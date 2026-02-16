import { Request, Response } from "express";
import axios from "axios";
import crypto from "crypto";
import prisma from "../db/prismaClient.js";
import { getGithubToken } from "../utils/getGithubToken.js";
import { safeRunCodeReview } from "../utils/aiUtil.js";

// Files that should never be reviewed — they produce noisy, unhelpful feedback
const SKIP_EXTENSIONS = new Set([
  // Lock files & dependency manifests
  ".lock", ".lockb",
  // Images
  ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp", ".bmp",
  // Fonts
  ".woff", ".woff2", ".ttf", ".eot", ".otf",
  // Compiled / minified
  ".min.js", ".min.css", ".map",
  // Data / config
  ".json", ".yaml", ".yml", ".toml",
  // Documents
  ".md", ".txt", ".pdf", ".docx",
  // Media
  ".mp4", ".mp3", ".wav",
]);

const SKIP_FILENAMES = new Set([
  "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "bun.lockb",
  ".gitignore", ".env.example", ".env.sample",
  "tsconfig.json", ".eslintrc.json", ".prettierrc",
]);

const MAX_PATCH_SIZE = 10000; // Skip files with diffs > 10KB (generated code, etc.)

function shouldSkipFile(filename: string, patchSize: number): boolean {
  const basename = filename.split("/").pop() ?? filename;

  // Exact filename match
  if (SKIP_FILENAMES.has(basename)) return true;

  // Extension match (handles compound extensions like .min.js)
  const lower = basename.toLowerCase();
  for (const ext of SKIP_EXTENSIONS) {
    if (lower.endsWith(ext)) return true;
  }

  // Skip very large diffs (likely generated or minified)
  if (patchSize > MAX_PATCH_SIZE) return true;

  return false;
}

function makeReviewId(prId: string, filename: string): string {
  const hash = crypto.createHash("sha256").update(filename).digest("hex").slice(0, 8);
  return `${prId}-${hash}`;
}

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

interface CheckRunResponse {
  id: number;
}

interface PullRequestFile {
  filename: string;
  status: string;
  patch?: string;
  contents_url: string;
}

interface CommentResponse {
  id: number;
}

export const pullRequestWebhook = async (
  _req: Request,
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

    // Deduplication: check if this PR was already reviewed
    const existingReview = await prisma.review.findFirst({
      where: {
        reviewId: { startsWith: payload.pull_request.id.toString() },
        repoId: payload.repository.id.toString(),
      },
    });

    if (existingReview) {
      console.log(`⏭️ PR ${payload.pull_request.id} already reviewed, skipping (webhook retry)`);
      return res.status(200).send("Already reviewed");
    }

    const token = await getGithubToken(payload.installation.id);
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    };

    const createResp = await axios.post<CheckRunResponse>(
      `https://api.github.com/repos/${payload.repository.owner.login}/${payload.repository.name}/check-runs`,
      {
        name: "AI Code Review",
        head_sha: payload.pull_request.head.sha,
        status: "in_progress",
      },
      { headers }
    );
    const checkRunId = createResp.data.id;

    const prFilesRes = await axios.get<PullRequestFile[]>(
      `${payload.pull_request.url}/files`,
      { headers: { ...headers, Accept: "application/vnd.github.v3+json" } }
    );

    const reviewableFiles = prFilesRes.data.filter(
      (file) => file.status !== "removed" && file.patch && !shouldSkipFile(file.filename, file.patch.length)
    );

    if (reviewableFiles.length === 0) {
      // Complete the check run even if no files to review
      await axios.patch(
        `https://api.github.com/repos/${payload.repository.owner.login}/${payload.repository.name}/check-runs/${checkRunId}`,
        {
          name: "AI Code Review",
          head_sha: payload.pull_request.head.sha,
          status: "completed",
          conclusion: "success",
          output: {
            title: "No reviewable files",
            summary: `All ${prFilesRes.data.length} changed file(s) were skipped (lock files, images, configs, etc.)`,
          },
        },
        { headers }
      );
      return res.status(200).send("No reviewable files");
    }

    console.log(`📝 Reviewing ${reviewableFiles.length}/${prFilesRes.data.length} files`);

    for (const file of reviewableFiles) {

      const tempCommentRes = await axios.post<CommentResponse>(
        payload.pull_request.comments_url,
        {
          body: `⚡ Analyzing **${file.filename}**...`,
          commit_id: payload.pull_request.head.sha,
        },
        { headers }
      );

      const commentId = tempCommentRes.data.id;

      const contentRes = await axios.get<string>(file.contents_url, {
        headers: { ...headers, Accept: "application/vnd.github.v3.raw" },
      });

      let aiResponse: AIResponse;
      try {
        aiResponse = await safeRunCodeReview(
          file.patch!,
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
          reviewId: makeReviewId(payload.pull_request.id.toString(), file.filename),
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
