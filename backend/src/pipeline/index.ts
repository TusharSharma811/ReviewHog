/**
 * V2 Review Pipeline — Orchestrator
 *
 * Entry point for the multi-stage AI review pipeline.
 * Coordinates: classify → chunk → dispatch → collect → dedup → filter → summarize.
 *
 * Called from pullRequest.webhook.ts as a drop-in replacement for
 * the v1 safeRunPullRequestReview function.
 */

import type {
  PRContext,
  PRFile,
  PipelineResult,
  PipelineStats,
  ReviewerType,
  Finding,
  Conclusion,
} from "./types.js";
import { classifyFiles } from "./classifier.js";
import { buildChunks } from "./chunker.js";
import { dispatchReviewers } from "./dispatch.js";
import { deduplicateFindings } from "./dedup.js";
import { filterAndRank } from "./filter.js";
import { generatePRSummary } from "./summarizer.js";
import { resolveSettings } from "../reviewers/base.js";
import { logger } from "../utils/logger.js";

// ─── Risk Score Computation ─────────────────────────────────────────────────

function computeRiskScore(findings: Finding[]): number {
  if (findings.length === 0) return 0;

  const weights = { critical: 40, high: 20, medium: 8, low: 2 };
  let score = 0;

  for (const f of findings) {
    score += weights[f.severity] * f.confidence;
  }

  return Math.min(100, Math.round(score));
}

function deriveConclusion(findings: Finding[]): Conclusion {
  const hasCritical = findings.some((f) => f.severity === "critical");
  const hasHigh = findings.some((f) => f.severity === "high");

  if (hasCritical) return "failure";
  if (hasHigh) return "failure";
  if (findings.length === 0) return "success";
  return "neutral";
}

function deriveRating(findings: Finding[]): number {
  const critCount = findings.filter((f) => f.severity === "critical").length;
  const highCount = findings.filter((f) => f.severity === "high").length;
  const medCount = findings.filter((f) => f.severity === "medium").length;

  if (critCount > 0) return 1;
  if (highCount >= 2) return 2;
  if (highCount === 1) return 3;
  if (medCount > 0) return 4;
  return 5;
}

// ─── Pipeline ───────────────────────────────────────────────────────────────

export async function runReviewPipeline(
  ctx: PRContext,
  rawFiles: PRFile[]
): Promise<PipelineResult> {
  const startTime = Date.now();
  const reviewersRun = new Set<ReviewerType>();

  logger.info("PIPELINE", "Starting v2 review pipeline", {
    prId: ctx.prId,
    repo: ctx.repoFullName,
    fileCount: rawFiles.length,
  });

  // P1: Resolve AI settings once for the entire pipeline run
  const aiSettings = await resolveSettings(ctx.ownerId);

  // Stage 1: Classify files
  const classified = classifyFiles(rawFiles);
  const skippedCount = rawFiles.length - classified.length;

  logger.info("PIPELINE", "Files classified", {
    prId: ctx.prId,
    classified: classified.length,
    skipped: skippedCount,
    riskBreakdown: {
      critical: classified.filter((f) => f.riskTier === "critical").length,
      high: classified.filter((f) => f.riskTier === "high").length,
      medium: classified.filter((f) => f.riskTier === "medium").length,
      low: classified.filter((f) => f.riskTier === "low").length,
    },
  });

  // Stage 2: Chunk files
  const chunks = buildChunks(classified);

  logger.info("PIPELINE", "Chunks built", {
    prId: ctx.prId,
    chunkCount: chunks.length,
    chunkSizes: chunks.map((c) => ({
      id: c.id,
      files: c.files.length,
      tokens: c.totalTokens,
      risk: c.maxRiskTier,
    })),
  });

  // Stage 3: Dispatch to reviewers (P0: parallel, P1: shared settings)
  const { findings: rawFindings, reviewersUsed, totalTokensUsed, allReviewersFailed } = await dispatchReviewers(
    chunks,
    ctx,
    aiSettings
  );
  for (const r of reviewersUsed) reviewersRun.add(r);

  logger.info("PIPELINE", "Reviewers complete", {
    prId: ctx.prId,
    rawFindingsCount: rawFindings.length,
    reviewers: Array.from(reviewersRun),
    totalTokensUsed,
    allReviewersFailed,
  });

  // ⚠ CRITICAL: If all reviewers failed, do NOT report a clean result
  if (allReviewersFailed) {
    logger.error("PIPELINE", "All reviewers failed — returning error result", { prId: ctx.prId });

    const errorStats: PipelineStats = {
      filesReviewed: classified.length,
      filesSkipped: skippedCount,
      chunksProcessed: chunks.length,
      reviewersRun: Array.from(reviewersRun),
      totalTokensUsed,
      processingTimeMs: Date.now() - startTime,
    };

    return {
      findings: [],
      riskScore: -1,
      conclusion: "failure" as Conclusion,
      rating: 0,
      summary: "⚠️ **Review could not be completed.** All AI reviewers failed due to rate limiting or API errors. " +
        "Please try again later, or configure your own API key in Settings for reliable reviews.\n\n" +
        `> Attempted reviewers: ${Array.from(reviewersRun).join(", ") || "none"}\n` +
        `> Processed in ${((Date.now() - startTime) / 1000).toFixed(1)}s | Pipeline v2`,
      stats: errorStats,
    };
  }

  // Stage 4: Deduplicate
  const deduped = deduplicateFindings(rawFindings);

  // Stage 5: Filter & rank
  const filtered = filterAndRank(deduped);

  logger.info("PIPELINE", "Findings processed", {
    prId: ctx.prId,
    raw: rawFindings.length,
    afterDedup: deduped.length,
    afterFilter: filtered.length,
  });

  // Stage 6: Generate PR summary comment
  const conclusion = deriveConclusion(filtered);
  const rating = deriveRating(filtered);
  const riskScore = computeRiskScore(filtered);

  const stats: PipelineStats = {
    filesReviewed: classified.length,
    filesSkipped: skippedCount,
    chunksProcessed: chunks.length,
    reviewersRun: Array.from(reviewersRun),
    totalTokensUsed, // C3: Now tracks actual API usage
    processingTimeMs: Date.now() - startTime,
  };

  const summary = await generatePRSummary({
    findings: filtered,
    riskScore,
    conclusion,
    rating,
    stats,
    ctx,
  });

  stats.processingTimeMs = Date.now() - startTime;

  logger.info("PIPELINE", "Pipeline complete", {
    prId: ctx.prId,
    riskScore,
    rating,
    conclusion,
    findingsCount: filtered.length,
    totalTokensUsed,
    processingTimeMs: stats.processingTimeMs,
  });

  return {
    findings: filtered,
    riskScore,
    conclusion,
    rating,
    summary,
    stats,
  };
}


