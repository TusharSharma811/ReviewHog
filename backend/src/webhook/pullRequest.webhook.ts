import { Request, Response } from "express";
import axios from "axios";
import prisma from "../db/prismaClient.js";
import { getGithubToken } from "../utils/getGithubToken.js";
import {
  safeRunPullRequestReview,
  type PullRequestReviewFile,
} from "../utils/aiUtil.js";
import { runReviewPipeline } from "../pipeline/index.js";
import type { PRContext, PRFile } from "../pipeline/types.js";
import { logger } from "../utils/logger.js";
import { z } from "zod";

const USE_V2_PIPELINE = process.env.REVIEW_PIPELINE_VERSION === "v2";

// Files that should never be reviewed because they produce noisy feedback.
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
const GITHUB_COMMENT_LIMIT = 65000;

function shouldSkipFile(filename: string, patchSize: number): boolean {
  const basename = filename.split("/").pop() ?? filename;

  if (SKIP_FILENAMES.has(basename)) return true;

  const lower = basename.toLowerCase();
  for (const ext of SKIP_EXTENSIONS) {
    if (lower.endsWith(ext)) return true;
  }

  if (patchSize > MAX_PATCH_SIZE) return true;

  return false;
}

function makePullRequestReviewId(prId: string): string {
  return `${prId}-summary`;
}

function truncateGithubComment(body: string): string {
  if (body.length <= GITHUB_COMMENT_LIMIT) return body;

  const suffix = "\n\n---\nReview comment truncated because it exceeded GitHub's comment size limit.";
  return body.slice(0, GITHUB_COMMENT_LIMIT - suffix.length) + suffix;
}

interface AIResponse {
  comment: string;
  conclusion: "success" | "failure" | "neutral";
  rating: number;
}

interface PullRequestFile {
  filename: string;
  status: string;
  patch?: string;
  contents_url: string;
}

function buildPullRequestComment(
  aiResponse: AIResponse,
  reviewedFiles: PullRequestReviewFile[],
  skippedFiles: PullRequestFile[]
): string {
  const skippedSummary = skippedFiles.length > 0
    ? `\n\nSkipped ${skippedFiles.length} file(s): ${skippedFiles.map((file) => `\`${file.filename}\``).join(", ")}`
    : "";

  return truncateGithubComment(`## ReviewHog AI Review

${aiResponse.comment}

---
Rating: ${aiResponse.rating}/5
Conclusion: ${aiResponse.conclusion}
Reviewed ${reviewedFiles.length} file(s): ${reviewedFiles.map((file) => `\`${file.filename}\``).join(", ")}${skippedSummary}`);
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

interface CheckRunResponse {
  id: number;
}

async function computeAvgRating(ownerId: string): Promise<number | null> {
  const result = await prisma.review.aggregate({
    where: { ownerId, rating: { not: null } },
    _avg: { rating: true },
  });
  return result._avg.rating;
}

async function buildReviewFileContext(
  file: PullRequestFile,
  headers: Record<string, string>,
  prId: string
): Promise<PullRequestReviewFile> {
  logger.info("WEBHOOK", "Fetching review context", {
    prId,
    file: file.filename,
    patchLength: file.patch!.length,
  });

  let fileContent: string;
  try {
    const contentRes = await axios.get<string>(file.contents_url, {
      headers: { ...headers, Accept: "application/vnd.github.v3.raw" },
    });
    fileContent = contentRes.data;
    logger.debug("WEBHOOK", "File content fetched", {
      prId,
      file: file.filename,
      contentLength: String(fileContent).length,
    });
  } catch (fetchErr) {
    logger.error("WEBHOOK", "Failed to fetch file content", {
      prId,
      file: file.filename,
      error: fetchErr instanceof Error ? fetchErr.message : String(fetchErr),
    });
    fileContent = "(file content unavailable)";
  }

  return {
    filename: file.filename,
    status: file.status,
    patch: file.patch!,
    fullContent: String(fileContent),
  };
}

/**
 * Process the PR review in the background (after webhook has responded 200).
 */
async function processPullRequest(payload: PullRequestPayload, ownerId: string): Promise<void> {
  const prId = payload.pull_request.id;
  const repoFullName = `${payload.repository.owner.login}/${payload.repository.name}`;

  logger.info("WEBHOOK", "Processing PR review", { prId, repo: repoFullName });

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

    logger.info("WEBHOOK", "File analysis complete", {
      prId,
      totalFiles: allFiles.length,
      reviewable: reviewableFiles.length,
      skipped: skippedFiles.length,
      skippedNames: skippedFiles.map((file) => file.filename),
    });

    if (reviewableFiles.length === 0) {
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

    const reviewFiles = await Promise.all(
      reviewableFiles.map((file) => buildReviewFileContext(file, headers, prId))
    );

    let aiResponse: AIResponse;

    // ── V2 Pipeline ─────────────────────────────────────────────────
    if (USE_V2_PIPELINE) {
      try {
        const prContext: PRContext = {
          prId,
          repoFullName,
          prTitle: "",
          prBody: "",
          baseBranch: "",
          headSha: payload.pull_request.head.sha,
          ownerId,
          installationId: payload.installation.id,
          commentsUrl: payload.pull_request.comments_url,
          prUrl: payload.pull_request.url,
        };

        const prFiles: PRFile[] = reviewFiles.map((f) => ({
          filename: f.filename,
          status: f.status,
          patch: f.patch,
          fullContent: f.fullContent,
          contents_url: "",
        }));

        const pipelineResult = await runReviewPipeline(prContext, prFiles);

        aiResponse = {
          comment: pipelineResult.summary,
          conclusion: pipelineResult.conclusion,
          rating: pipelineResult.rating,
        };

        logger.info("WEBHOOK", "V2 pipeline review complete", {
          prId,
          rating: pipelineResult.rating,
          conclusion: pipelineResult.conclusion,
          riskScore: pipelineResult.riskScore,
          findingsCount: pipelineResult.findings.length,
          processingTimeMs: pipelineResult.stats.processingTimeMs,
        });
      } catch (v2Err) {
        logger.error("WEBHOOK", "V2 pipeline failed, falling back to v1", {
          prId,
          error: v2Err instanceof Error ? v2Err.message : String(v2Err),
          stack: v2Err instanceof Error ? v2Err.stack : undefined,
        });

        // Fall back to v1
        try {
          aiResponse = await safeRunPullRequestReview(reviewFiles, { ownerId });
        } catch (v1Err) {
          const errMsg = v1Err instanceof Error ? v1Err.message : String(v1Err);
          aiResponse = {
            comment: `ReviewHog could not generate a complete AI summary for this pull request.\n\nPlease review the changes manually before merging.\n\n**Error:** ${errMsg}`,
            conclusion: "neutral",
            rating: 3,
          };
        }
      }
    } else {
      // ── V1 Pipeline (original) ──────────────────────────────────────
      try {
        aiResponse = await safeRunPullRequestReview(reviewFiles, { ownerId });
        logger.info("WEBHOOK", "V1 AI PR review received", {
          prId,
          rating: aiResponse.rating,
          conclusion: aiResponse.conclusion,
          filesReviewed: reviewFiles.length,
        });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        logger.error("WEBHOOK", "AI PR review threw unexpected error", {
          prId,
          error: errMsg,
          stack: err instanceof Error ? err.stack : undefined,
        });
        aiResponse = {
          comment: `ReviewHog could not generate a complete AI summary for this pull request.\n\nPlease review the changes manually before merging.\n\n**Error:** ${errMsg}`,
          conclusion: "neutral",
          rating: 3,
        };
      }
    }

    // V2 pipeline produces a self-contained summary; v1 needs wrapping
    const commentBody = USE_V2_PIPELINE
      ? aiResponse.comment
      : buildPullRequestComment(aiResponse, reviewFiles, skippedFiles);

    await axios.post(
      payload.pull_request.comments_url,
      { body: commentBody },
      { headers }
    );

    logger.debug("WEBHOOK", "PR review comment posted", { prId, pipeline: USE_V2_PIPELINE ? "v2" : "v1" });

    await prisma.review.create({
      data: {
        reviewId: makePullRequestReviewId(payload.pull_request.id.toString()),
        repoId: payload.repository.id.toString(),
        ownerId,
        comment: commentBody,
        rating: aiResponse.rating,
        pipelineVersion: USE_V2_PIPELINE ? "v2" : "v1",
      },
    });

    logger.debug("WEBHOOK", "PR review saved to DB", { prId });

    const issuesInPR = aiResponse.conclusion === "failure" ? 1 : 0;
    const passesInPR = aiResponse.conclusion === "success" ? 1 : 0;

    await axios.patch(
      `https://api.github.com/repos/${repoFullName}/check-runs/${checkRunId}`,
      {
        name: "AI Code Review",
        head_sha: payload.pull_request.head.sha,
        status: "completed",
        conclusion: aiResponse.conclusion,
        output: {
          title: "AI code review complete",
          summary: commentBody.slice(0, GITHUB_COMMENT_LIMIT),
        },
      },
      { headers }
    );

    const avgRating = await computeAvgRating(ownerId);

    await prisma.insight.upsert({
      where: { ownerId },
      update: {
        totalReviews: { increment: 1 },
        totalPRs: { increment: 1 },
        avgRating,
        issuesFound: { increment: issuesInPR },
        cleanPasses: { increment: passesInPR },
        lastReviewAt: new Date(),
      },
      create: {
        ownerId,
        totalReviews: 1,
        totalPRs: 1,
        avgRating,
        issuesFound: issuesInPR,
        cleanPasses: passesInPR,
        lastReviewAt: new Date(),
      },
    });

    logger.info("WEBHOOK", "PR review complete", {
      prId,
      repo: repoFullName,
      filesReviewed: reviewableFiles.length,
      conclusion: aiResponse.conclusion,
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
      include: {
        owner: {
          select: { aiReviewsEnabled: true },
        },
      },
    });

    if (!repoInfo || !repoInfo.isReviewOn || !repoInfo.owner.aiReviewsEnabled) {
      logger.info("WEBHOOK", "Review disabled for repo, skipping", {
        repoId: validPayload.repository.id,
        isReviewOn: repoInfo?.isReviewOn ?? false,
        aiReviewsEnabled: repoInfo?.owner.aiReviewsEnabled ?? false,
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

    // FIX #5: Respond immediately, process in background.
    // This prevents GitHub from retrying the webhook due to timeout.
    res.status(200).send("Processing");

    logger.info("WEBHOOK", "Webhook accepted, starting background processing", {
      prId: validPayload.pull_request.id,
      repo: `${validPayload.repository.owner.login}/${validPayload.repository.name}`,
      action,
    });

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
