/**
 * V3 Pipeline — Stage 2: Repository Standards Review
 *
 * For each enabled RepoStandard, runs a separate LLM call in parallel
 * (respecting concurrency cap). Each finding is tagged with the
 * standard name in its source array.
 *
 * This stage is skipped if no repo standards are configured.
 */

import crypto from "crypto";
import pLimit from "p-limit";
import type { ReviewStage, ReviewContext, StageResult } from "./types.js";
import type { Finding } from "../types.js";
import { callLLMProvider, extractJSON } from "../../reviewers/base.js";
import { reviewerOutputSchema } from "../../prompts/schemas.js";
import { logger } from "../../utils/logger.js";

const STAGE_NAME = "Standards Review";
const STANDARDS_CONCURRENCY = Number(process.env.STANDARDS_CONCURRENCY || 3);

function buildStandardPrompt(standardName: string, standardPrompt: string): string {
  return `You are a code reviewer enforcing specific repository standards.

Repository Standard: ${standardName}

Instructions:
${standardPrompt}

Review the following code changes according to ONLY these instructions.
Do not report issues outside the scope of these instructions.

## CONFIDENCE GUIDELINES:
- 0.9-1.0: Clear violation of the standard with obvious fix.
- 0.7-0.8: Very likely a violation.
- 0.5-0.6: Probable violation worth flagging.
- Below 0.5: Do NOT report it.

If the code fully complies with these standards, set noIssues: true.`;
}

export class StandardsReviewStage implements ReviewStage {
  name = STAGE_NAME;

  async execute(context: ReviewContext): Promise<StageResult> {
    const { prContext, diff, repoStandards, aiSettings } = context;

    const enabledStandards = repoStandards.filter((s) => s.isEnabled);

    if (enabledStandards.length === 0) {
      logger.info("STAGE", `[${STAGE_NAME}] No standards configured, skipping`, {
        prId: prContext.prId,
      });

      return {
        stageName: STAGE_NAME,
        findings: [],
        tokensUsed: 0,
        failed: false,
        metadata: { standardsTriggered: [] },
      };
    }

    logger.info("STAGE", `[${STAGE_NAME}] Running ${enabledStandards.length} standard(s)`, {
      prId: prContext.prId,
      standards: enabledStandards.map((s) => s.name),
    });

    const limit = pLimit(STANDARDS_CONCURRENCY);
    const allFindings: Finding[] = [];
    let totalTokens = 0;
    const standardsTriggered: string[] = [];
    let allFailed = true;

    const results = await Promise.allSettled(
      enabledStandards.map((standard) =>
        limit(async () => {
          const systemPrompt = buildStandardPrompt(standard.name, standard.prompt);
          const userPrompt = `PR Diff:\n\n${diff}`;

          try {
            const { content, tokensUsed } = await callLLMProvider(
              systemPrompt,
              userPrompt,
              aiSettings
            );

            if (!content.trim()) {
              throw new Error("Empty response from model");
            }

            const jsonStr = extractJSON(content);
            const parsed = JSON.parse(jsonStr);
            const validated = reviewerOutputSchema.parse(parsed);

            const sourceName = `Standard: ${standard.name}`;

            const findings: Finding[] = validated.findings.map((f) => ({
              ...f,
              id: crypto
                .createHash("md5")
                .update(`std:${standard.name}:${f.file}:${f.category}:${f.title}`)
                .digest("hex")
                .slice(0, 12),
              reviewerType: "standard" as const,
              lineRange: f.lineRange,
              suggestion: f.suggestion,
              source: [sourceName],
            }));

            return { findings, tokensUsed, standardName: standard.name, failed: false };
          } catch (err) {
            logger.error("STAGE", `[${STAGE_NAME}] Standard "${standard.name}" failed`, {
              prId: prContext.prId,
              error: err instanceof Error ? err.message : String(err),
            });

            return { findings: [] as Finding[], tokensUsed: 0, standardName: standard.name, failed: true };
          }
        })
      )
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        allFindings.push(...result.value.findings);
        totalTokens += result.value.tokensUsed;

        if (result.value.findings.length > 0) {
          standardsTriggered.push(result.value.standardName);
        }

        if (!result.value.failed) {
          allFailed = false;
        }
      }
    }

    logger.info("STAGE", `[${STAGE_NAME}] Complete`, {
      prId: prContext.prId,
      totalFindings: allFindings.length,
      standardsTriggered,
      totalTokens,
    });

    return {
      stageName: STAGE_NAME,
      findings: allFindings,
      tokensUsed: totalTokens,
      failed: enabledStandards.length > 0 && allFailed,
      metadata: { standardsTriggered },
    };
  }
}
