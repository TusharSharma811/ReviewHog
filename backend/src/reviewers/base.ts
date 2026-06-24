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
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 3000;
const RATE_LIMIT_DELAY_MS = 15000; // Extra wait on 429

// ─── AI Settings Resolution ────────────────────────────────────────────────

interface ResolvedSettings {
  apiKey: string | null;
  model: string;
  apiBaseUrl: string; // Provider-specific API endpoint
  temperature: number; // LLM temperature (0.0-1.0)
}

// ─── Provider API URLs ──────────────────────────────────────────────────────

const PROVIDER_URLS: Record<string, string> = {
  openrouter: "https://openrouter.ai/api/v1/chat/completions",
  openai: "https://api.openai.com/v1/chat/completions",
  anthropic: "https://api.anthropic.com/v1/messages",
  google: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
  default: "https://openrouter.ai/api/v1/chat/completions",
};



async function resolveSettings(
  ownerId: string,
  repoTemperature?: number
): Promise<ResolvedSettings> {
  const user = await prisma.user.findUnique({
    where: { id: ownerId },
    select: { aiApiKey: true, aiModel: true, aiProvider: true, aiBaseUrl: true },
  });

  let apiKey: string | null = null;
  if (user?.aiApiKey) {
    try {
      apiKey = decryptAISecret(user.aiApiKey);
    } catch {
      // Fall back to default
    }
  }

  // Priority: user's saved model → system default
  let model: string;
  if (user?.aiModel?.trim()) {
    model = getEffectiveOpenRouterModel(user.aiModel);
  } else {
    model = getEffectiveOpenRouterModel(null);
  }

  // Resolve API base URL: user custom URL → provider default → OpenRouter
  const provider = user?.aiProvider || "default";
  const apiBaseUrl = user?.aiBaseUrl?.trim() || PROVIDER_URLS[provider] || PROVIDER_URLS.default;

  return {
    apiKey: apiKey || getDefaultOpenRouterApiKey(),
    model,
    apiBaseUrl,
    temperature: repoTemperature ?? 0.1,
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

interface JsonSchemaResponseFormat {
  type: "json_schema";
  json_schema: {
    name: string;
    strict: boolean;
    schema: unknown;
  };
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

async function callLLMProvider(
  systemPrompt: string,
  userPrompt: string,
  settings: ResolvedSettings,
  responseFormat: JsonSchemaResponseFormat = REVIEWER_RESPONSE_FORMAT
): Promise<{ content: string; tokensUsed: number }> {
  if (!settings.apiKey) {
    throw new Error("No API key configured");
  }

  let lastError: unknown;
  let totalTokensUsed = 0;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const result = await callLLMProviderOnce(systemPrompt, userPrompt, settings, responseFormat);
      totalTokensUsed += result.tokensUsed;
      return { content: result.content, tokensUsed: totalTokensUsed };
    } catch (err) {
      lastError = err;
      totalTokensUsed += 0;
      const errMsg = err instanceof Error ? err.message : String(err);
      const is429 = errMsg.includes("429") || errMsg.toLowerCase().includes("rate");

      logger.warn("LLM", `Attempt ${attempt + 1}/${MAX_RETRIES} failed`, {
        error: errMsg,
        rateLimited: is429,
      });

      if (attempt < MAX_RETRIES - 1) {
        const delay = is429
          ? RATE_LIMIT_DELAY_MS * (attempt + 1)
          : BASE_DELAY_MS * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError ?? new Error("All LLM retries exhausted");
}

/** Single LLM call without retries */
async function callLLMProviderOnce(
  systemPrompt: string,
  userPrompt: string,
  settings: ResolvedSettings,
  responseFormat: JsonSchemaResponseFormat
): Promise<{ content: string; tokensUsed: number }> {
  const isAnthropic = settings.apiBaseUrl.includes("anthropic.com");
  const schemaContract =
    "Return ONLY valid JSON matching this JSON schema. Do not wrap it in markdown.\n" +
    JSON.stringify(responseFormat.json_schema.schema);

  if (isAnthropic) {
    const response = await axios.post(
      settings.apiBaseUrl,
      {
        model: settings.model,
        system: `${systemPrompt}\n\n${schemaContract}`,
        messages: [{ role: "user", content: userPrompt }],
        max_tokens: MAX_OUTPUT_TOKENS,
        temperature: settings.temperature,
      },
      {
        timeout: REQUEST_TIMEOUT_MS,
        headers: {
          "x-api-key": settings.apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
      }
    );

    const data = response.data as {
      content?: Array<{ type: string; text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
      error?: { message?: string };
    };

    if (data.error?.message) {
      throw new Error(`Anthropic: ${data.error.message}`);
    }

    const text = data.content
      ?.filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("") ?? "";
    const tokensUsed = (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0);

    return { content: text, tokensUsed };
  }

  // OpenAI-compatible format (OpenRouter, OpenAI, Google AI)
  const headers: Record<string, string> = {
    Authorization: `Bearer ${settings.apiKey}`,
    "Content-Type": "application/json",
  };

  if (settings.apiBaseUrl.includes("openrouter.ai")) {
    headers["HTTP-Referer"] = process.env.FRONTEND_URL || "https://review-hog.vercel.app";
    headers["X-OpenRouter-Title"] = "ReviewHog-v3";
  }

  const response = await axios.post<OpenRouterResponse>(
    settings.apiBaseUrl,
    {
      model: settings.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: responseFormat,
      temperature: settings.temperature,
      max_tokens: MAX_OUTPUT_TOKENS,
    },
    { timeout: REQUEST_TIMEOUT_MS, headers }
  );

  if (response.data.error?.message) {
    throw new Error(`API Error: ${response.data.error.message}`);
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
      source: f.source ?? [],
    })),
    noIssues: validated.noIssues,
  };
}

// ─── Public: Resolve Settings (call once per pipeline run) ──────────────────

export { resolveSettings, callLLMProvider, parseReviewerOutput, extractJSON, normalizeContent, formatChunkForPrompt };
export type { ResolvedSettings };
