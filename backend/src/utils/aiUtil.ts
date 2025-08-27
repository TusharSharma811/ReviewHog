import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate, PromptTemplate } from "@langchain/core/prompts";
import dotenv from "dotenv";


dotenv.config();

const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  temperature: 0.4 ,
  apiKey: process.env.GEMINI_API_KEY
});


const prompt = `You are a Senior Software Engineer performing a professional code review.  
You will receive a code diff (GitHub-style) and must return detailed, high-quality suggestions.

Your response should be a single comment that includes:
1. A summary of the changes made in the diff.
2. Any potential issues or improvements you notice.
3. Suggestions for best practices or optimizations.
4. If the code is good, simply say "Looks good to me!" without any further comments.
5. Use markdown formatting for code snippets, if applicable.
6. Be concise but thorough in your review.
7. Use markdown formatting for comments and output a single string response.
Output in the format : 

{{  
  "comment": "Looks good to me!" ,
  "conclusion" : ["success" , "failure"]
}}

Here is the code diff:
{diff}

Here is the full file content:
{full_file}



`

const promptTemplate = PromptTemplate.fromTemplate(

  prompt
);

  const chain = promptTemplate.pipe(model);

export default chain;