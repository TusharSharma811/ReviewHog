import { Star, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Review {
  id: string;
  comment?: string | null;
  rating?: number | null;
  createdAt: string;
  repo?: {
    id: string;
    name: string;
  };
}

interface RecentActivityProps {
  recentActivities: Review[];
  hasMore?: boolean;
  onLoadMore?: () => void;
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function renderStars(rating: number | null | undefined) {
  if (rating == null) return null;
  const clamped = Math.max(1, Math.min(5, Math.round(rating)));
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${i < clamped ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

export const RecentActivity = ({ recentActivities, hasMore = false, onLoadMore }: RecentActivityProps) => {
  return (
    <Card className="bg-gradient-card border-border shadow-card">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {recentActivities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No reviews yet. Open a pull request to get your first AI review!
          </p>
        ) : (
          <>
            {recentActivities.map((review) => {
              const repoName = review.repo?.name
                ? review.repo.name.includes("/")
                  ? review.repo.name.split("/")[1]
                  : review.repo.name
                : "Unknown repo";

              return (
                <div
                  key={review.id}
                  className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-sm font-medium text-foreground">{repoName}</span>
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">
                      {timeAgo(review.createdAt)}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {review.comment.substring(0, 200)}
                    </p>
                  )}
                  {renderStars(review.rating)}
                </div>
              );
            })}
            {hasMore && onLoadMore && (
              <button
                onClick={onLoadMore}
                className="w-full flex items-center justify-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors py-2 cursor-pointer"
              >
                <ChevronDown className="h-4 w-4" />
                Load more
              </button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};