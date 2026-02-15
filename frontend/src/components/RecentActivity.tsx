import { GitPullRequest, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Review {
  id: string;
  comment?: string | null;
  rating?: number | null;
  approved: boolean;
  createdAt: string;
  repo: {
    id: string;
    name: string;
  };
}

function formatRelativeDate(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

function renderRating(rating: number | null | undefined) {
  if (rating == null) return null;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${i < rating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

export const RecentActivity = ({ recentActivities }: { recentActivities: Review[] }) => {
  if (!recentActivities || recentActivities.length === 0) {
    return (
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <GitPullRequest className="h-5 w-5 text-primary" />
            <span>Recent Reviews</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No reviews yet. Reviews will appear here once PRs are opened on your connected repositories.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card border-border shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <GitPullRequest className="h-5 w-5 text-primary" />
          <span>Recent Reviews</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {recentActivities.map((review) => (
          <div key={review.id} className="flex items-start space-x-4 p-4 rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium text-foreground truncate">
                    {review.repo.name}
                  </p>
                  <Badge
                    variant="outline"
                    className={
                      review.approved
                        ? "bg-success/10 text-success border-success/20"
                        : "bg-muted/20 text-muted-foreground border-muted"
                    }
                  >
                    {review.approved ? "Approved" : "Reviewed"}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground shrink-0 ml-2">
                  {formatRelativeDate(review.createdAt)}
                </span>
              </div>

              {review.comment && (
                <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                  {review.comment.slice(0, 150)}{review.comment.length > 150 ? "..." : ""}
                </p>
              )}

              {renderRating(review.rating)}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};