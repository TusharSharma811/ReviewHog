import { Request, Response } from "express";
import axios from "axios";
import crypto from "crypto";
import prisma from "../db/prismaClient.js";
import { getGithubToken } from "../utils/getGithubToken.js";
import { safeRunCodeReview } from "../utils/aiUtil.js";
import { logger } from "../utils/logger.js";
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
async function processPullRequest(payload: PullRequestPayload, ownerId: string): Promise<void> {
  const prId = payload.pull_request.id;
  const repoFullName = `${payload.repository.owner.login}/${payload.repository.name}`;

  logger.info("WEBHOOK", `Processing PR review`, { prId, repo: repoFullName });

  try {
    const token = await getGithubToken(payload.installation.id);
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    };

    logger.info("WEBHOOK", "GitHub token acquired", { prId, installationId: payload.installation.id });

    const createResp = await axios.post<CheckRunResponse>(
      `https://api.github.com/repos/${repoFullName}/check-runs`,
      {
        name: "AI Code Review",
        head_sha: payload.pull_request.head.sha,
        status: "in_progress",
      },
      { headers }
    );
    const checkRunId = createResp.data.id;

    logger.info("WEBHOOK", "Check run created", { prId, checkRunId });

    const prFilesRes = await axios.get<PullRequestFile[]>(
      `${payload.pull_request.url}/files`,
      { headers: { ...headers, Accept: "application/vnd.github.v3+json" } }
    );

    const allFiles = prFilesRes.data;
    const reviewableFiles = allFiles.filter(
      (file) => file.status !== "removed" && file.patch && !shouldSkipFile(file.filename, file.patch.length)
    );

    const skippedFiles = allFiles.filter(
      (file) => file.status === "removed" || !file.patch || shouldSkipFile(file.filename, file.patch?.length ?? 0)
    );

    logger.info("WEBHOOK", `File analysis complete`, {
      prId,
      totalFiles: allFiles.length,
      reviewable: reviewableFiles.length,
      skipped: skippedFiles.length,
      skippedNames: skippedFiles.map(f => f.filename),
    });

    if (reviewableFiles.length === 0) {
      // Complete the check run even if no files to review
      await axios.patch(
        `https://api.github.com/repos/${repoFullName}/check-runs/${checkRunId}`,
        {
          name: "AI Code Review",
          head_sha: payload.pull_request.head.sha,
          status: "completed",
          conclusion: "success",
          output: {
            title: "No reviewable files",
            summary: `All ${allFiles.length} changed file(s) were skipped (lock files, images, configs, etc.)`,
          },
        },
        { headers }
      );
      logger.info("WEBHOOK", "No reviewable files, check run completed", { prId });
      return;
    }

    let finalConclusion: "success" | "failure" | "neutral" = "success";
    let issuesInPR = 0;
    let passesInPR = 0;

    for (const file of reviewableFiles) {
      logger.info("WEBHOOK", `Reviewing file`, { prId, file: file.filename, patchLength: file.patch!.length });

      const tempCommentRes = await axios.post<CommentResponse>(
        payload.pull_request.comments_url,
        {
          body: `⚡ Analyzing **${file.filename}**...`,
          commit_id: payload.pull_request.head.sha,
        },
        { headers }
      );

      const commentId = tempCommentRes.data.id;
      logger.debug("WEBHOOK", "Placeholder comment posted", { prId, commentId, file: file.filename });

      let fileContent: string;
      try {
        const contentRes = await axios.get<string>(file.contents_url, {
          headers: { ...headers, Accept: "application/vnd.github.v3.raw" },
        });
        fileContent = contentRes.data;
        logger.debug("WEBHOOK", "File content fetched", { prId, file: file.filename, contentLength: String(fileContent).length });
      } catch (fetchErr) {
        logger.error("WEBHOOK", "Failed to fetch file content", {
          prId,
          file: file.filename,
          error: fetchErr instanceof Error ? fetchErr.message : String(fetchErr),
        });
        fileContent = "(file content unavailable)";
      }

      let aiResponse: AIResponse;
      try {
        aiResponse = await safeRunCodeReview(
          file.patch!,
          `File Path: ${file.filename}\n\n${fileContent}`,
          { ownerId }
        );
        logger.info("WEBHOOK", "AI review received", {
          prId,
          file: file.filename,
          rating: aiResponse.rating,
          conclusion: aiResponse.conclusion,
        });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        logger.error("WEBHOOK", "AI review threw unexpected error", {
          prId,
          file: file.filename,
          error: errMsg,
          stack: err instanceof Error ? err.stack : undefined,
        });
        aiResponse = {
          comment: `⚠️ AI review failed for this file.\n\n**Error:** ${errMsg}\n\nPlease review manually.`,
          conclusion: "neutral",
          rating: 3,
        };
      }

      await axios.patch(
        `https://api.github.com/repos/${repoFullName}/issues/comments/${commentId}`,
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
          ownerId,
          comment: aiResponse.comment,
          rating: aiResponse.rating,
        },
      });

      logger.debug("WEBHOOK", "Review saved to DB", { prId, file: file.filename });
    }

    await axios.patch(
      `https://api.github.com/repos/${repoFullName}/check-runs/${checkRunId}`,
      {
        name: "AI Code Review",
        head_sha: payload.pull_request.head.sha,
        status: "completed",
        conclusion: finalConclusion,
      },
      { headers }
    );

    // Compute updated avgRating from all reviews
    const avgRating = await computeAvgRating(ownerId);

    await prisma.insight.upsert({
      where: { ownerId },
      update: {
        totalReviews: { increment: reviewableFiles.length },
        totalPRs: { increment: 1 },
        avgRating,
        issuesFound: { increment: issuesInPR },
        cleanPasses: { increment: passesInPR },
        lastReviewAt: new Date(),
      },
      create: {
        ownerId,
        totalReviews: reviewableFiles.length,
        totalPRs: 1,
        avgRating,
        issuesFound: issuesInPR,
        cleanPasses: passesInPR,
        lastReviewAt: new Date(),
      },
    });

    logger.info("WEBHOOK", `PR review complete`, {
      prId,
      repo: repoFullName,
      filesReviewed: reviewableFiles.length,
      conclusion: finalConclusion,
      issues: issuesInPR,
      passes: passesInPR,
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error("WEBHOOK", "Fatal error processing PR review", {
      prId,
      repo: repoFullName,
      error: errMsg,
      stack: err instanceof Error ? err.stack : undefined,
    });
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
      logger.error("WEBHOOK", "Invalid PR webhook payload", {
        issues: parsed.error.issues,
      });
      return res.status(400).send("Invalid payload");
    }

    const validPayload = parsed.data;

    const repoInfo = await prisma.repo.findUnique({
      where: { id: validPayload.repository.id.toString() },
    });

    if (!repoInfo || !repoInfo.isReviewOn) {
      logger.info("WEBHOOK", "Review disabled for repo, skipping", {
        repoId: validPayload.repository.id,
        isReviewOn: repoInfo?.isReviewOn ?? false,
      });
      return res.status(200).send("Review disabled for this repo");
    }

    if (action !== "opened") {
      logger.debug("WEBHOOK", `Action '${action}' ignored`, { prId: validPayload.pull_request.id });
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
      logger.info("WEBHOOK", "PR already reviewed, skipping (webhook retry)", {
        prId: validPayload.pull_request.id,
      });
      return res.status(200).send("Already reviewed");
    }

    // FIX #5: Respond immediately, process in background
    // This prevents GitHub from retrying the webhook due to timeout
    res.status(200).send("Processing");

    logger.info("WEBHOOK", "Webhook accepted, starting background processing", {
      prId: validPayload.pull_request.id,
      repo: `${validPayload.repository.owner.login}/${validPayload.repository.name}`,
      action,
    });

    // Run the actual review work asynchronously
    setImmediate(() => {
      processPullRequest(validPayload, repoInfo.ownerId).catch((err) => {
        logger.error("WEBHOOK", "Background PR processing crashed", {
          prId: validPayload.pull_request.id,
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
        });
      });
    });
  } catch (err) {
    logger.error("WEBHOOK", "Unhandled error in PR webhook handler", {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    res.status(500).send("Internal Server Error");
  }
};
