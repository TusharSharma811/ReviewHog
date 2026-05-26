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
 * Correctness always runs. Security runs on high-risk categories.
 */
function selectReviewers(chunk: ReviewChunk): ReviewerType[] {
  const reviewers: ReviewerType[] = ["correctness"];

  // Determine all categories in this chunk
  const categories = new Set(chunk.files.map((f) => f.category));

  // Security reviewer for sensitive code
  const securityCategories = new Set([
    "auth",
    "api-route",
    "database",
    "middleware",
  ]);
  const hasSecurityRelevant = [...categories].some((c) =>
    securityCategories.has(c)
  );

  if (hasSecurityRelevant || chunk.maxRiskTier === "critical") {
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
