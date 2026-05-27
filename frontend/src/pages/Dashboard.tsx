import { Loader2, ExternalLink, LogOut, RefreshCw, Settings as SettingsIcon, Sun, Moon } from "lucide-react";
import { MetricsSection } from "@/components/MetricsSection";
import { GitHubActivitySection } from "@/components/GitHubActivity";
import { RecentActivity } from "@/components/RecentActivity";
import { RepositoryCard } from "@/components/RepositoryCard";
import { AddRepoModal } from "@/components/AddRepoModal";
import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { API_BASE_URL } from "@/config";
import { toast } from "sonner";
import { setToken, removeToken, getToken, authFetch } from "@/lib/auth";
import { useTheme } from "@/lib/useTheme";
import LOGO from "../assets/47509314-ae8b-44c2-b8c0-5d5a8a7ff228.png";

interface Pagination {
  page: number;
  limit: number;
  totalRepos: number;
  totalReviews: number;
  hasMoreRepos: boolean;
  hasMoreReviews: boolean;
}

interface UserData {
  name?: string;
  email?: string;
  avatarUrl?: string;
  repos: any[];
  reviews: any[];
  insights: any;
  pagination?: Pagination;
}

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

const GITHUB_APP_INSTALL_URL = "https://github.com/apps/reviewhog/installations/new";

const Dashboard = () => {
  const [searchParams] = useSearchParams();
  const isNewUser = searchParams.get("new") === "true";
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [userData, setUserData] = useState<UserData | null>(null);
  const [metricsData, setMetricsData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [activityData, setActivityData] = useState<any>(null);
  const [activityLoading, setActivityLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [repoPage, setRepoPage] = useState(1);
  const [reviewPage, setReviewPage] = useState(1);
  const [isPolling, setIsPolling] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async (page = 1, silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
        setError(null);
      }

      const response = await authFetch(
        `${API_BASE_URL}/api/users/data/me/insights?page=${page}&limit=10`,
        { method: "GET" }
      );

      if (response.status === 401 || response.status === 403) {
        navigate("/", { replace: true });
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch data (${response.status})`);
      }

      const data: UserData = await response.json();
      setUserData(data);

      // Stop polling once repos appear
      if (data.repos.length > 0 && pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
        setIsPolling(false);
        toast.success("Repositories connected!", {
          description: `${data.repos.length} repo(s) are now connected to ReviewHog.`,
        });
      }

      return data;
    } catch (err) {
      if (!silent) {
        const message = err instanceof Error ? err.message : "Something went wrong";
        setError(message);
        toast.error("Failed to load dashboard", { description: message });
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [navigate]);

  const fetchMetrics = useCallback(async (silent = false) => {
    try {
      if (!silent) setMetricsLoading(true);
      const response = await authFetch(
        `${API_BASE_URL}/api/users/data/me/metrics`,
        { method: "GET" }
      );

      if (response.ok) {
        const data: MetricsData = await response.json();
        setMetricsData(data);
      }
    } catch {
      // Metrics are non-critical; don't block dashboard
    } finally {
      if (!silent) setMetricsLoading(false);
    }
  }, []);

  const fetchActivity = useCallback(async (silent = false) => {
    try {
      if (!silent) setActivityLoading(true);
      const response = await authFetch(
        `${API_BASE_URL}/api/users/data/me/github-activity`,
        { method: "GET" }
      );

      if (response.ok) {
        const data = await response.json();
        setActivityData(data);
      }
    } catch {
      // Activity is non-critical
    } finally {
      if (!silent) setActivityLoading(false);
    }
  }, []);

  useEffect(() => {
    // SEC-1: Clean up any old URL-based token params (backward compat)
    const urlToken = searchParams.get("token");
    if (urlToken) {
      // Legacy: if a token is in the URL, store it and clean up
      setToken(urlToken);
      const url = new URL(window.location.href);
      url.searchParams.delete("token");
      url.searchParams.delete("new");
      window.history.replaceState({}, "", url.toString());
    }

    // Auth is now cookie-based — fetchData will return 401/403 if no valid cookie.
    // Only redirect if there's no cookie AND no localStorage token.
    fetchData().then((data) => {
      if (isNewUser) {
        toast.success("Welcome to ReviewHog! 🎉", {
          description: "Install the GitHub App to start getting AI code reviews.",
          duration: 6000,
        });
      }

      if (data && data.repos.length === 0) {
        setIsPolling(true);
        pollIntervalRef.current = setInterval(() => {
          fetchData(1, true);
        }, 10000);
      }
    });

    fetchMetrics();
    fetchActivity();

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [fetchData, fetchMetrics, fetchActivity, isNewUser, searchParams]);

  // Auto-refresh all dashboard data every 30 seconds (silent — no loaders)
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      fetchData(1, true);
      fetchMetrics(true);
      fetchActivity(true);
    }, 30000);

    return () => clearInterval(refreshInterval);
  }, [fetchData, fetchMetrics, fetchActivity]);

  const handleLogout = async () => {
    // Stop any active polling
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    // SEC-1: Clear server-side HttpOnly cookie
    try {
      await authFetch(`${API_BASE_URL}/api/auth/logout`, { method: "POST" });
    } catch {
      // Best-effort — continue with client-side cleanup
    }

    // Clear localStorage fallback token
    removeToken();

    // Hard redirect to clear all React state (prevents stale auth)
    window.location.href = "/";
  };

  const handleAddRepo = async (name: string, description: string) => {
    const response = await authFetch(`${API_BASE_URL}/api/users/data/repos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || `Failed to add repository (${response.status})`);
    }

    toast.success("Repository added!", {
      description: `${name} has been connected to ReviewHog.`,
    });

    // Refresh data
    await fetchData(1, true);
    await fetchMetrics();
  };

  const handleRemoveRepo = async (repoId: string, repoName: string) => {
    try {
      const response = await authFetch(`${API_BASE_URL}/api/users/data/repos/${repoId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to remove repository");
      }

      const displayName = repoName.includes("/") ? repoName.split("/")[1] : repoName;
      toast.success("Repository removed", {
        description: `${displayName} has been disconnected from ReviewHog.`,
      });

      // Refresh data
      await fetchData(1, true);
      await fetchMetrics();
    } catch (err) {
      toast.error("Failed to remove repository", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  };

  const loadMoreRepos = async () => {
    const nextPage = repoPage + 1;
    setRepoPage(nextPage);
    const data = await fetchData(nextPage, true);
    if (data && userData) {
      setUserData({
        ...data,
        repos: [...userData.repos, ...data.repos],
        reviews: userData.reviews,
      });
    }
  };

  const loadMoreReviews = async () => {
    const nextPage = reviewPage + 1;
    setReviewPage(nextPage);
    const data = await fetchData(nextPage, true);
    if (data && userData) {
      setUserData({
        ...data,
        repos: userData.repos,
        reviews: [...userData.reviews, ...data.reviews],
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 text-foreground animate-spin" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4 text-center px-4">
          <p className="text-lg font-semibold text-red-600">Failed to load dashboard</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <a
            href="/"
            className="mt-2 text-sm text-indigo-600 underline hover:text-indigo-700 transition-colors"
          >
            ← Back to login
          </a>
        </div>
      </div>
    );
  }

  const repositories = userData?.repos ?? [];
  const recentActivities = userData?.reviews ?? [];
  const pagination = userData?.pagination;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img src={LOGO} alt="ReviewHog Logo" className="h-8 w-8 rounded-lg" />
              <div>
                <h1 className="text-lg font-semibold text-foreground">ReviewHog</h1>
                <p className="text-sm text-muted-foreground">
                  {userData?.name ? `Welcome back, ${userData.name}` : "GitHub Integration Dashboard"}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1.5 text-sm text-emerald-600 mr-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="hidden sm:inline font-medium">Active</span>
              </div>
              <button
                onClick={toggleTheme}
                className="inline-flex items-center justify-center rounded-full text-sm font-medium border border-border bg-card hover:bg-muted h-9 w-9 transition-colors cursor-pointer"
                title={isDark ? "Switch to light mode" : "Switch to dark mode"}
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <button
                onClick={() => navigate("/settings")}
                className="inline-flex items-center gap-2 rounded-full text-sm font-medium border border-border bg-card hover:bg-muted h-9 px-4 transition-colors cursor-pointer"
              >
                <SettingsIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
              </button>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-full text-sm font-medium border border-border bg-card hover:bg-muted h-9 px-4 transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 md:px-6 py-8">
        {/* Install GitHub App Banner */}
        {repositories.length === 0 && (
          <div className="mb-8 p-6 rounded-2xl border border-indigo-200 bg-indigo-50/50">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  {isNewUser ? "Welcome! Let's get started 🚀" : "No repositories connected"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Install the ReviewHog GitHub App to connect your repositories and start getting AI-powered code reviews on every pull request.
                </p>
                {isPolling && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    Checking for new repositories...
                  </div>
                )}
              </div>
              <a
                href={GITHUB_APP_INSTALL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 shrink-0 rounded-full bg-foreground text-background hover:bg-foreground/90 h-10 px-6 text-sm font-medium transition-colors"
              >
                Install GitHub App
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        )}

        {/* Metrics Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-6">Dashboard Overview</h2>
          <MetricsSection metrics={metricsData} loading={metricsLoading} />
        </div>

        {/* GitHub Activity Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-6">GitHub Activity</h2>
          <GitHubActivitySection data={activityData} loading={activityLoading} />
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <RecentActivity
              recentActivities={recentActivities}
              hasMore={pagination?.hasMoreReviews ?? false}
              onLoadMore={loadMoreReviews}
            />
          </div>

          {/* Repository Status */}
          <div className="space-y-6">
            <RepositoryCard
              repositories={repositories}
              hasMore={pagination?.hasMoreRepos ?? false}
              onLoadMore={loadMoreRepos}
              onAddRepo={() => setShowAddModal(true)}
              onRemoveRepo={handleRemoveRepo}
            />
          </div>
        </div>
      </main>

      {/* Add Repo Modal */}
      <AddRepoModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddRepo}
      />
    </div>
  );
};

export default Dashboard;
