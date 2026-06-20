/**
 * V3 Pipeline — Stage 1: General Code Review
 *
 * Performs a broad code review for bugs, logic issues,
 * code quality, and maintainability concerns.
 * This stage always runs on every PR.
 */

import crypto from "crypto";
import type { ReviewStage, ReviewContext, StageResult } from "./types.js";
import type { Finding } from "../types.js";
import { callLLMProvider, extractJSON } from "../../reviewers/base.js";
import { reviewerOutputSchema } from "../../prompts/schemas.js";
import { REVIEWER_RESPONSE_FORMAT } from "../../prompts/schemas.js";
import { logger } from "../../utils/logger.js";

const STAGE_NAME = "General Review";

const GENERAL_REVIEW_SYSTEM_PROMPT = `You are a senior software engineer performing a thorough code review.

Review the following code changes for:
- Bugs and logic errors
- Code quality concerns
- Maintainability issues
- Error handling gaps
- Resource leaks
- Incorrect async/await usage
- Type safety issues
- Division by zero risks
- Methods called but not invoked (missing parentheses)
- Variables used before assignment

## CONFIDENCE GUIDELINES:
- 0.9-1.0: You are certain this is a real issue. The code WILL fail or is clearly wrong.
- 0.7-0.8: Very likely an issue. Specific failure scenario is clear.
- 0.5-0.6: Probable issue worth flagging.
- Below 0.5: Do NOT report it.

## DO NOT REPORT:
- Style preferences (naming, formatting, import order)
- Missing comments or documentation
- Code that works correctly but could be "cleaner"

## CRITICAL RULES:
- For NEW FILES: review the entire file content, not just the diff headers.
- Provide a CONCRETE failure scenario for each finding.
- If the code genuinely has zero issues, set noIssues: true.`;

export class GeneralReviewStage implements ReviewStage {
  name = STAGE_NAME;

  async execute(context: ReviewContext): Promise<StageResult> {
    const { prContext, diff, aiSettings } = context;

    logger.info("STAGE", `[${STAGE_NAME}] Starting`, { prId: prContext.prId });

    try {
      const userPrompt = `Review the following PR diff:\n\n${diff}`;

      const { content, tokensUsed } = await callLLMProvider(
        GENERAL_REVIEW_SYSTEM_PROMPT,
        userPrompt,
        aiSettings
      );

      if (!content.trim()) {
        throw new Error("Empty response from model");
      }

      const jsonStr = extractJSON(content);
      const parsed = JSON.parse(jsonStr);
      const validated = reviewerOutputSchema.parse(parsed);

      const findings: Finding[] = validated.findings.map((f) => ({
        ...f,
        id: crypto
          .createHash("md5")
          .update(`general:${f.file}:${f.category}:${f.title}`)
          .digest("hex")
          .slice(0, 12),
        reviewerType: "general" as const,
        lineRange: f.lineRange,
        suggestion: f.suggestion,
        source: [STAGE_NAME],
      }));

      logger.info("STAGE", `[${STAGE_NAME}] Complete`, {
        prId: prContext.prId,
        findingsCount: findings.length,
        tokensUsed,
      });

      return {
        stageName: STAGE_NAME,
        findings,
        tokensUsed,
        failed: false,
      };
    } catch (err) {
      logger.error("STAGE", `[${STAGE_NAME}] Failed`, {
        prId: prContext.prId,
        error: err instanceof Error ? err.message : String(err),
      });

      return {
        stageName: STAGE_NAME,
        findings: [],
        tokensUsed: 0,
        failed: true,
      };
    }
  }
}
