/**
 * V2 Pipeline — Reviewer Dispatch
 *
 * Selects which specialized reviewers to run on each chunk based on
 * the file categories present, then executes them in parallel.
 */

import type {
  ReviewChunk,
  PRContext,
  Finding,
  ReviewerType,
} from "./types.js";
import { runReviewer } from "../reviewers/base.js";
import { CORRECTNESS_SYSTEM_PROMPT } from "../reviewers/correctness.js";
import { SECURITY_SYSTEM_PROMPT } from "../reviewers/security.js";
import { logger } from "../utils/logger.js";

// ─── Reviewer Registry ──────────────────────────────────────────────────────

const REVIEWER_PROMPTS: Record<ReviewerType, string> = {
  correctness: CORRECTNESS_SYSTEM_PROMPT,
  security: SECURITY_SYSTEM_PROMPT,
  // Future reviewers:
  concurrency: "",
  "api-contract": "",
};

// ─── Reviewer Selection ─────────────────────────────────────────────────────

/**
 * Determines which reviewers to run based on the chunk's content.
 *
 * Correctness reviewer always runs on every chunk.
 *
 * Security reviewer is triggered via THREE independent signals (any one suffices):
 *   1. Category-based:  File path matches a sensitive category (auth, api, db, middleware)
 *   2. Content-based:   Diff contains security patterns (SQL, eval, subprocess, secrets, etc.)
 *   3. Risk-tier-based: Classifier assigned "high" or "critical" risk
 *
 * Why all three? Files can be security-sensitive without having a recognizable path.
 * For example, a standalone `app.py` with SQL injection + pickle deserialization + hardcoded
 * secrets gets categorized as "business-logic" by path, but the content + risk tier signals
 * correctly trigger the security reviewer.
 */
function selectReviewers(chunk: ReviewChunk): ReviewerType[] {
  const reviewers: ReviewerType[] = ["correctness"];

  // ── Signal 1: Category-based (file path matches a sensitive pattern) ──
  const categories = new Set(chunk.files.map((f) => f.category));
  const securityCategories = new Set([
    "auth",
    "api-route",
    "database",
    "middleware",
  ]);
  const hasSecurityRelevant = [...categories].some((c) =>
    securityCategories.has(c)
  );

  // ── Signal 2: Content-based (diff contains security-sensitive code) ──
  // These patterns catch dangerous operations regardless of file path or category.
  // This is the fallback for files not matched by category rules above.
  const SECURITY_CONTENT_PATTERNS = [
    /\beval\s*\(/,                       // Dynamic code execution
    /\bexec\s*\(/,                       // Command/code execution
    /subprocess|child_process/,          // OS command execution
    /pickle\.|deserializ/i,             // Unsafe deserialization (Python pickle, etc.)
    /sql|query|execute.*\(/i,            // Database queries (potential injection)
    /password|secret|api[_-]?key|token/i, // Credential/secret handling
    /crypto|hash|bcrypt|argon/i,         // Cryptographic operations
    /redirect|open\s*\(/i,              // Open redirects, file access
    /innerHTML|dangerouslySetInnerHTML/i, // XSS vectors
    /\bshell\s*[:=]\s*true/,            // Shell execution flags
  ];

  const hasSecurityContent = chunk.files.some((f) =>
    SECURITY_CONTENT_PATTERNS.some((p) => p.test(f.patch))
  );

  // ── Signal 3: Risk-tier-based (classifier flagged the file as risky) ──
  // High/critical risk means the classifier detected multiple danger signals
  // or the file touches a sensitive area. Security review is warranted.
  if (
    hasSecurityRelevant ||
    hasSecurityContent ||
    chunk.maxRiskTier === "critical" ||
    chunk.maxRiskTier === "high"
  ) {
    reviewers.push("security");
  }

  // Future: concurrency reviewer for auth + database
  // Future: api-contract reviewer for api-route files

  return reviewers;
}

// ─── Dispatch ───────────────────────────────────────────────────────────────

export interface DispatchResult {
  findings: Finding[];
  reviewersUsed: ReviewerType[];
}

export async function dispatchReviewers(
  chunks: ReviewChunk[],
  ctx: PRContext
): Promise<DispatchResult> {
  const allFindings: Finding[] = [];
  const reviewersUsed = new Set<ReviewerType>();

  for (const chunk of chunks) {
    const selectedReviewers = selectReviewers(chunk);

    logger.info("DISPATCH", `Chunk ${chunk.id}`, {
      prId: ctx.prId,
      fileCount: chunk.files.length,
      risk: chunk.maxRiskTier,
      reviewers: selectedReviewers,
    });

    // Run all selected reviewers in parallel for this chunk
    const results = await Promise.allSettled(
      selectedReviewers.map((reviewerType) => {
        const systemPrompt = REVIEWER_PROMPTS[reviewerType];
        if (!systemPrompt) {
          logger.warn("DISPATCH", `No prompt for reviewer: ${reviewerType}`);
          return Promise.resolve([]);
        }

        reviewersUsed.add(reviewerType);

        return runReviewer({
          reviewerType,
          systemPrompt,
          chunk,
          ctx,
        });
      })
    );

    // Collect findings from successful reviewers
    for (const result of results) {
      if (result.status === "fulfilled") {
        allFindings.push(...result.value);
      } else {
        logger.error("DISPATCH", "Reviewer promise rejected", {
          prId: ctx.prId,
          chunkId: chunk.id,
          error:
            result.reason instanceof Error
              ? result.reason.message
              : String(result.reason),
        });
      }
    }
  }

  return {
    findings: allFindings,
    reviewersUsed: Array.from(reviewersUsed),
  };
}
