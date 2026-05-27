import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Github,
  Sparkles,
  Bot,
  BarChart3,
  GitPullRequest,
  FolderGit2,
  ShieldCheck,
  Star,
  Bug,
  Activity,
  TrendingUp,
  Code2,
  ToggleRight,
  Lock,
} from "lucide-react";
import { motion } from "motion/react";
import { API_BASE_URL } from "@/config";
import { authFetch } from "@/lib/auth";
import { Navbar } from "@/components/Navbar";

/* ─── Feature Data ─── */

const FEATURES = [
  {
    icon: Bot,
    title: "AI Code Review",
    description:
      "Automated reviews triggered on every pull request — zero manual effort with per-file analysis and actionable feedback.",
    highlights: [
      { icon: Star, text: "Strict 5-point quality rating rubric" },
      { icon: Bug, text: "Catches bugs, code smells & security issues" },
      { icon: Activity, text: "Exponential retry with backoff for reliability" },
    ],
    gradient: "from-indigo-500 to-violet-500",
    glowColor: "rgba(99, 102, 241, 0.15)",
  },
  {
    icon: BarChart3,
    title: "Dashboard & Metrics",
    description:
      "A single dashboard showing your code quality score, severity breakdown, 7-day review activity, and top repos.",
    highlights: [
      { icon: TrendingUp, text: "Quality score percentage across all reviews" },
      { icon: BarChart3, text: "Severity breakdown — clean, moderate, critical" },
      { icon: Bug, text: "Issues found vs. clean passes tracking" },
    ],
    gradient: "from-emerald-500 to-teal-500",
    glowColor: "rgba(16, 185, 129, 0.15)",
  },
  {
    icon: GitPullRequest,
    title: "GitHub Activity Tracking",
    description:
      "Full visibility into pushes, commits, PRs, issues, contribution streaks, language breakdown, and per-repo tables.",
    highlights: [
      { icon: Activity, text: "Weekly & monthly commit breakdowns" },
      { icon: Code2, text: "Language distribution across repositories" },
      { icon: TrendingUp, text: "14-day push chart & contribution streaks" },
    ],
    gradient: "from-sky-500 to-blue-500",
    glowColor: "rgba(14, 165, 233, 0.15)",
  },
  {
    icon: FolderGit2,
    title: "Repository Management",
    description:
      "Add repos directly from the dashboard, remove with inline confirmation, and toggle AI reviews per repository.",
    highlights: [
      { icon: ToggleRight, text: "Toggle AI reviews on/off per repo" },
      { icon: FolderGit2, text: "Add repos by entering owner/repo" },
      { icon: Activity, text: "Cascade-delete reviews on repo removal" },
    ],
    gradient: "from-amber-500 to-orange-500",
    glowColor: "rgba(245, 158, 11, 0.15)",
  },
  {
    icon: ShieldCheck,
    title: "Security First",
    description:
      "Webhook signature verification, authorization checks on every endpoint, and rate limiting on all routes.",
    highlights: [
      { icon: Lock, text: "HMAC SHA-256 webhook signature verification" },
      { icon: ShieldCheck, text: "User-scoped authorization on every endpoint" },
      { icon: Activity, text: "Rate limiting protects all API routes" },
    ],
    gradient: "from-rose-500 to-pink-500",
    glowColor: "rgba(244, 63, 94, 0.15)",
  },
];

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
      id="home"
      className="min-h-screen bg-white text-[#1a1a1a] overflow-x-hidden"
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

      {/* ═══════════════════════════════════════════════
          FEATURES SECTION
          ═══════════════════════════════════════════════ */}
      <section
        id="features"
        className="relative z-10 w-full max-w-[1600px] mx-auto px-6 md:px-[60px] pt-20 md:pt-32 pb-24 md:pb-36"
      >
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 md:mb-24"
        >
          <span
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium text-[#666] mb-6"
            style={{
              background: "rgba(99, 102, 241, 0.06)",
              border: "1px solid rgba(99, 102, 241, 0.15)",
            }}
          >
            <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
            Everything you need
          </span>
          <h2
            className="text-[32px] sm:text-[44px] lg:text-[56px] leading-[1.1] text-[#0a0a0a] mt-4"
            style={{
              fontFamily: "'Fustat', sans-serif",
              fontWeight: 700,
              letterSpacing: "-1.5px",
            }}
          >
            Ship better code,{" "}
            <span className="gradient-text">faster</span>
          </h2>
          <p
            className="mt-5 text-base sm:text-lg text-[#666] max-w-[600px] mx-auto leading-[1.65]"
            style={{
              fontFamily: "'Inter', sans-serif",
              letterSpacing: "-0.3px",
            }}
          >
            ReviewHog gives your team an AI-powered safety net — catching bugs,
            enforcing standards, and surfacing insights on every pull request.
          </p>
        </motion.div>

        {/* Feature Cards Grid */}
        <div className="feat-grid">
          {FEATURES.map((feat, idx) => (
            <motion.div
              key={feat.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="feat-card group"
              id={`feat-card-${idx}`}
            >
              {/* Glow background */}
              <div
                className="feat-card-glow"
                style={{ background: feat.glowColor }}
              />

              {/* Icon */}
              <div className={`feat-icon bg-gradient-to-br ${feat.gradient}`}>
                <feat.icon className="h-5 w-5 text-white" />
              </div>

              {/* Title & description */}
              <h3 className="feat-title">{feat.title}</h3>
              <p className="feat-desc">{feat.description}</p>

              {/* Highlights */}
              <ul className="feat-highlights">
                {feat.highlights.map((h, i) => (
                  <li key={i} className="feat-highlight-item">
                    <h.icon className="h-3.5 w-3.5 shrink-0 text-[#888]" />
                    <span>{h.text}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col items-center gap-5 mt-20 md:mt-28"
        >
          <p
            className="text-[#888] text-sm text-center"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Ready to let AI review your code?
          </p>
          <button
            id="features-cta"
            onClick={handleGitHubLogin}
            disabled={isLoading}
            className="lg-cta disabled:opacity-50"
          >
            {isLoading ? "Connecting…" : "Get Started Free"}
            <span className="lg-cta-icon">
              <ArrowRight className="h-[18px] w-[18px] text-white" />
            </span>
          </button>
        </motion.div>
      </section>
    </div>
  );
};

export default LandingPage;