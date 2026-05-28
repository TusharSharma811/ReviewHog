/**
 * V2 Pipeline — Base Reviewer
 *
 * Shared logic for all specialized reviewers: prompt building,
 * OpenRouter API call, response parsing, and finding hydration.
 */

import axios from "axios";
import crypto from "crypto";
import type {
  ReviewChunk,
  PRContext,
  Finding,
  ReviewerType,
  ReviewerOutput,
} from "../pipeline/types.js";
import { reviewerOutputSchema } from "../prompts/schemas.js";
import { REVIEWER_RESPONSE_FORMAT } from "../prompts/schemas.js";
import {
  OPENROUTER_CHAT_COMPLETIONS_URL,
  getDefaultOpenRouterApiKey,
  getEffectiveOpenRouterModel,
  decryptAISecret,
} from "../utils/aiSettings.js";
import prisma from "../db/prismaClient.js";
import { logger } from "../utils/logger.js";

const REQUEST_TIMEOUT_MS = Number(process.env.AI_REQUEST_TIMEOUT_MS || 90000);
const MAX_OUTPUT_TOKENS = Number(process.env.AI_MAX_TOKENS || 8000);
const MAX_RETRIES = 2;
const BASE_DELAY_MS = 2000;

// ─── AI Settings Resolution ────────────────────────────────────────────────

interface ResolvedSettings {
  apiKey: string | null;
  model: string;
}

// ─── Model Routing ──────────────────────────────────────────────────────────

/**
 * Routes to different models based on risk tier and reviewer type.
 * All tiers default to FREE models. Override via env vars if you have a paid key.
 * User's saved model OR system default always take priority over tiered routing.
 */
const MODEL_TIERS = {
  premium: process.env.AI_MODEL_PREMIUM || "deepseek/deepseek-r1-0528:free",
  standard: process.env.AI_MODEL_STANDARD || "deepseek/deepseek-r1-0528:free",
  economy: process.env.AI_MODEL_ECONOMY || "deepseek/deepseek-r1-0528:free",
};

function selectModelForChunk(
  riskTier: import("../pipeline/types.js").RiskTier,
  reviewerType: import("../pipeline/types.js").ReviewerType
): string {
  // Security reviewer gets the most capable free model
  if (reviewerType === "security") return MODEL_TIERS.premium;

  // Route by risk
  switch (riskTier) {
    case "critical":
      return MODEL_TIERS.premium;
    case "high":
    case "medium":
      return MODEL_TIERS.standard;
    case "low":
      return MODEL_TIERS.economy;
    default:
      return MODEL_TIERS.standard;
  }
}

async function resolveSettings(
  ownerId: string,
  riskTier?: import("../pipeline/types.js").RiskTier,
  reviewerType?: import("../pipeline/types.js").ReviewerType
): Promise<ResolvedSettings> {
  const user = await prisma.user.findUnique({
    where: { id: ownerId },
    select: { aiApiKey: true, aiModel: true },
  });

  let apiKey: string | null = null;
  if (user?.aiApiKey) {
    try {
      apiKey = decryptAISecret(user.aiApiKey);
    } catch {
      // Fall back to default
    }
  }

  // Priority: user's saved model → system default → tiered routing
  let model: string;
  if (user?.aiModel?.trim()) {
    // User explicitly saved a model in settings
    model = getEffectiveOpenRouterModel(user.aiModel);
  } else {
    // Use the system default (env var or hardcoded nvidia)
    // This ensures the model shown in the UI is actually what runs
    model = getEffectiveOpenRouterModel(null);
  }

  return {
    apiKey: apiKey || getDefaultOpenRouterApiKey(),
    model,
  };
}

// ─── Prompt Building ────────────────────────────────────────────────────────

function formatChunkForPrompt(chunk: ReviewChunk): string {
  return chunk.files
    .map(
      (file, i) => `
## File ${i + 1}: ${file.filename}
Language: ${file.language} | Status: ${file.status} | Risk: ${file.riskTier}

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

// ─── API Call ───────────────────────────────────────────────────────────────

interface OpenRouterResponse {
  choices?: Array<{ message?: { content?: unknown } }>;
  error?: { message?: string };
  usage?: { total_tokens?: number };
}

function normalizeContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((p) => {
        if (typeof p === "string") return p;
        if (p && typeof p === "object" && "text" in p) return String(p.text ?? "");
        return "";
      })
      .join("");
  }
  return content == null ? "" : JSON.stringify(content);
}

async function callOpenRouter(
  systemPrompt: string,
  userPrompt: string,
  settings: ResolvedSettings
): Promise<{ content: string; tokensUsed: number }> {
  if (!settings.apiKey) {
    throw new Error("No OpenRouter API key configured");
  }

  const response = await axios.post<OpenRouterResponse>(
    OPENROUTER_CHAT_COMPLETIONS_URL,
    {
      model: settings.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: REVIEWER_RESPONSE_FORMAT,
      temperature: 0.1,
      max_tokens: MAX_OUTPUT_TOKENS,
    },
    {
      timeout: REQUEST_TIMEOUT_MS,
      headers: {
        Authorization: `Bearer ${settings.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.FRONTEND_URL || "https://review-hog.vercel.app",
        "X-OpenRouter-Title": "ReviewHog-v2",
      },
    }
  );

  if (response.data.error?.message) {
    throw new Error(`OpenRouter: ${response.data.error.message}`);
  }

  const content = normalizeContent(response.data.choices?.[0]?.message?.content);
  const tokensUsed = response.data.usage?.total_tokens ?? 0;

  return { content, tokensUsed };
}

// ─── Response Parsing ───────────────────────────────────────────────────────

function extractJSON(raw: string): string {
  const fenceMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) return fenceMatch[1].trim();

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) return jsonMatch[0].trim();

  return raw.trim();
}

function parseReviewerOutput(raw: string, reviewerType: ReviewerType): ReviewerOutput {
  const jsonStr = extractJSON(raw);
  const parsed = JSON.parse(jsonStr);
  const validated = reviewerOutputSchema.parse(parsed);

  return {
    findings: validated.findings.map((f) => ({
      ...f,
      id: crypto
        .createHash("md5")
        .update(`${f.file}:${f.category}:${f.title}`)
        .digest("hex")
        .slice(0, 12),
      reviewerType,
      lineRange: f.lineRange,
      suggestion: f.suggestion,
    })),
    noIssues: validated.noIssues,
  };
}

// ─── Public: Resolve Settings (call once per pipeline run) ──────────────────

export { resolveSettings };
export type { ResolvedSettings };

// ─── Public: Run a Reviewer ─────────────────────────────────────────────────

export interface RunReviewerOptions {
  reviewerType: ReviewerType;
  systemPrompt: string;
  chunk: ReviewChunk;
  ctx: PRContext;
  /** P1: Pre-resolved settings to avoid N+1 DB queries */
  preResolvedSettings?: ResolvedSettings;
}

export interface ReviewerResult {
  findings: Finding[];
  tokensUsed: number;
}

export async function runReviewer(
  options: RunReviewerOptions
): Promise<ReviewerResult> {
  const { reviewerType, systemPrompt, chunk, ctx, preResolvedSettings } = options;

  // P1: Use pre-resolved settings if available, otherwise resolve per-call (backward compat)
  const settings = preResolvedSettings
    ? {
        ...preResolvedSettings,
        model: preResolvedSettings.model || selectModelForChunk(chunk.maxRiskTier, reviewerType),
      }
    : await resolveSettings(ctx.ownerId, chunk.maxRiskTier, reviewerType);

  const userPrompt = formatChunkForPrompt(chunk);

  let lastError: unknown;
  let totalTokensUsed = 0;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      logger.debug("REVIEWER", `[${reviewerType}] Attempt ${attempt + 1}`, {
        chunkId: chunk.id,
        prId: ctx.prId,
      });

      const { content, tokensUsed } = await callOpenRouter(systemPrompt, userPrompt, settings);
      totalTokensUsed += tokensUsed;

      if (!content.trim()) {
        throw new Error("Empty response from model");
      }

      const output = parseReviewerOutput(content, reviewerType);

      // C5: Validate consistency between noIssues flag and findings array
      if (output.noIssues && output.findings.length > 0) {
        logger.warn("REVIEWER", `[${reviewerType}] Inconsistency: noIssues=true but ${output.findings.length} findings returned`, {
          chunkId: chunk.id,
          prId: ctx.prId,
          findingsCount: output.findings.length,
        });
        // Trust the findings over the flag — the LLM contradicted itself
      }

      logger.info("REVIEWER", `[${reviewerType}] Complete`, {
        chunkId: chunk.id,
        prId: ctx.prId,
        findingsCount: output.findings.length,
        noIssues: output.noIssues,
        tokensUsed,
      });

      return { findings: output.findings, tokensUsed: totalTokensUsed };
    } catch (err) {
      lastError = err;
      logger.error("REVIEWER", `[${reviewerType}] Attempt ${attempt + 1} failed`, {
        chunkId: chunk.id,
        error: err instanceof Error ? err.message : String(err),
      });

      if (attempt < MAX_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, BASE_DELAY_MS * Math.pow(2, attempt)));
      }
    }
  }

  logger.error("REVIEWER", `[${reviewerType}] All retries exhausted`, {
    chunkId: chunk.id,
    prId: ctx.prId,
    lastError: lastError instanceof Error ? lastError.message : String(lastError),
  });

  // Graceful degradation: return empty findings, don't crash the pipeline
  return { findings: [], tokensUsed: totalTokensUsed };
}
