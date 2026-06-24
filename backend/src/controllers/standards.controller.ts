/**
 * Repo Settings Controller
 *
 * Endpoints for managing per-repo review instructions and temperature.
 */

import { Request, Response } from "express";
import prisma from "../db/prismaClient.js";
import { logger } from "../utils/logger.js";
import { z } from "zod";
import { RequestWithUser } from "../types/auth.js";

// ─── Validation Schemas ─────────────────────────────────────────────────────

const updateRepoSettingsSchema = z.object({
  reviewInstructions: z.string().max(5000, "Instructions too long").nullable().optional(),
  temperature: z.number().min(0).max(1).optional(),
});

// ─── Get Repo Settings ──────────────────────────────────────────────────────

export const getRepoSettings = async (req: Request, res: Response) => {
  const userId = (req as RequestWithUser).user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { repoId } = req.params;

  try {
    const repo = await prisma.repo.findFirst({
      where: { id: repoId, ownerId: userId },
      select: { id: true, name: true, reviewInstructions: true, temperature: true },
    });

    if (!repo) return res.status(404).json({ message: "Repository not found" });

    res.status(200).json({
      repoId: repo.id,
      repoName: repo.name,
      reviewInstructions: repo.reviewInstructions,
      temperature: repo.temperature,
    });
  } catch (error) {
    logger.error("REPO", "Error fetching repo settings", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ message: "Internal server error" });
  }
};

// ─── Update Repo Settings ───────────────────────────────────────────────────

export const updateRepoSettings = async (req: Request, res: Response) => {
  const userId = (req as RequestWithUser).user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { repoId } = req.params;
  const parsed = updateRepoSettingsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });

  try {
    const repo = await prisma.repo.findFirst({ where: { id: repoId, ownerId: userId } });
    if (!repo) return res.status(404).json({ message: "Repository not found" });

    const data: Record<string, unknown> = {};
    if (parsed.data.reviewInstructions !== undefined) {
      data.reviewInstructions = parsed.data.reviewInstructions;
    }
    if (parsed.data.temperature !== undefined) {
      data.temperature = parsed.data.temperature;
    }

    const updated = await prisma.repo.update({
      where: { id: repoId },
      data,
      select: { id: true, name: true, reviewInstructions: true, temperature: true },
    });

    res.status(200).json({
      repoId: updated.id,
      repoName: updated.name,
      reviewInstructions: updated.reviewInstructions,
      temperature: updated.temperature,
    });
  } catch (error) {
    logger.error("REPO", "Error updating repo settings", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ message: "Internal server error" });
  }
};
