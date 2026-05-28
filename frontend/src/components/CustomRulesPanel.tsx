import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Edit3, Shield, Check, AlertTriangle } from "lucide-react";
import { API_BASE_URL } from "@/config";
import { authFetch } from "@/lib/auth";
import { toast } from "sonner";

interface CustomRule {
  id: string;
  name: string;
  pattern: string;
  description: string | null;
  severity: string;
  category: string;
  isEnabled: boolean;
}

const SEVERITY_OPTIONS = [
  { value: "critical", label: "Critical", color: "text-red-600" },
  { value: "high", label: "High", color: "text-orange-600" },
  { value: "medium", label: "Medium", color: "text-amber-600" },
  { value: "low", label: "Low", color: "text-blue-600" },
];

const CATEGORY_OPTIONS = [
  { value: "custom", label: "Custom" },
  { value: "security", label: "Security" },
  { value: "performance", label: "Performance" },
  { value: "style", label: "Style" },
];

export const CustomRulesPanel = () => {
  const [rules, setRules] = useState<CustomRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", pattern: "", description: "", severity: "medium", category: "custom" });

  const fetchRules = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authFetch(`${API_BASE_URL}/api/users/data/me/custom-rules`);
      if (res.ok) setRules(await res.json());
    } catch { /* non-critical */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.pattern.trim()) {
      toast.error("Name and pattern are required");
      return;
    }

    try {
      const url = editingId
        ? `${API_BASE_URL}/api/users/data/me/custom-rules/${editingId}`
        : `${API_BASE_URL}/api/users/data/me/custom-rules`;

      const res = await authFetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        toast.success(editingId ? "Rule updated" : "Rule created");
        setShowForm(false);
        setEditingId(null);
        setForm({ name: "", pattern: "", description: "", severity: "medium", category: "custom" });
        fetchRules();
      } else {
        const data = await res.json();
        toast.error(data.message || "Failed to save rule");
      }
    } catch {
      toast.error("Failed to save rule");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await authFetch(`${API_BASE_URL}/api/users/data/me/custom-rules/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Rule deleted");
        fetchRules();
      }
    } catch {
      toast.error("Failed to delete rule");
    }
  };

  const handleToggle = async (rule: CustomRule) => {
    try {
      const res = await authFetch(`${API_BASE_URL}/api/users/data/me/custom-rules/${rule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled: !rule.isEnabled }),
      });
      if (res.ok) fetchRules();
    } catch { /* silent */ }
  };

  const startEdit = (rule: CustomRule) => {
    setForm({ name: rule.name, pattern: rule.pattern, description: rule.description || "", severity: rule.severity, category: rule.category });
    setEditingId(rule.id);
    setShowForm(true);
  };

  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="px-6 py-5 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Shield className="h-5 w-5 text-indigo-500" /> Custom Review Rules
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">Define patterns to flag during code reviews</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: "", pattern: "", description: "", severity: "medium", category: "custom" }); }}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors cursor-pointer">
          <Plus className="h-4 w-4" /> Add Rule
        </button>
      </div>

      <div className="p-6 space-y-3">
        {/* Form */}
        {showForm && (
          <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20 p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input type="text" placeholder="Rule name" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
              <input type="text" placeholder="Pattern (e.g. console.log)" value={form.pattern}
                onChange={e => setForm(f => ({ ...f, pattern: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
            </div>
            <input type="text" placeholder="Description (optional)" value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
            <div className="grid grid-cols-2 gap-3">
              <select value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}
                className="px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none cursor-pointer">
                {SEVERITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none cursor-pointer">
                {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => { setShowForm(false); setEditingId(null); }}
                className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">Cancel</button>
              <button onClick={handleSubmit}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors cursor-pointer">
                <Check className="h-3.5 w-3.5" /> {editingId ? "Update" : "Create"}
              </button>
            </div>
          </div>
        )}

        {/* Rules List */}
        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground animate-pulse">Loading rules...</div>
        ) : rules.length === 0 ? (
          <div className="py-8 text-center">
            <AlertTriangle className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No custom rules yet. Create one to flag specific patterns in code reviews.</p>
          </div>
        ) : (
          rules.map(rule => (
            <div key={rule.id} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
              rule.isEnabled ? "border-border bg-muted/30" : "border-border bg-muted/10 opacity-60"
            }`}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${rule.isEnabled ? "text-foreground" : "text-muted-foreground"}`}>{rule.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    rule.severity === "critical" ? "bg-red-100 dark:bg-red-900/30 text-red-600" :
                    rule.severity === "high" ? "bg-orange-100 dark:bg-orange-900/30 text-orange-600" :
                    rule.severity === "medium" ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600" :
                    "bg-blue-100 dark:bg-blue-900/30 text-blue-600"
                  }`}>{rule.severity}</span>
                  <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded bg-muted">{rule.category}</span>
                </div>
                <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">{rule.pattern}</p>
              </div>
              <div className="flex items-center gap-1.5 ml-3 shrink-0">
                <button onClick={() => handleToggle(rule)} className={`h-8 w-12 rounded-full relative transition-colors cursor-pointer ${
                  rule.isEnabled ? "bg-indigo-500" : "bg-muted"
                }`}>
                  <div className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                    rule.isEnabled ? "translate-x-5" : "translate-x-1"
                  }`} />
                </button>
                <button onClick={() => startEdit(rule)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => handleDelete(rule.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-500 transition-colors cursor-pointer">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
