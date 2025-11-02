import { Request, Response } from "express";
import {chain,safeRunCodeReview} from "../utils/aiUtil.js";
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

export const pullRequestWebhook = async (
  req: Request,
  res: Response,
  action: string,
  payload: PullRequestPayload
) => {
  try {
    const repoInfo = await prisma.repo.findUnique({
      where: { id: payload.repository.id.toString() },
    });

    if (!repoInfo || !repoInfo.isReviewOn) {
      return res.status(200).send("Review disabled for this repo");
    }

    if (action !== "opened") {
      return res.status(200).send("Action ignored");
    }

    const token = await getGithubToken(payload.installation.id);
    const commentsUrl = payload.pull_request.comments_url;

    const createResp: any = await axios.post(
      `https://api.github.com/repos/${payload.repository.owner.login}/${payload.repository.name}/check-runs`,
      {
        name: "AI Code Review",
        head_sha: payload.pull_request.head.sha,
        status: "in_progress",
      },
      { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } }
    );
    const checkRunId = createResp.data.id;

    // Fetch PR files
    const prFilesRes: any = await axios.get(`${payload.pull_request.url}/files`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json" },
    });

    for (const file of prFilesRes.data) {
      if (file.status === "removed") continue;

      // Post initial analyzing comment for this file
      const tempCommentRes: any = await axios.post(
        commentsUrl,
        {
          body: `⚡ Analyzing **${file.filename}**...`,
          commit_id: payload.pull_request.head.sha,
        },
        { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } }
      );
      const commentId = tempCommentRes.data.id;

      // Fetch file content
      const contentRes: any = await axios.get(file.contents_url, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3.raw" },
      });

      // Fetch diff for this file (optional, or use full PR diff)
      const diffRes : {data : string} = await axios.get(payload.pull_request.diff_url, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3.diff" },
      });

      // Run AI review per file
      let aiResponse: AIResponse;
      try {
        aiResponse = await safeRunCodeReview(diffRes.data, `File Path: ${file.filename}\nContent:\n${contentRes.data}`);
      } catch (err) {
        console.error(`AI failed for ${file.filename}:`, err);
        aiResponse = { comment: "AI review failed.", conclusion: "neutral" , rating : 2};
      }

      // Update comment with AI review
      await axios.patch(
        `https://api.github.com/repos/${payload.repository.owner.login}/${payload.repository.name}/issues/comments/${commentId}`,
        { body: aiResponse.comment },
        { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } }
      );

      // Save review in DB
      await prisma.review.create({
        data: {
          reviewId: `${payload.pull_request.id}-${file.filename}`,
          repoId: payload.repository.id.toString(),
          ownerId: payload.repository.owner.id.toString(),
          comment: aiResponse.comment,
          rating: aiResponse.rating,
        },
      });
    }

    // Complete the check run after all files processed
    await axios.patch(
      `https://api.github.com/repos/${payload.repository.owner.login}/${payload.repository.name}/check-runs/${checkRunId}`,
      {
        name: "AI Code Review",
        head_sha: payload.pull_request.head.sha,
        status: "completed",
        conclusion: "success",
      },
      { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } }
    );


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

