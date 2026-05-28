import { useCallback, useEffect, useState } from "react";
import {
  KeyRound, Loader2, Save, SlidersHorizontal,
  ExternalLink, Shield, Eye, EyeOff, ChevronDown
} from "lucide-react";
import { toast } from "sonner";
import { API_BASE_URL } from "@/config";
import { authFetch } from "@/lib/auth";

// ─── Types ──────────────────────────────────────────────────────────────────

interface AISettings {
  provider: string;
  providerName: string;
  defaultModel: string;
  model: string;
  customModel: string;
  hasCustomApiKey: boolean;
  usesDefaultApiKey: boolean;
  usesDefaultModel: boolean;
  hasDefaultApiKey: boolean;
  baseUrl: string;
}

// ─── Provider Definitions ───────────────────────────────────────────────────

const PROVIDERS = [
  {
    id: "openrouter",
    name: "OpenRouter",
    icon: "🌐",
    description: "100+ models, single API key",
    keyUrl: "https://openrouter.ai/keys",
    keyPlaceholder: "sk-or-v1-...",
    models: [
      { id: "deepseek/deepseek-v4-flash", label: "DeepSeek V4 Flash" },
      { id: "anthropic/claude-sonnet-4", label: "Claude Sonnet 4" },
      { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
      { id: "openai/gpt-4o", label: "GPT-4o" },
      { id: "openai/gpt-4o-mini", label: "GPT-4o Mini" },
      { id: "meta-llama/llama-4-maverick", label: "Llama 4 Maverick" },
    ],
  },
  {
    id: "openai",
    name: "OpenAI",
    icon: "🤖",
    description: "GPT-4o, GPT-4.1 direct",
    keyUrl: "https://platform.openai.com/api-keys",
    keyPlaceholder: "sk-proj-...",
    models: [
      { id: "gpt-4o", label: "GPT-4o" },
      { id: "gpt-4o-mini", label: "GPT-4o Mini" },
      { id: "gpt-4.1", label: "GPT-4.1" },
      { id: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    icon: "🧠",
    description: "Claude models direct",
    keyUrl: "https://console.anthropic.com/settings/keys",
    keyPlaceholder: "sk-ant-...",
    models: [
      { id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
      { id: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku" },
    ],
  },
  {
    id: "google",
    name: "Google AI",
    icon: "💎",
    description: "Gemini models direct",
    keyUrl: "https://aistudio.google.com/apikey",
    keyPlaceholder: "AIza...",
    models: [
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
      { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
      { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
    ],
  },
  {
    id: "default",
    name: "Default (Free)",
    icon: "⚡",
    description: "Limited accuracy, rate-limited",
    keyUrl: "",
    keyPlaceholder: "",
    models: [],
  },
];

// ─── Component ──────────────────────────────────────────────────────────────

export const AiSettingsPanel = () => {
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState("default");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [showProviderPicker, setShowProviderPicker] = useState(false);

  const provider = PROVIDERS.find(p => p.id === selectedProvider) || PROVIDERS[4];

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await authFetch(`${API_BASE_URL}/api/users/data/me/ai-settings`);
      if (!response.ok) throw new Error(`Failed to load AI settings (${response.status})`);

      const data: AISettings = await response.json();
      setSettings(data);
      setSelectedProvider(data.provider || "default");
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

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const handleSave = async () => {
    if (selectedProvider !== "default" && !apiKey.trim() && !settings?.hasCustomApiKey) {
      toast.error("API key required for this provider");
      return;
    }

    try {
      setSaving(true);

      const body: Record<string, unknown> = {
        provider: selectedProvider,
        useDefaultApiKey: selectedProvider === "default",
        useDefaultModel: !model.trim(),
      };

      if (apiKey.trim()) body.apiKey = apiKey.trim();
      if (model.trim()) body.model = model.trim();

      const response = await authFetch(`${API_BASE_URL}/api/users/data/me/ai-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || `Failed (${response.status})`);

      const next = data as AISettings;
      setSettings(next);
      setSelectedProvider(next.provider || "default");
      setModel(next.customModel || next.defaultModel);
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
            {settings?.providerName ?? "Loading..."}
          </p>
        </div>
        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <SlidersHorizontal className="h-4 w-4 text-foreground" />
        </div>
      </div>

      <div className="p-6 space-y-5">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading settings...
          </div>
        ) : (
          <>
            {/* Provider Selector */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Provider</label>
              <button
                onClick={() => setShowProviderPicker(!showProviderPicker)}
                className="w-full flex items-center justify-between rounded-xl border border-border bg-muted px-4 py-3 text-sm text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <span>{provider.icon}</span>
                  <span className="font-medium">{provider.name}</span>
                  <span className="text-muted-foreground text-xs hidden sm:inline">— {provider.description}</span>
                </span>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showProviderPicker ? "rotate-180" : ""}`} />
              </button>

              {showProviderPicker && (
                <div className="mt-2 rounded-xl border border-border bg-card overflow-hidden">
                  {PROVIDERS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedProvider(p.id);
                        setShowProviderPicker(false);
                        if (p.models.length > 0) setModel(p.models[0].id);
                        else setModel("");
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors cursor-pointer ${
                        selectedProvider === p.id
                          ? "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400"
                          : "hover:bg-muted/50 text-foreground"
                      }`}
                    >
                      <span className="text-lg">{p.icon}</span>
                      <div className="min-w-0">
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* API Key */}
            {selectedProvider !== "default" && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5 text-indigo-500" /> API Key
                  </label>
                  {provider.keyUrl && (
                    <a href={provider.keyUrl} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors">
                      Get key <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-border bg-muted px-3 py-2.5">
                  <KeyRound className="h-4 w-4 text-muted-foreground shrink-0" />
                  <input
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder={settings?.hasCustomApiKey ? "Key saved (enter new to replace)" : provider.keyPlaceholder}
                    className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground font-mono"
                    autoComplete="off"
                  />
                  <button onClick={() => setShowKey(!showKey)}
                    className="p-1 text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <div className="flex items-center gap-1.5 mt-1.5 text-xs text-emerald-600">
                  <Shield className="h-3 w-3" />
                  <span>Encrypted with AES-256-GCM</span>
                </div>
              </div>
            )}

            {/* Model Selection */}
            {provider.models.length > 0 && (
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Model</label>
                <div className="grid grid-cols-1 gap-1.5">
                  {provider.models.map(m => (
                    <button
                      key={m.id}
                      onClick={() => setModel(m.id)}
                      className={`w-full px-3 py-2 rounded-lg border text-left text-sm transition-all cursor-pointer ${
                        model === m.id
                          ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 font-medium"
                          : "border-border bg-muted/30 hover:bg-muted/60 text-foreground"
                      }`}
                    >
                      {m.label}
                      <span className="text-xs text-muted-foreground ml-2 font-mono">{m.id}</span>
                    </button>
                  ))}
                </div>

                <div className="mt-2">
                  <input
                    value={model}
                    onChange={e => setModel(e.target.value)}
                    placeholder="Or enter custom model ID"
                    className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm outline-none focus:border-foreground font-mono"
                  />
                </div>
              </div>
            )}

            {/* Active Config Summary */}
            <div className="rounded-xl bg-muted px-4 py-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Active configuration</p>
              <p className="text-sm text-foreground">
                <span className="mr-1">{provider.icon}</span> {provider.name}
                {model && <span className="text-muted-foreground"> · {model}</span>}
              </p>
            </div>

            {/* Save */}
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
