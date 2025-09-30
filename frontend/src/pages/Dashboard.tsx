import { Bot , GitBranchIcon , GitPullRequest} from "lucide-react";
import { MetricsCard } from "@/components/MetricsCard";
import { RecentActivity } from "@/components/RecentActivity";
import { RepositoryCard } from "@/components/RepositoryCard";
import { useEffect, useState } from "react";

interface metrics {
  totalPRs?: number;
  totalReviews?: number;
  avgReviewTime?: string;
  issuesFound?: number;
}

const Dashboard = () => {

  const uid = new URLSearchParams(window.location.search).get("uid");
  console.log("User ID:", uid);
  const [repositories , setRepositories] = useState([]) ;
  const [metrics , setMetrics] = useState<metrics>({}) ;
  const [recentActivities , setRecentActivities] = useState([]) ;
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`https://vulture-needed-immensely.ngrok-free.app/api/users/data/me/insights?uid=${uid}` , {
          method : "GET" ,
          credentials : "include"
        });
        const data = await response.json();
        console.log("Fetched Data:", data);
        
        setRepositories(data.repos);
        setMetrics(data.insights);
        setRecentActivities( data.reviews);
        console.log(metrics);
        
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };
    if (uid) {
      fetchData();
    }
  }, [uid]);
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
                <p className="text-sm text-muted-foreground">GitHub Integration Dashboard</p>
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
        {/* Overview Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-6">Dashboard Overview</h2>
          
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricsCard title="Open PRs" value={metrics && metrics.totalPRs?.toString() || '0'} icon={GitPullRequest} description="Number of open pull requests across all repositories." />
           <MetricsCard title="Total Repositories" value={repositories && repositories.length.toString() || '0'} icon={GitBranchIcon} description="Total number of repositories owned by the user." />
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
            <RepositoryCard repositories={repositories}/>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;