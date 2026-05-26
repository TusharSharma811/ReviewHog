/**
 * V2 Pipeline — File Classifier & Risk Scorer
 *
 * Categorizes each PR file by its role (auth, api-route, database, etc.)
 * and assigns a risk tier (critical → low) based on the category, diff size,
 * and content signals (e.g. SQL, crypto, eval).
 */

import type { PRFile, ClassifiedFile, FileCategory, RiskTier } from "./types.js";

// ─── Language Detection ─────────────────────────────────────────────────────

const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "typescript",
  ".js": "javascript",
  ".jsx": "javascript",
  ".py": "python",
  ".rb": "ruby",
  ".go": "go",
  ".rs": "rust",
  ".java": "java",
  ".kt": "kotlin",
  ".cs": "csharp",
  ".php": "php",
  ".swift": "swift",
  ".sql": "sql",
  ".sh": "shell",
  ".bash": "shell",
  ".yml": "yaml",
  ".yaml": "yaml",
  ".json": "json",
  ".css": "css",
  ".scss": "css",
  ".html": "html",
  ".vue": "vue",
  ".svelte": "svelte",
};

function detectLanguage(filename: string): string {
  const lower = filename.toLowerCase();
  for (const [ext, lang] of Object.entries(EXTENSION_LANGUAGE_MAP)) {
    if (lower.endsWith(ext)) return lang;
  }
  return "unknown";
}

// ─── Token Estimation ───────────────────────────────────────────────────────

/**
 * Rough token estimate: ~4 characters per token for code.
 * Intentionally conservative to avoid context overflow.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5);
}

// ─── File Categorization ────────────────────────────────────────────────────

const CATEGORY_RULES: [RegExp, FileCategory][] = [
  // Auth / session / token handling
  [/\/(auth|login|session|oauth|jwt|token|signup|signin|password|credential)/i, "auth"],
  // API routes / controllers / handlers
  [/\/(route|controller|handler|endpoint|api)\./i, "api-route"],
  // Database / ORM / migrations
  [/\/(model|schema|migration|prisma|query|seed|knex|sequelize|typeorm)/i, "database"],
  // Middleware
  [/\/middleware\//i, "middleware"],
  // Tests
  [/\.(test|spec|e2e)\./i, "test"],
  [/__tests__\//i, "test"],
  // UI / frontend components
  [/\/(component|page|view|hook|layout|widget)s?\//i, "ui"],
  [/\.(css|scss|less|styled)$/i, "ui"],
  // Utilities
  [/\/(util|helper|lib|common|shared)\//i, "util"],
  // Config
  [/\.(config|rc|env)/i, "config"],
  [/\/(config|settings)\//i, "config"],
  [/^\.?[a-z]+rc(\.(js|json|yml|yaml))?$/i, "config"],
];

function categorizeFile(filename: string): FileCategory {
  for (const [pattern, category] of CATEGORY_RULES) {
    if (pattern.test(filename)) return category;
  }
  return "business-logic";
}

// ─── Risk Tier Assignment ───────────────────────────────────────────────────

/**
 * High-risk content patterns — if any match in the diff, bump risk.
 * These signal security-sensitive or correctness-critical code.
 */
const HIGH_RISK_PATTERNS = [
  /\beval\s*\(/,
  /\bexec\s*\(/,
  /\bnew\s+Function\b/,
  /\$\{.*\}.*(?:query|sql|exec)/i,
  /process\.env\b/,
  /crypto\./,
  /bcrypt|argon2|scrypt/i,
  /jwt\.sign|jwt\.verify/i,
  /password|secret|api[_-]?key/i,
  /DELETE\s+FROM|DROP\s+TABLE|TRUNCATE/i,
  /\bchild_process\b/,
  /\.exec\(|\.spawn\(/,
  /res\.redirect\(.*req\./,
  /innerHTML|dangerouslySetInnerHTML/i,
];

function hasHighRiskContent(patch: string): boolean {
  return HIGH_RISK_PATTERNS.some((p) => p.test(patch));
}

function computeRiskTier(file: PRFile, category: FileCategory): RiskTier {
  // Always critical: auth, database migrations, middleware
  if (["auth", "middleware"].includes(category)) return "critical";
  if (category === "database" && /migration/i.test(file.filename)) return "critical";

  // High-risk content in any file bumps to at least high
  if (hasHighRiskContent(file.patch)) return "high";

  // API routes are high risk
  if (category === "api-route") return "high";

  // Database models/queries
  if (category === "database") return "high";

  // Large business-logic diffs
  if (category === "business-logic" && file.patch.length > 2000) return "high";

  // Medium: smaller business logic, utils
  if (["business-logic", "util"].includes(category)) return "medium";

  // Low: tests, UI, config
  if (["test", "ui", "config", "other"].includes(category)) return "low";

  return "medium";
}

// ─── Public API ─────────────────────────────────────────────────────────────

export function classifyFile(file: PRFile): ClassifiedFile {
  const category = categorizeFile(file.filename);
  const riskTier = computeRiskTier(file, category);
  const language = detectLanguage(file.filename);
  const tokenEstimate = estimateTokens(file.patch + file.fullContent);

  return {
    filename: file.filename,
    status: file.status,
    patch: file.patch,
    fullContent: file.fullContent,
    riskTier,
    language,
    category,
    tokenEstimate,
  };
}

export function classifyFiles(files: PRFile[]): ClassifiedFile[] {
  return files.map(classifyFile);
}
