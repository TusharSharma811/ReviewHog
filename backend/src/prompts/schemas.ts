/**
 * V2 Pipeline — Output Schemas
 *
 * Zod validation schemas and OpenRouter JSON Schema definitions
 * for reviewer outputs. Every reviewer returns findings in the
 * same structure, enabling uniform aggregation.
 */

import { z } from "zod";

// ─── Zod Schema ─────────────────────────────────────────────────────────────

export const findingSchema = z.object({
  file: z.string(),
  lineRange: z.string().optional(), // e.g. "45-52"
  severity: z.enum(["critical", "high", "medium", "low"]),
  confidence: z.number().min(0).max(1),
  title: z.string().max(150),
  description: z.string().max(800),
  suggestion: z.string().max(400).optional(),
  category: z.enum([
    "bug",
    "security",
    "race-condition",
    "data-loss",
    "error-handling",
    "injection",
    "breaking-change",
    "performance",
    "null-safety",
    "resource-leak",
  ]),
});

export const reviewerOutputSchema = z.object({
  findings: z.array(findingSchema),
  noIssues: z.boolean(),
});

export type FindingInput = z.infer<typeof findingSchema>;
export type ReviewerOutputInput = z.infer<typeof reviewerOutputSchema>;

// ─── OpenRouter JSON Schema (for response_format) ───────────────────────────

export const FINDING_JSON_SCHEMA = {
  type: "object" as const,
  properties: {
    findings: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          file: { type: "string" as const, description: "Relative file path" },
          lineRange: {
            type: "string" as const,
            description: "Approximate line range, e.g. '45-52'. Omit if unsure.",
          },
          severity: {
            type: "string" as const,
            enum: ["critical", "high", "medium", "low"],
            description: "Impact severity of this finding",
          },
          confidence: {
            type: "number" as const,
            minimum: 0,
            maximum: 1,
            description: "Your confidence this is a real issue (0.0 to 1.0)",
          },
          title: {
            type: "string" as const,
            description: "One-line summary of the issue (max 150 chars)",
          },
          description: {
            type: "string" as const,
            description:
              "Detailed explanation: what is wrong, why it fails, concrete failure scenario (max 800 chars)",
          },
          suggestion: {
            type: "string" as const,
            description: "Concrete fix or code change to resolve (max 400 chars)",
          },
          category: {
            type: "string" as const,
            enum: [
              "bug",
              "security",
              "race-condition",
              "data-loss",
              "error-handling",
              "injection",
              "breaking-change",
              "performance",
              "null-safety",
              "resource-leak",
            ],
          },
        },
        required: [
          "file",
          "severity",
          "confidence",
          "title",
          "description",
          "category",
        ],
        additionalProperties: false,
      },
    },
    noIssues: {
      type: "boolean" as const,
      description: "Set true ONLY if you found zero issues worth reporting",
    },
  },
  required: ["findings", "noIssues"],
  additionalProperties: false,
};

/**
 * Full response_format payload for OpenRouter structured output.
 */
export const REVIEWER_RESPONSE_FORMAT = {
  type: "json_schema" as const,
  json_schema: {
    name: "code_review_findings",
    strict: true,
    schema: FINDING_JSON_SCHEMA,
  },
};
