/**
 * V3 Pipeline — Stage 2: User Instructions Review
 *
 * Runs the user's per-repo custom instructions as a
 * separate LLM call per chunk. Only executes if
 * reviewInstructions is non-empty for the repo being reviewed.
 *
 * Users define their standards and custom review rules here.
 */

import crypto from "crypto";
import pLimit from "p-limit";
import type { ReviewStage, ReviewContext, StageResult } from "./types.js";
import type { Finding } from "../types.js";
import { callLLMProvider, extractJSON, formatChunkForPrompt } from "../../reviewers/base.js";
import { reviewerOutputSchema } from "../../prompts/schemas.js";
import { logger } from "../../utils/logger.js";

const STAGE_NAME = "User Instructions Review";
const USER_INSTRUCTIONS_CONCURRENCY = Number(process.env.USER_INSTRUCTIONS_CONCURRENCY || 2);

const USER_INSTRUCTIONS_SYSTEM_PROMPT = `You are a code reviewer following specific instructions provided by the repository owner.

The owner has defined custom standards, rules, and review instructions for their repository.
Review the code changes according to ONLY the instructions given below.
Do not report issues outside the scope of these instructions.

## CONFIDENCE GUIDELINES:
- 0.9-1.0: Clear violation with obvious fix.
- 0.7-0.8: Very likely a violation.
- 0.5-0.6: Probable issue worth flagging.
- Below 0.5: Do NOT report it.

If the code fully satisfies the instructions, set noIssues: true.`;

export class UserInstructionsReviewStage implements ReviewStage {
  name = STAGE_NAME;

  async execute(context: ReviewContext): Promise<StageResult> {
    const { prContext, reviewChunks, reviewInstructions, aiSettings } = context;

    if (!reviewInstructions?.trim()) {
      logger.info("STAGE", `[${STAGE_NAME}] No user instructions configured, skipping`, {
        prId: prContext.prId,
      });

      return {
        stageName: STAGE_NAME,
        findings: [],
        tokensUsed: 0,
        failed: false,
        skipped: true,
      };
    }

    logger.info("STAGE", `[${STAGE_NAME}] Running user instructions review`, {
      prId: prContext.prId,
      instructionLength: reviewInstructions.length,
      chunks: reviewChunks.length,
    });

    if (reviewChunks.length === 0) {
      return {
        stageName: STAGE_NAME,
        findings: [],
        tokensUsed: 0,
        failed: false,
        skipped: true,
      };
    }

    const limit = pLimit(USER_INSTRUCTIONS_CONCURRENCY);
    const allFindings: Finding[] = [];
    let totalTokens = 0;
    let allFailed = true;

    const results = await Promise.allSettled(
      reviewChunks.map((chunk) =>
        limit(async () => {
          try {
            const userPrompt = `User Instructions:\n${reviewInstructions}\n\nPR Chunk:\n\n${formatChunkForPrompt(chunk)}`;

            const { content, tokensUsed } = await callLLMProvider(
              USER_INSTRUCTIONS_SYSTEM_PROMPT,
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
                .update(`userinst:${chunk.id}:${f.file}:${f.category}:${f.title}`)
                .digest("hex")
                .slice(0, 12),
              reviewerType: "user-prompt" as const,
              lineRange: f.lineRange,
              suggestion: f.suggestion,
              source: ["User Instructions"],
            }));

            return { findings, tokensUsed, failed: false };
          } catch (err) {
            logger.error("STAGE", `[${STAGE_NAME}] Chunk failed`, {
              prId: prContext.prId,
              chunkId: chunk.id,
              error: err instanceof Error ? err.message : String(err),
            });

            return { findings: [] as Finding[], tokensUsed: 0, failed: true };
          }
        })
      )
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        allFindings.push(...result.value.findings);
        totalTokens += result.value.tokensUsed;
        if (!result.value.failed) allFailed = false;
      }
    }

    logger.info("STAGE", `[${STAGE_NAME}] Complete`, {
      prId: prContext.prId,
      findingsCount: allFindings.length,
      tokensUsed: totalTokens,
    });

    return {
      stageName: STAGE_NAME,
      findings: allFindings,
      tokensUsed: totalTokens,
      failed: allFailed,
    };
  }
}
