import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "langchain/output_parsers";
import dotenv from "dotenv";

dotenv.config();

interface AIResponse {
  comment: string;
  conclusion: "success" | "failure" | "neutral";
}

// ✅ Step 1: Define the JSON schema
const parser = StructuredOutputParser.fromNamesAndDescriptions({
  comment: "Code review comment with suggestions or 'Looks good to me!'",
  conclusion: "Either 'success' or 'failure'"
});

// Get the instructions for the model to strictly follow JSON format
const formatInstructions = parser.getFormatInstructions();

// ✅ Step 2: Configure the model
const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-pro",
  temperature: 0.7,
  apiKey: process.env.GEMINI_API_KEY
});

// ✅ Step 3: Create the prompt template
const prompt = ChatPromptTemplate.fromTemplate(`
You are a Senior Software Engineer performing a professional code review.

⚠️ Important: Always respond **ONLY in valid JSON** following these instructions exactly:
${formatInstructions}

Here is the code diff:
{diff}

Here is the full file content:
{full_file}
`);

// ✅ Step 4: Build the chain
const chain = prompt.pipe(model).pipe(parser);

async function safeRunCodeReview(diff: string, full_file: string): Promise<AIResponse> {
  try {
    const result = await chain.invoke({
      formatInstructions, // include if your prompt needs it
      diff,
      full_file,
    });

    // Validate the result
    if (
      result &&
      typeof result.comment === "string" &&
      typeof result.conclusion === "string" &&
      ["success", "failure", "neutral"].includes(result.conclusion)
    ) {
      // Type assertion is safe here after validation
      return result as unknown as AIResponse;
    }

    // Fallback if validation fails
    console.warn("AI returned invalid structure, using fallback.");
    return { comment: "AI review failed.", conclusion: "neutral" };
  } catch (err) {
    console.error("AI invocation failed:", err);
    return { comment: "AI review failed.", conclusion: "neutral" };
  }
}


export { chain, safeRunCodeReview };
