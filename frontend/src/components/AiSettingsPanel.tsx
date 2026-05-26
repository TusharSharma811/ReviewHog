import { useCallback, useEffect, useState } from "react";
import { KeyRound, Loader2, Save, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { API_BASE_URL } from "@/config";
import { authFetch } from "@/lib/auth";

interface AISettings {
  provider: string;
  defaultModel: string;
  model: string;
  customModel: string;
  hasCustomApiKey: boolean;
  usesDefaultApiKey: boolean;
  usesDefaultModel: boolean;
  hasDefaultApiKey: boolean;
}

export const AiSettingsPanel = () => {
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [useDefaultApiKey, setUseDefaultApiKey] = useState(true);
  const [useDefaultModel, setUseDefaultModel] = useState(true);
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await authFetch(`${API_BASE_URL}/api/users/data/me/ai-settings`);

      if (!response.ok) {
        throw new Error(`Failed to load AI settings (${response.status})`);
      }

      const data: AISettings = await response.json();
      setSettings(data);
      setUseDefaultApiKey(data.usesDefaultApiKey);
      setUseDefaultModel(data.usesDefaultModel);
      setModel(data.customModel || data.defaultModel);
      setApiKey("");
    } catch (err) {
      toast.error("Failed to load AI settings", {
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
    if (!useDefaultApiKey && !apiKey.trim() && !settings?.hasCustomApiKey) {
      toast.error("OpenRouter API key required");
      return;
    }

    if (!useDefaultModel && !model.trim()) {
      toast.error("Model ID required");
      return;
    }

    try {
      setSaving(true);

      const body: {
        useDefaultApiKey: boolean;
        useDefaultModel: boolean;
        apiKey?: string;
        model?: string;
      } = {
        useDefaultApiKey,
        useDefaultModel,
      };

      if (!useDefaultApiKey && apiKey.trim()) {
        body.apiKey = apiKey.trim();
      }

      if (!useDefaultModel) {
        body.model = model.trim();
      }

      const response = await authFetch(`${API_BASE_URL}/api/users/data/me/ai-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || `Failed to save AI settings (${response.status})`);
      }

      const nextSettings = data as AISettings;
      setSettings(nextSettings);
      setUseDefaultApiKey(nextSettings.usesDefaultApiKey);
      setUseDefaultModel(nextSettings.usesDefaultModel);
      setModel(nextSettings.customModel || nextSettings.defaultModel);
      setApiKey("");

      toast.success("AI settings saved");
    } catch (err) {
      toast.error("Failed to save AI settings", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="px-6 py-5 border-b border-border flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-foreground">AI Settings</h3>
          <p className="text-sm text-muted-foreground truncate">
            {settings?.provider ?? "OpenRouter"}
          </p>
        </div>
        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <SlidersHorizontal className="h-4 w-4 text-foreground" />
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
                <span className="block text-sm font-medium text-foreground">Default API key</span>
                <span className="block text-xs text-muted-foreground">
                  {settings?.hasDefaultApiKey ? "Available" : "Missing"}
                </span>
              </span>
              <input
                type="checkbox"
                checked={useDefaultApiKey}
                onChange={(event) => setUseDefaultApiKey(event.target.checked)}
                className="h-4 w-4 accent-foreground"
              />
            </label>

            {!useDefaultApiKey && (
              <div className="space-y-2">
                <label htmlFor="openrouter-api-key" className="text-sm font-medium text-foreground">
                  OpenRouter API key
                </label>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2">
                  <KeyRound className="h-4 w-4 text-muted-foreground shrink-0" />
                  <input
                    id="openrouter-api-key"
                    type="password"
                    value={apiKey}
                    onChange={(event) => setApiKey(event.target.value)}
                    placeholder={settings?.hasCustomApiKey ? "Custom key saved" : "sk-or-v1-..."}
                    className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    autoComplete="off"
                  />
                </div>
              </div>
            )}

            <label className="flex items-center justify-between gap-4 cursor-pointer">
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground">Default model</span>
                <span className="block text-xs text-muted-foreground break-all">
                  {settings?.defaultModel}
                </span>
              </span>
              <input
                type="checkbox"
                checked={useDefaultModel}
                onChange={(event) => setUseDefaultModel(event.target.checked)}
                className="h-4 w-4 accent-foreground"
              />
            </label>

            {!useDefaultModel && (
              <div className="space-y-2">
                <label htmlFor="openrouter-model" className="text-sm font-medium text-foreground">
                  Model ID
                </label>
                <input
                  id="openrouter-model"
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                  placeholder="provider/model-name"
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm outline-none focus:border-foreground"
                />
              </div>
            )}

            <div className="rounded-xl bg-muted px-4 py-3">
              <p className="text-xs font-medium text-muted-foreground">Active model</p>
              <p className="text-sm text-foreground break-all">
                {useDefaultModel ? settings?.defaultModel : model || settings?.model}
              </p>
            </div>

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
