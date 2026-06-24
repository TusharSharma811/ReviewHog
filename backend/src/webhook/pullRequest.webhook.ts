import { Request, Response } from "express";
import axios from "axios";
import prisma from "../db/prismaClient.js";
import { getGithubToken } from "../utils/getGithubToken.js";
import { runReviewPipeline } from "../pipeline/index.js";
import type { PRContext, PRFile } from "../pipeline/types.js";
import { logger } from "../utils/logger.js";
import { makePullRequestReviewId } from "../utils/reviewIds.js";
import { z } from "zod";

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

function truncateGithubComment(body: string): string {
  if (body.length <= GITHUB_COMMENT_LIMIT) return body;

  const suffix = "\n\n---\nReview comment truncated because it exceeded GitHub's comment size limit.";
  return body.slice(0, GITHUB_COMMENT_LIMIT - suffix.length) + suffix;
}

interface PullRequestFile {
  filename: string;
  status: string;
  patch?: string;
  contents_url: string;
}

// Zod validation for the webhook payload
const pullRequestPayloadSchema = z.object({
  action: z.string(),
  pull_request: z.object({
    id: z.union([z.string(), z.number()]).transform(String),
    title: z.string().optional().default(""),
    body: z.string().nullable().optional().default(""),
    head: z.object({ sha: z.string() }),
    base: z.object({ ref: z.string() }).optional(),
    comments_url: z.string().url(),
    diff_url: z.string().url(),
    url: z.string().url(),
    html_url: z.string().url().optional(),
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
  prId: string,
  headSha: string
): Promise<PRFile> {
  logger.info("WEBHOOK", "Fetching review context", {
    prId,
    file: file.filename,
    patchLength: file.patch!.length,
  });

  let fileContent: string;
  try {
    // Append ?ref=<headSha> to fetch the file from the PR head, not the default branch
    const separator = file.contents_url.includes("?") ? "&" : "?";
    const refUrl = `${file.contents_url}${separator}ref=${headSha}`;

    const contentRes = await axios.get<string>(refUrl, {
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
    contents_url: file.contents_url,
  };
}

/**
 * Process the PR review in the background (after webhook has responded 200).
 * V3 pipeline only — no V1/V2 fallback.
 */
async function processPullRequest(
  payload: PullRequestPayload,
  ownerId: string,
  dbRepoId: string
): Promise<void> {
  const prId = payload.pull_request.id;
  const repoFullName = `${payload.repository.owner.login}/${payload.repository.name}`;
  const headSha = payload.pull_request.head.sha;
  let checkRunId: number | null = null;
  let headers: Record<string, string> | null = null;

  logger.info("WEBHOOK", "Processing PR review (v3 pipeline)", { prId, repo: repoFullName });

  try {
    const token = await getGithubToken(payload.installation.id);
    const requestHeaders: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    };
    headers = requestHeaders;

    logger.info("WEBHOOK", "GitHub token acquired", { prId, installationId: payload.installation.id });

    const createResp = await axios.post<CheckRunResponse>(
      `https://api.github.com/repos/${repoFullName}/check-runs`,
      {
        name: "AI Code Review",
        head_sha: headSha,
        status: "in_progress",
      },
      { headers: requestHeaders }
    );
    checkRunId = createResp.data.id;

    logger.info("WEBHOOK", "Check run created", { prId, checkRunId });

    const prFilesRes = await axios.get<PullRequestFile[]>(
      `${payload.pull_request.url}/files`,
      { headers: { ...requestHeaders, Accept: "application/vnd.github.v3+json" } }
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
            head_sha: headSha,
          status: "completed",
          conclusion: "success",
          output: {
            title: "No reviewable files",
            summary: `All ${allFiles.length} changed file(s) were skipped (lock files, images, configs, etc.)`,
          },
        },
        { headers: requestHeaders }
      );
      logger.info("WEBHOOK", "No reviewable files, check run completed", { prId });
      return;
    }

    const reviewFiles = await Promise.all(
      reviewableFiles.map((file) => buildReviewFileContext(file, requestHeaders, prId, headSha))
    );

    // ── V3 Pipeline ──
    const prContext: PRContext = {
      prId,
      repoFullName,
      prTitle: payload.pull_request.title || "",
      prBody: payload.pull_request.body || "",
      baseBranch: payload.pull_request.base?.ref || "",
      headSha,
      ownerId,
      installationId: payload.installation.id,
      commentsUrl: payload.pull_request.comments_url,
      prUrl: payload.pull_request.url,
      githubRepoId: payload.repository.id.toString(),
    };

    let pipelineResult: import("../pipeline/types.js").PipelineResult;
    try {
      pipelineResult = await runReviewPipeline(prContext, reviewFiles, skippedFiles.length);

      logger.info("WEBHOOK", "V3 pipeline review complete", {
        prId,
        rating: pipelineResult.rating,
        conclusion: pipelineResult.conclusion,
        riskScore: pipelineResult.riskScore,
        findingsCount: pipelineResult.findings.length,
        stagesRun: pipelineResult.stats.stagesRun,
        processingTimeMs: pipelineResult.stats.processingTimeMs,
      });
    } catch (pipelineErr) {
      logger.error("WEBHOOK", "V3 pipeline failed", {
        prId,
        error: pipelineErr instanceof Error ? pipelineErr.message : String(pipelineErr),
        stack: pipelineErr instanceof Error ? pipelineErr.stack : undefined,
      });

      pipelineResult = {
        findings: [],
        riskScore: -1,
        conclusion: "neutral",
        rating: 3,
        summary: `ReviewHog could not generate a complete AI review for this pull request.\n\nPlease review the changes manually before merging.`,
        stats: {
          filesReviewed: reviewFiles.length,
          filesSkipped: skippedFiles.length,
          chunksProcessed: 0,
          reviewersRun: [],
          totalTokensUsed: 0,
          processingTimeMs: 0,
          stagesRun: [],
        },
      };
    }

    const commentBody = truncateGithubComment(pipelineResult.summary);

    await axios.post(
      payload.pull_request.comments_url,
      { body: commentBody },
      { headers }
    );

    logger.debug("WEBHOOK", "PR review comment posted", { prId });

    // Persist review with V3 pipeline metadata
    await prisma.review.create({
      data: {
        reviewId: makePullRequestReviewId(payload.pull_request.id.toString(), headSha),
        repoId: dbRepoId,
        ownerId,
        comment: commentBody,
        rating: pipelineResult.rating,
        prUrl: payload.pull_request.html_url ?? null,
        pipelineVersion: "v3",
        riskScore: pipelineResult.riskScore,
        findingsCount: pipelineResult.findings.length,
        criticalCount: pipelineResult.findings.filter(f => f.severity === "critical").length,
        highCount: pipelineResult.findings.filter(f => f.severity === "high").length,
        tokensUsed: pipelineResult.stats.totalTokensUsed,
        processingMs: pipelineResult.stats.processingTimeMs,
        reviewersUsed: pipelineResult.stats.reviewersRun,
        findingsJson: JSON.parse(JSON.stringify(pipelineResult.findings)),
        stagesRun: pipelineResult.stats.stagesRun,
      },
    });

    logger.debug("WEBHOOK", "PR review saved to DB", { prId });

    const issuesInPR = pipelineResult.conclusion === "failure" ? 1 : 0;
    const passesInPR = pipelineResult.conclusion === "success" ? 1 : 0;

    // Descriptive check run title based on review results
    let checkRunTitle = "AI code review complete";
    if (pipelineResult.conclusion === "failure") {
      checkRunTitle = "❌ Critical/High issues found — review required before merge";
    } else if (pipelineResult.conclusion === "neutral") {
      checkRunTitle = "⚠️ Minor issues found — review recommended";
    } else if (pipelineResult.conclusion === "success") {
      checkRunTitle = "✅ No issues found — safe to merge";
    }

    await axios.patch(
      `https://api.github.com/repos/${repoFullName}/check-runs/${checkRunId}`,
      {
        name: "AI Code Review",
        head_sha: headSha,
        status: "completed",
        conclusion: pipelineResult.conclusion,
        output: {
          title: checkRunTitle,
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
      conclusion: pipelineResult.conclusion,
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

    if (checkRunId && headers) {
      try {
        await axios.patch(
          `https://api.github.com/repos/${repoFullName}/check-runs/${checkRunId}`,
          {
            name: "AI Code Review",
            head_sha: headSha,
            status: "completed",
            conclusion: "failure",
            output: {
              title: "AI code review failed",
              summary: "ReviewHog could not complete this review. Please review the changes manually and retry later.",
            },
          },
          { headers }
        );
      } catch (updateErr) {
        logger.error("WEBHOOK", "Failed to mark check run as failed", {
          prId,
          checkRunId,
          error: updateErr instanceof Error ? updateErr.message : String(updateErr),
        });
      }
    }
  }
}

export const pullRequestWebhook = async (
  _req: Request,
  res: Response,
  action: string,
  payload: unknown
) => {
  try {
    const parsed = pullRequestPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      logger.error("WEBHOOK", "Invalid PR webhook payload", {
        issues: parsed.error.issues,
      });
      return res.status(400).send("Invalid payload");
    }

    const validPayload = parsed.data;

    const ownerId = validPayload.repository.owner.id.toString();
    const githubRepoId = validPayload.repository.id.toString();

    const repoInfo = await prisma.repo.findFirst({
      where: {
        ownerId,
        githubRepoId,
      },
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

    // Handle both 'opened' (new PR) and 'synchronize' (new commits pushed)
    if (action !== "opened" && action !== "synchronize") {
      logger.debug("WEBHOOK", `Action '${action}' ignored`, { prId: validPayload.pull_request.id });
      return res.status(200).send("Action ignored");
    }

    // Deduplication: check if this PR was already reviewed
    const existingReview = await prisma.review.findFirst({
      where: {
        reviewId: makePullRequestReviewId(
          validPayload.pull_request.id.toString(),
          validPayload.pull_request.head.sha
        ),
        repoId: repoInfo.id,
      },
    });

    if (existingReview) {
      logger.info("WEBHOOK", "PR already reviewed, skipping (webhook retry)", {
        prId: validPayload.pull_request.id,
      });
      return res.status(200).send("Already reviewed");
    }

    // Respond immediately, process in background.
    res.status(200).send("Processing");

    logger.info("WEBHOOK", "Webhook accepted, starting background processing", {
      prId: validPayload.pull_request.id,
      repo: `${validPayload.repository.owner.login}/${validPayload.repository.name}`,
      action,
    });

    setImmediate(() => {
      processPullRequest(validPayload, repoInfo.ownerId, repoInfo.id).catch((err) => {
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
