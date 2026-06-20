/**
 * V3 Pipeline — Stage 4: Aggregator
 *
 * Deterministic stage that collects all findings from Stages 1-3,
 * groups them by source, and produces a structured intermediate
 * object for downstream processing.
 *
 * This stage does NOT add new findings — it reorganizes and
 * tags the existing ones. The accumulatedFindings in the context
 * are REPLACED with the aggregated set.
 */

import type { ReviewStage, ReviewContext, StageResult } from "./types.js";
import type { Finding } from "../types.js";
import { logger } from "../../utils/logger.js";

const STAGE_NAME = "Aggregator";

export interface AggregatedFindings {
  generalReview: Finding[];
  standardsReviews: Record<string, Finding[]>;
  userPromptReview: Finding[];
  all: Finding[];
}

export class AggregatorStage implements ReviewStage {
  name = STAGE_NAME;

  async execute(context: ReviewContext): Promise<StageResult> {
    const { prContext, accumulatedFindings } = context;

    logger.info("STAGE", `[${STAGE_NAME}] Aggregating ${accumulatedFindings.length} findings`, {
      prId: prContext.prId,
    });

    // Group by source
    const generalReview: Finding[] = [];
    const standardsReviews: Record<string, Finding[]> = {};
    const userPromptReview: Finding[] = [];

    for (const finding of accumulatedFindings) {
      for (const src of finding.source) {
        if (src === "General Review") {
          generalReview.push(finding);
        } else if (src.startsWith("Standard: ")) {
          const standardName = src.replace("Standard: ", "");
          if (!standardsReviews[standardName]) {
            standardsReviews[standardName] = [];
          }
          standardsReviews[standardName].push(finding);
        } else if (src === "User Instructions") {
          userPromptReview.push(finding);
        }
      }
    }

    const aggregated: AggregatedFindings = {
      generalReview,
      standardsReviews,
      userPromptReview,
      all: accumulatedFindings,
    };

    logger.info("STAGE", `[${STAGE_NAME}] Aggregation complete`, {
      prId: prContext.prId,
      generalCount: generalReview.length,
      standardsCount: Object.values(standardsReviews).reduce((sum, arr) => sum + arr.length, 0),
      userPromptCount: userPromptReview.length,
      totalCount: accumulatedFindings.length,
    });

    // Don't add new findings — just store the aggregated structure as metadata
    // The accumulatedFindings stays unchanged for the next stage
    return {
      stageName: STAGE_NAME,
      findings: [], // No NEW findings from this stage
      tokensUsed: 0,
      failed: false,
      metadata: { aggregated },
    };
  }
}
