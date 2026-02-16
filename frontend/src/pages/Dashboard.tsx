import { Bot, GitBranchIcon, GitPullRequest, Loader2, Star, ExternalLink, LogOut, RefreshCw } from "lucide-react";
import { MetricsCard } from "@/components/MetricsCard";
import { RecentActivity } from "@/components/RecentActivity";
import { RepositoryCard } from "@/components/RepositoryCard";
import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { API_BASE_URL } from "@/config";
import { toast } from "sonner";

interface Metrics {
  totalPRs?: number;
  totalReviews?: number;
  avgRating?: number | null;
}

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
  insights: Metrics | null;
  pagination?: Pagination;
}

const GITHUB_APP_INSTALL_URL = "https://github.com/apps/reviewhog/installations/new";

const Dashboard = () => {
  const [searchParams] = useSearchParams();
  const isNewUser = searchParams.get("new") === "true";
  const navigate = useNavigate();

  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [repoPage, setRepoPage] = useState(1);
  const [reviewPage, setReviewPage] = useState(1);
  const [isPolling, setIsPolling] = useState(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async (page = 1, silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
        setError(null);
      }

      const response = await fetch(
        `${API_BASE_URL}/api/users/data/me/insights?page=${page}&limit=10`,
        { method: "GET", credentials: "include" }
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

  useEffect(() => {
    fetchData().then((data) => {
      if (isNewUser) {
        toast.success("Welcome to ReviewHog! 🎉", {
          description: "Install the GitHub App to start getting AI code reviews.",
          duration: 6000,
        });
      }

      // Start polling if no repos
      if (data && data.repos.length === 0) {
        setIsPolling(true);
        pollIntervalRef.current = setInterval(() => {
          fetchData(1, true);
        }, 10000);
      }
    });

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [fetchData, isNewUser]);

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      navigate("/", { replace: true });
    } catch {
      toast.error("Logout failed", { description: "Please try again." });
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
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4 text-center px-4">
          <p className="text-lg font-semibold text-destructive">Failed to load dashboard</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <a
            href="/"
            className="mt-2 text-sm text-primary underline hover:text-primary/80 transition-colors"
          >
            ← Back to login
          </a>
        </div>
      </div>
    );
  }

  const repositories = userData?.repos ?? [];
  const recentActivities = userData?.reviews ?? [];
  const metrics = userData?.insights ?? {};
  const pagination = userData?.pagination;

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-primary rounded-lg">
                <Bot className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">ReviewHog</h1>
                <p className="text-sm text-muted-foreground">
                  {userData?.name ? `Welcome back, ${userData.name}` : "GitHub Integration Dashboard"}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1 text-sm text-success">
                <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                <span className="hidden sm:inline">Active</span>
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-md text-sm font-medium border border-border bg-background hover:bg-muted h-9 px-3 transition-colors cursor-pointer"
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
          <div className="mb-8 p-6 rounded-lg border border-primary/20 bg-primary/5">
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
                className="inline-flex items-center gap-2 shrink-0 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 text-sm font-medium transition-colors"
              >
                Install GitHub App
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        )}

        {/* Overview Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-6">Dashboard Overview</h2>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            <MetricsCard
              title="Total PRs Reviewed"
              value={String(metrics?.totalPRs ?? 0)}
              icon={GitPullRequest}
              description="Pull requests reviewed by AI across all repositories."
            />
            <MetricsCard
              title="Connected Repos"
              value={String(pagination?.totalRepos ?? repositories.length)}
              icon={GitBranchIcon}
              description="Repositories connected to ReviewHog."
            />
            <MetricsCard
              title="Avg. Rating"
              value={metrics?.avgRating != null ? metrics.avgRating.toFixed(1) : "—"}
              icon={Star}
              description="Average code quality rating across reviews."
            />
          </div>
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
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;