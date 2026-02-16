import { Request, Response } from "express";
import prisma from "../db/prismaClient.js";
import { z } from "zod";

type RequestWithUser = Request & { user?: { id: string } };

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

const toggleRepoSchema = z.object({
  repoId: z.string().min(1, "Repository ID is required"),
});

export const toggleGithubReview = async (req: Request, res: Response) => {
  const parsed = toggleRepoSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  const { repoId } = parsed.data;

  try {
    const repo = await prisma.repo.findUnique({
      where: { id: repoId },
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
