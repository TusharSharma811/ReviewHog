import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "langchain/output_parsers";
import dotenv from "dotenv";

dotenv.config();

interface AIResponse {
  comment: string;
  conclusion: "success" | "failure" | "neutral";
  rating : number;
}

const parser = StructuredOutputParser.fromNamesAndDescriptions({
  comment: "Code review comment with suggestions",
  conclusion: "Either 'success' or 'failure'",
  rating:"Between 1 to 5 based on quality of code or review and this must be a number"
});


const formatInstructions = parser.getFormatInstructions();

const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-pro",
  temperature: 0.7,
  apiKey: process.env.GEMINI_API_KEY
});


const prompt = ChatPromptTemplate.fromTemplate(`
You are a Senior Software Engineer performing a professional code review.

⚠️ Important: Always respond **ONLY in valid JSON** following these instructions exactly:
${formatInstructions}

Here is the code diff:
{diff}

Here is the full file content:
{full_file}
`);


const chain = prompt.pipe(model).pipe(parser);

async function safeRunCodeReview(diff: string, full_file: string): Promise<AIResponse> {
  try {
    const result = await chain.invoke({
      formatInstructions, 
      diff,
      full_file,
    });

 
    if (
      result &&
      typeof result.comment === "string" &&
      typeof result.conclusion === "string" &&
      typeof result.rating === "number" &&
      ["success", "failure", "neutral"].includes(result.conclusion)
    ) {
      // Type assertion is safe here after validation
      return result as unknown as AIResponse;
    }

    
    console.warn("AI returned invalid structure, using fallback.");
    return { comment: "AI review failed.", conclusion: "neutral" , rating : 2};
  } catch (err) {
    console.error("AI invocation failed:", err);
    return { comment: "AI review failed.", conclusion: "neutral" , rating : 2};
  }
}


export { chain, safeRunCodeReview };
