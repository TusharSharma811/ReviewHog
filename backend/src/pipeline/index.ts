/**
 * V3 Review Pipeline — Orchestrator
 *
 * Entry point for the multi-stage AI review pipeline.
 * Coordinates: classify → chunk → build diff → run 6-stage pipeline.
 *
 * V3 Pipeline Stages:
 *   1. General Code Review (LLM)
 *   2. Repository Standards Review (parallel LLM calls per standard)
 *   3. User Custom Prompt Review (LLM)
 *   4. Aggregator (deterministic)
 *   5. Deduplicator & Severity Classifier (LLM with deterministic fallback)
 *   6. Final Report Generator (deterministic)
 */

import type {
  PRContext,
  PRFile,
  PipelineResult,
} from "./types.js";
import { classifyFiles } from "./classifier.js";
import { buildChunks } from "./chunker.js";
import { resolveSettings } from "../reviewers/base.js";
import { logger } from "../utils/logger.js";
import prisma from "../db/prismaClient.js";

// V3 Stage Imports
import type { ReviewContext, RepoStandardRecord } from "./stages/types.js";
import { ReviewPipelineEngine } from "./stages/engine.js";
import { GeneralReviewStage } from "./stages/generalReview.js";
import { StandardsReviewStage } from "./stages/standardsReview.js";
import { UserPromptReviewStage } from "./stages/userPromptReview.js";
import { AggregatorStage } from "./stages/aggregator.js";
import { DeduplicatorStage } from "./stages/deduplicator.js";
import { ReportGeneratorStage } from "./stages/reportGenerator.js";

// ─── Diff Builder ───────────────────────────────────────────────────────────

/**
 * Builds a consolidated diff string from all PR files.
 * This is sent to each LLM stage as the code context.
 */
function buildDiffText(files: PRFile[]): string {
  return files
    .map(
      (file, i) => `
## File ${i + 1}: ${file.filename}
Status: ${file.status}

### Diff
\`\`\`diff
${file.patch}
\`\`\`

### Full file context
\`\`\`
${file.fullContent}
\`\`\`
`.trim()
    )
    .join("\n\n---\n\n");
}

// ─── Pipeline ───────────────────────────────────────────────────────────────

export async function runReviewPipeline(
  ctx: PRContext,
  rawFiles: PRFile[]
): Promise<PipelineResult> {
  const startTime = Date.now();

  logger.info("PIPELINE", "Starting v3 review pipeline", {
    prId: ctx.prId,
    repo: ctx.repoFullName,
    fileCount: rawFiles.length,
  });

  // ── Pre-processing: Classify & Chunk (reused from V2) ──

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

  const chunks = buildChunks(classified);

  logger.info("PIPELINE", "Chunks built", {
    prId: ctx.prId,
    chunkCount: chunks.length,
  });

  // ── Resolve AI settings ──

  const aiSettings = await resolveSettings(ctx.ownerId);

  // ── Build diff text ──

  const diff = buildDiffText(rawFiles);

  // ── Load repo standards from DB ──

  let repoStandards: RepoStandardRecord[] = [];
  try {
    const standards = await prisma.repoStandard.findMany({
      where: { ownerId: ctx.ownerId, isEnabled: true },
      select: { id: true, name: true, prompt: true, isEnabled: true },
    });
    repoStandards = standards;
  } catch (err) {
    logger.warn("PIPELINE", "Failed to load repo standards", {
      prId: ctx.prId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // ── Load per-repo review instructions ──

  let reviewInstructions: string | null = null;
  try {
    // Find the repo by matching the full name (owner/repo format)
    const repo = await prisma.repo.findFirst({
      where: {
        ownerId: ctx.ownerId,
        url: { contains: ctx.repoFullName },
      },
      select: { reviewInstructions: true },
    });
    reviewInstructions = repo?.reviewInstructions ?? null;
  } catch (err) {
    logger.warn("PIPELINE", "Failed to load review instructions", {
      prId: ctx.prId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  logger.info("PIPELINE", "Pipeline context built", {
    prId: ctx.prId,
    standardsCount: repoStandards.length,
    hasReviewInstructions: Boolean(reviewInstructions),
  });

  // ── Build ReviewContext ──

  const reviewContext: ReviewContext = {
    prContext: ctx,
    diff,
    repoStandards,
    reviewInstructions,
    aiSettings,
    accumulatedFindings: [],
    stageMetadata: {},
  };

  // ── Create & Configure Pipeline Engine ──

  const engine = new ReviewPipelineEngine()
    .addStage(new GeneralReviewStage())        // Stage 1: General Review
    .addStage(new StandardsReviewStage())      // Stage 2: Standards Review
    .addStage(new UserPromptReviewStage())     // Stage 3: User Prompt Review
    .addStage(new AggregatorStage())           // Stage 4: Aggregator
    .addStage(new DeduplicatorStage())         // Stage 5: Deduplicator
    .addStage(new ReportGeneratorStage());     // Stage 6: Report Generator

  // ── Execute Pipeline ──

  const result = await engine.execute(reviewContext, {
    filesReviewed: classified.length,
    filesSkipped: skippedCount,
    chunksProcessed: chunks.length,
    startTime,
  });

  logger.info("PIPELINE", "Pipeline v3 complete", {
    prId: ctx.prId,
    riskScore: result.riskScore,
    rating: result.rating,
    conclusion: result.conclusion,
    findingsCount: result.findings.length,
    totalTokensUsed: result.stats.totalTokensUsed,
    stagesRun: result.stats.stagesRun,
    standardsTriggered: result.stats.standardsTriggered,
    processingTimeMs: result.stats.processingTimeMs,
  });

  return result;
}
