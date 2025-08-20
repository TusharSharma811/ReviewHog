import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, GitPullRequest, Github } from "lucide-react";
import { useDashboardData } from "../hooks/useApi";
import { LoadingState, EmptyState } from "../components/LoadingState";
import { PullRequestCard } from "../components/PullRequestCard";
import { RepositoryList } from "../components/RepositoryList";
import type { PullRequest } from "../types";

const Dashboard = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("reviews");
  const [searchParams] = useSearchParams();
  const uid = searchParams.get("uid");

  const { dashboardData, loading, refetch } = useDashboardData(uid || undefined);

  const filteredPRs = dashboardData?.pullRequests.filter((pr: PullRequest) =>
    pr.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pr.repository.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pr.author.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <GitPullRequest className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-2xl font-bold">CodeRevU Dashboard</h1>
              </div>
              
              {/* Stats */}
              {dashboardData && (
                <div className="hidden md:flex space-x-6 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{dashboardData.stats.totalPRs}</div>
                    <div className="text-muted-foreground">Pull Requests</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{dashboardData.stats.averageScore}%</div>
                    <div className="text-muted-foreground">Avg Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{dashboardData.stats.totalIssues}</div>
                    <div className="text-muted-foreground">Issues Found</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{dashboardData.stats.totalSuggestions}</div>
                    <div className="text-muted-foreground">Suggestions</div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-4">
              <button 
                onClick={refetch}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                aria-label="Refresh dashboard data"
              >
                <Github className="mr-2 h-4 w-4" />
                Refresh Data
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-8 border-b border-gray-200">
            <button
              onClick={() => setActiveTab("reviews")}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "reviews"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-gray-700 hover:border-gray-300"
              }`}
              aria-current={activeTab === "reviews" ? "page" : undefined}
            >
              Reviews
            </button>
            <button
              onClick={() => setActiveTab("repositories")}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "repositories"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-gray-700 hover:border-gray-300"
              }`}
              aria-current={activeTab === "repositories" ? "page" : undefined}
            >
              Repositories
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <LoadingState 
          isLoading={loading.isLoading} 
          error={loading.error}
        >
          {activeTab === "reviews" && (
            <div className="space-y-6">
              {/* Search */}
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  placeholder="Search pull requests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-10 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Search pull requests"
                />
              </div>

              {/* Pull Requests */}
              {filteredPRs.length === 0 ? (
                <EmptyState
                  title="No pull requests found"
                  description={searchQuery ? "Try adjusting your search terms." : "No pull requests to review yet."}
                  icon={<GitPullRequest className="h-12 w-12 text-gray-400" />}
                />
              ) : (
                <div className="space-y-4" role="list" aria-label="Pull requests">
                  {filteredPRs.map((pr) => (
                    <div key={pr.id} role="listitem">
                      <PullRequestCard pullRequest={pr} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "repositories" && dashboardData && (
            <RepositoryList repositories={dashboardData.repositories} />
          )}
        </LoadingState>
      </div>
    </div>
  );
};

export default Dashboard;