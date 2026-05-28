import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, Star, ExternalLink, AlertTriangle, CheckCircle, Shield,
  Clock, Cpu, FileCode, ChevronDown, ChevronUp, Bug, Zap, RefreshCw,
  Copy, Check, GitPullRequest
} from "lucide-react";
import { API_BASE_URL } from "@/config";
import { authFetch } from "@/lib/auth";
import { useTheme } from "@/lib/useTheme";
import Loader from "@/components/Loader";
import { toast } from "sonner";
import LOGO from "../assets/47509314-ae8b-44c2-b8c0-5d5a8a7ff228.png";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Finding {
  id: string;
  reviewerType: string;
  file: string;
  lineRange?: string;
  severity: "critical" | "high" | "medium" | "low";
  confidence: number;
  title: string;
  description: string;
  suggestion?: string;
  category: string;
}

interface ReviewData {
  id: string;
  rating: number | null;
  comment: string | null;
  riskScore: number | null;
  findingsCount: number;
  criticalCount: number;
  highCount: number;
  tokensUsed: number;
  processingMs: number;
  reviewersUsed: string[];
  pipelineVersion: string;
  findingsJson: Finding[] | null;
  prUrl: string | null;
  approved: boolean;
  createdAt: string;
  repo: {
    id: string;
    name: string;
    url: string;
    language: string | null;
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const SEVERITY_CONFIG = {
  critical: { color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/40", border: "border-red-200 dark:border-red-800", icon: "🔴", label: "Critical" },
  high:     { color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/40", border: "border-orange-200 dark:border-orange-800", icon: "🟠", label: "High" },
  medium:   { color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/40", border: "border-amber-200 dark:border-amber-800", icon: "🟡", label: "Medium" },
  low:      { color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/40", border: "border-blue-200 dark:border-blue-800", icon: "🔵", label: "Low" },
};

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function riskColor(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score <= 25) return "text-emerald-600";
  if (score <= 50) return "text-amber-600";
  if (score <= 75) return "text-orange-600";
  return "text-red-600";
}

function riskGradient(score: number): string {
  if (score <= 25) return "from-emerald-500 to-emerald-400";
  if (score <= 50) return "from-amber-500 to-amber-400";
  if (score <= 75) return "from-orange-500 to-orange-400";
  return "from-red-600 to-red-500";
}

// ─── Finding Card Component ────────────────────────────────────────────────

function FindingCard({ finding, repoName, onCreateIssue }: { finding: Finding; repoName: string; onCreateIssue: (f: Finding) => void }) {
  const [expanded, setExpanded] = useState(false);
  const config = SEVERITY_CONFIG[finding.severity];

  return (
    <div className={`rounded-xl border ${config.border} ${config.bg} overflow-hidden transition-all duration-200`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3.5 flex items-start gap-3 text-left cursor-pointer hover:opacity-90 transition-opacity"
      >
        <span className="text-lg mt-0.5 shrink-0">{config.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-semibold ${config.color}`}>{config.label}</span>
            <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded bg-background/60 font-mono">{finding.category}</span>
            <span className="text-xs text-muted-foreground">{Math.round(finding.confidence * 100)}% confidence</span>
          </div>
          <p className="text-sm font-medium text-foreground mt-1">{finding.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 font-mono">
            {finding.file}{finding.lineRange ? `:${finding.lineRange}` : ""}
          </p>
        </div>
        <div className="shrink-0 mt-1">
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/50 pt-3">
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Issue Description</h4>
            <p className="text-sm text-foreground leading-relaxed">{finding.description}</p>
          </div>

          {finding.suggestion && (
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-3">
              <h4 className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Zap className="h-3 w-3" /> Suggested Fix
              </h4>
              <p className="text-sm text-emerald-800 dark:text-emerald-300 leading-relaxed">{finding.suggestion}</p>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs text-muted-foreground px-2 py-1 rounded-full bg-background/60 border border-border">
              <Shield className="h-3 w-3 inline mr-1" />{finding.reviewerType}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onCreateIssue(finding); }}
              className="text-xs text-indigo-600 hover:text-indigo-700 px-2 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer flex items-center gap-1"
            >
              <Bug className="h-3 w-3" /> Create Issue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

const ReviewDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [review, setReview] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rerunning, setRerunning] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchReview = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await authFetch(`${API_BASE_URL}/api/users/data/reviews/${id}`);
      if (res.status === 401) { navigate("/", { replace: true }); return; }
      if (!res.ok) throw new Error(`Failed to fetch review (${res.status})`);
      const data = await res.json();
      setReview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { fetchReview(); }, [fetchReview]);

  const handleRerun = async () => {
    if (!review) return;
    setRerunning(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/api/users/data/reviews/${review.id}/rerun`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success("Review cleared", { description: data.message });
        navigate("/dashboard");
      } else {
        toast.error("Re-run failed", { description: data.message });
      }
    } catch {
      toast.error("Failed to re-run review");
    } finally {
      setRerunning(false);
    }
  };

  const handleCreateIssue = async (finding: Finding) => {
    if (!review) return;
    try {
      const body = `## ${SEVERITY_CONFIG[finding.severity].icon} ${finding.title}\n\n**File:** \`${finding.file}${finding.lineRange ? `:${finding.lineRange}` : ""}\`\n**Severity:** ${finding.severity}\n**Category:** ${finding.category}\n**Reviewer:** ${finding.reviewerType}\n\n### Description\n${finding.description}\n\n${finding.suggestion ? `### Suggested Fix\n${finding.suggestion}\n\n` : ""}---\n_Created by [ReviewHog](https://review-hog.vercel.app) AI code review_`;

      const res = await authFetch(`${API_BASE_URL}/api/users/data/github/create-issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `[ReviewHog] ${finding.title}`,
          body,
          repoFullName: review.repo.name,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Issue created!", { description: `Issue #${data.issueNumber} created successfully.` });
      } else {
        toast.error("Failed to create issue", { description: data.message });
      }
    } catch {
      toast.error("Failed to create issue");
    }
  };

  const handleCopyBadge = () => {
    if (!review) return;
    const badgeUrl = `${API_BASE_URL}/api/users/data/repos/${review.repo.id}/badge.svg`;
    const markdown = `![Code Quality](${badgeUrl})`;
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    toast.success("Badge markdown copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader />
          <p className="text-sm text-muted-foreground">Loading review...</p>
        </div>
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4 text-center px-4">
          <AlertTriangle className="h-10 w-10 text-red-500" />
          <p className="text-lg font-semibold text-red-600">{error || "Review not found"}</p>
          <button onClick={() => navigate("/dashboard")} className="text-sm text-indigo-600 underline hover:text-indigo-700 cursor-pointer">
            ← Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  const findings: Finding[] = Array.isArray(review.findingsJson) ? review.findingsJson : [];
  const repoName = review.repo.name.includes("/") ? review.repo.name.split("/")[1] : review.repo.name;
  const isV2 = review.pipelineVersion === "v2";

  // Group findings by severity
  const grouped = { critical: [] as Finding[], high: [] as Finding[], medium: [] as Finding[], low: [] as Finding[] };
  for (const f of findings) {
    if (grouped[f.severity]) grouped[f.severity].push(f);
  }

  // Extract improvement tips from findings
  const improvements = findings
    .filter(f => f.suggestion)
    .map(f => ({ file: f.file, suggestion: f.suggestion!, severity: f.severity, category: f.category }));

  return (
    <div className="min-h-screen bg-background max-w-full overflow-x-hidden">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => navigate("/dashboard")} className="shrink-0 p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer">
                <ArrowLeft className="h-4 w-4 text-foreground" />
              </button>
              <img src={LOGO} alt="ReviewHog" className="h-6 w-6 shrink-0 rounded" />
              <div className="min-w-0">
                <h1 className="text-sm font-semibold text-foreground truncate">Review Detail</h1>
                <p className="text-xs text-muted-foreground truncate">{repoName} · {timeAgo(review.createdAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {review.prUrl && (
                <a href={review.prUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 px-3 py-1.5 rounded-full border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/30 transition-colors">
                  <GitPullRequest className="h-3.5 w-3.5" /> View PR
                </a>
              )}
              <button onClick={handleCopyBadge}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-full border border-border bg-card hover:bg-muted transition-colors cursor-pointer">
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">Badge</span>
              </button>
              <button onClick={handleRerun} disabled={rerunning}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-full border border-border bg-card hover:bg-muted transition-colors cursor-pointer disabled:opacity-50">
                <RefreshCw className={`h-3.5 w-3.5 ${rerunning ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Re-run</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-6 sm:py-8 space-y-6">
        {/* Score Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {/* Rating */}
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 review-card-glow">
            <p className="text-xs font-medium text-muted-foreground mb-2">Rating</p>
            <div className="flex items-center gap-1 mb-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`h-4 w-4 sm:h-5 sm:w-5 ${review.rating && i < review.rating ? "text-amber-400 fill-amber-400" : "text-gray-200 dark:text-gray-700"}`} />
              ))}
            </div>
            <p className="text-lg sm:text-2xl font-bold text-foreground">{review.rating ?? "—"}<span className="text-sm text-muted-foreground font-normal">/5</span></p>
          </div>

          {/* Risk Score */}
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 review-card-glow">
            <p className="text-xs font-medium text-muted-foreground mb-2">Risk Score</p>
            <div className="relative h-2 bg-muted rounded-full overflow-hidden mb-2">
              <div className={`absolute h-full rounded-full bg-gradient-to-r ${riskGradient(review.riskScore ?? 0)} transition-all duration-700`}
                style={{ width: `${review.riskScore ?? 0}%` }} />
            </div>
            <p className={`text-lg sm:text-2xl font-bold ${riskColor(review.riskScore)}`}>{review.riskScore ?? "—"}<span className="text-sm text-muted-foreground font-normal">/100</span></p>
          </div>

          {/* Findings */}
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 review-card-glow">
            <p className="text-xs font-medium text-muted-foreground mb-2">Findings</p>
            <p className="text-lg sm:text-2xl font-bold text-foreground">{review.findingsCount}</p>
            <div className="flex items-center gap-2 mt-1">
              {review.criticalCount > 0 && <span className="text-xs text-red-600 font-medium">{review.criticalCount} critical</span>}
              {review.highCount > 0 && <span className="text-xs text-orange-600 font-medium">{review.highCount} high</span>}
            </div>
          </div>

          {/* Pipeline Info */}
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 review-card-glow">
            <p className="text-xs font-medium text-muted-foreground mb-2">Pipeline</p>
            <p className="text-lg sm:text-2xl font-bold text-foreground uppercase">{review.pipelineVersion}</p>
            <p className="text-xs text-muted-foreground mt-1">{(review.processingMs / 1000).toFixed(1)}s · {review.tokensUsed.toLocaleString()} tokens</p>
          </div>
        </div>

        {/* Findings Section (V2 only) */}
        {isV2 && findings.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-bold text-foreground">Issues Found ({findings.length})</h2>
              <div className="flex items-center gap-2 text-xs">
                {grouped.critical.length > 0 && <span className="px-2 py-1 rounded-full bg-red-50 dark:bg-red-950/40 text-red-600 font-medium border border-red-200 dark:border-red-800">🔴 {grouped.critical.length}</span>}
                {grouped.high.length > 0 && <span className="px-2 py-1 rounded-full bg-orange-50 dark:bg-orange-950/40 text-orange-600 font-medium border border-orange-200 dark:border-orange-800">🟠 {grouped.high.length}</span>}
                {grouped.medium.length > 0 && <span className="px-2 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 font-medium border border-amber-200 dark:border-amber-800">🟡 {grouped.medium.length}</span>}
                {grouped.low.length > 0 && <span className="px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 font-medium border border-blue-200 dark:border-blue-800">🔵 {grouped.low.length}</span>}
              </div>
            </div>

            <div className="space-y-2">
              {(["critical", "high", "medium", "low"] as const).map(severity =>
                grouped[severity].map(f => (
                  <FindingCard key={f.id} finding={f} repoName={review.repo.name} onCreateIssue={handleCreateIssue} />
                ))
              )}
            </div>
          </div>
        )}

        {/* What Can Be Done Better */}
        {improvements.length > 0 && (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" /> What Can Be Done Better
              </h2>
              <p className="text-xs text-muted-foreground mt-1">Actionable improvements extracted from the review findings</p>
            </div>
            <div className="p-4 sm:p-6 space-y-3">
              {improvements.map((imp, i) => (
                <div key={i} className="flex gap-3 p-3 rounded-xl bg-muted/50">
                  <div className={`shrink-0 mt-0.5 h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold ${
                    imp.severity === "critical" ? "bg-red-100 dark:bg-red-900/50 text-red-600" :
                    imp.severity === "high" ? "bg-orange-100 dark:bg-orange-900/50 text-orange-600" :
                    imp.severity === "medium" ? "bg-amber-100 dark:bg-amber-900/50 text-amber-600" :
                    "bg-blue-100 dark:bg-blue-900/50 text-blue-600"
                  }`}>{i + 1}</div>
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-muted-foreground mb-0.5">{imp.file} · {imp.category}</p>
                    <p className="text-sm text-foreground leading-relaxed">{imp.suggestion}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Summary (Markdown comment) */}
        {review.comment && (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <FileCode className="h-5 w-5 text-indigo-500" /> AI Review Summary
              </h2>
            </div>
            <div className="p-4 sm:p-6">
              <div className="prose prose-sm dark:prose-invert max-w-none review-summary-content">
                <pre className="whitespace-pre-wrap text-sm leading-relaxed text-foreground bg-muted/30 rounded-xl p-4 overflow-x-auto font-sans">{review.comment}</pre>
              </div>
            </div>
          </div>
        )}

        {/* Pipeline Stats Footer */}
        {isV2 && (
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Pipeline Details</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Processing Time</p>
                  <p className="text-sm font-medium text-foreground">{(review.processingMs / 1000).toFixed(1)}s</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Tokens Used</p>
                  <p className="text-sm font-medium text-foreground">{review.tokensUsed.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Reviewers</p>
                  <p className="text-sm font-medium text-foreground">{review.reviewersUsed.join(", ") || "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Reviewed On</p>
                  <p className="text-sm font-medium text-foreground">{new Date(review.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2 pb-8">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
          <Link to="/history" className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 transition-colors">
            View All History <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </main>
    </div>
  );
};

export default ReviewDetail;
