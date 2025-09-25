import { CheckCircle, XCircle, AlertTriangle, GitPullRequest, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Activity {
  id: string;
  type: "review_completed" | "review_failed" | "review_pending";
  repository: string;
  pullRequest: string;
  author: string;
  timestamp: string;
  status: "success" | "failed" | "pending";
}

const mockActivities: Activity[] = [
  {
    id: "1",
    type: "review_completed",
    repository: "frontend/dashboard",
    pullRequest: "#127: Add user authentication",
    author: "sarah-dev",
    timestamp: "2 minutes ago",
    status: "success"
  },
  {
    id: "2",
    type: "review_completed",
    repository: "backend/api",
    pullRequest: "#89: Optimize database queries", 
    author: "john-doe",
    timestamp: "15 minutes ago",
    status: "success"
  },
  {
    id: "3",
    type: "review_failed",
    repository: "mobile/app",
    pullRequest: "#45: Update dependencies",
    author: "alex-mobile",
    timestamp: "32 minutes ago",
    status: "failed"
  },
  {
    id: "4",
    type: "review_pending",
    repository: "docs/website",
    pullRequest: "#12: Update API documentation",
    author: "docs-team",
    timestamp: "1 hour ago",
    status: "pending"
  },
  {
    id: "5",
    type: "review_completed",
    repository: "tools/cli",
    pullRequest: "#203: Add new command",
    author: "cli-maintainer",
    timestamp: "2 hours ago",
    status: "success"
  }
];

export const RecentActivity = () => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-success" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "pending":
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      success: "bg-success/10 text-success border-success/20",
      failed: "bg-destructive/10 text-destructive border-destructive/20",
      pending: "bg-warning/10 text-warning border-warning/20"
    };

    return (
      <Badge variant="outline" className={variants[status as keyof typeof variants]}>
        {status}
      </Badge>
    );
  };

  return (
    <Card className="bg-gradient-card border-border shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <GitPullRequest className="h-5 w-5 text-primary" />
          <span>Recent Activity</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {mockActivities.map((activity) => (
          <div key={activity.id} className="flex items-start space-x-4 p-4 rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors">
            <div className="mt-1">
              {getStatusIcon(activity.status)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium text-foreground truncate">
                    {activity.repository}
                  </p>
                  {getStatusBadge(activity.status)}
                </div>
                <span className="text-xs text-muted-foreground">
                  {activity.timestamp}
                </span>
              </div>
              
              <p className="text-sm text-muted-foreground mb-1">
                {activity.pullRequest}
              </p>
              
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                <span>{activity.author}</span>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};