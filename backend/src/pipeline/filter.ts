/**
 * V2 Pipeline — Confidence Filter & Ranking
 *
 * Drops low-confidence findings, sorts by severity + confidence,
 * and caps total findings to prevent information overload.
 */

import type { Finding, Severity } from "./types.js";

const MIN_CONFIDENCE = 0.55;
const MAX_FINDINGS = 10;

const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/**
 * Filters findings by minimum confidence threshold,
 * sorts by severity (critical first) then by confidence (highest first),
 * and caps at MAX_FINDINGS to keep reviews focused.
 */
export function filterAndRank(findings: Finding[]): Finding[] {
  return findings
    .filter((f) => f.confidence >= MIN_CONFIDENCE)
    .sort((a, b) => {
      // Primary: severity (critical > high > medium > low)
      const sevDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
      if (sevDiff !== 0) return sevDiff;

      // Secondary: confidence (higher first)
      return b.confidence - a.confidence;
    })
    .slice(0, MAX_FINDINGS);
}
