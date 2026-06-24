/**
 * V3 Pipeline — Stage 6: Final Report Generator
 *
 * Generates the final structured markdown report from the
 * deduplicated findings. This is a deterministic template —
 * no LLM call needed. The report is stored in stageMetadata
 * for the engine to extract as the pipeline summary.
 *
 * Report structure:
 * - Critical Issues
 * - Security Concerns
 * - Performance Improvements
 * - Maintainability Suggestions
 * - Positive Observations
 * - Standards Triggered
 */

import type { ReviewStage, ReviewContext, StageResult } from "./types.js";
import type { Finding, Severity, PipelineStats } from "../types.js";
import { logger } from "../../utils/logger.js";

const STAGE_NAME = "Report Generator";

const GITHUB_COMMENT_LIMIT = 65000;

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

// ─── Category-Based Grouping ────────────────────────────────────────────────

interface ReportSection {
  title: string;
  emoji: string;
  categories: Set<string>;
  findings: Finding[];
}

function buildReportSections(findings: Finding[]): ReportSection[] {
  const sections: ReportSection[] = [
    {
      title: "Critical Issues",
      emoji: "🚨",
      categories: new Set(["bug", "data-loss", "null-safety", "error-handling"]),
      findings: [],
    },
    {
      title: "Security Concerns",
      emoji: "🔒",
      categories: new Set(["security", "injection", "race-condition"]),
      findings: [],
    },
    {
      title: "Performance Improvements",
      emoji: "⚡",
      categories: new Set(["performance", "resource-leak"]),
      findings: [],
    },
    {
      title: "Maintainability Suggestions",
      emoji: "🔧",
      categories: new Set([
        "maintainability", "code-quality", "breaking-change",
        "standards-violation", "accessibility",
      ]),
      findings: [],
    },
  ];

  // Assign each finding to the first matching section
  const assigned = new Set<string>();

  for (const section of sections) {
    for (const f of findings) {
      if (section.categories.has(f.category) && !assigned.has(f.id)) {
        section.findings.push(f);
        assigned.add(f.id);
      }
    }
  }

  // Critical-severity findings go to "Critical Issues" regardless of category
  for (const f of findings) {
    if (f.severity === "critical" && !assigned.has(f.id)) {
      sections[0].findings.push(f);
      assigned.add(f.id);
    }
  }

  // Any unassigned findings go to the best-fit section
  for (const f of findings) {
    if (!assigned.has(f.id)) {
      sections[3].findings.push(f); // Default to Maintainability
      assigned.add(f.id);
    }
  }

  return sections.filter((s) => s.findings.length > 0);
}

// ─── Finding Formatter ──────────────────────────────────────────────────────

function formatFinding(f: Finding): string {
  const location = f.lineRange
    ? `\`${f.file}:${f.lineRange}\``
    : `\`${f.file}\``;

  const suggestion = f.suggestion
    ? `\n  → **Fix:** ${f.suggestion}`
    : "";

  const confidence = `_(${Math.round(f.confidence * 100)}% confidence)_`;

  const sources = f.source.length > 0
    ? `\n  📋 Source: ${f.source.join(", ")}`
    : "";

  return `${SEVERITY_EMOJI[f.severity]} **${f.title}** — ${location} ${confidence}\n${f.description}${suggestion}${sources}`;
}

// ─── Report Generator Stage ─────────────────────────────────────────────────

export class ReportGeneratorStage implements ReviewStage {
  name = STAGE_NAME;

  async execute(context: ReviewContext): Promise<StageResult> {
    const { prContext, accumulatedFindings } = context;

    logger.info("STAGE", `[${STAGE_NAME}] Generating report from ${accumulatedFindings.length} findings`, {
      prId: prContext.prId,
    });

    const sections: string[] = [];

    // ── Header ──
    sections.push(`## ReviewHog AI Review\n`);

    // ── Overview ──
    const riskScore = this.computeRiskScore(accumulatedFindings);
    const rating = this.deriveRating(accumulatedFindings);
    const ratingStars = "★".repeat(rating) + "☆".repeat(5 - rating);
    const conclusion = accumulatedFindings.some((f) => f.severity === "critical" || f.severity === "high")
      ? "❌"
      : accumulatedFindings.length === 0
        ? "✅"
        : "⚠️";

    sections.push(
      `${conclusion} **Risk Score: ${riskScore}/100** | **Rating: ${ratingStars}** | Pipeline v3\n`
    );

    if (accumulatedFindings.length === 0) {
      sections.push(
        `No actionable issues found. The changes look correct and safe to merge.\n`
      );
    } else {
      // ── Categorized Sections ──
      const reportSections = buildReportSections(accumulatedFindings);

      for (const section of reportSections) {
        sections.push(`### ${section.emoji} ${section.title} (${section.findings.length})\n`);

        for (const finding of section.findings) {
          sections.push(formatFinding(finding) + "\n");
        }
      }

      // ── Positive Observations ──
      const infoFindings = accumulatedFindings.filter((f) => f.severity === "info");
      if (infoFindings.length > 0) {
        sections.push(`### ✨ Positive Observations (${infoFindings.length})\n`);
        for (const f of infoFindings) {
          sections.push(formatFinding(f) + "\n");
        }
      }
    }

    // ── User Instructions Note ──
    const hasUserInstructions = Boolean(context.reviewInstructions?.trim());

    if (hasUserInstructions) {
      sections.push(`### 📋 Custom Review\n`);
      sections.push(`✓ User Instructions applied`);
      sections.push("");
    }

    // ── Footer ──
    sections.push(`---`);
    sections.push(
      `📊 ${accumulatedFindings.length} finding(s) | Pipeline v3`
    );
    sections.push(
      `🤖 Stages: General Review${hasUserInstructions ? " → User Instructions" : ""} → Dedup → Report`
    );

    let report = sections.join("\n");

    // Truncate if exceeding GitHub's comment size limit
    if (report.length > GITHUB_COMMENT_LIMIT) {
      const suffix =
        "\n\n---\n_Review truncated due to GitHub comment size limit._";
      report = report.slice(0, GITHUB_COMMENT_LIMIT - suffix.length) + suffix;
    }

    logger.info("STAGE", `[${STAGE_NAME}] Report generated`, {
      prId: prContext.prId,
      reportLength: report.length,
      findingsCount: accumulatedFindings.length,
    });

    return {
      stageName: STAGE_NAME,
      findings: [], // Report generator doesn't produce findings
      tokensUsed: 0,
      failed: false,
      metadata: { report },
    };
  }

  private computeRiskScore(findings: Finding[]): number {
    if (findings.length === 0) return 0;
    const weights = { critical: 40, high: 20, medium: 8, low: 2, info: 0 };
    let score = 0;
    for (const f of findings) {
      score += (weights[f.severity] ?? 0) * f.confidence;
    }
    return Math.min(100, Math.round(score));
  }

  private deriveRating(findings: Finding[]): number {
    const critCount = findings.filter((f) => f.severity === "critical").length;
    const highCount = findings.filter((f) => f.severity === "high").length;
    const medCount = findings.filter((f) => f.severity === "medium").length;
    if (critCount > 0) return 1;
    if (highCount >= 2) return 2;
    if (highCount === 1) return 3;
    if (medCount > 0) return 4;
    return 5;
  }
}
