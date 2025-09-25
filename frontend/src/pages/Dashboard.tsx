import { Bot, GitBranch, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { MetricsCard } from "@/components/MetricsCard";
import { RecentActivity } from "@/components/RecentActivity";
import { RepositoryCard } from "@/components/RepositoryCard";

const Dashboard = () => {
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
                <h1 className="text-xl font-semibold text-foreground">AI Review Bot</h1>
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
            <MetricsCard
              title="Reviews Completed"
              value="1,247"
              change="+12%"
              changeType="positive"
              icon={CheckCircle}
              description="This month"
            />
            <MetricsCard
              title="Success Rate"
              value="94.2%"
              change="+2.1%"
              changeType="positive"
              icon={AlertCircle}
              description="Last 30 days"
            />
            <MetricsCard
              title="Repositories"
              value="23"
              change="+3"
              changeType="positive"
              icon={GitBranch}
              description="Connected"
            />
            <MetricsCard
              title="Avg Review Time"
              value="2.4m"
              change="-0.3m"
              changeType="positive"
              icon={Clock}
              description="Per pull request"
            />
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <RecentActivity />
          </div>

          {/* Repository Status */}
          <div className="space-y-6">
            <RepositoryCard />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;