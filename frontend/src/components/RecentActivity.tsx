import { Star, ChevronDown } from "lucide-react";

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
          className={`h-3 w-3 ${i < clamped ? "text-amber-400 fill-amber-400" : "text-gray-200"}`}
        />
      ))}
    </div>
  );
}

export const RecentActivity = ({ recentActivities, hasMore = false, onLoadMore }: RecentActivityProps) => {
  return (
    <div className="rounded-2xl border border-border bg-white">
      <div className="px-6 py-5 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
      </div>
      <div className="p-6 space-y-3">
        {recentActivities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
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
                  className="p-4 rounded-xl bg-gray-50/80 hover:bg-gray-100/80 transition-colors"
                >
                  <div className="flex items-start justify-between mb-1.5">
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
                className="w-full flex items-center justify-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors py-3 cursor-pointer rounded-xl hover:bg-indigo-50/50"
              >
                <ChevronDown className="h-4 w-4" />
                Load more
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};