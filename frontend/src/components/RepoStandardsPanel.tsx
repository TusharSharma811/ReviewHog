import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Edit3, BookOpen, Check, AlertTriangle, Loader2, X } from "lucide-react";
import { API_BASE_URL } from "@/config";
import { authFetch } from "@/lib/auth";
import { toast } from "sonner";

interface RepoStandard {
  id: string;
  name: string;
  prompt: string;
  isEnabled: boolean;
}

export const RepoStandardsPanel = () => {
  const [standards, setStandards] = useState<RepoStandard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", prompt: "" });
  const [saving, setSaving] = useState(false);

  const fetchStandards = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authFetch(`${API_BASE_URL}/api/users/data/me/repo-standards`);
      if (res.ok) setStandards(await res.json());
    } catch { /* non-critical */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchStandards(); }, [fetchStandards]);

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("Standard name is required");
      return;
    }
    if (form.prompt.trim().length < 10) {
      toast.error("Prompt must be at least 10 characters");
      return;
    }

    setSaving(true);
    try {
      const url = editingId
        ? `${API_BASE_URL}/api/users/data/me/repo-standards/${editingId}`
        : `${API_BASE_URL}/api/users/data/me/repo-standards`;

      const res = await authFetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        toast.success(editingId ? "Standard updated" : "Standard created");
        setShowForm(false);
        setEditingId(null);
        setForm({ name: "", prompt: "" });
        fetchStandards();
      } else {
        const data = await res.json();
        toast.error(data.message || "Failed to save standard");
      }
    } catch {
      toast.error("Failed to save standard");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await authFetch(`${API_BASE_URL}/api/users/data/me/repo-standards/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Standard deleted");
        fetchStandards();
      }
    } catch {
      toast.error("Failed to delete standard");
    }
  };

  const handleToggle = async (standard: RepoStandard) => {
    try {
      const res = await authFetch(`${API_BASE_URL}/api/users/data/me/repo-standards/${standard.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled: !standard.isEnabled }),
      });
      if (res.ok) fetchStandards();
    } catch { /* silent */ }
  };

  const startEdit = (standard: RepoStandard) => {
    setForm({ name: standard.name, prompt: standard.prompt });
    setEditingId(standard.id);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ name: "", prompt: "" });
  };

  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="px-6 py-5 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-violet-500" /> Review Standards
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Define coding standards the AI enforces on every PR review
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: "", prompt: "" }); }}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 px-3 py-1.5 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Add Standard
        </button>
      </div>

      <div className="p-6 space-y-3">
        {/* Form */}
        {showForm && (
          <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/20 p-4 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
            <input
              type="text"
              placeholder="Standard name (e.g. React Best Practices)"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              maxLength={100}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            />
            <textarea
              placeholder="Describe what the AI should enforce, e.g.:&#10;- Always use functional components with hooks&#10;- Never use inline styles&#10;- All API calls must have error handling&#10;- Use TypeScript strict mode types"
              value={form.prompt}
              onChange={e => setForm(f => ({ ...f, prompt: e.target.value }))}
              rows={5}
              maxLength={5000}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none placeholder:text-muted-foreground/60"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {form.prompt.length}/5000
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  {editingId ? "Update" : "Create"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Standards List */}
        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground animate-pulse">
            Loading standards...
          </div>
        ) : standards.length === 0 && !showForm ? (
          <div className="py-8 text-center">
            <AlertTriangle className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No review standards defined yet. Add one to enforce coding standards across all PRs.
            </p>
          </div>
        ) : (
          standards.map(standard => (
            <div
              key={standard.id}
              className={`rounded-xl border transition-colors ${
                standard.isEnabled
                  ? "border-border bg-muted/30"
                  : "border-border bg-muted/10 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${standard.isEnabled ? "text-foreground" : "text-muted-foreground"}`}>
                      {standard.name}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
                      standard
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {standard.prompt}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 ml-3 shrink-0">
                  <button
                    onClick={() => handleToggle(standard)}
                    className={`h-8 w-12 rounded-full relative transition-colors cursor-pointer ${
                      standard.isEnabled ? "bg-violet-500" : "bg-muted"
                    }`}
                  >
                    <div className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                      standard.isEnabled ? "translate-x-5" : "translate-x-1"
                    }`} />
                  </button>
                  <button
                    onClick={() => startEdit(standard)}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(standard.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-500 transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
