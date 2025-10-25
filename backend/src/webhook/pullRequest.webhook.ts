import { Request, Response } from "express";
import chain from "../utils/aiUtil.js";
import axios from "axios";
import { getGithubToken } from "../utils/getGithubToken.js";
import prisma  from "../db/prismaClient.js";
interface PullRequestPayload {
  action: string;
  pull_request: {
    id : string
    head: { sha: string };
    comments_url: string;
    diff_url: string;
    url: string;
  };
  repository: {
    id : number;
    owner: { login: string , id : string};
    name: string;
  };
  installation: { id: string };
}

interface AIResponse {
  comment: string;
  conclusion: "success" | "failure" | "neutral";
  rating : number ;
}

function extractJsonFromCodeBlock(input: string): AIResponse {
  const cleaned = input.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  try {
    console.log("Extracted JSON from AI:", cleaned);
    return JSON.parse(cleaned);
  } catch (err) {
    throw new Error("Invalid JSON inside code block: " + err);
  }
}

export const pullRequestWebhook = async (req: Request, res: Response , action : string , payload: PullRequestPayload) => {
    try {
  
  const repoInfo = await prisma.repo.findUnique({
    where :{
      id : payload.repository.id.toString() , 
    }
  }) ;

  if(!repoInfo ||!repoInfo.isReviewOn){
    return ; 
  }
  if (action !== "opened") {
    return res.status(200).send("Action ignored");
  }


    const token = await getGithubToken(payload.installation.id);
    const commentsUrl = payload.pull_request.comments_url;
    const diffRes = await axios.get(payload.pull_request.diff_url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3.diff",
      },
    });

    // Initial "Analyzing" comment
    await axios.post(
      commentsUrl,
      {
        body: `
> **Note**  
> ReviewHog is currently analyzing the latest changes in this PR.  
> This may take a few minutes — sit tight, good things take time!

---
`,
        commit_id: payload.pull_request.head.sha,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
        },
      }
    );

    // Fetch PR files
    const prFilesRes: any = await axios.get(
      `${payload.pull_request.url}/files`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    // Create Check Run
    const createResp: any = await axios.post(
      `https://api.github.com/repos/${payload.repository.owner.login}/${payload.repository.name}/check-runs`,
      {
        name: "AI Code Review",
        head_sha: payload.pull_request.head.sha,
        status: "in_progress",
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
        },
      }
    );

    const checkRunId = createResp.data.id;

    // Fetch file contents in parallel
    const fileDataArr = await Promise.all(
      prFilesRes.data.map(async (file: any) => {
        if (file.status === "removed") {
          console.log(`File ${file.filename} removed, skipping.`);
          return null;
        }
        const contentRes: any = await axios.get(file.contents_url, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3.raw",
          },
        });
        return `File Path: ${file.filename}\nContent:\n${contentRes.data}\n\n`;
      })
    );

    const fileData = fileDataArr.filter(Boolean) as string[];


    const aiResponse = await chain.invoke({
      diff: diffRes.data,
      full_file: fileData,
    });

    const extracted = extractJsonFromCodeBlock(aiResponse.content as string);

    if (!extracted.comment || !extracted.conclusion) {
      throw new Error("AI response missing required fields");
    }

    // Post AI comment
    await axios.post(
      commentsUrl,
      {
        body: extracted.comment,
        commit_id: payload.pull_request.head.sha,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
        },
      }
    );

    await axios.patch(
      `https://api.github.com/repos/${payload.repository.owner.login}/${payload.repository.name}/check-runs/${checkRunId}`,
      {
        name: "AI Code Review",
        head_sha: payload.pull_request.head.sha,
        status: "completed",
        conclusion: extracted.conclusion,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
        },
      }
    );

    await prisma.review.create({
      data: {
        reviewId : `${payload.pull_request.id}`.toString(),
        repoId: `${payload.repository.id}`.toString(),
        ownerId: `${payload.repository.owner.id}`.toString(),
        comment: extracted.comment,
        rating: extracted.rating,
        
      },
    });

    await prisma.insight.upsert({
      where: { ownerId: `${payload.repository.owner.id}`.toString() },
      update: {
        totalReviews: { increment: 1 },
        totalPRs: { increment: 1 },
      },
      create: {
        ownerId: `${payload.repository.owner.id}`.toString(),
        totalReviews: 1,
        totalPRs: 1,
      },
    });

    res.status(200).send("Webhook processed successfully");
  } catch (err) {
    console.error("Error processing PR webhook:", err);
    res.status(500).send("Internal Server Error");
  }
};
