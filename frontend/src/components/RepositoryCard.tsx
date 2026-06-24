import ToggleSwitch from "./ToggleSwitch";
import { GitFork, Star, ChevronDown, Trash2, Plus, MessageSquare, Check, X, Loader2, Thermometer } from "lucide-react";
import { useState } from "react";
import { API_BASE_URL } from "@/config";
import { authFetch } from "@/lib/auth";
import { toast } from "sonner";

interface Repository {
  id: string;
  name: string;
  description?: string | null;
  isReviewOn: boolean;
  stars?: number;
  forks?: number;
  language?: string | null;
  reviews?: { createdAt: string }[];
  reviewInstructions?: string | null;
  temperature?: number;
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

// ─── Per-Repo Settings Editor (instructions + temperature) ──────────────────

function RepoSettingsEditor({
  repoId,
  initialInstructions,
  initialTemperature,
}: {
  repoId: string;
  initialInstructions: string | null;
  initialTemperature: number;
}) {
  const [open, setOpen] = useState(false);
  const [instructions, setInstructions] = useState(initialInstructions ?? "");
  const [temperature, setTemperature] = useState(initialTemperature);
  const [saving, setSaving] = useState(false);
  const [savedInstructions, setSavedInstructions] = useState(initialInstructions ?? "");
  const [savedTemperature, setSavedTemperature] = useState(initialTemperature);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await authFetch(
        `${API_BASE_URL}/api/users/data/repos/${repoId}/settings`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reviewInstructions: instructions.trim() || null,
            temperature,
          }),
        }
      );
      if (res.ok) {
        toast.success("Repo settings saved");
        setSavedInstructions(instructions.trim());
        setSavedTemperature(temperature);
        setOpen(false);
      } else {
        const data = await res.json();
        toast.error(data.message || "Failed to save");
      }
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setInstructions(savedInstructions);
    setTemperature(savedTemperature);
    setOpen(false);
  };

  return (
    <div className="mt-2">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors cursor-pointer rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-950/30 px-2 py-1"
        >
          <MessageSquare className="h-3 w-3" />
          {savedInstructions ? "Edit user instructions" : "Add user instructions"}
          {savedTemperature !== 0.1 && (
            <span className="ml-1 text-muted-foreground">
              · temp {savedTemperature.toFixed(2)}
            </span>
          )}
        </button>
      ) : (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
          {/* Instructions */}
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">
              User Instructions
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Define your review standards and instructions here. e.g. Focus on error handling, ensure all async functions have try-catch blocks, enforce naming conventions..."
              rows={4}
              maxLength={5000}
              className="w-full px-3 py-2 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-background text-foreground text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none placeholder:text-muted-foreground/60"
            />
            <span className="text-xs text-muted-foreground">
              {instructions.length}/5000
            </span>
          </div>

          {/* Temperature slider */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-foreground flex items-center gap-1">
                <Thermometer className="h-3 w-3 text-orange-500" />
                Temperature
              </label>
              <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {temperature.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer accent-indigo-500"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
              <span>Precise (0.0)</span>
              <span>Creative (1.0)</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-1.5">
            <button
              onClick={handleCancel}
              disabled={saving}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted transition-colors cursor-pointer disabled:opacity-50"
            >
              <X className="h-3 w-3" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded-md transition-colors cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Repository Card ────────────────────────────────────────────────────────

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
                  className="p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-start justify-between">
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
                  {/* Per-repo user instructions + temperature */}
                  <RepoSettingsEditor
                    repoId={repo.id}
                    initialInstructions={repo.reviewInstructions ?? null}
                    initialTemperature={repo.temperature ?? 0.1}
                  />
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
