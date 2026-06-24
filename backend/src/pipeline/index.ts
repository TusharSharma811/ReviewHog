/**
 * V3 Review Pipeline — Orchestrator
 *
 * Entry point for the multi-stage AI review pipeline.
 * Coordinates: classify → chunk → build diff → run 5-stage pipeline.
 *
 * V3 Pipeline Stages:
 *   1. General Code Review (LLM)
 *   2. User Instructions Review (LLM)
 *   3. Aggregator (deterministic)
 *   4. Deduplicator & Severity Classifier (LLM with deterministic fallback)
 *   5. Final Report Generator (deterministic)
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
import type { ReviewContext } from "./stages/types.js";
import { ReviewPipelineEngine } from "./stages/engine.js";
import { GeneralReviewStage } from "./stages/generalReview.js";
import { UserInstructionsReviewStage } from "./stages/userPromptReview.js";
import { AggregatorStage } from "./stages/aggregator.js";
import { DeduplicatorStage } from "./stages/deduplicator.js";
import { ReportGeneratorStage } from "./stages/reportGenerator.js";

// ─── Diff Builder ───────────────────────────────────────────────────────────

/**
 * Builds a consolidated diff string from all PR files.
 * This is sent to each LLM stage as the code context.
 */
type DiffTextFile = Pick<PRFile, "filename" | "status" | "patch" | "fullContent">;

function buildDiffText(files: DiffTextFile[]): string {
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
  rawFiles: PRFile[],
  filesSkipped = 0
): Promise<PipelineResult> {
  const startTime = Date.now();

  logger.info("PIPELINE", "Starting v3 review pipeline", {
    prId: ctx.prId,
    repo: ctx.repoFullName,
    fileCount: rawFiles.length,
  });

  // ── Pre-processing: Classify & Chunk (reused from V2) ──

  const classified = classifyFiles(rawFiles);
  const skippedCount = filesSkipped;

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

  // ── Load per-repo settings (instructions + temperature) ──

  let reviewInstructions: string | null = null;
  let repoTemperature: number = 0.1;
  try {
    const repo = await prisma.repo.findFirst({
      where: {
        ownerId: ctx.ownerId,
        githubRepoId: ctx.githubRepoId,
      },
      select: { reviewInstructions: true, temperature: true },
    });
    reviewInstructions = repo?.reviewInstructions ?? null;
    repoTemperature = repo?.temperature ?? 0.1;
  } catch (err) {
    logger.warn("PIPELINE", "Failed to load repo settings", {
      prId: ctx.prId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // ── Resolve AI settings (with repo temperature) ──

  const aiSettings = await resolveSettings(ctx.ownerId, repoTemperature);

  // ── Build diff text ──

  const diff = buildDiffText(chunks.flatMap((chunk) => chunk.files));

  logger.info("PIPELINE", "Pipeline context built", {
    prId: ctx.prId,
    hasReviewInstructions: Boolean(reviewInstructions),
    temperature: repoTemperature,
  });

  // ── Build ReviewContext ──

  const reviewContext: ReviewContext = {
    prContext: ctx,
    diff,
    reviewChunks: chunks,
    reviewInstructions,
    aiSettings,
    accumulatedFindings: [],
    stageMetadata: {},
  };

  // ── Create & Configure Pipeline Engine ──

  const engine = new ReviewPipelineEngine()
    .addStage(new GeneralReviewStage())            // Stage 1: General Review
    .addStage(new UserInstructionsReviewStage())    // Stage 2: User Instructions
    .addStage(new AggregatorStage())               // Stage 3: Aggregator
    .addStage(new DeduplicatorStage())             // Stage 4: Deduplicator
    .addStage(new ReportGeneratorStage());         // Stage 5: Report Generator

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
    processingTimeMs: result.stats.processingTimeMs,
  });

  return result;
}
