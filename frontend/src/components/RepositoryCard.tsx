import ToggleSwitch from "./ToggleSwitch";
import { GitFork, Star, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Repository {
  id: string;
  name: string;
  description?: string | null;
  isReviewOn: boolean;
  stars?: number;
  forks?: number;
  language?: string | null;
  reviews?: { createdAt: string }[];
}

interface RepositoryCardProps {
  repositories: Repository[];
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

export const RepositoryCard = ({ repositories, hasMore = false, onLoadMore }: RepositoryCardProps) => {
  return (
    <Card className="bg-gradient-card border-border shadow-card">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Repositories</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {repositories.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No repositories connected yet.
          </p>
        ) : (
          <>
            {repositories.map((repo) => {
              const lastReview = repo.reviews?.[0]?.createdAt;
              const repoName = repo.name.includes("/") ? repo.name.split("/")[1] : repo.name;

              return (
                <div
                  key={repo.id}
                  className="flex items-start justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{repoName}</p>
                    {repo.description && (
                      <p className="text-xs text-muted-foreground truncate">{repo.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {repo.language && <span>{repo.language}</span>}
                      {(repo.stars ?? 0) > 0 && (
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          {repo.stars}
                        </span>
                      )}
                      {(repo.forks ?? 0) > 0 && (
                        <span className="flex items-center gap-1">
                          <GitFork className="h-3 w-3" />
                          {repo.forks}
                        </span>
                      )}
                      {lastReview && <span>Last review: {timeAgo(lastReview)}</span>}
                    </div>
                  </div>
                  <div className="ml-3 shrink-0">
                    <ToggleSwitch repoId={repo.id} initialChecked={repo.isReviewOn} />
                  </div>
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
