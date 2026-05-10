import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";

interface AIResponse {
  comment: string;
  conclusion: "success" | "failure" | "neutral";
  rating: number;
}

const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  temperature: 0.7,
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY!,
});

const reviewSchema = z.object({
  comment: z.string().describe("Detailed, actionable feedback about this specific file. Use markdown formatting."),
  conclusion: z.enum(["success", "failure", "neutral"]).describe(
    "success = code is production-ready with no significant issues. " +
    "failure = code has bugs, security vulnerabilities, or critical problems that MUST be fixed before merging. " +
    "neutral = code works but has non-blocking suggestions for improvement."
  ),
  rating: z.number().min(1).max(5).describe(
    "Code quality rating on a strict 1-5 scale. " +
    "1 = Critical issues (security vulnerabilities, data loss risks, broken logic). " +
    "2 = Major issues (unhandled errors, race conditions, significant performance problems). " +
    "3 = Moderate issues (missing validation, poor error handling, code smells, no edge case handling). " +
    "4 = Minor issues (naming conventions, missing comments, minor style issues, small optimizations possible). " +
    "5 = Excellent (clean, well-structured, follows best practices, no issues found)."
  ),
});

const structuredModel = model.withStructuredOutput(reviewSchema);

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

const chain = prompt.pipe(structuredModel);

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return (
      msg.includes("429") ||
      msg.includes("rate limit") ||
      msg.includes("500") ||
      msg.includes("503") ||
      msg.includes("timeout") ||
      msg.includes("econnreset") ||
      msg.includes("resource exhausted") ||
      msg.includes("tool call") ||
      msg.includes("no parseable") ||
      msg.includes("failed") ||
      msg.includes("unavailable")
    );
  }
  return false;
}

export async function safeRunCodeReview(diff: string, full_file: string): Promise<AIResponse> {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await chain.invoke({ diff, full_file });

      const comment =
        typeof response?.comment === "string"
          ? response.comment
          : "AI did not provide a comment.";

      const conclusion =
        ["success", "failure", "neutral"].includes(response?.conclusion || "")
          ? response.conclusion as "success" | "failure" | "neutral"
          : "neutral";

      const rawRating =
        typeof response?.rating === "number"
          ? response.rating
          : Number(response?.rating) || 3;

      // Clamp rating to 1-5 range
      const rating = Math.max(1, Math.min(5, Math.round(rawRating)));

      return { comment, conclusion, rating };
    } catch (err) {
      lastError = err;
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`❌ AI invocation failed (attempt ${attempt + 1}/${MAX_RETRIES}): ${errMsg}`);

      if (attempt < MAX_RETRIES - 1 && isRetryableError(err)) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        console.log(`⏳ Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  console.error("❌ All AI retry attempts exhausted:", lastError);
  return { comment: "AI review failed after multiple attempts.", conclusion: "neutral", rating: 3 };
}
