import { GitPullRequest, Bug, CheckCircle, TrendingUp, Clock } from "lucide-react";

interface MetricsData {
  overview: {
    totalPRs: number;
    totalReviews: number;
    avgRating: number | null;
    issuesFound: number;
    cleanPasses: number;
    lastReviewAt: string | null;
    qualityScore: number | null;
  };
  severityBreakdown: {
    issues: number;
    neutral: number;
    clean: number;
  };
  dailyActivity: { date: string; count: number; label: string }[];
  topRepos: { id: string; name: string; reviewCount: number }[];
  recentTimeline: {
    id: string;
    repoName: string;
    rating: number | null;
    comment: string;
    createdAt: string;
  }[];
}

interface MetricsSectionProps {
  metrics: MetricsData | null;
  loading?: boolean;
}

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



function qualityColor(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  return "text-red-500";
}

function qualityBgColor(score: number | null): string {
  if (score === null) return "bg-gray-50";
  if (score >= 80) return "bg-emerald-50";
  if (score >= 60) return "bg-amber-50";
  return "bg-red-50";
}

export const MetricsSection = ({ metrics, loading }: MetricsSectionProps) => {
  if (loading || !metrics) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-white p-6 animate-pulse">
              <div className="h-10 w-10 rounded-xl bg-gray-100 mb-4" />
              <div className="h-4 w-20 bg-gray-100 rounded mb-2" />
              <div className="h-8 w-16 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const { overview, severityBreakdown, dailyActivity, topRepos } = metrics;
  const maxDaily = Math.max(...dailyActivity.map((d) => d.count), 1);

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Reviews */}
        <div className="card-hover rounded-2xl border border-border bg-white p-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 mb-4">
            <GitPullRequest className="h-5 w-5 text-indigo-500" />
          </div>
          <h3 className="text-sm font-medium text-muted-foreground">Total Reviews</h3>
          <p className="text-3xl font-bold text-foreground tracking-tight">{overview.totalReviews}</p>
          <p className="text-xs text-muted-foreground mt-1">
            across {overview.totalPRs} pull request{overview.totalPRs !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Issues Found */}
        <div className="card-hover rounded-2xl border border-border bg-white p-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 mb-4">
            <Bug className="h-5 w-5 text-red-500" />
          </div>
          <h3 className="text-sm font-medium text-muted-foreground">Issues Found</h3>
          <p className="text-3xl font-bold text-red-600 tracking-tight">{overview.issuesFound}</p>
          <p className="text-xs text-muted-foreground mt-1">
            critical & major issues caught
          </p>
        </div>

        {/* Clean Passes */}
        <div className="card-hover rounded-2xl border border-border bg-white p-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 mb-4">
            <CheckCircle className="h-5 w-5 text-emerald-500" />
          </div>
          <h3 className="text-sm font-medium text-muted-foreground">Clean Passes</h3>
          <p className="text-3xl font-bold text-emerald-600 tracking-tight">{overview.cleanPasses}</p>
          <p className="text-xs text-muted-foreground mt-1">
            files passed with no issues
          </p>
        </div>

        {/* Quality Score */}
        <div className="card-hover rounded-2xl border border-border bg-white p-6">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${qualityBgColor(overview.qualityScore)} mb-4`}>
            <TrendingUp className={`h-5 w-5 ${qualityColor(overview.qualityScore)}`} />
          </div>
          <h3 className="text-sm font-medium text-muted-foreground">Quality Score</h3>
          <p className={`text-3xl font-bold tracking-tight ${qualityColor(overview.qualityScore)}`}>
            {overview.qualityScore !== null ? `${overview.qualityScore}%` : "—"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {overview.qualityScore !== null
              ? overview.qualityScore >= 80
                ? "Your code quality is excellent"
                : overview.qualityScore >= 60
                  ? "Room for improvement"
                  : "Significant issues detected"
              : "No reviews yet"
            }
          </p>
        </div>
      </div>

      {/* Activity Chart + Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Activity Chart */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-white p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-foreground">Review Activity</h3>
            <span className="text-xs text-muted-foreground">Last 7 days</span>
          </div>
          <div className="flex items-end gap-2 h-32">
            {dailyActivity.map((day) => {
              const height = maxDaily > 0 ? (day.count / maxDaily) * 100 : 0;
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-medium text-foreground">{day.count}</span>
                  <div
                    className="w-full rounded-t-lg bg-indigo-100 hover:bg-indigo-200 transition-colors relative group"
                    style={{ height: `${Math.max(height, 4)}%` }}
                  >
                    <div
                      className="absolute inset-0 rounded-t-lg bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{day.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Severity Breakdown */}
        <div className="rounded-2xl border border-border bg-white p-6">
          <h3 className="text-lg font-semibold text-foreground mb-6">Severity Breakdown</h3>
          <div className="space-y-4">
            {(() => {
              const total = severityBreakdown.issues + severityBreakdown.neutral + severityBreakdown.clean;
              if (total === 0) {
                return (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No reviews yet
                  </p>
                );
              }
              return (
                <>
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-emerald-600 font-medium">Clean (4-5★)</span>
                      <span className="text-muted-foreground">{severityBreakdown.clean}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${(severityBreakdown.clean / total) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-amber-600 font-medium">Moderate (3★)</span>
                      <span className="text-muted-foreground">{severityBreakdown.neutral}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all duration-500"
                        style={{ width: `${(severityBreakdown.neutral / total) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-red-500 font-medium">Issues (1-2★)</span>
                      <span className="text-muted-foreground">{severityBreakdown.issues}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500 rounded-full transition-all duration-500"
                        style={{ width: `${(severityBreakdown.issues / total) * 100}%` }}
                      />
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Top Repos */}
      {topRepos.length > 0 && (
        <div className="rounded-2xl border border-border bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Most Active Repos</h3>
            {overview.lastReviewAt && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                Last review: {timeAgo(overview.lastReviewAt)}
              </div>
            )}
          </div>
          <div className="space-y-3">
            {(() => {
              const maxCount = Math.max(...topRepos.map((r) => r.reviewCount), 1);
              return topRepos.map((repo, idx) => {
                const repoName = repo.name.includes("/") ? repo.name.split("/")[1] : repo.name;
                return (
                  <div key={repo.id} className="flex items-center gap-4">
                    <span className="text-sm font-bold text-muted-foreground/50 w-5 text-right">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-foreground truncate">
                          {repoName}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2 shrink-0">
                          {repo.reviewCount} review{repo.reviewCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-400 rounded-full transition-all duration-500"
                          style={{ width: `${(repo.reviewCount / maxCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
