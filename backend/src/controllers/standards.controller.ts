/**
 * Repository Standards Controller
 *
 * CRUD endpoints for managing repository review standards.
 * Standards are per-user and define LLM review prompts that
 * are run as separate stages in the V3 pipeline.
 */

import { Request, Response } from "express";
import prisma from "../db/prismaClient.js";
import { logger } from "../utils/logger.js";
import { z } from "zod";
import { RequestWithUser } from "../types/auth.js";

const MAX_STANDARDS_PER_USER = 10;

// ─── Validation Schemas ─────────────────────────────────────────────────────

const createStandardSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  prompt: z.string().min(10, "Prompt must be at least 10 characters").max(5000, "Prompt too long"),
  isEnabled: z.boolean().default(true),
});

const updateStandardSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  prompt: z.string().min(10).max(5000).optional(),
  isEnabled: z.boolean().optional(),
});

// ─── List Standards ─────────────────────────────────────────────────────────

export const getRepoStandards = async (req: Request, res: Response) => {
  const userId = (req as RequestWithUser).user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  try {
    const standards = await prisma.repoStandard.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json(standards);
  } catch (error) {
    logger.error("STANDARDS", "Error fetching repo standards", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ message: "Internal server error" });
  }
};

// ─── Create Standard ────────────────────────────────────────────────────────

export const createRepoStandard = async (req: Request, res: Response) => {
  const userId = (req as RequestWithUser).user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const parsed = createStandardSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });

  try {
    const count = await prisma.repoStandard.count({ where: { ownerId: userId } });
    if (count >= MAX_STANDARDS_PER_USER) {
      return res.status(400).json({ message: `Maximum ${MAX_STANDARDS_PER_USER} standards allowed` });
    }

    const standard = await prisma.repoStandard.create({
      data: { ...parsed.data, ownerId: userId },
    });
    res.status(201).json(standard);
  } catch (error) {
    logger.error("STANDARDS", "Error creating repo standard", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ message: "Internal server error" });
  }
};

// ─── Update Standard ────────────────────────────────────────────────────────

export const updateRepoStandard = async (req: Request, res: Response) => {
  const userId = (req as RequestWithUser).user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { standardId } = req.params;
  const parsed = updateStandardSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });

  try {
    const existing = await prisma.repoStandard.findFirst({ where: { id: standardId, ownerId: userId } });
    if (!existing) return res.status(404).json({ message: "Standard not found" });

    const standard = await prisma.repoStandard.update({ where: { id: standardId }, data: parsed.data });
    res.status(200).json(standard);
  } catch (error) {
    logger.error("STANDARDS", "Error updating repo standard", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ message: "Internal server error" });
  }
};

// ─── Delete Standard ────────────────────────────────────────────────────────

export const deleteRepoStandard = async (req: Request, res: Response) => {
  const userId = (req as RequestWithUser).user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { standardId } = req.params;
  try {
    const existing = await prisma.repoStandard.findFirst({ where: { id: standardId, ownerId: userId } });
    if (!existing) return res.status(404).json({ message: "Standard not found" });

    await prisma.repoStandard.delete({ where: { id: standardId } });
    res.status(200).json({ message: "Standard deleted" });
  } catch (error) {
    logger.error("STANDARDS", "Error deleting repo standard", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ message: "Internal server error" });
  }
};

// ─── Per-Repo Review Instructions ───────────────────────────────────────────

const updateReviewInstructionsSchema = z.object({
  reviewInstructions: z.string().max(5000, "Instructions too long").nullable(),
});

export const getRepoReviewInstructions = async (req: Request, res: Response) => {
  const userId = (req as RequestWithUser).user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { repoId } = req.params;

  try {
    const repo = await prisma.repo.findFirst({
      where: { id: repoId, ownerId: userId },
      select: { id: true, name: true, reviewInstructions: true },
    });

    if (!repo) return res.status(404).json({ message: "Repository not found" });

    res.status(200).json({
      repoId: repo.id,
      repoName: repo.name,
      reviewInstructions: repo.reviewInstructions,
    });
  } catch (error) {
    logger.error("STANDARDS", "Error fetching review instructions", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateRepoReviewInstructions = async (req: Request, res: Response) => {
  const userId = (req as RequestWithUser).user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { repoId } = req.params;
  const parsed = updateReviewInstructionsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });

  try {
    const repo = await prisma.repo.findFirst({ where: { id: repoId, ownerId: userId } });
    if (!repo) return res.status(404).json({ message: "Repository not found" });

    const updated = await prisma.repo.update({
      where: { id: repoId },
      data: { reviewInstructions: parsed.data.reviewInstructions },
      select: { id: true, name: true, reviewInstructions: true },
    });

    res.status(200).json({
      repoId: updated.id,
      repoName: updated.name,
      reviewInstructions: updated.reviewInstructions,
    });
  } catch (error) {
    logger.error("STANDARDS", "Error updating review instructions", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ message: "Internal server error" });
  }
};
