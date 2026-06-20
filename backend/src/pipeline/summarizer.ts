/**
 * V2 Pipeline — PR Summary Generator
 *
 * Takes ranked findings and produces the final markdown comment
 * posted on the GitHub PR. This is a deterministic template —
 * no LLM call needed, which makes it fast and predictable.
 */

import type { Finding, Conclusion, PipelineStats, PRContext, Severity } from "./types.js";

const SEVERITY_EMOJI: Record<Severity, string> = {
  critical: "🔴",
  high: "🟠",
  medium: "🟡",
  low: "🔵",
  info: "ℹ️",
};

const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  info: "Info",
};

const CONCLUSION_EMOJI: Record<Conclusion, string> = {
  success: "✅",
  failure: "❌",
  neutral: "⚠️",
};

const GITHUB_COMMENT_LIMIT = 65000;

// ─── Summary Input ──────────────────────────────────────────────────────────

export interface SummaryInput {
  findings: Finding[];
  riskScore: number;
  conclusion: Conclusion;
  rating: number;
  stats: PipelineStats;
  ctx: PRContext;
}

// ─── Format Helpers ─────────────────────────────────────────────────────────

function formatFinding(f: Finding): string {
  const location = f.lineRange
    ? `\`${f.file}:${f.lineRange}\``
    : `\`${f.file}\``;

  const suggestion = f.suggestion
    ? `\n  → **Fix:** ${f.suggestion}`
    : "";

  const confidence = `_(${Math.round(f.confidence * 100)}% confidence)_`;

  return `**${f.title}** — ${location} ${confidence}\n${f.description}${suggestion}`;
}

function groupBySeverity(findings: Finding[]): Map<Severity, Finding[]> {
  const groups = new Map<Severity, Finding[]>();
  for (const f of findings) {
    const group = groups.get(f.severity) || [];
    group.push(f);
    groups.set(f.severity, group);
  }
  return groups;
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function generatePRSummary(input: SummaryInput): Promise<string> {
  const { findings, riskScore, conclusion, rating, stats } = input;

  const sections: string[] = [];

  // Header
  sections.push(`## ReviewHog AI Review\n`);

  // Overview line
  const ratingStars = "★".repeat(rating) + "☆".repeat(5 - rating);
  sections.push(
    `${CONCLUSION_EMOJI[conclusion]} **Risk Score: ${riskScore}/100** | **Rating: ${ratingStars}** | Reviewed ${stats.filesReviewed} file(s)\n`
  );

  if (findings.length === 0) {
    // Clean bill of health
    sections.push(
      `No actionable issues found. The changes look correct and safe to merge.\n`
    );
    sections.push(
      `> Reviewed by: ${stats.reviewersRun.join(", ")} reviewer(s) across ${stats.chunksProcessed} chunk(s)\n`
    );
  } else {
    // Group findings by severity
    const grouped = groupBySeverity(findings);
    const severityOrder: Severity[] = ["critical", "high", "medium", "low"];

    for (const severity of severityOrder) {
      const group = grouped.get(severity);
      if (!group || group.length === 0) continue;

      sections.push(
        `### ${SEVERITY_EMOJI[severity]} ${SEVERITY_LABEL[severity]} (${group.length})\n`
      );

      for (const finding of group) {
        sections.push(formatFinding(finding) + "\n");
      }
    }
  }

  // Footer
  sections.push(`---`);
  sections.push(
    `📊 ${findings.length} finding(s) | ${stats.filesReviewed} files reviewed | ${stats.filesSkipped} skipped`
  );
  sections.push(
    `🤖 Reviewers: ${stats.reviewersRun.join(", ")}`
  );
  sections.push(
    `⚡ Processed in ${(stats.processingTimeMs / 1000).toFixed(1)}s | Pipeline v2`
  );

  let comment = sections.join("\n");

  // Truncate if exceeding GitHub's comment size limit
  if (comment.length > GITHUB_COMMENT_LIMIT) {
    const suffix =
      "\n\n---\n_Review truncated due to GitHub comment size limit._";
    comment = comment.slice(0, GITHUB_COMMENT_LIMIT - suffix.length) + suffix;
  }

  return comment;
}
