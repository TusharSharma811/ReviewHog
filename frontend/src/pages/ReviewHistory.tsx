import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, TrendingUp, BarChart3, Star, AlertTriangle,
  Calendar, GitPullRequest, ExternalLink
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from "recharts";
import { API_BASE_URL } from "@/config";
import { authFetch } from "@/lib/auth";
import { useTheme } from "@/lib/useTheme";
import Loader from "@/components/Loader";
import LOGO from "../assets/47509314-ae8b-44c2-b8c0-5d5a8a7ff228.png";

interface DailyTrend {
  date: string;
  reviews: number;
  avgRating: number | null;
  avgRisk: number;
  totalFindings: number;
}

interface RepoTrend {
  id: string;
  name: string;
  reviews: number;
  avgRating: number | null;
  findings: number;
}

interface ReviewItem {
  id: string;
  rating: number | null;
  riskScore: number | null;
  findingsCount: number;
  criticalCount: number;
  highCount: number;
  pipelineVersion: string;
  createdAt: string;
  repoName: string;
}

interface HistoryData {
  totalReviews: number;
  dailyTrends: DailyTrend[];
  repoTrends: RepoTrend[];
  reviews: ReviewItem[];
}

const ReviewHistory = () => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [data, setData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authFetch(`${API_BASE_URL}/api/users/data/reviews/history?days=${days}`);
      if (res.status === 401) { navigate("/", { replace: true }); return; }
      if (res.ok) setData(await res.json());
    } catch { /* non-critical */ }
    finally { setLoading(false); }
  }, [days, navigate]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader />
          <p className="text-sm text-muted-foreground">Loading history...</p>
        </div>
      </div>
    );
  }

  const chartColors = {
    stroke: isDark ? "#818cf8" : "#6366f1",
    grid: isDark ? "#1e293b" : "#f1f5f9",
    text: isDark ? "#94a3b8" : "#64748b",
    bar1: isDark ? "#818cf8" : "#6366f1",
    bar2: isDark ? "#34d399" : "#22c55e",
    bar3: isDark ? "#fbbf24" : "#f59e0b",
  };

  return (
    <div className="min-h-screen bg-background max-w-full overflow-x-hidden">
      <header className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate("/dashboard")} className="p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer">
                <ArrowLeft className="h-4 w-4 text-foreground" />
              </button>
              <img src={LOGO} alt="ReviewHog" className="h-6 w-6 rounded" />
              <div>
                <h1 className="text-base sm:text-lg font-semibold text-foreground">Review History & Trends</h1>
                <p className="text-xs text-muted-foreground">Track code quality evolution over time</p>
              </div>
            </div>
            <div className="flex items-center gap-1 rounded-full border border-border bg-card p-0.5">
              {[7, 30, 90].map(d => (
                <button key={d} onClick={() => setDays(d)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                    days === d ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                  }`}>
                  {d}d
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-6 sm:py-8 space-y-6">
        {!data || data.totalReviews === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center">
            <TrendingUp className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">No review history for the last {days} days.</p>
            <Link to="/dashboard" className="text-sm text-indigo-600 hover:text-indigo-700 mt-2 inline-block">← Back to dashboard</Link>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-2xl border border-border bg-card p-4">
                <GitPullRequest className="h-5 w-5 text-indigo-500 mb-2" />
                <p className="text-xs text-muted-foreground">Total Reviews</p>
                <p className="text-2xl font-bold text-foreground">{data.totalReviews}</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <Star className="h-5 w-5 text-amber-500 mb-2" />
                <p className="text-xs text-muted-foreground">Avg Rating</p>
                <p className="text-2xl font-bold text-foreground">
                  {data.reviews.filter(r => r.rating != null).length > 0
                    ? (data.reviews.filter(r => r.rating != null).reduce((s, r) => s + (r.rating ?? 0), 0) / data.reviews.filter(r => r.rating != null).length).toFixed(1)
                    : "—"}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <AlertTriangle className="h-5 w-5 text-red-500 mb-2" />
                <p className="text-xs text-muted-foreground">Total Findings</p>
                <p className="text-2xl font-bold text-foreground">{data.reviews.reduce((s, r) => s + r.findingsCount, 0)}</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <BarChart3 className="h-5 w-5 text-emerald-500 mb-2" />
                <p className="text-xs text-muted-foreground">Repos Reviewed</p>
                <p className="text-2xl font-bold text-foreground">{data.repoTrends.length}</p>
              </div>
            </div>

            {/* Review Activity Chart */}
            <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-4">Review Activity</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.dailyTrends} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={chartColors.stroke} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={chartColors.stroke} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false}
                      tick={{ fontSize: 11, fill: chartColors.text }}
                      tickFormatter={(v: string) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: chartColors.text }} allowDecimals={false} />
                    <Tooltip contentStyle={{
                      backgroundColor: isDark ? '#1e293b' : '#fff',
                      border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                      borderRadius: '12px', padding: '10px 14px',
                    }} />
                    <Area type="monotone" dataKey="reviews" name="Reviews" stroke={chartColors.stroke}
                      strokeWidth={2.5} fill="url(#histGrad)"
                      dot={{ r: 3, fill: chartColors.stroke, stroke: isDark ? '#1e293b' : '#fff', strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Per-Repo Breakdown */}
            {data.repoTrends.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-foreground mb-4">Repository Breakdown</h3>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.repoTrends.slice(0, 8)} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false}
                        tick={{ fontSize: 11, fill: chartColors.text }}
                        tickFormatter={(v: string) => v.includes("/") ? v.split("/")[1] : v} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: chartColors.text }} allowDecimals={false} />
                      <Tooltip contentStyle={{
                        backgroundColor: isDark ? '#1e293b' : '#fff',
                        border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                        borderRadius: '12px', padding: '10px 14px',
                      }} />
                      <Bar dataKey="reviews" name="Reviews" fill={chartColors.bar1} radius={[6, 6, 0, 0]} />
                      <Bar dataKey="findings" name="Findings" fill={chartColors.bar3} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Recent Reviews List */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-border">
                <h3 className="text-base sm:text-lg font-semibold text-foreground">All Reviews</h3>
              </div>
              <div className="divide-y divide-border">
                {data.reviews.slice().reverse().map(r => (
                  <Link key={r.id} to={`/review/${r.id}`}
                    className="flex items-center justify-between px-4 sm:px-6 py-3.5 hover:bg-muted/50 transition-colors group">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground group-hover:text-indigo-600 transition-colors truncate">
                        {r.repoName.includes("/") ? r.repoName.split("/")[1] : r.repoName}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span><Calendar className="h-3 w-3 inline mr-1" />{new Date(r.createdAt).toLocaleDateString()}</span>
                        {r.findingsCount > 0 && <span className="text-amber-600">{r.findingsCount} findings</span>}
                        {r.criticalCount > 0 && <span className="text-red-600">{r.criticalCount} critical</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      {r.rating != null && (
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`h-3 w-3 ${i < r.rating! ? "text-amber-400 fill-amber-400" : "text-gray-200 dark:text-gray-700"}`} />
                          ))}
                        </div>
                      )}
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default ReviewHistory;
