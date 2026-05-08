import { Request, Response } from "express";
import axios from "axios";
import crypto from "crypto";
import prisma from "../db/prismaClient.js";
import { getGithubToken } from "../utils/getGithubToken.js";
import { safeRunCodeReview } from "../utils/aiUtil.js";
import { z } from "zod";

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

// Zod validation for the webhook payload
const pullRequestPayloadSchema = z.object({
  action: z.string(),
  pull_request: z.object({
    id: z.union([z.string(), z.number()]).transform(String),
    head: z.object({ sha: z.string() }),
    comments_url: z.string().url(),
    diff_url: z.string().url(),
    url: z.string().url(),
  }),
  repository: z.object({
    id: z.number(),
    owner: z.object({
      login: z.string(),
      id: z.union([z.string(), z.number()]).transform(String),
    }),
    name: z.string(),
  }),
  installation: z.object({
    id: z.union([z.string(), z.number()]).transform(String),
  }),
});

type PullRequestPayload = z.infer<typeof pullRequestPayloadSchema>;

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

/**
 * Compute the average rating across all reviews for a given owner.
 */
async function computeAvgRating(ownerId: string): Promise<number | null> {
  const result = await prisma.review.aggregate({
    where: { ownerId, rating: { not: null } },
    _avg: { rating: true },
  });
  return result._avg.rating;
}

/**
 * Process the PR review in the background (after webhook has responded 200).
 */
async function processPullRequest(payload: PullRequestPayload): Promise<void> {
  try {
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
      return;
    }

    console.log(`📝 Reviewing ${reviewableFiles.length}/${prFilesRes.data.length} files`);

    let finalConclusion: "success" | "failure" | "neutral" = "success";
    let issuesInPR = 0;
    let passesInPR = 0;

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

      if (aiResponse.conclusion === "failure") {
        finalConclusion = "failure";
        issuesInPR++;
      } else if (aiResponse.conclusion === "success") {
        passesInPR++;
      }

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
        conclusion: finalConclusion,
      },
      { headers }
    );

    // Compute updated avgRating from all reviews
    const avgRating = await computeAvgRating(payload.repository.owner.id.toString());

    await prisma.insight.upsert({
      where: { ownerId: payload.repository.owner.id.toString() },
      update: {
        totalReviews: { increment: reviewableFiles.length },
        totalPRs: { increment: 1 },
        avgRating,
        issuesFound: { increment: issuesInPR },
        cleanPasses: { increment: passesInPR },
        lastReviewAt: new Date(),
      },
      create: {
        ownerId: payload.repository.owner.id.toString(),
        totalReviews: reviewableFiles.length,
        totalPRs: 1,
        avgRating,
        issuesFound: issuesInPR,
        cleanPasses: passesInPR,
        lastReviewAt: new Date(),
      },
    });

    console.log(`✅ PR ${payload.pull_request.id} reviewed successfully`);
  } catch (err) {
    console.error("❌ Error processing PR review:", err);
  }
}

export const pullRequestWebhook = async (
  _req: Request,
  res: Response,
  action: string,
  payload: unknown
) => {
  try {
    // FIX #14: Validate webhook payload with Zod
    const parsed = pullRequestPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      console.error("Invalid PR webhook payload:", parsed.error.issues);
      return res.status(400).send("Invalid payload");
    }

    const validPayload = parsed.data;

    const repoInfo = await prisma.repo.findUnique({
      where: { id: validPayload.repository.id.toString() },
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
        reviewId: { startsWith: validPayload.pull_request.id.toString() },
        repoId: validPayload.repository.id.toString(),
      },
    });

    if (existingReview) {
      console.log(`⏭️ PR ${validPayload.pull_request.id} already reviewed, skipping (webhook retry)`);
      return res.status(200).send("Already reviewed");
    }

    // FIX #5: Respond immediately, process in background
    // This prevents GitHub from retrying the webhook due to timeout
    res.status(200).send("Processing");

    // Run the actual review work asynchronously
    setImmediate(() => {
      processPullRequest(validPayload).catch((err) => {
        console.error("❌ Background PR processing failed:", err);
      });
    });
  } catch (err) {
    console.error("❌ Error processing PR webhook:", err);
    res.status(500).send("Internal Server Error");
  }
};
