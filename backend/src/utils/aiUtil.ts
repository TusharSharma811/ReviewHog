import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";
import { logger } from "./logger.js";

interface AIResponse {
  comment: string;
  conclusion: "success" | "failure" | "neutral";
  rating: number;
}

// ─── Validate API key at startup ────────────────────────────────────────────
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

if (!apiKey) {
  logger.error("AI", "No Gemini API key found. Set GEMINI_API_KEY or GOOGLE_API_KEY in .env");
} else {
  logger.info("AI", "Gemini API key loaded", { keyPrefix: apiKey.slice(0, 6) + "..." });
}

const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash-preview-05-20",
  temperature: 0.7,
  apiKey: apiKey || "missing-key",
});

// ─── Response validation schema ─────────────────────────────────────────────
const reviewSchema = z.object({
  comment: z.string(),
  conclusion: z.enum(["success", "failure", "neutral"]),
  rating: z.number().min(1).max(5),
});

// ─── Prompt (asks for JSON directly instead of using tool-calling) ──────────
const prompt = ChatPromptTemplate.fromTemplate(`
You are a Senior Software Engineer performing a thorough, professional code review.

## Instructions
- Review ONLY the code changes shown in the diff below.
- Use the full file content for context, but focus your feedback on what changed.
- Be specific and actionable — reference exact line numbers, variable names, and function names.
- If the change is trivial (whitespace, imports, log statements), acknowledge it briefly and rate 4-5.

## Rating Criteria (be strict and consistent)
- **5/5 — Excellent**: Clean, idiomatic code. Proper error handling, good naming, follows project patterns. No issues.
- **4/5 — Good**: Works correctly with minor style/convention suggestions. No functional problems.
- **3/5 — Acceptable**: Functions correctly but has notable code smells, missing validation, weak error handling, or lacks edge case coverage.
- **2/5 — Needs Work**: Has real bugs, unhandled errors, race conditions, or significant performance issues that should be fixed.
- **1/5 — Critical**: Contains security vulnerabilities, data loss risks, broken logic, or injection vectors. Must not be merged.

## Conclusion Criteria
- **success**: Code is production-ready. Rating should be 4-5.
- **neutral**: Code works but could be improved. Rating should be 3.
- **failure**: Code has problems that must be fixed. Rating should be 1-2.

Ensure your conclusion is consistent with your rating.

## Output Format
You MUST respond with ONLY a valid JSON object (no markdown fences, no extra text) in this exact format:
{{
  "comment": "Your detailed markdown-formatted review here",
  "conclusion": "success" | "failure" | "neutral",
  "rating": 1-5
}}

---

**Git diff for this file:**
\`\`\`diff
{diff}
\`\`\`

**Full file content for reference:**
\`\`\`
{full_file}
\`\`\`
`);

const chain = prompt.pipe(model);

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Extract JSON from a model response that might contain markdown fences or extra text.
 */
function extractJSON(raw: string): string {
  // Try to extract from markdown code fences
  const fenceMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) return fenceMatch[1].trim();

  // Try to find a JSON object directly
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) return jsonMatch[0].trim();

  return raw.trim();
}

/**
 * Parse the raw model output into a validated AIResponse.
 */
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
    throw new Error(`Schema validation failed: ${validated.error.issues.map(i => i.message).join(", ")}`);
  }

  // Clamp rating to 1-5
  validated.data.rating = Math.max(1, Math.min(5, Math.round(validated.data.rating)));

  return validated.data;
}

export async function safeRunCodeReview(diff: string, full_file: string): Promise<AIResponse> {
  let lastError: unknown;

  // Extract filename from the full_file header for logging
  const filenameMatch = full_file.match(/File Path:\s*(.+)/);
  const filename = filenameMatch ? filenameMatch[1].trim() : "unknown";

  logger.info("AI", `Starting review for ${filename}`, { diffLength: diff.length });

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      logger.debug("AI", `Attempt ${attempt + 1}/${MAX_RETRIES}`, { filename });

      const response = await chain.invoke({ diff, full_file });

      // Extract text content from the response
      const rawContent =
        typeof response.content === "string"
          ? response.content
          : Array.isArray(response.content)
            ? response.content.map((c: any) => (typeof c === "string" ? c : c.text || "")).join("")
            : JSON.stringify(response.content);

      if (!rawContent || rawContent.trim().length === 0) {
        logger.warn("AI", "Empty response from model", { filename, attempt: attempt + 1 });
        throw new Error("Empty response from model");
      }

      logger.debug("AI", "Raw response received", {
        filename,
        contentLength: rawContent.length,
        preview: rawContent.slice(0, 200),
      });

      const result = parseAIResponse(rawContent, filename);

      logger.info("AI", `Review complete for ${filename}`, {
        rating: result.rating,
        conclusion: result.conclusion,
        commentLength: result.comment.length,
      });

      return result;
    } catch (err) {
      lastError = err;
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.error("AI", `Attempt ${attempt + 1}/${MAX_RETRIES} failed`, {
        filename,
        error: errMsg,
        stack: err instanceof Error ? err.stack?.split("\n").slice(0, 3).join(" | ") : undefined,
      });

      if (attempt < MAX_RETRIES - 1) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        logger.info("AI", `Retrying in ${delay}ms...`, { filename });
        await sleep(delay);
      }
    }
  }

  const finalErr = lastError instanceof Error ? lastError.message : String(lastError);
  logger.error("AI", "All retry attempts exhausted", { filename, lastError: finalErr });
  return {
    comment: `⚠️ AI review could not be completed for this file.\n\n**Error:** ${finalErr}\n\nPlease review this file manually.`,
    conclusion: "neutral",
    rating: 3,
  };
}
