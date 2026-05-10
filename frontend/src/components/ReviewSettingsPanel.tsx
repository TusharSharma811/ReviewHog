import { useCallback, useEffect, useState } from "react";
import { Loader2, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { API_BASE_URL } from "@/config";
import { authFetch } from "@/lib/auth";

interface ReviewSettings {
  aiReviewsEnabled: boolean;
  defaultRepoReviewOn: boolean;
}

export const ReviewSettingsPanel = () => {
  const [settings, setSettings] = useState<ReviewSettings | null>(null);
  const [aiReviewsEnabled, setAiReviewsEnabled] = useState(true);
  const [defaultRepoReviewOn, setDefaultRepoReviewOn] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await authFetch(`${API_BASE_URL}/api/users/data/me/review-settings`);

      if (!response.ok) {
        throw new Error(`Failed to load review settings (${response.status})`);
      }

      const data: ReviewSettings = await response.json();
      setSettings(data);
      setAiReviewsEnabled(data.aiReviewsEnabled);
      setDefaultRepoReviewOn(data.defaultRepoReviewOn);
    } catch (err) {
      toast.error("Failed to load review settings", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await authFetch(`${API_BASE_URL}/api/users/data/me/review-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiReviewsEnabled, defaultRepoReviewOn }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || `Failed to save review settings (${response.status})`);
      }

      const nextSettings = data as ReviewSettings;
      setSettings(nextSettings);
      setAiReviewsEnabled(nextSettings.aiReviewsEnabled);
      setDefaultRepoReviewOn(nextSettings.defaultRepoReviewOn);
      toast.success("Review settings saved");
    } catch (err) {
      toast.error("Failed to save review settings", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-white">
      <div className="px-6 py-5 border-b border-border flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-foreground">Review Automation</h3>
          <p className="text-sm text-muted-foreground truncate">
            {settings?.aiReviewsEnabled ? "Enabled" : "Paused"}
          </p>
        </div>
        <div className="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
          <ShieldCheck className="h-4 w-4 text-foreground" />
        </div>
      </div>

      <div className="p-6 space-y-5">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading settings...
          </div>
        ) : (
          <>
            <label className="flex items-center justify-between gap-4 cursor-pointer">
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground">AI reviews</span>
                <span className="block text-xs text-muted-foreground">
                  {aiReviewsEnabled ? "Running for enabled repositories" : "Paused across all repositories"}
                </span>
              </span>
              <input
                type="checkbox"
                checked={aiReviewsEnabled}
                onChange={(event) => setAiReviewsEnabled(event.target.checked)}
                className="h-4 w-4 accent-foreground"
              />
            </label>

            <label className="flex items-center justify-between gap-4 cursor-pointer">
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground">New repositories</span>
                <span className="block text-xs text-muted-foreground">
                  {defaultRepoReviewOn ? "Reviews start enabled" : "Reviews start disabled"}
                </span>
              </span>
              <input
                type="checkbox"
                checked={defaultRepoReviewOn}
                onChange={(event) => setDefaultRepoReviewOn(event.target.checked)}
                className="h-4 w-4 accent-foreground"
              />
            </label>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-foreground text-background hover:bg-foreground/90 h-10 px-4 text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save settings
            </button>
          </>
        )}
      </div>
    </div>
  );
};
