import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Github, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { API_BASE_URL } from "@/config";
import { authFetch } from "@/lib/auth";
import { Navbar } from "@/components/Navbar";

/* ─── Main page ─── */

const LandingPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await authFetch(`${API_BASE_URL}/api/auth/me`, {
          method: "GET",
        });

        if (response.ok) {
          const data = await response.json();
          if (data.user?.id) {
            navigate("/dashboard", { replace: true });
            return;
          }
        }
      } catch {
        // Not logged in — stay on landing page
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuth();
  }, [navigate]);

  const handleGitHubLogin = async () => {
    setIsLoading(true);
    window.location.href = `${API_BASE_URL}/api/auth/github`;
  };

  /* ─── loading state ─── */
  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#0084ff] border-t-transparent" />
      </div>
    );
  }

  return (
    <div
      className="h-screen bg-white text-[#1a1a1a] overflow-hidden"
      style={{
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
      }}
    >
      {/* ─── Background Glow Layer ─── */}
      <div className="lg-glow-wrap" aria-hidden="true">
        <div className="lg-glow lg-glow-1" />
        <div className="lg-glow lg-glow-2" />
        <div className="lg-glow lg-glow-3" />
      </div>

      {/* ─── Navbar ─── */}
      <Navbar onGetStarted={handleGitHubLogin} isLoading={isLoading} />

      {/* ─── Hero Section ─── */}
      <main className="relative z-10 w-full max-w-[1600px] mx-auto px-6 md:px-[60px] pt-16 md:pt-20 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 items-center gap-10 lg:gap-10">
          {/* ── Left Column ── */}
          <div className="flex flex-col gap-7">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              id="social-proof"
            >
              <span
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium text-[#666]"
                style={{
                  background: "rgba(99, 102, 241, 0.06)",
                  border: "1px solid rgba(99, 102, 241, 0.15)",
                }}
              >
                <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                AI-Powered Code Reviews for GitHub
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="text-[42px] sm:text-[56px] lg:text-[75px] leading-[1.05] text-[#0a0a0a]"
              style={{
                fontFamily: "'Fustat', sans-serif",
                fontWeight: 700,
                letterSpacing: "-2px",
              }}
              id="hero-headline"
            >
              Stop shipping
              <br />
              <span className="gradient-text">buggy code</span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-base sm:text-lg leading-[1.65] text-[#666] max-w-[520px]"
              style={{
                fontFamily: "'Inter', sans-serif",
                letterSpacing: "-0.5px",
              }}
              id="hero-sub"
            >
              Let AI review every pull request so you can catch bugs, fix
              security holes, and ship with confidence.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.45 }}
              className="flex flex-wrap items-center gap-4"
            >
              <button
                id="hero-cta"
                onClick={handleGitHubLogin}
                disabled={isLoading}
                className="lg-cta disabled:opacity-50"
              >
                {isLoading ? "Connecting…" : "Get Started Free"}
                <span className="lg-cta-icon">
                  <ArrowRight className="h-[18px] w-[18px] text-white" />
                </span>
              </button>
              <a
                href="https://github.com/TusharSharma811/ReviewHog"
                target="_blank"
                rel="noopener noreferrer"
                className="lg-glass-btn !ml-0 !py-[14px] !px-7 !rounded-2xl !text-sm !font-medium"
              >
                <Github className="h-4 w-4" />
                GitHub
              </a>
            </motion.div>
          </div>

          {/* ── Right Column — Glassy Orb ── */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex items-center justify-center overflow-visible lg:order-last order-first"
            id="hero-orb"
          >
            <video
              className="lg-orb-video"
              src="https://future.co/images/homepage/glassy-orb/orb-purple.webm"
              autoPlay
              loop
              muted
              playsInline
            />
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default LandingPage;