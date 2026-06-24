/**
 * V3 Pipeline — Stage Types
 *
 * Core interfaces for the multi-stage review pipeline.
 * Each stage implements ReviewStage and operates on a shared ReviewContext.
 */

import type { PRContext, Finding, PipelineResult, ReviewChunk } from "../types.js";
import type { ResolvedSettings } from "../../reviewers/base.js";

// ─── Review Context ─────────────────────────────────────────────────────────

export interface ReviewContext {
  /** PR metadata */
  prContext: PRContext;
  /** Full PR diff text (all files concatenated) */
  diff: string;
  /** Token-bounded review chunks */
  reviewChunks: ReviewChunk[];
  /** Per-repo custom user instructions */
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
  skipped?: boolean;  // True if stage had no work to do (no user instructions, etc.)
  metadata?: Record<string, unknown>;
}

// ─── Review Stage Interface ─────────────────────────────────────────────────

export interface ReviewStage {
  /** Human-readable name for logging and tracking */
  name: string;
  /** Execute the stage. Receives full context, returns stage-specific results. */
  execute(context: ReviewContext): Promise<StageResult>;
}
