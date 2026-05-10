import axios from "axios";
import { z } from "zod";
import prisma from "../db/prismaClient.js";
import {
  DEFAULT_OPENROUTER_MODEL,
  OPENROUTER_CHAT_COMPLETIONS_URL,
  decryptAISecret,
  getDefaultOpenRouterApiKey,
  getEffectiveOpenRouterModel,
} from "./aiSettings.js";
import { logger } from "./logger.js";

interface AIResponse {
  comment: string;
  conclusion: "success" | "failure" | "neutral";
  rating: number;
}

export interface PullRequestReviewFile {
  filename: string;
  status: string;
  patch: string;
  fullContent: string;
}

interface CodeReviewOptions {
  ownerId?: string | null;
}

interface ResolvedAISettings {
  apiKey: string | null;
  model: string;
  apiKeySource: "user" | "default";
  modelSource: "user" | "default";
}

interface OpenRouterChatResponse {
  choices?: Array<{
    message?: {
      content?: unknown;
    };
  }>;
  error?: {
    message?: string;
  };
}

const requestTimeoutMs = Number(process.env.AI_REQUEST_TIMEOUT_MS || 60000);
const maxOutputTokens = Number(process.env.AI_MAX_TOKENS || 3200);

logger.info("AI", "OpenRouter configured", {
  defaultModel: DEFAULT_OPENROUTER_MODEL,
  hasDefaultApiKey: Boolean(getDefaultOpenRouterApiKey()),
});

const reviewSchema = z.object({
  comment: z.string(),
  conclusion: z.enum(["success", "failure", "neutral"]),
  rating: z.number().min(1).max(5),
});

const openRouterReviewSchema = {
  type: "object",
  properties: {
    comment: {
      type: "string",
      description: "Markdown-formatted code review feedback for the changed code.",
    },
    conclusion: {
      type: "string",
      enum: ["success", "failure", "neutral"],
      description: "Overall review outcome. Must align with the rating.",
    },
    rating: {
      type: "number",
      minimum: 1,
      maximum: 5,
      description: "Strict quality rating from 1 to 5.",
    },
  },
  required: ["comment", "conclusion", "rating"],
  additionalProperties: false,
};

function buildReviewPrompt(diff: string, fullFile: string): string {
  return `
You are a Senior Software Engineer performing a thorough, professional code review.

## Instructions
- Review ONLY the code changes shown in the diff below.
- Use the full file content for context, but focus your feedback on what changed.
- Be specific and actionable; reference exact line numbers, variable names, and function names where possible.
- If the change is trivial (whitespace, imports, log statements), acknowledge it briefly and rate 4-5.

## Rating Criteria
- 5/5 Excellent: Clean, idiomatic code. Proper error handling, good naming, follows project patterns. No issues.
- 4/5 Good: Works correctly with minor style/convention suggestions. No functional problems.
- 3/5 Acceptable: Functions correctly but has notable code smells, missing validation, weak error handling, or lacks edge case coverage.
- 2/5 Needs Work: Has real bugs, unhandled errors, race conditions, or significant performance issues that should be fixed.
- 1/5 Critical: Contains security vulnerabilities, data loss risks, broken logic, or injection vectors. Must not be merged.

## Conclusion Criteria
- success: Code is production-ready. Rating should be 4-5.
- neutral: Code works but could be improved. Rating should be 3.
- failure: Code has problems that must be fixed. Rating should be 1-2.

Ensure your conclusion is consistent with your rating.

## Output Format
Respond with ONLY a valid JSON object. Do not include markdown fences or extra text.
{
  "comment": "Your detailed markdown-formatted review here",
  "conclusion": "neutral",
  "rating": 3
}

---

Git diff for this file:
\`\`\`diff
${diff}
\`\`\`

Full file content for reference:
\`\`\`
${fullFile}
\`\`\`
`.trim();
}

function escapeFence(value: string): string {
  return value.replace(/```/g, "``\\`");
}

function formatPullRequestFiles(files: PullRequestReviewFile[]): string {
  return files
    .map((file, index) => `
## File ${index + 1}: ${file.filename}
Status: ${file.status}

Diff:
\`\`\`diff
${escapeFence(file.patch)}
\`\`\`

Full file content:
\`\`\`
${escapeFence(file.fullContent)}
\`\`\`
`.trim())
    .join("\n\n---\n\n");
}

function buildPullRequestReviewPrompt(files: PullRequestReviewFile[]): string {
  return `
You are a Senior Software Engineer performing a single pull request code review.

## Instructions
- Review ALL changed files shown below as one pull request.
- Produce ONE GitHub pull request comment that summarizes the complete change set.
- Focus on changed code, using full file content only for context.
- Include a concise overall summary, important risks or bugs, and per-file notes only where they add value.
- Be specific and actionable; reference file paths, variable names, function names, and changed behavior where possible.
- If there are no blocking issues, say so clearly.
- Do not write separate comments per file.

## Rating Criteria
- 5/5 Excellent: Clean, idiomatic code. Proper error handling, good naming, follows project patterns. No issues.
- 4/5 Good: Works correctly with minor style/convention suggestions. No functional problems.
- 3/5 Acceptable: Functions correctly but has notable code smells, missing validation, weak error handling, or lacks edge case coverage.
- 2/5 Needs Work: Has real bugs, unhandled errors, race conditions, or significant performance issues that should be fixed.
- 1/5 Critical: Contains security vulnerabilities, data loss risks, broken logic, or injection vectors. Must not be merged.

## Conclusion Criteria
- success: The PR is production-ready. Rating should be 4-5.
- neutral: The PR works but could be improved. Rating should be 3.
- failure: The PR has problems that must be fixed. Rating should be 1-2.

Ensure your conclusion is consistent with your rating.

## Output Format
Respond with ONLY a valid JSON object. Do not include markdown fences or extra text.
{
  "comment": "Your single markdown-formatted PR review comment here",
  "conclusion": "neutral",
  "rating": 3
}

---

Changed files:

${formatPullRequestFiles(files)}
`.trim();
}

async function resolveAISettings(ownerId?: string | null): Promise<ResolvedAISettings> {
  let userApiKey: string | null = null;
  let userModel: string | null = null;

  if (ownerId) {
    const user = await prisma.user.findUnique({
      where: { id: ownerId },
      select: {
        aiApiKey: true,
        aiModel: true,
      },
    });

    if (user) {
      userModel = user.aiModel;
      try {
        userApiKey = decryptAISecret(user.aiApiKey);
      } catch (err) {
        logger.error("AI", "Failed to decrypt user AI key; falling back to default key", {
          ownerId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  return {
    apiKey: userApiKey || getDefaultOpenRouterApiKey(),
    model: getEffectiveOpenRouterModel(userModel),
    apiKeySource: userApiKey ? "user" : "default",
    modelSource: userModel?.trim() ? "user" : "default",
  };
}

function normalizeContent(content: unknown): string {
  if (typeof content === "string") return content;

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) {
          return String((part as { text?: unknown }).text ?? "");
        }
        return "";
      })
      .join("");
  }

  return content == null ? "" : JSON.stringify(content);
}

function hasAggregateErrors(err: unknown): err is { errors: unknown[] } {
  return Boolean(
    err &&
    typeof err === "object" &&
    "errors" in err &&
    Array.isArray((err as { errors?: unknown }).errors)
  );
}

function formatOpenRouterError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    const data = err.response?.data as { error?: { message?: string }; message?: string } | undefined;
    const cause = err.cause as { message?: string; errors?: Array<{ message?: string }> } | undefined;
    const causeMessage = cause?.message || cause?.errors?.map((item) => item.message).filter(Boolean).join("; ");
    const message = data?.error?.message || data?.message || err.message || causeMessage || err.code || "Unknown request error";
    return status ? `OpenRouter request failed (${status}): ${message}` : message;
  }

  if (hasAggregateErrors(err)) {
    return err.errors.map((item) => item instanceof Error ? item.message : String(item)).join("; ");
  }

  return err instanceof Error ? err.message : String(err);
}

async function callOpenRouter(prompt: string, settings: ResolvedAISettings): Promise<string> {
  if (!settings.apiKey) {
    throw new Error("No OpenRouter API key configured. Set OPENROUTER_API_KEY or add a custom key in settings.");
  }

  const response = await axios.post<OpenRouterChatResponse>(
    OPENROUTER_CHAT_COMPLETIONS_URL,
    {
      model: settings.model,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "code_review",
          strict: true,
          schema: openRouterReviewSchema,
        },
      },
      temperature: 0.2,
      max_tokens: Number.isFinite(maxOutputTokens) ? maxOutputTokens : 3200,
    },
    {
      timeout: Number.isFinite(requestTimeoutMs) ? requestTimeoutMs : 60000,
      headers: {
        Authorization: `Bearer ${settings.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.FRONTEND_URL || "https://review-hog.vercel.app",
        "X-OpenRouter-Title": "ReviewHog",
      },
    }
  );

  if (response.data.error?.message) {
    throw new Error(`OpenRouter error: ${response.data.error.message}`);
  }

  return normalizeContent(response.data.choices?.[0]?.message?.content);
}

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractJSON(raw: string): string {
  const fenceMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) return fenceMatch[1].trim();

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) return jsonMatch[0].trim();

  return raw.trim();
}

function parseAIResponse(rawContent: string, filename: string): AIResponse {
  const jsonStr = extractJSON(rawContent);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (parseErr) {
    logger.error("AI", "JSON parse failed", {
      filename,
      rawLength: rawContent.length,
      rawPreview: rawContent.slice(0, 300),
      error: parseErr instanceof Error ? parseErr.message : String(parseErr),
    });
    throw new Error(`JSON parse failed: ${parseErr instanceof Error ? parseErr.message : parseErr}`);
  }

  const validated = reviewSchema.safeParse(parsed);
  if (!validated.success) {
    logger.error("AI", "Schema validation failed", {
      filename,
      parsed,
      zodErrors: validated.error.issues,
    });
    throw new Error(`Schema validation failed: ${validated.error.issues.map((i) => i.message).join(", ")}`);
  }

  return {
    ...validated.data,
    rating: Math.max(1, Math.min(5, Math.round(validated.data.rating))),
  };
}

async function runReviewPrompt({
  reviewPrompt,
  logTarget,
  inputLength,
  options,
  fallbackComment,
}: {
  reviewPrompt: string;
  logTarget: string;
  inputLength: number;
  options: CodeReviewOptions;
  fallbackComment: (error: string) => string;
}): Promise<AIResponse> {
  let lastError: unknown;
  const settings = await resolveAISettings(options.ownerId);

  logger.info("AI", `Starting review for ${logTarget}`, {
    inputLength,
    model: settings.model,
    apiKeySource: settings.apiKeySource,
    modelSource: settings.modelSource,
  });

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      logger.debug("AI", `Attempt ${attempt + 1}/${MAX_RETRIES}`, { target: logTarget });

      const rawContent = await callOpenRouter(reviewPrompt, settings);

      if (!rawContent || rawContent.trim().length === 0) {
        logger.warn("AI", "Empty response from model", { target: logTarget, attempt: attempt + 1 });
        throw new Error("Empty response from model");
      }

      logger.debug("AI", "Raw response received", {
        target: logTarget,
        contentLength: rawContent.length,
        preview: rawContent.slice(0, 200),
      });

      const result = parseAIResponse(rawContent, logTarget);

      logger.info("AI", `Review complete for ${logTarget}`, {
        rating: result.rating,
        conclusion: result.conclusion,
        commentLength: result.comment.length,
      });

      return result;
    } catch (err) {
      lastError = err;
      const errMsg = formatOpenRouterError(err);
      logger.error("AI", `Attempt ${attempt + 1}/${MAX_RETRIES} failed`, {
        target: logTarget,
        error: errMsg,
        stack: err instanceof Error ? err.stack?.split("\n").slice(0, 3).join(" | ") : undefined,
      });

      if (attempt < MAX_RETRIES - 1) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        logger.info("AI", `Retrying in ${delay}ms...`, { target: logTarget });
        await sleep(delay);
      }
    }
  }

  const finalErr = lastError ? formatOpenRouterError(lastError) : "Unknown error";
  logger.error("AI", "All retry attempts exhausted", { target: logTarget, lastError: finalErr });
  return {
    comment: fallbackComment(finalErr),
    conclusion: "neutral",
    rating: 3,
  };
}

export async function safeRunCodeReview(
  diff: string,
  fullFile: string,
  options: CodeReviewOptions = {}
): Promise<AIResponse> {
  const filenameMatch = fullFile.match(/File Path:\s*(.+)/);
  const filename = filenameMatch ? filenameMatch[1].trim() : "unknown";
  const reviewPrompt = buildReviewPrompt(diff, fullFile);

  return runReviewPrompt({
    reviewPrompt,
    logTarget: filename,
    inputLength: diff.length,
    options,
    fallbackComment: (error) =>
      `ReviewHog could not generate an AI review for this file.\n\nPlease review this file manually.\n\n**Error:** ${error}`,
  });
}

export async function safeRunPullRequestReview(
  files: PullRequestReviewFile[],
  options: CodeReviewOptions = {}
): Promise<AIResponse> {
  const reviewPrompt = buildPullRequestReviewPrompt(files);
  const inputLength = files.reduce(
    (total, file) => total + file.patch.length + file.fullContent.length,
    0
  );

  return runReviewPrompt({
    reviewPrompt,
    logTarget: `pull request (${files.length} files)`,
    inputLength,
    options,
    fallbackComment: (error) =>
      `ReviewHog could not generate a complete AI summary for this pull request.\n\nPlease review the changes manually before merging.\n\n**Error:** ${error}`,
  });
}
