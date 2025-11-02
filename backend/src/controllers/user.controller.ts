import { Request, Response } from "express";
import prisma from "../db/prismaClient.js";
import { Repo } from "@prisma/client";
export const getUserInsights = async (req: Request, res: Response) => {
  const userId = req.query.uid as string;
  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }
  try {
    const userData = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        repos: { include: { owner: true, reviews: { orderBy: { createdAt: "desc" }, take: 5 } } },
        reviews: {
                include: { repo: true},
                orderBy: { createdAt: "desc" },
                take: 5,
                select:{
                  repo:{ select: { id: true, name: true, ownerId: true } },
                }
        },
        insights: true,
      },
    });
    if (!userData) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(userData);
  } catch (error) {
    console.error("Error fetching user insights:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const toggleGithubReview = async (req: Request, res: Response) => {
  const userId = req.query.uid as string;
  const { repoId } = req.params;

  if (!userId || !repoId) {
    return res.status(400).json({ message: "User ID and Repository ID are required" });
  }

  try {
    const repo = await prisma.repo.findUnique({
      where: { id: repoId },
    });
    
    await prisma.repo.update({
      where: { id: repoId },
      data: { isReviewOn: !repo?.isReviewOn },
    });

    res.status(200).json({ message: "GitHub reviews toggled for repository" });
  } catch (error) {
    console.error("Error toggling GitHub reviews:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
