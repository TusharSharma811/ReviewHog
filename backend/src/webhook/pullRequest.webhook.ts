import { Request, Response } from "express";
import axios from "axios";
import prisma from "../db/prismaClient.js";
import { getGithubToken } from "../utils/getGithubToken.js";
import { safeRunCodeReview } from "../utils/aiUtil.js";

interface PullRequestPayload {
  action: string;
  pull_request: {
    id: string;
    head: { sha: string };
    comments_url: string;
    diff_url: string;
    url: string;
  };
  repository: {
    id: number;
    owner: { login: string; id: string };
    name: string;
  };
  installation: { id: string };
}

interface AIResponse {
  comment: string;
  conclusion: "success" | "failure" | "neutral";
  rating: number;
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
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    };

    const createResp: any = await axios.post(
      `https://api.github.com/repos/${payload.repository.owner.login}/${payload.repository.name}/check-runs`,
      {
        name: "AI Code Review",
        head_sha: payload.pull_request.head.sha,
        status: "in_progress",
      },
      { headers }
    );
    const checkRunId = createResp.data.id;

    const prFilesRes: any = await axios.get(`${payload.pull_request.url}/files`, {
      headers: { ...headers, Accept: "application/vnd.github.v3+json" },
    });

    for (const file of prFilesRes.data) {
      if (file.status === "removed" || !file.patch) continue; // skip deleted/binary files

      const tempCommentRes: any = await axios.post(
        payload.pull_request.comments_url,
        {
          body: `⚡ Analyzing **${file.filename}**...`,
          commit_id: payload.pull_request.head.sha,
        },
        { headers }
      );

      const commentId = tempCommentRes.data.id;

      const contentRes = await axios.get(file.contents_url, {
        headers: { ...headers, Accept: "application/vnd.github.v3.raw" },
      });

      let aiResponse: AIResponse;
      try {
        aiResponse = await safeRunCodeReview(
          file.patch,
          `File Path: ${file.filename}\n\n${contentRes.data}`
        );
      } catch (err) {
        console.error(`AI failed for ${file.filename}:`, err);
        aiResponse = {
          comment: "AI review failed.",
          conclusion: "neutral",
          rating: 2,
        };
      }

      await axios.patch(
        `https://api.github.com/repos/${payload.repository.owner.login}/${payload.repository.name}/issues/comments/${commentId}`,
        { body: aiResponse.comment },
        { headers }
      );

      await prisma.review.create({
        data: {
          reviewId: payload.pull_request.id.toString(),
          repoId: payload.repository.id.toString(),
          ownerId: payload.repository.owner.id.toString(),
          comment: aiResponse.comment,
          rating: aiResponse.rating,
        },
      });
    }

    await axios.patch(
      `https://api.github.com/repos/${payload.repository.owner.login}/${payload.repository.name}/check-runs/${checkRunId}`,
      {
        name: "AI Code Review",
        head_sha: payload.pull_request.head.sha,
        status: "completed",
        conclusion: "success",
      },
      { headers }
    );

    await prisma.insight.upsert({
      where: { ownerId: payload.repository.owner.id.toString() },
      update: {
        totalReviews: { increment: 1 },
        totalPRs: { increment: 1 },
      },
      create: {
        ownerId: payload.repository.owner.id.toString(),
        totalReviews: 1,
        totalPRs: 1,
      },
    });

    res.status(200).send("✅ Webhook processed successfully");
  } catch (err) {
    console.error("❌ Error processing PR webhook:", err);
    res.status(500).send("Internal Server Error");
  }
};
