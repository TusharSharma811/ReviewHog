import { Request, Response } from "express";
import prisma from "../db/prismaClient.js";
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

    res.status(200).json({
      ...userData,
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
    console.error("Error fetching user insights:", error);
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
    console.error("Error toggling GitHub reviews:", error);
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
  const url = `https://github.com/${name}`;

  try {
    // Check if repo already exists for this user
    const existing = await prisma.repo.findFirst({
      where: { url, ownerId: userId },
    });

    if (existing) {
      return res.status(409).json({ message: "Repository already connected" });
    }

    const repo = await prisma.repo.create({
      data: {
        name,
        description,
        language,
        url,
        ownerId: userId,
        isReviewOn: false, // AI reviews need GitHub App installed
      },
    });

    res.status(201).json({
      message: "Repository added successfully",
      repo,
    });
  } catch (error) {
    console.error("Error adding repository:", error);
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
    console.error("Error removing repository:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ─── Enhanced Metrics ───────────────────────────────────────────────────────

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
    console.error("Error fetching enhanced metrics:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
