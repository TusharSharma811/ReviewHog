import ToggleSwitch from "./ToggleSwitch";
import { GitFork, Star, ChevronDown, Trash2, Plus } from "lucide-react";
import { useState } from "react";

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
  onAddRepo?: () => void;
  onRemoveRepo?: (repoId: string, repoName: string) => void;
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

export const RepositoryCard = ({
  repositories,
  hasMore = false,
  onLoadMore,
  onAddRepo,
  onRemoveRepo,
}: RepositoryCardProps) => {
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Repositories</h3>
        {onAddRepo && (
          <button
            onClick={onAddRepo}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer rounded-lg hover:bg-indigo-50 px-2.5 py-1.5"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        )}
      </div>
      <div className="p-4 sm:p-6 space-y-3">
        {repositories.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground mb-3">
              No repositories connected yet.
            </p>
            {onAddRepo && (
              <button
                onClick={onAddRepo}
                className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Add your first repository
              </button>
            )}
          </div>
        ) : (
          <>
            {repositories.map((repo) => {
              const lastReview = repo.reviews?.[0]?.createdAt;
              const repoName = repo.name.includes("/") ? repo.name.split("/")[1] : repo.name;
              const isConfirming = confirmingDelete === repo.id;

              return (
                <div
                  key={repo.id}
                  className="flex items-start justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{repoName}</p>
                    {repo.description && (
                      <p className="text-xs text-muted-foreground truncate">{repo.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {repo.language && (
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-indigo-400" />
                          {repo.language}
                        </span>
                      )}
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
                  <div className="ml-3 shrink-0 flex items-center gap-2">
                    <ToggleSwitch repoId={repo.id} initialChecked={repo.isReviewOn} />
                    {onRemoveRepo && (
                      <>
                        {isConfirming ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                onRemoveRepo(repo.id, repo.name);
                                setConfirmingDelete(null);
                              }}
                              className="text-xs font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg px-2 py-1 transition-colors cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmingDelete(null)}
                              className="text-xs font-medium text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 rounded-lg px-2 py-1 transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmingDelete(repo.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors cursor-pointer"
                            title="Remove repository"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
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
