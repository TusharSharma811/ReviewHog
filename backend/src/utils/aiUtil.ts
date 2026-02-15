import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";

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

const prompt = ChatPromptTemplate.fromTemplate(`
You are a Senior Software Engineer performing a professional code review **only for the file shown below**.

Review strictly the code in this file. 
Ignore any unrelated context or previously seen code from other languages or files.

If the change is trivial (like adding print/log statements), just respond briefly and objectively.

You must respond ONLY in valid JSON with the following fields:
{{
  "comment": "Detailed feedback about this specific file",
  "conclusion": "success" | "failure" | "neutral",
  "rating": 1–5
}}

Here is the Git diff for this file:
{diff}

Here is the full file content for reference:
{full_file}
`);

const chain = prompt.pipe(model);

export async function safeRunCodeReview(diff: string, full_file: string): Promise<AIResponse> {
  try {
    const response = await chain.invoke({ diff, full_file });

    let rawOutput = "";
    if (typeof response.content === "string") {
      rawOutput = response.content;
    } else if (Array.isArray(response.content)) {
      rawOutput = response.content
        .map((p: any) => (typeof p?.text === "string" ? p.text : ""))
        .join("\n");
    } else if ((response as any)?.text) {
      rawOutput = (response as any).text;
    }

    const clean = rawOutput.replace(/```json|```/gi, "").trim();
    const parsed = JSON.parse(clean);

    const comment =
      typeof parsed.comment === "string"
        ? parsed.comment
        : "AI did not provide a comment.";

    const conclusion =
      ["success", "failure", "neutral"].includes(parsed.conclusion)
        ? parsed.conclusion
        : "neutral";

    const rating =
      typeof parsed.rating === "number"
        ? parsed.rating
        : Number(parsed.rating) || 2;

    return { comment, conclusion, rating };
  } catch (err) {
    console.error("❌ AI invocation failed:", err);
    return { comment: "AI review failed.", conclusion: "neutral", rating: 2 };
  }
}
