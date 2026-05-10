import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ExternalLink, Github, Loader2, LogOut, Settings as SettingsIcon, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AiSettingsPanel } from "@/components/AiSettingsPanel";
import { ReviewSettingsPanel } from "@/components/ReviewSettingsPanel";
import { API_BASE_URL } from "@/config";
import { authFetch, getToken, removeToken } from "@/lib/auth";
import { toast } from "sonner";
import LOGO from "../assets/Gemini_Generated_Image_azcybkazcybkazcy-removebg-preview.png";

interface UserData {
  name?: string;
  email?: string;
  avatarUrl?: string;
}

const GITHUB_APP_INSTALL_URL = "https://github.com/apps/reviewhog/installations/new";

const Settings = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    try {
      setLoading(true);
      const response = await authFetch(`${API_BASE_URL}/api/users/data/me/insights?page=1&limit=1`);

      if (response.status === 401 || response.status === 403) {
        navigate("/", { replace: true });
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to load account (${response.status})`);
      }

      const data: UserData = await response.json();
      setUserData(data);
    } catch (err) {
      toast.error("Failed to load settings", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (!getToken()) {
      navigate("/", { replace: true });
      return;
    }

    loadUser();
  }, [loadUser, navigate]);

  const handleLogout = () => {
    removeToken();
    window.location.href = "/";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 text-foreground animate-spin" />
          <p className="text-sm text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-white">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center space-x-3 min-w-0">
              <img src={LOGO} alt="ReviewHog Logo" className="h-8 w-8 shrink-0" />
              <div className="min-w-0">
                <h1 className="text-lg font-semibold text-foreground">Settings</h1>
                <p className="text-sm text-muted-foreground truncate">
                  {userData?.name ?? "ReviewHog account"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/dashboard")}
                className="inline-flex items-center gap-2 rounded-full text-sm font-medium border border-border bg-white hover:bg-gray-50 h-9 px-4 transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </button>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-full text-sm font-medium border border-border bg-white hover:bg-gray-50 h-9 px-4 transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-8">
        <div className="mb-8 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-white border border-border flex items-center justify-center">
            <SettingsIcon className="h-5 w-5 text-foreground" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Workspace Settings</h2>
            <p className="text-sm text-muted-foreground">Review behavior, AI provider, and account controls</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 space-y-8">
            <AiSettingsPanel />
            <ReviewSettingsPanel />
          </div>

          <div className="space-y-8">
            <div className="rounded-2xl border border-border bg-white">
              <div className="px-6 py-5 border-b border-border flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-foreground">Account</h3>
                  <p className="text-sm text-muted-foreground truncate">{userData?.email ?? "GitHub login"}</p>
                </div>
                {userData?.avatarUrl ? (
                  <img src={userData.avatarUrl} alt="" className="h-9 w-9 rounded-full shrink-0" />
                ) : (
                  <div className="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-foreground" />
                  </div>
                )}
              </div>
              <div className="p-6 space-y-3">
                <div className="rounded-xl bg-gray-50 px-4 py-3">
                  <p className="text-xs font-medium text-muted-foreground">GitHub user</p>
                  <p className="text-sm text-foreground truncate">{userData?.name ?? "Connected"}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-white hover:bg-gray-50 h-10 px-4 text-sm font-medium transition-colors cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-white">
              <div className="px-6 py-5 border-b border-border flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-foreground">GitHub App</h3>
                  <p className="text-sm text-muted-foreground truncate">Repository access</p>
                </div>
                <div className="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                  <Github className="h-4 w-4 text-foreground" />
                </div>
              </div>
              <div className="p-6 space-y-3">
                <a
                  href={GITHUB_APP_INSTALL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-foreground text-background hover:bg-foreground/90 h-10 px-4 text-sm font-medium transition-colors"
                >
                  Manage installation
                  <ExternalLink className="h-4 w-4" />
                </a>
                <button
                  onClick={() => navigate("/dashboard")}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-white hover:bg-gray-50 h-10 px-4 text-sm font-medium transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;
