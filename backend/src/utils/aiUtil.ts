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
  apiKey: process.env.GEMINI_API_KEY!,
});

const reviewSchema = z.object({
  comment: z.string().describe("Detailed feedback about this specific file"),
  conclusion: z.enum(["success", "failure", "neutral"]).describe("Code review conclusion"),
  rating: z.number().describe("Rating from 1 to 5"),
});

const structuredModel = model.withStructuredOutput(reviewSchema);

const prompt = ChatPromptTemplate.fromTemplate(`
You are a Senior Software Engineer performing a professional code review **only for the file shown below**.

Review strictly the code in this file. 
Ignore any unrelated context or previously seen code from other languages or files.

If the change is trivial (like adding print/log statements), just respond briefly and objectively.

Here is the Git diff for this file:
{diff}

Here is the full file content for reference:
{full_file}
`);

const chain = prompt.pipe(structuredModel);

export async function safeRunCodeReview(diff: string, full_file: string): Promise<AIResponse> {
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

    const rating =
      typeof response?.rating === "number"
        ? response.rating
        : Number(response?.rating) || 2;

    return { comment, conclusion, rating };
  } catch (err) {
    console.error("❌ AI invocation failed:", err);
    return { comment: "AI review failed.", conclusion: "neutral", rating: 2 };
  }
}
