/**
 * V3 Pipeline — Stage Types
 *
 * Core interfaces for the multi-stage review pipeline.
 * Each stage implements ReviewStage and operates on a shared ReviewContext.
 */

import type { PRContext, Finding, PipelineResult } from "../types.js";
import type { ResolvedSettings } from "../../reviewers/base.js";

// ─── Repository Standard (matches Prisma model) ────────────────────────────

export interface RepoStandardRecord {
  id: string;
  name: string;
  prompt: string;
  isEnabled: boolean;
}

// ─── Review Context ─────────────────────────────────────────────────────────

export interface ReviewContext {
  /** PR metadata */
  prContext: PRContext;
  /** Full PR diff text (all files concatenated) */
  diff: string;
  /** Repository standards from DB */
  repoStandards: RepoStandardRecord[];
  /** Per-repo custom review instructions */
  reviewInstructions: string | null;
  /** Pre-resolved AI/LLM settings */
  aiSettings: ResolvedSettings;
  /** Findings accumulated across stages — stages append to this */
  accumulatedFindings: Finding[];
  /** Metadata accumulated across stages */
  stageMetadata: Record<string, unknown>;
}

// ─── Stage Result ───────────────────────────────────────────────────────────

export interface StageResult {
  stageName: string;
  findings: Finding[];
  tokensUsed: number;
  failed: boolean;
  metadata?: Record<string, unknown>;
}

// ─── Review Stage Interface ─────────────────────────────────────────────────

export interface ReviewStage {
  /** Human-readable name for logging and tracking */
  name: string;
  /** Execute the stage. Receives full context, returns stage-specific results. */
  execute(context: ReviewContext): Promise<StageResult>;
}
