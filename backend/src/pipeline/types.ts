/**
 * V2 Review Pipeline — Shared Types
 *
 * Central type definitions for the multi-stage, multi-reviewer
 * AI code review pipeline.
 */

// ─── File Classification ────────────────────────────────────────────────────

export type FileCategory =
  | "auth"
  | "api-route"
  | "database"
  | "middleware"
  | "business-logic"
  | "config"
  | "test"
  | "ui"
  | "util"
  | "other";

export type RiskTier = "critical" | "high" | "medium" | "low";

export interface PRFile {
  filename: string;
  status: string; // added | modified | removed | renamed
  patch: string;
  fullContent: string;
  contents_url: string;
}

export interface ClassifiedFile {
  filename: string;
  status: string;
  patch: string;
  fullContent: string;
  riskTier: RiskTier;
  language: string;
  category: FileCategory;
  tokenEstimate: number;
}

// ─── Chunking ───────────────────────────────────────────────────────────────

export interface ReviewChunk {
  id: string;
  files: ClassifiedFile[];
  totalTokens: number;
  maxRiskTier: RiskTier;
  dominantCategory: FileCategory;
}

// ─── PR Context ─────────────────────────────────────────────────────────────

export interface PRContext {
  prId: string;
  repoFullName: string;
  prTitle: string;
  prBody: string;
  baseBranch: string;
  headSha: string;
  ownerId: string;
  installationId: string;
  commentsUrl: string;
  prUrl: string;
  githubRepoId: string; // GitHub numeric repo ID for DB lookup
}

// ─── Findings ───────────────────────────────────────────────────────────────

export type ReviewerType =
  | "correctness"
  | "security"
  | "concurrency"
  | "api-contract"
  | "general"
  | "standard"
  | "user-prompt";

export type FindingCategory =
  | "bug"
  | "security"
  | "race-condition"
  | "data-loss"
  | "error-handling"
  | "injection"
  | "breaking-change"
  | "performance"
  | "null-safety"
  | "resource-leak"
  | "maintainability"
  | "code-quality"
  | "accessibility"
  | "standards-violation";

export type Severity = "critical" | "high" | "medium" | "low" | "info";

export interface Finding {
  id: string;
  reviewerType: ReviewerType;
  file: string;
  lineRange?: string; // e.g. "45-52"
  severity: Severity;
  confidence: number; // 0.0 – 1.0
  title: string;
  description: string;
  suggestion?: string;
  category: FindingCategory;
  source: string[]; // Tracks which stage(s) produced this finding
}

// ─── Pipeline Result ────────────────────────────────────────────────────────

export type Conclusion = "success" | "failure" | "neutral";

export interface PipelineStats {
  filesReviewed: number;
  filesSkipped: number;
  chunksProcessed: number;
  reviewersRun: string[];
  totalTokensUsed: number;
  processingTimeMs: number;
  stagesRun: string[];
}

export interface PipelineResult {
  findings: Finding[];
  riskScore: number; // 0–100
  conclusion: Conclusion;
  rating: number; // 1–5
  summary: string; // Final markdown comment body
  stats: PipelineStats;
}

// ─── Reviewer Interface ─────────────────────────────────────────────────────

export interface ReviewerOutput {
  findings: Finding[];
  noIssues: boolean;
}

export interface ReviewerConfig {
  type: ReviewerType;
  systemPrompt: string;
  minConfidence: number;
}
