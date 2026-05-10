import { Request, Response } from "express";
import axios from "axios";
import prisma from "../db/prismaClient.js";
import { logger } from "../utils/logger.js";
import { RequestWithUser } from "../types/auth.js";

// ─── GitHub Event Types ─────────────────────────────────────────────────────

interface GitHubEvent {
  type: string;
  repo: { name: string };
  created_at: string;
  payload: {
    size?: number;       // PushEvent: number of commits
    action?: string;     // PullRequestEvent/IssuesEvent: opened/closed
    ref_type?: string;   // CreateEvent: branch/tag/repository
    commits?: unknown[];
  };
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface ActivitySummary {
  pushes: { thisWeek: number; thisMonth: number };
  commits: { thisWeek: number; thisMonth: number };
  prsOpened: { thisWeek: number; thisMonth: number };
  prsMerged: { thisWeek: number; thisMonth: number };
  issuesOpened: { thisWeek: number; thisMonth: number };
  branches: { thisMonth: number };
  mostActiveRepo: { name: string; eventCount: number } | null;
  languageBreakdown: { language: string; count: number }[];
  contributionStreak: number;
  dailyPushes: { date: string; count: number; label: string }[];
  repoActivity: { name: string; pushes: number; prs: number; issues: number }[];
}

// ─── Controller ─────────────────────────────────────────────────────────────

export const getGitHubActivity = async (req: Request, res: Response) => {
  const userId = (req as RequestWithUser).user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { githubToken: true, name: true },
    });

    if (!user?.githubToken) {
      return res.status(200).json({
        available: false,
        message: "Please re-login to enable GitHub activity tracking.",
      });
    }

    const headers = {
      Authorization: `Bearer ${user.githubToken}`,
      Accept: "application/vnd.github+json",
    };

    // Fetch up to 300 events (3 pages x 100) — GitHub keeps ~90 days of events
    let allEvents: GitHubEvent[] = [];
    try {
      const pages = await Promise.all([
        axios.get<GitHubEvent[]>(
          `https://api.github.com/users/${user.name}/events?per_page=100&page=1`,
          { headers }
        ),
        axios.get<GitHubEvent[]>(
          `https://api.github.com/users/${user.name}/events?per_page=100&page=2`,
          { headers }
        ),
        axios.get<GitHubEvent[]>(
          `https://api.github.com/users/${user.name}/events?per_page=100&page=3`,
          { headers }
        ),
      ]);
      allEvents = pages.flatMap((p) => p.data);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        // Token expired or revoked
        return res.status(200).json({
          available: false,
          message: "GitHub token expired. Please re-login.",
        });
      }
      throw err;
    }

    // Time boundaries
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // ── Aggregate stats ─────────────────────────────────────────────────
    const stats: ActivitySummary = {
      pushes: { thisWeek: 0, thisMonth: 0 },
      commits: { thisWeek: 0, thisMonth: 0 },
      prsOpened: { thisWeek: 0, thisMonth: 0 },
      prsMerged: { thisWeek: 0, thisMonth: 0 },
      issuesOpened: { thisWeek: 0, thisMonth: 0 },
      branches: { thisMonth: 0 },
      mostActiveRepo: null,
      languageBreakdown: [],
      contributionStreak: 0,
      dailyPushes: [],
      repoActivity: [],
    };

    const repoEventCounts = new Map<string, number>();
    const repoPushCounts = new Map<string, number>();
    const repoPRCounts = new Map<string, number>();
    const repoIssueCounts = new Map<string, number>();
    const dailyPushMap = new Map<string, number>();

    // Initialize last 14 days for daily push chart
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      dailyPushMap.set(d.toISOString().split("T")[0], 0);
    }

    // Track days with activity for streak calculation
    const activeDays = new Set<string>();

    for (const event of allEvents) {
      const eventDate = new Date(event.created_at);
      const dateKey = eventDate.toISOString().split("T")[0];
      const isThisWeek = eventDate >= oneWeekAgo;
      const isThisMonth = eventDate >= oneMonthAgo;

      if (!isThisMonth) continue; // Skip events older than 30 days

      const repoName = event.repo.name;
      repoEventCounts.set(repoName, (repoEventCounts.get(repoName) || 0) + 1);

      switch (event.type) {
        case "PushEvent": {
          const commitCount = event.payload.size ?? event.payload.commits?.length ?? 1;
          stats.pushes.thisMonth++;
          stats.commits.thisMonth += commitCount;
          repoPushCounts.set(repoName, (repoPushCounts.get(repoName) || 0) + 1);
          activeDays.add(dateKey);

          if (isThisWeek) {
            stats.pushes.thisWeek++;
            stats.commits.thisWeek += commitCount;
          }

          // Daily push tracking
          if (dailyPushMap.has(dateKey)) {
            dailyPushMap.set(dateKey, (dailyPushMap.get(dateKey) || 0) + 1);
          }
          break;
        }
        case "PullRequestEvent":
          if (event.payload.action === "opened") {
            stats.prsOpened.thisMonth++;
            repoPRCounts.set(repoName, (repoPRCounts.get(repoName) || 0) + 1);
            activeDays.add(dateKey);
            if (isThisWeek) stats.prsOpened.thisWeek++;
          } else if (event.payload.action === "closed") {
            stats.prsMerged.thisMonth++;
            if (isThisWeek) stats.prsMerged.thisWeek++;
          }
          break;
        case "IssuesEvent":
          if (event.payload.action === "opened") {
            stats.issuesOpened.thisMonth++;
            repoIssueCounts.set(repoName, (repoIssueCounts.get(repoName) || 0) + 1);
            activeDays.add(dateKey);
            if (isThisWeek) stats.issuesOpened.thisWeek++;
          }
          break;
        case "CreateEvent":
          if (event.payload.ref_type === "branch") {
            stats.branches.thisMonth++;
          }
          break;
      }
    }

    // ── Most active repo ────────────────────────────────────────────────
    let maxEvents = 0;
    let mostActiveRepoName = "";
    for (const [name, count] of repoEventCounts) {
      if (count > maxEvents) {
        maxEvents = count;
        mostActiveRepoName = name;
      }
    }
    if (mostActiveRepoName) {
      stats.mostActiveRepo = {
        name: mostActiveRepoName,
        eventCount: maxEvents,
      };
    }

    // ── Contribution streak (consecutive days going back from today) ────
    let streak = 0;
    for (let i = 0; i < 60; i++) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split("T")[0];
      if (activeDays.has(key)) {
        streak++;
      } else if (i > 0) {
        break; // Streak broken
      }
    }
    stats.contributionStreak = streak;

    // ── Daily pushes chart data ─────────────────────────────────────────
    stats.dailyPushes = Array.from(dailyPushMap.entries()).map(([date, count]) => ({
      date,
      count,
      label: new Date(date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
    }));

    // ── Per-repo activity breakdown (top 5) ─────────────────────────────
    const allRepos = new Set([
      ...repoPushCounts.keys(),
      ...repoPRCounts.keys(),
      ...repoIssueCounts.keys(),
    ]);

    const repoActivityArray = Array.from(allRepos).map((name) => ({
      name: name.includes("/") ? name.split("/")[1] : name,
      pushes: repoPushCounts.get(name) || 0,
      prs: repoPRCounts.get(name) || 0,
      issues: repoIssueCounts.get(name) || 0,
    }));

    repoActivityArray.sort((a, b) =>
      (b.pushes + b.prs + b.issues) - (a.pushes + a.prs + a.issues)
    );

    stats.repoActivity = repoActivityArray.slice(0, 5);

    // ── Language breakdown from user's repos ────────────────────────────
    try {
      const reposRes = await axios.get<{ language: string | null }[]>(
        `https://api.github.com/users/${user.name}/repos?per_page=100&sort=updated`,
        { headers }
      );
      const langCounts = new Map<string, number>();
      for (const repo of reposRes.data) {
        if (repo.language) {
          langCounts.set(repo.language, (langCounts.get(repo.language) || 0) + 1);
        }
      }
      stats.languageBreakdown = Array.from(langCounts.entries())
        .map(([language, count]) => ({ language, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);
    } catch {
      // Language fetch failed — non-critical
    }

    res.status(200).json({
      available: true,
      ...stats,
    });
  } catch (error) {
    logger.error("GITHUB", "Error fetching GitHub activity", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ message: "Internal server error" });
  }
};
