import { Request, Response } from "express";
import axios from "axios";
import prisma from "../db/prismaClient.js";
import { logger } from "../utils/logger.js";
import {
  DEFAULT_OPENROUTER_MODEL,
  decryptAISecret,
  encryptAISecret,
  getDefaultOpenRouterApiKey,
  getEffectiveOpenRouterModel,
} from "../utils/aiSettings.js";
import { z } from "zod";
import { RequestWithUser } from "../types/auth.js";

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const getUserInsights = async (req: Request, res: Response) => {
  const userId = (req as RequestWithUser).user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const parsed = paginationSchema.safeParse(req.query);
  const { page, limit } = parsed.success ? parsed.data : { page: 1, limit: 10 };
  const skip = (page - 1) * limit;

  try {
    const userData = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        repos: {
          include: {
            reviews: {
              orderBy: { createdAt: "desc" },
              take: 5,
            },
          },
          skip,
          take: limit,
        },
        reviews: {
          include: {
            repo: {
              select: {
                id: true,
                name: true,
                ownerId: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        },
        insights: true,
      },
    });

    if (!userData) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get total counts for pagination
    const [totalRepos, totalReviews] = await Promise.all([
      prisma.repo.count({ where: { ownerId: userId } }),
      prisma.review.count({ where: { ownerId: userId } }),
    ]);

    const {
      githubToken: _githubToken,
      aiApiKey: _aiApiKey,
      aiModel: _aiModel,
      ...safeUserData
    } = userData;

    res.status(200).json({
      ...safeUserData,
      pagination: {
        page,
        limit,
        totalRepos,
        totalReviews,
        hasMoreRepos: skip + limit < totalRepos,
        hasMoreReviews: skip + limit < totalReviews,
      },
    });
  } catch (error) {
    logger.error("USER", "Error fetching user insights", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ message: "Internal server error" });
  }
};

// ─── Toggle Review ──────────────────────────────────────────────────────────

const toggleRepoSchema = z.object({
  repoId: z.string().min(1, "Repository ID is required"),
});

export const toggleGithubReview = async (req: Request, res: Response) => {
  const userId = (req as RequestWithUser).user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const parsed = toggleRepoSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  const { repoId } = parsed.data;

  try {
    const repo = await prisma.repo.findFirst({
      where: { id: repoId, ownerId: userId },
    });

    if (!repo) {
      return res.status(404).json({ message: "Repository not found" });
    }

    await prisma.repo.update({
      where: { id: repoId },
      data: { isReviewOn: !repo.isReviewOn },
    });

    res.status(200).json({
      message: "GitHub reviews toggled for repository",
      isReviewOn: !repo.isReviewOn,
    });
  } catch (error) {
    logger.error("USER", "Error toggling GitHub reviews", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ message: "Internal server error" });
  }
};

// ─── Add Repository ─────────────────────────────────────────────────────────

const addRepoSchema = z.object({
  name: z.string().min(1, "Repository name is required")
    .regex(/^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/, "Must be in owner/repo format"),
  description: z.string().optional().default(""),
  language: z.string().optional().nullable(),
});

interface GitHubRepoResponse {
  id: number;
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
}

export const addRepository = async (req: Request, res: Response) => {
  const userId = (req as RequestWithUser).user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const parsed = addRepoSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  const { name, description, language } = parsed.data;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { githubToken: true, defaultRepoReviewOn: true },
    });

    if (!user?.githubToken) {
      return res.status(400).json({ message: "GitHub token not available. Please re-login before adding repositories." });
    }

    let githubToken: string | null;
    try {
      githubToken = decryptAISecret(user.githubToken);
    } catch {
      return res.status(400).json({ message: "GitHub token could not be decrypted. Please re-login." });
    }

    if (!githubToken) {
      return res.status(400).json({ message: "GitHub token not available. Please re-login before adding repositories." });
    }

    const repoRes = await axios.get<GitHubRepoResponse>(
      `https://api.github.com/repos/${name}`,
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github+json",
        },
      }
    );

    const githubRepo = repoRes.data;
    const url = githubRepo.html_url;
    const githubRepoId = githubRepo.id.toString();

    // Check if repo already exists for this user
    const existing = await prisma.repo.findFirst({
      where: {
        ownerId: userId,
        OR: [
          { url },
          { githubRepoId },
        ],
      },
    });

    if (existing) {
      return res.status(409).json({ message: "Repository already connected" });
    }

    const repo = await prisma.repo.create({
      data: {
        githubRepoId,
        name: githubRepo.full_name,
        description: githubRepo.description ?? description,
        language: githubRepo.language ?? language,
        url,
        ownerId: userId,
        stars: githubRepo.stargazers_count ?? 0,
        forks: githubRepo.forks_count ?? 0,
        isReviewOn: user.defaultRepoReviewOn ?? true,
      },
    });

    res.status(201).json({
      message: "Repository added successfully",
      repo,
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 404) {
        return res.status(404).json({ message: "GitHub repository not found or not accessible." });
      }
      if (status === 401 || status === 403) {
        return res.status(403).json({ message: "GitHub access denied. Please re-login or check repository permissions." });
      }
    }

    logger.error("USER", "Error adding repository", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ message: "Internal server error" });
  }
};

// ─── Remove Repository ─────────────────────────────────────────────────────

export const removeRepository = async (req: Request, res: Response) => {
  const userId = (req as RequestWithUser).user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const parsed = toggleRepoSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  const { repoId } = parsed.data;

  try {
    // Verify ownership
    const repo = await prisma.repo.findFirst({
      where: { id: repoId, ownerId: userId },
    });

    if (!repo) {
      return res.status(404).json({ message: "Repository not found" });
    }

    // Cascade deletes reviews automatically
    await prisma.repo.delete({
      where: { id: repoId },
    });

    res.status(200).json({ message: "Repository removed successfully" });
  } catch (error) {
    logger.error("USER", "Error removing repository", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ message: "Internal server error" });
  }
};

// AI Settings

const PROVIDER_INFO: Record<string, { name: string; baseUrl: string; keyUrl: string }> = {
  openrouter: { name: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1/chat/completions", keyUrl: "https://openrouter.ai/keys" },
  openai: { name: "OpenAI", baseUrl: "https://api.openai.com/v1/chat/completions", keyUrl: "https://platform.openai.com/api-keys" },
  anthropic: { name: "Anthropic", baseUrl: "https://api.anthropic.com/v1/messages", keyUrl: "https://console.anthropic.com/settings/keys" },
  google: { name: "Google AI", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", keyUrl: "https://aistudio.google.com/apikey" },
  default: { name: "Default (Free)", baseUrl: "https://openrouter.ai/api/v1/chat/completions", keyUrl: "" },
};

const updateAISettingsSchema = z.object({
  apiKey: z.string().max(4096, "API key is too long").optional(),
  model: z.string().max(200, "Model ID is too long").optional(),
  provider: z.enum(["openrouter", "openai", "anthropic", "google", "default"]).optional(),
  useDefaultApiKey: z.boolean().optional().default(false),
  useDefaultModel: z.boolean().optional().default(false),
});

const modelIdSchema = z.string()
  .trim()
  .min(1, "Model ID is required")
  .max(200, "Model ID is too long")
  .regex(/^[a-zA-Z0-9._/:@+-]+$/, "Model ID contains invalid characters");

function serializeAISettings(user: {
  aiApiKey: string | null;
  aiModel: string | null;
  aiProvider: string;
  aiBaseUrl: string | null;
}) {
  const provider = user.aiProvider || "default";
  const info = PROVIDER_INFO[provider] || PROVIDER_INFO.default;

  return {
    provider,
    providerName: info.name,
    defaultModel: DEFAULT_OPENROUTER_MODEL,
    model: getEffectiveOpenRouterModel(user.aiModel),
    customModel: user.aiModel ?? "",
    hasCustomApiKey: Boolean(user.aiApiKey),
    usesDefaultApiKey: !user.aiApiKey,
    usesDefaultModel: !user.aiModel,
    hasDefaultApiKey: Boolean(getDefaultOpenRouterApiKey()),
    baseUrl: user.aiBaseUrl || info.baseUrl,
  };
}

export const getAISettings = async (req: Request, res: Response) => {
  const userId = (req as RequestWithUser).user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { aiApiKey: true, aiModel: true, aiProvider: true, aiBaseUrl: true },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(serializeAISettings(user));
  } catch (error) {
    logger.error("USER", "Error fetching AI settings", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateAISettings = async (req: Request, res: Response) => {
  const userId = (req as RequestWithUser).user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const parsed = updateAISettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  const { apiKey, model, useDefaultApiKey, useDefaultModel, provider } = parsed.data;

  try {
    const current = await prisma.user.findUnique({
      where: { id: userId },
      select: { aiApiKey: true, aiModel: true, aiProvider: true },
    });

    if (!current) {
      return res.status(404).json({ message: "User not found" });
    }

    const data: Record<string, unknown> = {};

    // Provider change
    if (provider) {
      data.aiProvider = provider;
      const info = PROVIDER_INFO[provider];
      if (info) data.aiBaseUrl = info.baseUrl;
    }

    // API key
    if (useDefaultApiKey) {
      data.aiApiKey = null;
    } else if (typeof apiKey === "string" && apiKey.trim()) {
      data.aiApiKey = encryptAISecret(apiKey);
    } else if (useDefaultApiKey === false && !current.aiApiKey && apiKey === "") {
      return res.status(400).json({ message: "API key is required when default key is disabled" });
    }

    // Model
    if (useDefaultModel) {
      data.aiModel = null;
    } else if (typeof model === "string") {
      const modelResult = modelIdSchema.safeParse(model);
      if (!modelResult.success) {
        return res.status(400).json({ message: modelResult.error.issues[0].message });
      }
      data.aiModel = modelResult.data;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: { aiApiKey: true, aiModel: true, aiProvider: true, aiBaseUrl: true },
    });

    res.status(200).json(serializeAISettings(updated));
  } catch (error) {
    logger.error("USER", "Error updating AI settings", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ message: "Internal server error" });
  }
};

// ─── Enhanced Metrics ───────────────────────────────────────────────────────

// Review Settings

const updateReviewSettingsSchema = z.object({
  aiReviewsEnabled: z.boolean().optional(),
  defaultRepoReviewOn: z.boolean().optional(),
});

function serializeReviewSettings(user: {
  aiReviewsEnabled: boolean;
  defaultRepoReviewOn: boolean;
}) {
  return {
    aiReviewsEnabled: user.aiReviewsEnabled,
    defaultRepoReviewOn: user.defaultRepoReviewOn,
  };
}

export const getReviewSettings = async (req: Request, res: Response) => {
  const userId = (req as RequestWithUser).user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { aiReviewsEnabled: true, defaultRepoReviewOn: true },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(serializeReviewSettings(user));
  } catch (error) {
    logger.error("USER", "Error fetching review settings", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateReviewSettings = async (req: Request, res: Response) => {
  const userId = (req as RequestWithUser).user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const parsed = updateReviewSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  try {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: parsed.data,
      select: { aiReviewsEnabled: true, defaultRepoReviewOn: true },
    });

    res.status(200).json(serializeReviewSettings(updated));
  } catch (error) {
    logger.error("USER", "Error updating review settings", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getEnhancedMetrics = async (req: Request, res: Response) => {
  const userId = (req as RequestWithUser).user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Fetch all data in parallel
    const [
      insights,
      recentReviews,
      reviewsByConclusion,
      topRepos,
      dailyActivity,
    ] = await Promise.all([
      // 1. Basic insights
      prisma.insight.findUnique({
        where: { ownerId: userId },
      }),

      // 2. Recent reviews for timeline
      prisma.review.findMany({
        where: { ownerId: userId },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          repo: { select: { name: true } },
        },
      }),

      // 3. Count reviews by their rating tiers (as a proxy for conclusion severity)
      // Since conclusion isn't stored, we use rating: 1-2=issues, 3=neutral, 4-5=clean
      prisma.review.groupBy({
        by: ["rating"],
        where: { ownerId: userId, rating: { not: null } },
        _count: { id: true },
      }),

      // 4. Top repos by review count
      prisma.repo.findMany({
        where: { ownerId: userId },
        select: {
          id: true,
          name: true,
          _count: { select: { reviews: true } },
        },
        orderBy: { reviews: { _count: "desc" } },
        take: 5,
      }),

      // 5. Daily activity for last 7 days
      prisma.review.findMany({
        where: {
          ownerId: userId,
          createdAt: { gte: sevenDaysAgo },
        },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    // Build daily activity chart data
    const dailyCounts: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split("T")[0];
      dailyCounts[key] = 0;
    }
    for (const review of dailyActivity) {
      const key = review.createdAt.toISOString().split("T")[0];
      if (dailyCounts[key] !== undefined) {
        dailyCounts[key]++;
      }
    }

    // Compute severity breakdown from ratings
    let issuesCount = 0;
    let neutralCount = 0;
    let cleanCount = 0;
    for (const group of reviewsByConclusion) {
      const rating = group.rating ?? 3;
      const count = group._count.id;
      if (rating <= 2) issuesCount += count;
      else if (rating === 3) neutralCount += count;
      else cleanCount += count;
    }

    // Quality score = (clean / total) * 100
    const totalRated = issuesCount + neutralCount + cleanCount;
    const qualityScore = totalRated > 0
      ? Math.round((cleanCount / totalRated) * 100)
      : null;

    res.status(200).json({
      overview: {
        totalPRs: insights?.totalPRs ?? 0,
        totalReviews: insights?.totalReviews ?? 0,
        avgRating: insights?.avgRating ?? null,
        issuesFound: insights?.issuesFound ?? issuesCount,
        cleanPasses: insights?.cleanPasses ?? cleanCount,
        lastReviewAt: insights?.lastReviewAt ?? null,
        qualityScore,
      },
      severityBreakdown: {
        issues: issuesCount,
        neutral: neutralCount,
        clean: cleanCount,
      },
      dailyActivity: Object.entries(dailyCounts).map(([date, count]) => ({
        date,
        count,
        label: new Date(date).toLocaleDateString("en-US", { weekday: "short" }),
      })),
      topRepos: topRepos.map((r: { id: string; name: string; _count: { reviews: number } }) => ({
        id: r.id,
        name: r.name,
        reviewCount: r._count.reviews,
      })),
      recentTimeline: recentReviews.map((r: { id: string; repo: { name: string } | null; rating: number | null; comment: string | null; createdAt: Date }) => ({
        id: r.id,
        repoName: r.repo?.name ?? "Unknown",
        rating: r.rating,
        comment: r.comment?.substring(0, 120) ?? "",
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    logger.error("USER", "Error fetching enhanced metrics", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ message: "Internal server error" });
  }
};

// ─── Onboarding ─────────────────────────────────────────────────────────────

export const getOnboardingStatus = async (req: Request, res: Response) => {
  const userId = (req as RequestWithUser).user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { onboardingComplete: true, aiProvider: true, aiModel: true },
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({
      onboardingComplete: user.onboardingComplete,
      aiProvider: user.aiProvider,
      aiModel: user.aiModel,
    });
  } catch (error) {
    logger.error("USER", "Error fetching onboarding status", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ message: "Internal server error" });
  }
};

const onboardingSchema = z.object({
  provider: z.enum(["openrouter", "openai", "default"]),
  apiKey: z.string().optional(),
  model: z.string().optional(),
  baseUrl: z.string().url().optional(),
});

export const completeOnboarding = async (req: Request, res: Response) => {
  const userId = (req as RequestWithUser).user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const parsed = onboardingSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });

  const { provider, apiKey, model, baseUrl } = parsed.data;

  try {
    const updateData: Record<string, unknown> = {
      aiProvider: provider,
      aiModel: model || null,
      aiBaseUrl: baseUrl || null,
      onboardingComplete: true,
    };

    // Encrypt the API key if provided (AES-256-GCM)
    if (apiKey && apiKey.trim()) {
      updateData.aiApiKey = encryptAISecret(apiKey.trim());
    }

    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    res.status(200).json({ message: "Onboarding complete", provider });
  } catch (error) {
    logger.error("USER", "Error completing onboarding", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ message: "Internal server error" });
  }
};
