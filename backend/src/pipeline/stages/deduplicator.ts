/**
 * V3 Pipeline — Stage 5: LLM-Powered Deduplication & Severity Classification
 *
 * Uses an LLM to intelligently:
 * - Merge duplicate/overlapping findings from different stages
 * - Remove redundant comments
 * - Group similar issues
 * - Re-assign final severity (Critical, High, Medium, Low, Info)
 * - Combine source arrays when merging
 *
 * Replaces the accumulated findings with the deduplicated set.
 */

import crypto from "crypto";
import type { ReviewStage, ReviewContext, StageResult } from "./types.js";
import type { Finding, Severity } from "../types.js";
import { callLLMProvider, extractJSON } from "../../reviewers/base.js";
import { logger } from "../../utils/logger.js";
import { z } from "zod";

const STAGE_NAME = "Deduplicator";

const MIN_CONFIDENCE = 0.55;
const MAX_FINDINGS = 15;

// ─── Dedup Output Schema ────────────────────────────────────────────────────

const dedupFindingSchema = z.object({
  originalIds: z.array(z.string()),
  file: z.string(),
  lineRange: z.string().optional(),
  severity: z.enum(["critical", "high", "medium", "low", "info"]),
  confidence: z.number().min(0).max(1),
  title: z.string().max(150),
  description: z.string().max(800),
  suggestion: z.string().max(400).optional(),
  category: z.enum([
    "bug", "security", "race-condition", "data-loss", "error-handling",
    "injection", "breaking-change", "performance", "null-safety",
    "resource-leak", "maintainability", "code-quality", "accessibility",
    "standards-violation",
  ]),
  sources: z.array(z.string()),
});

const dedupOutputSchema = z.object({
  findings: z.array(dedupFindingSchema),
});

const DEDUP_SYSTEM_PROMPT = `You are an AI code review post-processor. Your job is to deduplicate, merge, and classify findings from multiple review stages.

You will receive a JSON array of code review findings from different sources (General Review, Repository Standards, User Instructions).

Your tasks:
1. **Merge duplicates**: If multiple findings refer to the same issue (same file, similar line range, same root cause), merge them into ONE finding. Combine their "sources" arrays.
2. **Remove redundant**: If one finding is a subset of another (e.g., "SQL injection" and "string concatenation in query" about the same code), keep only the more specific/complete one.
3. **Group similar**: If findings are about the same pattern repeated across lines, consolidate into one finding covering the range.
4. **Assign severity**: Re-evaluate severity based on the combined evidence:
   - Critical: Will crash, cause data loss, or is an exploitable security vulnerability
   - High: Very likely to cause bugs or security issues
   - Medium: Probable issue, should be fixed
   - Low: Minor issue, nice to fix
   - Info: Informational observation, no action needed
5. **Preserve sources**: When merging, combine ALL source tags from the merged findings.

Return ONLY the deduplicated findings. Maintain the original detail quality.

CRITICAL: Return valid JSON matching the schema. The "originalIds" field should contain the IDs of all original findings that were merged into this one.`;

const DEDUP_RESPONSE_FORMAT = {
  type: "json_schema" as const,
  json_schema: {
    name: "dedup_findings",
    strict: true,
    schema: {
      type: "object" as const,
      properties: {
        findings: {
          type: "array" as const,
          items: {
            type: "object" as const,
            properties: {
              originalIds: {
                type: "array" as const,
                items: { type: "string" as const },
                description: "IDs of original findings merged into this one",
              },
              file: { type: "string" as const },
              lineRange: { type: "string" as const, description: "e.g. '45-52'" },
              severity: {
                type: "string" as const,
                enum: ["critical", "high", "medium", "low", "info"],
              },
              confidence: { type: "number" as const, minimum: 0, maximum: 1 },
              title: { type: "string" as const },
              description: { type: "string" as const },
              suggestion: { type: "string" as const },
              category: {
                type: "string" as const,
                enum: [
                  "bug", "security", "race-condition", "data-loss", "error-handling",
                  "injection", "breaking-change", "performance", "null-safety",
                  "resource-leak", "maintainability", "code-quality", "accessibility",
                  "standards-violation",
                ],
              },
              sources: {
                type: "array" as const,
                items: { type: "string" as const },
              },
            },
            required: ["originalIds", "file", "severity", "confidence", "title", "description", "category", "sources"],
            additionalProperties: false,
          },
        },
      },
      required: ["findings"],
      additionalProperties: false,
    },
  },
};

// ─── Deterministic Fallback ─────────────────────────────────────────────────

const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

function deterministicDedup(findings: Finding[]): Finding[] {
  if (findings.length === 0) return [];

  // Group by file + category + line bucket
  const groups = new Map<string, Finding[]>();
  for (const f of findings) {
    const lineBucket = f.lineRange
      ? `L${Math.floor(parseInt(f.lineRange.split("-")[0], 10) / 5)}`
      : `no-line-${f.title.slice(0, 30)}`;
    const key = `${f.file}::${f.category}::${lineBucket}`;
    const group = groups.get(key) || [];
    group.push(f);
    groups.set(key, group);
  }

  return Array.from(groups.values()).map((group) => {
    const sorted = [...group].sort((a, b) => b.confidence - a.confidence);
    const best = { ...sorted[0] };

    // Merge sources
    const allSources = new Set<string>();
    for (const f of sorted) {
      for (const s of f.source) allSources.add(s);
    }
    best.source = Array.from(allSources);

    // Boost confidence for multi-source findings
    if (sorted.length > 1 && best.confidence < 0.95) {
      best.confidence = Math.min(1.0, best.confidence + 0.05 * (sorted.length - 1));
    }

    // Escalate severity if another reviewer flagged higher
    const maxSeverity = sorted.reduce((max, f) => {
      return SEVERITY_ORDER[f.severity] < SEVERITY_ORDER[max] ? f.severity : max;
    }, best.severity);
    best.severity = maxSeverity;

    if (sorted.length > 1) {
      const otherSources = sorted
        .slice(1)
        .flatMap((f) => f.source)
        .filter((s) => !best.source.includes(s));
      if (otherSources.length > 0) {
        best.description += `\n\n_Also flagged by: ${otherSources.join(", ")}._`;
      }
    }

    return best;
  });
}

function filterAndRank(findings: Finding[]): Finding[] {
  return findings
    .filter((f) => f.confidence >= MIN_CONFIDENCE)
    .sort((a, b) => {
      const sevDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
      if (sevDiff !== 0) return sevDiff;
      return b.confidence - a.confidence;
    })
    .slice(0, MAX_FINDINGS);
}

// ─── Stage Implementation ───────────────────────────────────────────────────

export class DeduplicatorStage implements ReviewStage {
  name = STAGE_NAME;

  async execute(context: ReviewContext): Promise<StageResult> {
    const { prContext, accumulatedFindings, aiSettings } = context;

    if (accumulatedFindings.length === 0) {
      logger.info("STAGE", `[${STAGE_NAME}] No findings to deduplicate`, {
        prId: prContext.prId,
      });

      // Clear accumulated and return empty
      context.accumulatedFindings = [];
      return {
        stageName: STAGE_NAME,
        findings: [],
        tokensUsed: 0,
        failed: false,
      };
    }

    logger.info("STAGE", `[${STAGE_NAME}] Deduplicating ${accumulatedFindings.length} findings`, {
      prId: prContext.prId,
    });

    // Attempt LLM dedup, fall back to deterministic if LLM fails
    let deduped: Finding[];
    let tokensUsed = 0;

    try {
      // Build the input payload for the LLM
      const findingsPayload = accumulatedFindings.map((f) => ({
        id: f.id,
        file: f.file,
        lineRange: f.lineRange,
        severity: f.severity,
        confidence: f.confidence,
        title: f.title,
        description: f.description,
        suggestion: f.suggestion,
        category: f.category,
        sources: f.source,
      }));

      const userPrompt = `Deduplicate and classify these ${accumulatedFindings.length} findings:\n\n${JSON.stringify(findingsPayload, null, 2)}`;

      const { content, tokensUsed: used } = await callLLMProvider(
        DEDUP_SYSTEM_PROMPT,
        userPrompt,
        aiSettings,
        DEDUP_RESPONSE_FORMAT
      );
      tokensUsed = used;

      if (!content.trim()) {
        throw new Error("Empty response from dedup LLM");
      }

      const jsonStr = extractJSON(content);
      const parsed = JSON.parse(jsonStr);
      const validated = dedupOutputSchema.parse(parsed);

      // Map back to Finding type
      deduped = validated.findings.map((f) => ({
        id: crypto
          .createHash("md5")
          .update(`dedup:${f.file}:${f.category}:${f.title}`)
          .digest("hex")
          .slice(0, 12),
        reviewerType: "general" as const, // Merged findings lose specific reviewer type
        file: f.file,
        lineRange: f.lineRange,
        severity: f.severity,
        confidence: f.confidence,
        title: f.title,
        description: f.description,
        suggestion: f.suggestion,
        category: f.category,
        source: f.sources,
      }));

      logger.info("STAGE", `[${STAGE_NAME}] LLM dedup complete`, {
        prId: prContext.prId,
        before: accumulatedFindings.length,
        after: deduped.length,
        tokensUsed,
      });
    } catch (err) {
      logger.warn("STAGE", `[${STAGE_NAME}] LLM dedup failed, using deterministic fallback`, {
        prId: prContext.prId,
        error: err instanceof Error ? err.message : String(err),
      });

      deduped = deterministicDedup(accumulatedFindings);
    }

    // Apply confidence filter and rank
    const filtered = filterAndRank(deduped);

    // REPLACE the accumulated findings with the deduplicated set
    context.accumulatedFindings = filtered;

    logger.info("STAGE", `[${STAGE_NAME}] Final findings after filter`, {
      prId: prContext.prId,
      count: filtered.length,
    });

    return {
      stageName: STAGE_NAME,
      findings: [], // Don't double-add — we already updated accumulatedFindings
      tokensUsed,
      failed: false,
    };
  }
}
