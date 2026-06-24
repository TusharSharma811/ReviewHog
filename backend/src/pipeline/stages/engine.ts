/**
 * V3 Pipeline — Review Pipeline Engine
 *
 * Pluggable stage-based pipeline orchestrator. Stages are registered
 * in order and executed sequentially, with each stage receiving the
 * accumulated findings from all prior stages.
 */

import type { ReviewContext, ReviewStage, StageResult } from "./types.js";
import type { PipelineResult, PipelineStats, Finding, Conclusion } from "../types.js";
import { logger } from "../../utils/logger.js";

// ─── Risk / Rating Computation ──────────────────────────────────────────────

function computeRiskScore(findings: Finding[]): number {
  if (findings.length === 0) return 0;

  const weights = { critical: 40, high: 20, medium: 8, low: 2, info: 0 };
  let score = 0;

  for (const f of findings) {
    score += (weights[f.severity] ?? 0) * f.confidence;
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

// ─── Pipeline Engine ────────────────────────────────────────────────────────

export class ReviewPipelineEngine {
  private stages: ReviewStage[] = [];

  /** Register a stage. Stages execute in the order they are added. */
  addStage(stage: ReviewStage): this {
    this.stages.push(stage);
    return this;
  }

  /** Execute all registered stages sequentially. */
  async execute(
    context: ReviewContext,
    meta: {
      filesReviewed: number;
      filesSkipped: number;
      chunksProcessed: number;
      startTime: number;
    }
  ): Promise<PipelineResult> {
    const stageResults: StageResult[] = [];
    const stagesRun: string[] = [];
    let totalTokensUsed = 0;

    for (const stage of this.stages) {
      logger.info("ENGINE", `Starting stage: ${stage.name}`, {
        prId: context.prContext.prId,
        accumulatedFindings: context.accumulatedFindings.length,
      });

      try {
        const result = await stage.execute(context);
        stageResults.push(result);
        stagesRun.push(stage.name);
        totalTokensUsed += result.tokensUsed;

        // Append new findings to the shared context
        context.accumulatedFindings.push(...result.findings);

        // Merge metadata
        if (result.metadata) {
          context.stageMetadata[stage.name] = result.metadata;
        }

        logger.info("ENGINE", `Stage complete: ${stage.name}`, {
          prId: context.prContext.prId,
          findings: result.findings.length,
          tokensUsed: result.tokensUsed,
          failed: result.failed,
          skipped: result.skipped ?? false,
        });
      } catch (err) {
        logger.error("ENGINE", `Stage crashed: ${stage.name}`, {
          prId: context.prContext.prId,
          error: err instanceof Error ? err.message : String(err),
        });

        stageResults.push({
          stageName: stage.name,
          findings: [],
          tokensUsed: 0,
          failed: true,
        });
        stagesRun.push(stage.name);
      }
    }

    // The final findings are whatever the last stage left in accumulatedFindings
    const finalFindings = context.accumulatedFindings;

    // If all LLM stages failed, return an error result
    // Exclude deterministic stages (Aggregator, Report Generator, Deduplicator)
    // and skipped stages (no user instructions configured)
    const llmStages = stageResults.filter(
      (r) => r.stageName !== "Aggregator" && r.stageName !== "Report Generator"
        && r.stageName !== "Deduplicator" && !r.skipped
    );
    const allLlmFailed =
      llmStages.length > 0 && llmStages.every((r) => r.failed);

    if (allLlmFailed) {
      logger.error("ENGINE", "All LLM stages failed", {
        prId: context.prContext.prId,
      });

      const errorStats: PipelineStats = {
        filesReviewed: meta.filesReviewed,
        filesSkipped: meta.filesSkipped,
        chunksProcessed: meta.chunksProcessed,
        reviewersRun: [],
        totalTokensUsed,
        processingTimeMs: Date.now() - meta.startTime,
        stagesRun,
      };

      return {
        findings: [],
        riskScore: -1,
        conclusion: "failure" as Conclusion,
        rating: 3,
        summary:
          "⚠️ **Review could not be completed.** All AI reviewers failed due to rate limiting or API errors. " +
          "Please try again later, or configure your own API key in Settings for reliable reviews.\n\n" +
          `> Stages attempted: ${stagesRun.join(", ") || "none"}\n` +
          `> Processed in ${((Date.now() - meta.startTime) / 1000).toFixed(1)}s | Pipeline v3`,
        stats: errorStats,
      };
    }

    const conclusion = deriveConclusion(finalFindings);
    const rating = deriveRating(finalFindings);
    const riskScore = computeRiskScore(finalFindings);

    const stats: PipelineStats = {
      filesReviewed: meta.filesReviewed,
      filesSkipped: meta.filesSkipped,
      chunksProcessed: meta.chunksProcessed,
      reviewersRun: stagesRun,
      totalTokensUsed,
      processingTimeMs: Date.now() - meta.startTime,
      stagesRun,
    };

    // The summary is generated by the Report Generator stage and stored in stageMetadata
    const summary =
      (context.stageMetadata["Report Generator"] as { report?: string })?.report ??
      "Review completed but report generation failed.";

    logger.info("ENGINE", "Pipeline complete", {
      prId: context.prContext.prId,
      riskScore,
      rating,
      conclusion,
      findingsCount: finalFindings.length,
      totalTokensUsed,
      stagesRun,
      processingTimeMs: stats.processingTimeMs,
    });

    return {
      findings: finalFindings,
      riskScore,
      conclusion,
      rating,
      summary,
      stats,
    };
  }
}
