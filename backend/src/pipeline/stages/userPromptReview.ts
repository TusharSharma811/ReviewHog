/**
 * V3 Pipeline — Stage 3: User Custom Prompt Review
 *
 * Runs the user's per-repo custom review instructions as a
 * separate LLM call. Only executes if reviewInstructions is
 * non-empty for the repo being reviewed.
 */

import crypto from "crypto";
import type { ReviewStage, ReviewContext, StageResult } from "./types.js";
import type { Finding } from "../types.js";
import { callLLMProvider, extractJSON } from "../../reviewers/base.js";
import { reviewerOutputSchema } from "../../prompts/schemas.js";
import { logger } from "../../utils/logger.js";

const STAGE_NAME = "User Prompt Review";

const USER_PROMPT_SYSTEM_PROMPT = `You are a code reviewer following specific instructions provided by the repository owner.

Review the code changes according to ONLY the instructions given below.
Do not report issues outside the scope of these instructions.

## CONFIDENCE GUIDELINES:
- 0.9-1.0: Clear violation with obvious fix.
- 0.7-0.8: Very likely a violation.
- 0.5-0.6: Probable issue worth flagging.
- Below 0.5: Do NOT report it.

If the code fully satisfies the instructions, set noIssues: true.`;

export class UserPromptReviewStage implements ReviewStage {
  name = STAGE_NAME;

  async execute(context: ReviewContext): Promise<StageResult> {
    const { prContext, diff, reviewInstructions, aiSettings } = context;

    if (!reviewInstructions?.trim()) {
      logger.info("STAGE", `[${STAGE_NAME}] No user instructions configured, skipping`, {
        prId: prContext.prId,
      });

      return {
        stageName: STAGE_NAME,
        findings: [],
        tokensUsed: 0,
        failed: false,
      };
    }

    logger.info("STAGE", `[${STAGE_NAME}] Running user custom prompt`, {
      prId: prContext.prId,
      instructionLength: reviewInstructions.length,
    });

    try {
      const userPrompt = `Review Instructions:\n${reviewInstructions}\n\nPR Diff:\n\n${diff}`;

      const { content, tokensUsed } = await callLLMProvider(
        USER_PROMPT_SYSTEM_PROMPT,
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
          .update(`userprompt:${f.file}:${f.category}:${f.title}`)
          .digest("hex")
          .slice(0, 12),
        reviewerType: "user-prompt" as const,
        lineRange: f.lineRange,
        suggestion: f.suggestion,
        source: ["User Instructions"],
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
