import { useState } from "react";
import { X, Plus, AlertCircle } from "lucide-react";

interface AddRepoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string, description: string) => Promise<void>;
}

export const AddRepoModal = ({ isOpen, onClose, onAdd }: AddRepoModalProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = name.trim();

    // Validate owner/repo format
    if (!/^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/.test(trimmed)) {
      setError("Please enter a valid GitHub repo in owner/repo format");
      return;
    }

    setLoading(true);
    try {
      await onAdd(trimmed, description.trim());
      setName("");
      setDescription("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add repository");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl bg-white border border-border shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Add Repository</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="repo-name">
              Repository
            </label>
            <input
              id="repo-name"
              type="text"
              placeholder="owner/repository"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(null); }}
              className="w-full h-10 px-3 rounded-xl border border-border bg-gray-50/50 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:border-foreground/30 transition-all"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Enter the GitHub repository in <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">owner/repo</code> format
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="repo-desc">
              Description <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              id="repo-desc"
              type="text"
              placeholder="A brief description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-border bg-gray-50/50 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:border-foreground/30 transition-all"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <div className="bg-indigo-50/50 border border-indigo-200 rounded-xl p-3">
            <p className="text-xs text-indigo-700">
              <strong>Note:</strong> For AI-powered reviews, ensure the ReviewHog GitHub App is also installed on this repository.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-full text-sm font-medium border border-border bg-white hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="h-9 px-5 rounded-full text-sm font-medium bg-foreground text-background hover:bg-foreground/90 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              {loading ? "Adding..." : "Add Repository"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
