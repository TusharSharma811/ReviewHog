import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, Key, Zap, Shield, Sparkles, ExternalLink,
  CheckCircle, AlertTriangle, Eye, EyeOff
} from "lucide-react";
import { API_BASE_URL } from "@/config";
import { authFetch } from "@/lib/auth";
import { toast } from "sonner";
import LOGO from "../assets/47509314-ae8b-44c2-b8c0-5d5a8a7ff228.png";

// ─── Provider Definitions ───────────────────────────────────────────────────

const PROVIDERS = [
  {
    id: "openrouter" as const,
    name: "OpenRouter",
    description: "Access 100+ models from OpenAI, Anthropic, Google, Meta & more with a single API key",
    icon: "🌐",
    keyUrl: "https://openrouter.ai/keys",
    keyPlaceholder: "sk-or-v1-...",
    recommended: true,
    models: [
      { id: "deepseek/deepseek-v4-flash", label: "DeepSeek V4 Flash", tag: "Fast & free" },
      { id: "anthropic/claude-sonnet-4", label: "Claude Sonnet 4", tag: "Best quality" },
      { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", tag: "Fast" },
      { id: "openai/gpt-4o", label: "GPT-4o", tag: "Versatile" },
      { id: "openai/gpt-4o-mini", label: "GPT-4o Mini", tag: "Budget" },
      { id: "meta-llama/llama-4-maverick", label: "Llama 4 Maverick", tag: "Open source" },
    ],
  },
  {
    id: "openai" as const,
    name: "OpenAI Direct",
    description: "Use your OpenAI API key directly for GPT models",
    icon: "🤖",
    keyUrl: "https://platform.openai.com/api-keys",
    keyPlaceholder: "sk-proj-...",
    recommended: false,
    models: [
      { id: "gpt-4o", label: "GPT-4o", tag: "Best quality" },
      { id: "gpt-4o-mini", label: "GPT-4o Mini", tag: "Budget" },
      { id: "gpt-4.1", label: "GPT-4.1", tag: "Latest" },
      { id: "gpt-4.1-mini", label: "GPT-4.1 Mini", tag: "Fast" },
    ],
  },
];

// ─── Component ──────────────────────────────────────────────────────────────

const Onboarding = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"choice" | "provider" | "done">("choice");
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);

  const provider = PROVIDERS.find(p => p.id === selectedProvider);

  const handleUseDefault = async () => {
    setSaving(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/api/users/data/me/onboarding`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "default" }),
      });
      if (res.ok) {
        setStep("done");
        setTimeout(() => navigate("/dashboard"), 1500);
      } else {
        toast.error("Failed to save settings");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProvider = async () => {
    if (!selectedProvider || !apiKey.trim()) {
      toast.error("Please enter your API key");
      return;
    }

    setSaving(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/api/users/data/me/onboarding`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: selectedProvider,
          apiKey: apiKey.trim(),
          model: selectedModel || undefined,
        }),
      });
      if (res.ok) {
        setStep("done");
        setTimeout(() => navigate("/dashboard"), 1500);
      } else {
        const data = await res.json();
        toast.error(data.message || "Failed to save settings");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  // ─── Done Screen ──────────────────────────────────────────────────────

  if (step === "done") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 animate-in fade-in">
          <div className="h-16 w-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
            <CheckCircle className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">You're all set!</h2>
          <p className="text-muted-foreground">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <img src={LOGO} alt="ReviewHog" className="h-14 w-14 rounded-xl mx-auto mb-4" />
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {step === "choice" ? "Welcome to ReviewHog 🎉" : `Set up ${provider?.name}`}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            {step === "choice"
              ? "Configure your AI provider for the best code review experience"
              : "Enter your API key to unlock premium code reviews"}
          </p>
        </div>

        {/* Step: Choose Provider or Default */}
        {step === "choice" && (
          <div className="space-y-4">
            {/* Recommendation Banner */}
            <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  We recommend bringing your own API key
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                  The default free model has limited accuracy. Your own key unlocks top-tier models like Claude, GPT-4o, and Gemini for significantly better security & correctness analysis.
                </p>
              </div>
            </div>

            {/* Provider Cards */}
            {PROVIDERS.map(p => (
              <button
                key={p.id}
                onClick={() => { setSelectedProvider(p.id); setSelectedModel(p.models[0]?.id || ""); setStep("provider"); }}
                className="w-full rounded-2xl border border-border bg-card p-5 text-left hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-start gap-4">
                  <div className="text-3xl">{p.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-foreground group-hover:text-indigo-600 transition-colors">{p.name}</h3>
                      {p.recommended && (
                        <span className="text-xs font-medium text-emerald-600 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{p.description}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {p.models.slice(0, 4).map(m => (
                        <span key={m.id} className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-muted">{m.label}</span>
                      ))}
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-indigo-500 shrink-0 mt-1 transition-colors" />
                </div>
              </button>
            ))}

            {/* Default Option */}
            <div className="relative">
              <div className="absolute inset-x-0 top-0 flex items-center justify-center -mt-3">
                <span className="text-xs text-muted-foreground bg-background px-3">or</span>
              </div>
              <button
                onClick={handleUseDefault}
                disabled={saving}
                className="w-full rounded-2xl border border-dashed border-border bg-card/50 p-5 text-center hover:border-muted-foreground/50 transition-all cursor-pointer disabled:opacity-50 mt-2"
              >
                <Zap className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium text-muted-foreground">Continue with free default</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Uses DeepSeek V4 Flash (free) — limited accuracy for security analysis
                </p>
              </button>
            </div>
          </div>
        )}

        {/* Step: Configure Provider */}
        {step === "provider" && provider && (
          <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
            {/* API Key Input */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <Key className="h-4 w-4 text-indigo-500" /> API Key
                </label>
                <a href={provider.keyUrl} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors">
                  Get a key <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder={provider.keyPlaceholder}
                  className="w-full px-4 py-3 pr-10 rounded-xl border border-border bg-background text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-shadow"
                />
                <button onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-600">
                <Shield className="h-3 w-3" />
                <span>Encrypted with AES-256-GCM before storage. Never stored in plain text.</span>
              </div>
            </div>

            {/* Model Selection */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-amber-500" /> Model
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {provider.models.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedModel(m.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedModel === m.id
                        ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 dark:border-indigo-700"
                        : "border-border bg-muted/30 hover:bg-muted/50"
                    }`}
                  >
                    <p className="text-sm font-medium text-foreground">{m.label}</p>
                    <p className="text-xs text-muted-foreground">{m.tag}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button onClick={() => setStep("choice")}
                className="px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                ← Back
              </button>
              <button
                onClick={handleSaveProvider}
                disabled={!apiKey.trim() || saving}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-foreground text-background h-11 text-sm font-medium hover:bg-foreground/90 transition-colors cursor-pointer disabled:opacity-40"
              >
                {saving ? "Saving..." : "Complete Setup"} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
