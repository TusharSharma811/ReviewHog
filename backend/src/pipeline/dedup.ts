/**
 * V2 Pipeline — Finding Deduplication
 *
 * Merges near-duplicate findings from different reviewers.
 * When multiple reviewers flag the same file/area/category,
 * we keep the highest-confidence finding and merge context.
 */

import type { Finding } from "./types.js";

/**
 * Generates a dedup key for a finding.
 * Findings in the same file, same category, and overlapping line range
 * are considered duplicates.
 */
function dedupKey(f: Finding): string {
  // Bucket lines into groups of 5 to catch overlapping ranges
  // without being so coarse that unrelated findings get merged
  const lineBucket = f.lineRange
    ? `L${Math.floor(parseInt(f.lineRange.split("-")[0], 10) / 5)}`
    : `no-line-${f.title.slice(0, 30)}`;

  return `${f.file}::${f.category}::${lineBucket}`;
}

/**
 * Merges a group of duplicate findings into one.
 * Keeps the highest-confidence finding and appends context from others.
 */
function mergeDuplicates(group: Finding[]): Finding {
  // Sort by confidence descending
  const sorted = [...group].sort((a, b) => b.confidence - a.confidence);
  const best = sorted[0];

  // If multiple reviewers flagged the same thing, boost confidence slightly
  if (sorted.length > 1 && best.confidence < 0.95) {
    best.confidence = Math.min(1.0, best.confidence + 0.05 * (sorted.length - 1));
  }

  // If a different reviewer had a higher severity, escalate
  const maxSeverity = sorted.reduce((max, f) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return order[f.severity] < order[max] ? f.severity : max;
  }, best.severity);
  best.severity = maxSeverity;

  // Append additional context from other reviewers if they add value
  if (sorted.length > 1) {
    const otherReviewers = sorted
      .slice(1)
      .map((f) => f.reviewerType)
      .filter((r) => r !== best.reviewerType);

    if (otherReviewers.length > 0) {
      best.description += `\n\n_Also flagged by: ${otherReviewers.join(", ")} reviewer(s)._`;
    }
  }

  return best;
}

// ─── Public API ─────────────────────────────────────────────────────────────

export function deduplicateFindings(findings: Finding[]): Finding[] {
  if (findings.length === 0) return [];

  const groups = new Map<string, Finding[]>();

  for (const f of findings) {
    const key = dedupKey(f);
    const group = groups.get(key) || [];
    group.push(f);
    groups.set(key, group);
  }

  return Array.from(groups.values()).map(mergeDuplicates);
}
