/**
 * V2 Pipeline — Smart Chunker
 *
 * Groups classified files into review chunks that fit within
 * the model's context window. Files are sorted by risk tier
 * so critical files are reviewed first. Oversized files are
 * truncated to fit a single chunk.
 */

import type { ClassifiedFile, ReviewChunk, RiskTier, FileCategory } from "./types.js";
import { estimateTokens } from "./classifier.js";

/**
 * Max tokens per chunk sent to a reviewer.
 * We reserve ~2K tokens for the system prompt and ~2K for the output,
 * so from an 8K context model this leaves ~4K for code.
 * For larger-context models this can be bumped.
 */
const MAX_CHUNK_TOKENS = 6000;

/**
 * If a single file exceeds this, we truncate its fullContent
 * and keep only the diff (which is more important for review).
 */
const MAX_SINGLE_FILE_TOKENS = 5000;

const RISK_ORDER: Record<RiskTier, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

// ─── Truncation ─────────────────────────────────────────────────────────────

function truncateFile(file: ClassifiedFile, maxTokens: number): ClassifiedFile {
  const patchTokens = estimateTokens(file.patch);

  if (patchTokens >= maxTokens) {
    // Even the diff is too large — truncate it
    const charLimit = maxTokens * 3; // rough reverse of estimateTokens
    return {
      ...file,
      patch: file.patch.slice(0, charLimit) + "\n... (diff truncated)",
      fullContent: "(full content omitted — file too large)",
      tokenEstimate: maxTokens,
    };
  }

  // Keep full diff, truncate the full-file context
  const remainingTokens = maxTokens - patchTokens;
  const contextCharLimit = remainingTokens * 3;

  return {
    ...file,
    fullContent:
      file.fullContent.length > contextCharLimit
        ? file.fullContent.slice(0, contextCharLimit) + "\n... (context truncated)"
        : file.fullContent,
    tokenEstimate: Math.min(file.tokenEstimate, maxTokens),
  };
}

// ─── Chunk Construction ─────────────────────────────────────────────────────

function computeMaxRiskTier(files: ClassifiedFile[]): RiskTier {
  let maxRisk: RiskTier = "low";
  for (const f of files) {
    if (RISK_ORDER[f.riskTier] < RISK_ORDER[maxRisk]) {
      maxRisk = f.riskTier;
    }
  }
  return maxRisk;
}

function computeDominantCategory(files: ClassifiedFile[]): FileCategory {
  const counts = new Map<FileCategory, number>();
  for (const f of files) {
    counts.set(f.category, (counts.get(f.category) || 0) + 1);
  }
  let dominant: FileCategory = "other";
  let maxCount = 0;
  for (const [cat, count] of counts) {
    if (count > maxCount) {
      maxCount = count;
      dominant = cat;
    }
  }
  return dominant;
}

function makeChunk(files: ClassifiedFile[], counter: { value: number }): ReviewChunk {
  counter.value++;
  return {
    id: `chunk-${counter.value}`,
    files,
    totalTokens: files.reduce((sum, f) => sum + f.tokenEstimate, 0),
    maxRiskTier: computeMaxRiskTier(files),
    dominantCategory: computeDominantCategory(files),
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Groups classified files into token-bounded chunks.
 *
 * Strategy:
 * 1. Sort by risk tier (critical first)
 * 2. Bin-pack files into chunks up to MAX_CHUNK_TOKENS
 * 3. Oversized single files become their own truncated chunk
 */
export function buildChunks(files: ClassifiedFile[]): ReviewChunk[] {
  const counter = { value: 0 };

  if (files.length === 0) return [];

  // Sort: critical → high → medium → low
  const sorted = [...files].sort(
    (a, b) => RISK_ORDER[a.riskTier] - RISK_ORDER[b.riskTier]
  );

  const chunks: ReviewChunk[] = [];
  let currentFiles: ClassifiedFile[] = [];
  let currentTokens = 0;

  for (const file of sorted) {
    // Oversized file → standalone truncated chunk
    if (file.tokenEstimate > MAX_CHUNK_TOKENS) {
      // Flush current batch first
      if (currentFiles.length > 0) {
        chunks.push(makeChunk(currentFiles, counter));
        currentFiles = [];
        currentTokens = 0;
      }
      chunks.push(makeChunk([truncateFile(file, MAX_SINGLE_FILE_TOKENS)], counter));
      continue;
    }

    // Would exceed limit → flush and start new chunk
    if (currentTokens + file.tokenEstimate > MAX_CHUNK_TOKENS) {
      if (currentFiles.length > 0) {
        chunks.push(makeChunk(currentFiles, counter));
      }
      currentFiles = [file];
      currentTokens = file.tokenEstimate;
    } else {
      currentFiles.push(file);
      currentTokens += file.tokenEstimate;
    }
  }

  // Flush remaining
  if (currentFiles.length > 0) {
    chunks.push(makeChunk(currentFiles, counter));
  }

  return chunks;
}
