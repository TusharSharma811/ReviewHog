import { Bot, GitBranchIcon, GitPullRequest, Loader2, Star, ExternalLink } from "lucide-react";
import { MetricsCard } from "@/components/MetricsCard";
import { RecentActivity } from "@/components/RecentActivity";
import { RepositoryCard } from "@/components/RepositoryCard";
import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/config";
import { toast } from "sonner";

interface Metrics {
  totalPRs?: number;
  totalReviews?: number;
  avgRating?: number | null;
}

interface UserData {
  name?: string;
  repos: any[];
  reviews: any[];
  insights: Metrics | null;
}

const GITHUB_APP_INSTALL_URL = "https://github.com/apps/reviewhog/installations/new";

const Dashboard = () => {
  const params = new URLSearchParams(window.location.search);
  const uid = params.get("uid");
  const isNewUser = params.get("new") === "true";

  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${API_BASE_URL}/api/users/data/me/insights?uid=${uid}`, {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          const errorMsg = `Failed to fetch data (${response.status})`;
          throw new Error(errorMsg);
        }

        const data = await response.json();
        setUserData(data);

        if (isNewUser) {
          toast.success("Welcome to ReviewHog! 🎉", {
            description: "Install the GitHub App to start getting AI code reviews.",
            duration: 6000,
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something went wrong";
        setError(message);
        toast.error("Failed to load dashboard", {
          description: message,
        });
      } finally {
        setLoading(false);
      }
    };

    if (uid) {
      fetchData();
    } else {
      setLoading(false);
      setError("No user ID provided. Please log in again.");
      toast.error("Missing user ID", {
        description: "Redirecting you to login...",
      });
    }
  }, [uid, isNewUser]);

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

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
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
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 text-sm text-success">
                <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                <span>Active</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
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
          <div className="flex flex-col md:flex-row md:space-x-6 space-y-6 md:space-y-0">
            <MetricsCard
              title="Total PRs Reviewed"
              value={String(metrics?.totalPRs ?? 0)}
              icon={GitPullRequest}
              description="Pull requests reviewed by AI across all repositories."
            />
            <MetricsCard
              title="Connected Repos"
              value={String(repositories.length)}
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
            <RecentActivity recentActivities={recentActivities} />
          </div>

          {/* Repository Status */}
          <div className="space-y-6">
            <RepositoryCard repositories={repositories} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;