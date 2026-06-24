/**
 * V3 Pipeline — Stage 3: Aggregator
 *
 * Deterministic stage that collects all findings from Stages 1-2,
 * groups them by source, and produces a structured intermediate
 * object for downstream processing.
 *
 * This stage does NOT add new findings — it reorganizes and
 * tags the existing ones.
 */

import type { ReviewStage, ReviewContext, StageResult } from "./types.js";
import type { Finding } from "../types.js";
import { logger } from "../../utils/logger.js";

const STAGE_NAME = "Aggregator";

export interface AggregatedFindings {
  generalReview: Finding[];
  userInstructionsReview: Finding[];
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
    const userInstructionsReview: Finding[] = [];

    for (const finding of accumulatedFindings) {
      for (const src of finding.source) {
        if (src === "General Review") {
          generalReview.push(finding);
        } else if (src === "User Instructions") {
          userInstructionsReview.push(finding);
        }
      }
    }

    const aggregated: AggregatedFindings = {
      generalReview,
      userInstructionsReview,
      all: accumulatedFindings,
    };

    logger.info("STAGE", `[${STAGE_NAME}] Aggregation complete`, {
      prId: prContext.prId,
      generalCount: generalReview.length,
      userInstructionsCount: userInstructionsReview.length,
      totalCount: accumulatedFindings.length,
    });

    return {
      stageName: STAGE_NAME,
      findings: [], // No NEW findings from this stage
      tokensUsed: 0,
      failed: false,
      metadata: { aggregated },
    };
  }
}
