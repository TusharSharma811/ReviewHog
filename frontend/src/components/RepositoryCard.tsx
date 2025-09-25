import { Plus, GitBranch, Settings, CheckCircle, XCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Repository {
  id: string;
  name: string;
  owner: string;
  status: "active" | "inactive" | "pending";
  lastReview: string;
  reviewCount: number;
}

const mockRepositories: Repository[] = [
  {
    id: "1",
    name: "frontend/dashboard",
    owner: "acme-corp",
    status: "active",
    lastReview: "2 min ago",
    reviewCount: 45
  },
  {
    id: "2", 
    name: "backend/api",
    owner: "acme-corp",
    status: "active",
    lastReview: "15 min ago",
    reviewCount: 32
  },
  {
    id: "3",
    name: "mobile/app",
    owner: "acme-corp", 
    status: "pending",
    lastReview: "1 hour ago",
    reviewCount: 18
  },
  {
    id: "4",
    name: "docs/website",
    owner: "acme-corp",
    status: "inactive",
    lastReview: "2 days ago",
    reviewCount: 7
  }
];

export const RepositoryCard = () => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-3 w-3 text-success" />;
      case "inactive":
        return <XCircle className="h-3 w-3 text-muted-foreground" />;
      case "pending":
        return <Clock className="h-3 w-3 text-warning" />;
      default:
        return <XCircle className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: "bg-success/10 text-success border-success/20",
      inactive: "bg-muted/20 text-muted-foreground border-muted",
      pending: "bg-warning/10 text-warning border-warning/20"
    };

    return (
      <Badge variant="outline" className={`${variants[status as keyof typeof variants]} text-xs`}>
        {status}
      </Badge>
    );
  };

  return (
    <Card className="bg-gradient-card border-border shadow-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <GitBranch className="h-5 w-5 text-primary" />
            <span>Repositories</span>
          </CardTitle>
          <Button size="sm" className="bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-1" />
            Add Repo
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {mockRepositories.map((repo) => (
          <div key={repo.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors group">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                {getStatusIcon(repo.status)}
                <p className="text-sm font-medium text-foreground truncate">
                  {repo.name}
                </p>
                {getStatusBadge(repo.status)}
              </div>
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Last review: {repo.lastReview}</span>
                <span>{repo.reviewCount} reviews</span>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity ml-2"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        ))}
        
        <div className="pt-4 border-t border-border">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-3">
              Connect more repositories to expand coverage
            </p>
            <Button variant="outline" className="w-full border-primary/20 hover:bg-primary/5">
              <Plus className="h-4 w-4 mr-2" />
              Connect GitHub Repository
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};