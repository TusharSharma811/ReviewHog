import {
  GitCommit, GitPullRequest, AlertCircle, GitBranch, Flame, ArrowUpRight,
  Activity, Code2, Zap, BarChart3
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

interface GitHubActivityData {
  available: boolean;
  message?: string;
  pushes?: { thisWeek: number; thisMonth: number };
  commits?: { thisWeek: number; thisMonth: number };
  prsOpened?: { thisWeek: number; thisMonth: number };
  prsMerged?: { thisWeek: number; thisMonth: number };
  issuesOpened?: { thisWeek: number; thisMonth: number };
  branches?: { thisMonth: number };
  mostActiveRepo?: { name: string; eventCount: number } | null;
  languageBreakdown?: { language: string; count: number }[];
  contributionStreak?: number;
  dailyPushes?: { date: string; count: number; label: string }[];
  repoActivity?: { name: string; pushes: number; prs: number; issues: number }[];
}

interface GitHubActivityProps {
  data: GitHubActivityData | null;
  loading?: boolean;
}

const LANG_COLORS: Record<string, string> = {
  TypeScript: "bg-blue-500",
  JavaScript: "bg-yellow-400",
  Python: "bg-green-500",
  Java: "bg-orange-500",
  Go: "bg-cyan-500",
  Rust: "bg-amber-600",
  "C++": "bg-pink-500",
  C: "bg-gray-600",
  "C#": "bg-purple-500",
  Ruby: "bg-red-500",
  PHP: "bg-indigo-400",
  Swift: "bg-orange-400",
  Kotlin: "bg-violet-500",
  HTML: "bg-red-400",
  CSS: "bg-blue-400",
  Shell: "bg-emerald-500",
  Dart: "bg-teal-500",
};

export const GitHubActivitySection = ({ data, loading }: GitHubActivityProps) => {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-6 animate-pulse">
              <div className="h-10 w-10 rounded-xl bg-muted mb-4" />
              <div className="h-4 w-20 bg-muted rounded mb-2" />
              <div className="h-8 w-16 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data || !data.available) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <Activity className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          {data?.message || "GitHub activity data unavailable. Please re-login to enable."}
        </p>
      </div>
    );
  }

  const {
    pushes, commits, prsOpened, prsMerged, issuesOpened, branches,
    mostActiveRepo, languageBreakdown, contributionStreak,
    dailyPushes, repoActivity,
  } = data;



  return (
    <div className="space-y-6">
      {/* Stat Cards Row 1: Activity Overview */}
      <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3">
        {/* Pushes */}
        <div className="card-hover rounded-2xl border border-border bg-card p-3 sm:p-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 mb-3">
            <ArrowUpRight className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-xs font-medium text-muted-foreground">Pushes</p>
          <p className="text-lg sm:text-2xl font-bold text-foreground">{pushes?.thisWeek ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {pushes?.thisMonth ?? 0} this month
          </p>
        </div>

        {/* Commits */}
        <div className="card-hover rounded-2xl border border-border bg-card p-3 sm:p-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 mb-3">
            <GitCommit className="h-4 w-4 text-purple-500" />
          </div>
          <p className="text-xs font-medium text-muted-foreground">Commits</p>
          <p className="text-lg sm:text-2xl font-bold text-foreground">{commits?.thisWeek ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {commits?.thisMonth ?? 0} this month
          </p>
        </div>

        {/* PRs Opened */}
        <div className="card-hover rounded-2xl border border-border bg-card p-3 sm:p-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 mb-3">
            <GitPullRequest className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-xs font-medium text-muted-foreground">PRs Opened</p>
          <p className="text-lg sm:text-2xl font-bold text-foreground">{prsOpened?.thisWeek ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {prsOpened?.thisMonth ?? 0} this month
          </p>
        </div>

        {/* PRs Merged */}
        <div className="card-hover rounded-2xl border border-border bg-card p-3 sm:p-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 mb-3">
            <GitPullRequest className="h-4 w-4 text-violet-500" />
          </div>
          <p className="text-xs font-medium text-muted-foreground">PRs Closed</p>
          <p className="text-lg sm:text-2xl font-bold text-foreground">{prsMerged?.thisWeek ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {prsMerged?.thisMonth ?? 0} this month
          </p>
        </div>

        {/* Issues */}
        <div className="card-hover rounded-2xl border border-border bg-card p-3 sm:p-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 mb-3">
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-xs font-medium text-muted-foreground">Issues</p>
          <p className="text-lg sm:text-2xl font-bold text-foreground">{issuesOpened?.thisWeek ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {issuesOpened?.thisMonth ?? 0} this month
          </p>
        </div>

        {/* Branches */}
        <div className="card-hover rounded-2xl border border-border bg-card p-3 sm:p-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-50 mb-3">
            <GitBranch className="h-4 w-4 text-cyan-500" />
          </div>
          <p className="text-xs font-medium text-muted-foreground">Branches</p>
          <p className="text-lg sm:text-2xl font-bold text-foreground">{branches?.thisMonth ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-0.5">created this month</p>
        </div>
      </div>

      {/* Streak + Most Active Repo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* Contribution Streak */}
        <div className="card-hover rounded-2xl border border-border bg-card p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50">
              <Flame className={`h-5 w-5 ${(contributionStreak ?? 0) > 0 ? "text-orange-500" : "text-muted-foreground/40"}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Contribution Streak</p>
              <p className="text-3xl font-bold text-foreground">
                {contributionStreak ?? 0}
                <span className="text-base font-normal text-muted-foreground ml-1">
                  day{(contributionStreak ?? 0) !== 1 ? "s" : ""}
                </span>
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {(contributionStreak ?? 0) >= 7
              ? "🔥 You're on fire! Keep it up!"
              : (contributionStreak ?? 0) > 0
                ? "Keep pushing, build that streak!"
                : "Make your first contribution today!"}
          </p>
        </div>

        {/* Most Active Repo */}
        <div className="card-hover rounded-2xl border border-border bg-card p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
              <Zap className="h-5 w-5 text-indigo-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-muted-foreground">Most Active Repo</p>
              {mostActiveRepo ? (
                <>
                  <p className="text-lg font-bold text-foreground truncate">
                    {mostActiveRepo.name.includes("/")
                      ? mostActiveRepo.name.split("/")[1]
                      : mostActiveRepo.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {mostActiveRepo.eventCount} event{mostActiveRepo.eventCount !== 1 ? "s" : ""} this month
                  </p>
                </>
              ) : (
                <p className="text-lg font-bold text-muted-foreground/40">—</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Push Activity + Language Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Daily Pushes Chart */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-4 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold text-foreground">Push Activity</h3>
            </div>
            <span className="text-xs text-muted-foreground">Last 14 days</span>
          </div>
          {dailyPushes && dailyPushes.length > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyPushes} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="pushGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.4} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 500 }}
                    dy={8}
                    tickFormatter={(value: string) => value.split(',')[0].split(' ')[0]}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#94a3b8' }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '10px 14px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                    }}
                    labelStyle={{ color: '#94a3b8', fontSize: 11, marginBottom: 4 }}
                    itemStyle={{ color: '#e2e8f0', fontWeight: 600, fontSize: 13 }}
                    cursor={{ fill: 'rgba(59,130,246,0.06)' }}
                  />
                  <Bar
                    dataKey="count"
                    name="Pushes"
                    fill="url(#pushGradient)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                    animationDuration={800}
                    animationEasing="ease-out"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No push activity yet</p>
          )}
        </div>

        {/* Language Breakdown */}
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-6">
            <Code2 className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground">Languages</h3>
          </div>
          {languageBreakdown && languageBreakdown.length > 0 ? (
            <div className="space-y-3">
              {(() => {
                const total = languageBreakdown.reduce((s, l) => s + l.count, 0);
                return languageBreakdown.map((lang) => (
                  <div key={lang.language}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${LANG_COLORS[lang.language] || "bg-gray-400"}`} />
                        <span className="font-medium text-foreground">{lang.language}</span>
                      </div>
                      <span className="text-muted-foreground text-xs">
                        {lang.count} repo{lang.count !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${LANG_COLORS[lang.language] || "bg-gray-400"}`}
                        style={{ width: `${(lang.count / total) * 100}%` }}
                      />
                    </div>
                  </div>
                ));
              })()}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No language data</p>
          )}
        </div>
      </div>

      {/* Per-Repo Activity Breakdown */}
      {repoActivity && repoActivity.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Repo Activity Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Repository</th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground">Pushes</th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground">PRs</th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground">Issues</th>
                  <th className="text-right py-2 pl-3 font-medium text-muted-foreground">Total</th>
                </tr>
              </thead>
              <tbody>
                {repoActivity.map((repo) => (
                  <tr key={repo.name} className="border-b border-border/50 last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="py-2.5 pr-4 font-medium text-foreground">{repo.name}</td>
                    <td className="text-right py-2.5 px-3 text-blue-600 font-medium">{repo.pushes}</td>
                    <td className="text-right py-2.5 px-3 text-emerald-600 font-medium">{repo.prs}</td>
                    <td className="text-right py-2.5 px-3 text-amber-600 font-medium">{repo.issues}</td>
                    <td className="text-right py-2.5 pl-3 font-bold text-foreground">{repo.pushes + repo.prs + repo.issues}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
