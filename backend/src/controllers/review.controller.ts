import { Request, Response } from "express";
import prisma from "../db/prismaClient.js";
import { logger } from "../utils/logger.js";
import { z } from "zod";
import { RequestWithUser } from "../types/auth.js";
import axios from "axios";
import { decryptAISecret } from "../utils/aiSettings.js";

// ─── Get Single Review Detail ───────────────────────────────────────────────

export const getReviewDetail = async (req: Request, res: Response) => {
  const userId = (req as RequestWithUser).user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { reviewId } = req.params;
  if (!reviewId) return res.status(400).json({ message: "Review ID required" });

  try {
    const review = await prisma.review.findFirst({
      where: { id: reviewId, ownerId: userId },
      include: {
        repo: { select: { id: true, name: true, url: true, language: true } },
      },
    });

    if (!review) return res.status(404).json({ message: "Review not found" });

    res.status(200).json(review);
  } catch (error) {
    logger.error("REVIEW", "Error fetching review detail", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ message: "Internal server error" });
  }
};

// ─── Review History & Trends ────────────────────────────────────────────────

export const getReviewHistory = async (req: Request, res: Response) => {
  const userId = (req as RequestWithUser).user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const days = Math.min(Number(req.query.days) || 90, 365);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  try {
    const reviews = await prisma.review.findMany({
      where: { ownerId: userId, createdAt: { gte: since } },
      select: {
        id: true, rating: true, riskScore: true, findingsCount: true,
        criticalCount: true, highCount: true, pipelineVersion: true,
        createdAt: true,
        repo: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // Build daily aggregates
    const dailyMap: Record<string, { count: number; avgRating: number; totalRisk: number; totalFindings: number; ratings: number[] }> = {};
    for (const r of reviews) {
      const key = r.createdAt.toISOString().split("T")[0];
      if (!dailyMap[key]) dailyMap[key] = { count: 0, avgRating: 0, totalRisk: 0, totalFindings: 0, ratings: [] };
      dailyMap[key].count++;
      if (r.rating != null) dailyMap[key].ratings.push(r.rating);
      dailyMap[key].totalRisk += r.riskScore ?? 0;
      dailyMap[key].totalFindings += r.findingsCount ?? 0;
    }

    const dailyTrends = Object.entries(dailyMap).map(([date, d]) => ({
      date,
      reviews: d.count,
      avgRating: d.ratings.length > 0 ? +(d.ratings.reduce((a, b) => a + b, 0) / d.ratings.length).toFixed(1) : null,
      avgRisk: d.count > 0 ? Math.round(d.totalRisk / d.count) : 0,
      totalFindings: d.totalFindings,
    }));

    // Per-repo aggregates
    const repoMap: Record<string, { name: string; reviews: number; avgRating: number; ratings: number[]; findings: number }> = {};
    for (const r of reviews) {
      const rid = r.repo?.id ?? "unknown";
      if (!repoMap[rid]) repoMap[rid] = { name: r.repo?.name ?? "Unknown", reviews: 0, avgRating: 0, ratings: [], findings: 0 };
      repoMap[rid].reviews++;
      if (r.rating != null) repoMap[rid].ratings.push(r.rating);
      repoMap[rid].findings += r.findingsCount ?? 0;
    }

    const repoTrends = Object.entries(repoMap).map(([id, d]) => ({
      id, name: d.name, reviews: d.reviews,
      avgRating: d.ratings.length > 0 ? +(d.ratings.reduce((a, b) => a + b, 0) / d.ratings.length).toFixed(1) : null,
      findings: d.findings,
    })).sort((a, b) => b.reviews - a.reviews);

    res.status(200).json({
      totalReviews: reviews.length,
      dailyTrends,
      repoTrends,
      reviews: reviews.map(r => ({
        id: r.id, rating: r.rating, riskScore: r.riskScore,
        findingsCount: r.findingsCount, criticalCount: r.criticalCount,
        highCount: r.highCount, pipelineVersion: r.pipelineVersion,
        createdAt: r.createdAt, repoName: r.repo?.name ?? "Unknown",
      })),
    });
  } catch (error) {
    logger.error("REVIEW", "Error fetching review history", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ message: "Internal server error" });
  }
};

// ─── Compare Reviews ────────────────────────────────────────────────────────

export const compareReviews = async (req: Request, res: Response) => {
  const userId = (req as RequestWithUser).user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const ids = (req.query.ids as string || "").split(",").filter(Boolean);
  if (ids.length !== 2) return res.status(400).json({ message: "Provide exactly 2 review IDs" });

  try {
    const reviews = await prisma.review.findMany({
      where: { id: { in: ids }, ownerId: userId },
      include: { repo: { select: { id: true, name: true } } },
    });

    if (reviews.length !== 2) return res.status(404).json({ message: "One or both reviews not found" });

    res.status(200).json({ reviews });
  } catch (error) {
    logger.error("REVIEW", "Error comparing reviews", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ message: "Internal server error" });
  }
};

// ─── Custom Rules CRUD ──────────────────────────────────────────────────────

const customRuleSchema = z.object({
  name: z.string().min(1).max(100),
  pattern: z.string().min(1).max(500),
  description: z.string().max(500).optional(),
  severity: z.enum(["critical", "high", "medium", "low"]).default("medium"),
  category: z.enum(["custom", "security", "performance", "style"]).default("custom"),
  isEnabled: z.boolean().default(true),
});

export const getCustomRules = async (req: Request, res: Response) => {
  const userId = (req as RequestWithUser).user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  try {
    const rules = await prisma.customRule.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json(rules);
  } catch (error) {
    logger.error("RULES", "Error fetching custom rules", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ message: "Internal server error" });
  }
};

export const createCustomRule = async (req: Request, res: Response) => {
  const userId = (req as RequestWithUser).user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const parsed = customRuleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });

  try {
    const count = await prisma.customRule.count({ where: { ownerId: userId } });
    if (count >= 25) return res.status(400).json({ message: "Maximum 25 custom rules allowed" });

    const rule = await prisma.customRule.create({
      data: { ...parsed.data, ownerId: userId },
    });
    res.status(201).json(rule);
  } catch (error) {
    logger.error("RULES", "Error creating custom rule", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateCustomRule = async (req: Request, res: Response) => {
  const userId = (req as RequestWithUser).user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { ruleId } = req.params;
  const parsed = customRuleSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });

  try {
    const existing = await prisma.customRule.findFirst({ where: { id: ruleId, ownerId: userId } });
    if (!existing) return res.status(404).json({ message: "Rule not found" });

    const rule = await prisma.customRule.update({ where: { id: ruleId }, data: parsed.data });
    res.status(200).json(rule);
  } catch (error) {
    logger.error("RULES", "Error updating custom rule", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteCustomRule = async (req: Request, res: Response) => {
  const userId = (req as RequestWithUser).user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { ruleId } = req.params;
  try {
    const existing = await prisma.customRule.findFirst({ where: { id: ruleId, ownerId: userId } });
    if (!existing) return res.status(404).json({ message: "Rule not found" });

    await prisma.customRule.delete({ where: { id: ruleId } });
    res.status(200).json({ message: "Rule deleted" });
  } catch (error) {
    logger.error("RULES", "Error deleting custom rule", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ message: "Internal server error" });
  }
};

// ─── Code Quality Badge ─────────────────────────────────────────────────────

export const getRepoBadge = async (req: Request, res: Response) => {
  const { repoId } = req.params;

  try {
    const repo = await prisma.repo.findUnique({
      where: { id: repoId },
      select: { name: true, ownerId: true },
    });

    if (!repo) return res.status(404).send("Not found");

    const reviews = await prisma.review.findMany({
      where: { repoId, rating: { not: null } },
      select: { rating: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const avgRating = reviews.length > 0
      ? reviews.reduce((s, r) => s + (r.rating ?? 0), 0) / reviews.length
      : 0;

    const score = Math.round(avgRating * 20); // 0-100
    const color = score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : score >= 40 ? "#f97316" : "#ef4444";
    const label = "code quality";
    const value = reviews.length > 0 ? `${score}%` : "n/a";

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="140" height="20" role="img">
  <linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>
  <clipPath id="r"><rect width="140" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="82" height="20" fill="#555"/>
    <rect x="82" width="58" height="20" fill="${color}"/>
    <rect width="140" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="41" y="15" fill="#010101" fill-opacity=".3">${label}</text>
    <text x="41" y="14">${label}</text>
    <text x="111" y="15" fill="#010101" fill-opacity=".3">${value}</text>
    <text x="111" y="14">${value}</text>
  </g>
</svg>`;

    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.send(svg);
  } catch (error) {
    logger.error("BADGE", "Error generating badge", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).send("Error");
  }
};

// ─── Create GitHub Issue from Finding ───────────────────────────────────────

const createIssueSchema = z.object({
  title: z.string().min(1).max(256),
  body: z.string().min(1).max(65536),
  repoFullName: z.string().regex(/^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/),
});

export const createGitHubIssue = async (req: Request, res: Response) => {
  const userId = (req as RequestWithUser).user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const parsed = createIssueSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { githubToken: true },
    });

    if (!user?.githubToken) {
      return res.status(400).json({ message: "GitHub token not available. Please re-login." });
    }

    let token: string | null;
    try {
      token = decryptAISecret(user.githubToken);
    } catch {
      return res.status(400).json({ message: "GitHub token decryption failed. Please re-login." });
    }

    const { title, body, repoFullName } = parsed.data;
    const response = await axios.post(
      `https://api.github.com/repos/${repoFullName}/issues`,
      { title, body, labels: ["reviewhog", "ai-review"] },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
        },
      }
    );

    res.status(201).json({
      issueUrl: response.data.html_url,
      issueNumber: response.data.number,
    });
  } catch (error) {
    logger.error("ISSUE", "Error creating GitHub issue", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ message: "Failed to create GitHub issue" });
  }
};

// ─── Re-run Review (mark for re-processing) ────────────────────────────────

export const rerunReview = async (req: Request, res: Response) => {
  const userId = (req as RequestWithUser).user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { reviewId } = req.params;

  try {
    const review = await prisma.review.findFirst({
      where: { id: reviewId, ownerId: userId },
      select: { id: true, prUrl: true, repoId: true },
    });

    if (!review) return res.status(404).json({ message: "Review not found" });
    if (!review.prUrl) return res.status(400).json({ message: "No PR URL associated with this review. Cannot re-run." });

    // Delete the existing review so the webhook dedup check passes
    await prisma.review.delete({ where: { id: reviewId } });

    res.status(200).json({
      message: "Review deleted. Push a new commit or re-open the PR to trigger a fresh review.",
      prUrl: review.prUrl,
    });
  } catch (error) {
    logger.error("REVIEW", "Error re-running review", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ message: "Internal server error" });
  }
};
