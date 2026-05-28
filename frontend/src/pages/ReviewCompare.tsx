import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, Star, ArrowRight, ArrowUpRight, ArrowDownRight, Minus, GitPullRequest } from "lucide-react";
import { API_BASE_URL } from "@/config";
import { authFetch } from "@/lib/auth";
import Loader from "@/components/Loader";
import LOGO from "../assets/47509314-ae8b-44c2-b8c0-5d5a8a7ff228.png";

interface ReviewSummary {
  id: string;
  rating: number | null;
  riskScore: number | null;
  findingsCount: number;
  criticalCount: number;
  highCount: number;
  tokensUsed: number;
  processingMs: number;
  pipelineVersion: string;
  comment: string | null;
  prUrl: string | null;
  createdAt: string;
  repo: { id: string; name: string };
}

function DeltaIndicator({ before, after, lowerIsBetter = false }: { before: number; after: number; lowerIsBetter?: boolean }) {
  const delta = after - before;
  if (delta === 0) return <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Minus className="h-3 w-3" /> No change</span>;
  const improved = lowerIsBetter ? delta < 0 : delta > 0;
  return (
    <span className={`text-xs font-medium flex items-center gap-0.5 ${improved ? "text-emerald-600" : "text-red-500"}`}>
      {improved ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {delta > 0 ? "+" : ""}{delta}
    </span>
  );
}

const ReviewCompare = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [reviews, setReviews] = useState<ReviewSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [allReviews, setAllReviews] = useState<{ id: string; repoName: string; createdAt: string; rating: number | null }[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [picking, setPicking] = useState(false);

  const idsParam = searchParams.get("ids") || "";

  const fetchComparison = useCallback(async (ids: string) => {
    if (!ids || ids.split(",").filter(Boolean).length !== 2) return;
    try {
      setLoading(true);
      const res = await authFetch(`${API_BASE_URL}/api/users/data/reviews/compare?ids=${ids}`);
      if (res.status === 401) { navigate("/", { replace: true }); return; }
      if (res.ok) {
        const data = await res.json();
        // Sort chronologically
        const sorted = data.reviews.sort((a: ReviewSummary, b: ReviewSummary) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        setReviews(sorted);
      }
    } catch { /* non-critical */ }
    finally { setLoading(false); }
  }, [navigate]);

  const fetchAllReviews = useCallback(async () => {
    try {
      const res = await authFetch(`${API_BASE_URL}/api/users/data/reviews/history?days=90`);
      if (res.ok) {
        const data = await res.json();
        setAllReviews(data.reviews.map((r: any) => ({
          id: r.id, repoName: r.repoName, createdAt: r.createdAt, rating: r.rating,
        })));
      }
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => {
    if (idsParam) fetchComparison(idsParam);
    else { setLoading(false); setPicking(true); }
    fetchAllReviews();
  }, [idsParam, fetchComparison, fetchAllReviews]);

  const handleSelect = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const handleCompare = () => {
    if (selectedIds.length === 2) {
      navigate(`/compare?ids=${selectedIds.join(",")}`);
      setPicking(false);
      fetchComparison(selectedIds.join(","));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background max-w-full overflow-x-hidden">
      <header className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/dashboard")} className="p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer">
              <ArrowLeft className="h-4 w-4 text-foreground" />
            </button>
            <img src={LOGO} alt="ReviewHog" className="h-6 w-6 rounded" />
            <div>
              <h1 className="text-base sm:text-lg font-semibold text-foreground">Compare Reviews</h1>
              <p className="text-xs text-muted-foreground">Side-by-side comparison of two reviews</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-6 sm:py-8 space-y-6">
        {/* Picker */}
        {(picking || reviews.length === 0) && (
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="text-lg font-semibold text-foreground mb-2">Select Two Reviews to Compare</h3>
            <p className="text-sm text-muted-foreground mb-4">Pick any two reviews to see how your code quality changed between them.</p>

            {allReviews.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No reviews found. Create some reviews first!</p>
            ) : (
              <>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {allReviews.slice().reverse().map(r => (
                    <button key={r.id} onClick={() => handleSelect(r.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer text-left ${
                        selectedIds.includes(r.id)
                          ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 dark:border-indigo-700"
                          : "border-border bg-muted/30 hover:bg-muted/50"
                      }`}>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {r.repoName.includes("/") ? r.repoName.split("/")[1] : r.repoName}
                        </p>
                        <p className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {r.rating != null && (
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={`h-3 w-3 ${i < r.rating! ? "text-amber-400 fill-amber-400" : "text-gray-200 dark:text-gray-700"}`} />
                            ))}
                          </div>
                        )}
                        <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                          selectedIds.includes(r.id) ? "border-indigo-500 bg-indigo-500" : "border-border"
                        }`}>
                          {selectedIds.includes(r.id) && <span className="text-white text-xs font-bold">{selectedIds.indexOf(r.id) + 1}</span>}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <button onClick={handleCompare} disabled={selectedIds.length !== 2}
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-foreground text-background h-10 text-sm font-medium transition-colors disabled:opacity-40 cursor-pointer">
                  Compare Selected <ArrowRight className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        )}

        {/* Comparison View */}
        {reviews.length === 2 && (
          <>
            <div className="flex items-center justify-center gap-4 text-center">
              <div className="text-sm font-medium text-muted-foreground">
                {new Date(reviews[0].createdAt).toLocaleDateString()}
              </div>
              <ArrowRight className="h-5 w-5 text-indigo-500" />
              <div className="text-sm font-medium text-muted-foreground">
                {new Date(reviews[1].createdAt).toLocaleDateString()}
              </div>
            </div>

            {/* Side-by-side metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviews.map((r, idx) => {
                const repoName = r.repo.name.includes("/") ? r.repo.name.split("/")[1] : r.repo.name;
                return (
                  <div key={r.id} className={`rounded-2xl border bg-card p-5 space-y-4 ${idx === 0 ? "border-border" : "border-indigo-200 dark:border-indigo-800"}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">{idx === 0 ? "Before" : "After"}</p>
                        <p className="text-sm font-semibold text-foreground">{repoName}</p>
                      </div>
                      <Link to={`/review/${r.id}`} className="text-xs text-indigo-600 hover:text-indigo-700">View →</Link>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-muted/50">
                        <p className="text-xs text-muted-foreground">Rating</p>
                        <div className="flex items-center gap-1 mt-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`h-3.5 w-3.5 ${r.rating && i < r.rating ? "text-amber-400 fill-amber-400" : "text-gray-200 dark:text-gray-700"}`} />
                          ))}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-muted/50">
                        <p className="text-xs text-muted-foreground">Risk Score</p>
                        <p className="text-lg font-bold text-foreground">{r.riskScore ?? "—"}<span className="text-xs text-muted-foreground">/100</span></p>
                      </div>
                      <div className="p-3 rounded-xl bg-muted/50">
                        <p className="text-xs text-muted-foreground">Findings</p>
                        <p className="text-lg font-bold text-foreground">{r.findingsCount}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-muted/50">
                        <p className="text-xs text-muted-foreground">Critical</p>
                        <p className="text-lg font-bold text-red-600">{r.criticalCount}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Deltas */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-base font-semibold text-foreground mb-4">Changes Summary</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Rating</p>
                  <DeltaIndicator before={reviews[0].rating ?? 0} after={reviews[1].rating ?? 0} />
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Risk Score</p>
                  <DeltaIndicator before={reviews[0].riskScore ?? 0} after={reviews[1].riskScore ?? 0} lowerIsBetter />
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Findings</p>
                  <DeltaIndicator before={reviews[0].findingsCount} after={reviews[1].findingsCount} lowerIsBetter />
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Critical</p>
                  <DeltaIndicator before={reviews[0].criticalCount} after={reviews[1].criticalCount} lowerIsBetter />
                </div>
              </div>
            </div>

            <button onClick={() => { setPicking(true); setReviews([]); setSelectedIds([]); }}
              className="text-sm text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer">
              ← Pick different reviews
            </button>
          </>
        )}
      </main>
    </div>
  );
};

export default ReviewCompare;
