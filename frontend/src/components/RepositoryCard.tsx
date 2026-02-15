import { GitBranch, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ToggleSwitch from "./ToggleSwitch";

interface Review {
  id: string;
  createdAt: string;
}

interface Repository {
  id: string;
  name: string;
  description?: string | null;
  url: string;
  language?: string | null;
  stars: number;
  forks: number;
  isReviewOn: boolean;
  createdAt: string;
  reviews: Review[];
}

function formatRelativeDate(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

export const RepositoryCard = ({
  repositories,
}: {
  repositories: Repository[];
}) => {
  if (!repositories || repositories.length === 0) {
    return (
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center space-x-2">
            <GitBranch className="h-5 w-5 text-primary" />
            <span>Repositories</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No repositories connected yet. Install the ReviewHog GitHub App to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card border-border shadow-card max-h-[600px] overflow-y-auto">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <GitBranch className="h-5 w-5 text-primary" />
            <span>Repositories ({repositories.length})</span>
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {repositories.map((repo) => (
          <div
            key={repo.id}
            className="flex items-center justify-between p-3 rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors"
          >
            <div className="flex-1 min-w-0 mr-3">
              <div className="flex items-center space-x-2 mb-1">
                <a
                  href={repo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-foreground truncate hover:text-primary transition-colors flex items-center gap-1"
                >
                  {repo.name}
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              </div>

              {repo.description && (
                <p className="text-xs text-muted-foreground truncate mb-1">
                  {repo.description}
                </p>
              )}

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {repo.reviews.length > 0 ? (
                  <>
                    <span>{repo.reviews.length} review{repo.reviews.length !== 1 ? "s" : ""}</span>
                    <span>·</span>
                    <span>Last: {formatRelativeDate(repo.reviews[0].createdAt)}</span>
                  </>
                ) : (
                  <span>No reviews yet</span>
                )}
              </div>
            </div>

            <ToggleSwitch repoId={repo.id} initialChecked={repo.isReviewOn} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
