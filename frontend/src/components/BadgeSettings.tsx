import { useState, useEffect, useCallback } from "react";
import { Copy, Check, Image, ExternalLink } from "lucide-react";
import { API_BASE_URL } from "@/config";
import { authFetch } from "@/lib/auth";
import { toast } from "sonner";

interface Repo {
  id: string;
  name: string;
}

export const BadgeSettings = () => {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [copied, setCopied] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRepos = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authFetch(`${API_BASE_URL}/api/users/data/me/insights?page=1&limit=50`);
      if (res.ok) {
        const data = await res.json();
        setRepos(data.repos || []);
        if (data.repos?.length > 0) setSelectedRepo(data.repos[0].id);
      }
    } catch { /* non-critical */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRepos(); }, [fetchRepos]);

  const badgeUrl = selectedRepo ? `${API_BASE_URL}/api/users/data/repos/${selectedRepo}/badge.svg` : "";
  const repoName = repos.find(r => r.id === selectedRepo)?.name || "";
  const displayName = repoName.includes("/") ? repoName.split("/")[1] : repoName;

  const formats = [
    { label: "Markdown", code: `![Code Quality](${badgeUrl})`, id: "md" },
    { label: "HTML", code: `<img src="${badgeUrl}" alt="Code Quality" />`, id: "html" },
    { label: "URL", code: badgeUrl, id: "url" },
  ];

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopied(id);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-40 bg-muted rounded" />
          <div className="h-10 w-full bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="px-6 py-5 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Image className="h-5 w-5 text-emerald-500" /> Code Quality Badges
        </h3>
        <p className="text-sm text-muted-foreground mt-0.5">Embed quality badges in your README</p>
      </div>

      <div className="p-6 space-y-4">
        {repos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No repositories connected. Add a repo first.</p>
        ) : (
          <>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Select Repository</label>
              <select value={selectedRepo} onChange={e => setSelectedRepo(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none cursor-pointer">
                {repos.map(r => (
                  <option key={r.id} value={r.id}>{r.name.includes("/") ? r.name.split("/")[1] : r.name}</option>
                ))}
              </select>
            </div>

            {/* Badge Preview */}
            {selectedRepo && (
              <div className="rounded-xl bg-muted/50 p-4 flex items-center justify-center">
                <img src={badgeUrl} alt={`${displayName} quality badge`} className="h-5" />
              </div>
            )}

            {/* Embed Codes */}
            {selectedRepo && (
              <div className="space-y-2">
                {formats.map(f => (
                  <div key={f.id} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-16 shrink-0">{f.label}</span>
                    <div className="flex-1 flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border">
                      <code className="text-xs text-foreground font-mono flex-1 truncate">{f.code}</code>
                      <button onClick={() => handleCopy(f.code, f.id)}
                        className="shrink-0 p-1 rounded hover:bg-muted transition-colors cursor-pointer">
                        {copied === f.id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
