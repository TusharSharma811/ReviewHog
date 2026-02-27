import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Github,
  Shield,
  Zap,
  GitPullRequest,
  MessageSquareCode,
  ArrowRight,
  Link2,
} from "lucide-react";
import { motion } from "motion/react";
import { API_BASE_URL } from "@/config";
import { authFetch } from "@/lib/auth";
import { Navbar } from "@/components/Navbar";
import { ScannerTerminal } from "@/components/ScannerTerminal";



const FEATURES = [
  {
    icon: Zap,
    title: "Instant Reviews",
    description:
      "Get detailed AI feedback on every pull request within seconds, not hours. Ship faster with confidence.",
    color: "from-amber-500 to-orange-600",
  },
  {
    icon: Shield,
    title: "Security First",
    description:
      "Automatically detect vulnerabilities, leaked secrets, and insecure patterns before they reach production.",
    color: "from-emerald-500 to-teal-600",
  },
  {
    icon: Github,
    title: "GitHub Native",
    description:
      "Zero-config integration. Install the GitHub App, and ReviewHog comments directly on your pull requests.",
    color: "from-blue-500 to-violet-600",
  },
];

const STEPS = [
  {
    icon: Link2,
    step: "01",
    title: "Connect GitHub",
    description: "Install the ReviewHog app on your repositories in one click.",
  },
  {
    icon: GitPullRequest,
    step: "02",
    title: "Open a Pull Request",
    description:
      "Push code and create a PR as usual. ReviewHog activates automatically.",
  },
  {
    icon: MessageSquareCode,
    step: "03",
    title: "Get AI Review",
    description:
      "Receive line-by-line comments with actionable fixes and best-practice suggestions.",
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

  /* ─── particle positions (stable between rerenders) ─── */
  const particles = useMemo(
    () =>
      Array.from({ length: 40 }, () => ({
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        delay: Math.random() * 5,
        duration: 3 + Math.random() * 4,
        size: 1 + Math.random() * 2,
      })),
    []
  );

  /* ─── loading state ─── */
  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-foreground">
      {/* ─── Navbar ─── */}
      <Navbar onGetStarted={handleGitHubLogin} isLoading={isLoading} />

      {/* ─── Hero ─── */}
      <section className="relative flex min-h-screen items-center overflow-hidden pt-16">
        {/* Gradient blobs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-40 top-0 h-[600px] w-[600px] rounded-full bg-blue-600/15 blur-[120px]" />
          <div className="absolute -right-40 bottom-0 h-[500px] w-[500px] rounded-full bg-violet-600/15 blur-[120px]" />
        </div>

        {/* Floating particles */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {particles.map((p, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-blue-400/30"
              style={{
                top: p.top,
                left: p.left,
                width: p.size,
                height: p.size,
              }}
              animate={{ opacity: [0, 1, 0], y: [0, -30, 0] }}
              transition={{
                duration: p.duration,
                repeat: Infinity,
                delay: p.delay,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-12 px-6 lg:grid-cols-2 lg:gap-16">
          {/* Left — copy */}
          <div className="flex flex-col justify-center space-y-8">


            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
            >
              Stop shipping
              <br />
              <span className="gradient-text">buggy code</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="max-w-lg text-lg leading-relaxed text-muted-foreground md:text-xl"
            >
              Let AI review every pull request so you can catch bugs, fix
              security holes, and ship with confidence.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-wrap items-center gap-4"
            >
              <button
                id="hero-cta"
                onClick={handleGitHubLogin}
                disabled={isLoading}
                className="group inline-flex cursor-pointer items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-blue-500/40 disabled:opacity-50"
              >
                {isLoading ? "Connecting…" : "Get Started Free"}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
              <a
                href="https://github.com/TusharSharma811/ReviewHog"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/[0.08] hover:text-foreground"
              >
                <Github className="h-4 w-4" />
                GitHub
              </a>
            </motion.div>
          </div>

          {/* Right — terminal */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="flex items-center"
          >
            <ScannerTerminal />
          </motion.div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="relative py-32">
        <div className="mx-auto max-w-7xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5 }}
            className="mb-16 text-center"
          >
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need to&nbsp;
              <span className="gradient-text">ship clean code</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              ReviewHog plugs directly into your GitHub workflow—no context
              switching, no extra tools.
            </p>
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 transition-colors hover:border-white/[0.12] hover:bg-white/[0.04]"
              >
                <div
                  className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${f.color} shadow-lg`}
                >
                  <f.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {f.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How it works ─── */}
      <section id="how-it-works" className="relative py-32">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-violet-600/10 blur-[140px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5 }}
            className="mb-16 text-center"
          >
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Up and running in{" "}
              <span className="gradient-text">three steps</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              No configuration files. No CLI setup. Just install and go.
            </p>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8"
              >
                <span className="absolute right-6 top-6 font-mono text-5xl font-black text-white/[0.04]">
                  {s.step}
                </span>
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{s.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {s.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA banner ─── */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-blue-600/10 via-violet-600/10 to-transparent p-12 text-center md:p-20"
          >
            <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-blue-600/10 blur-[100px]" />
            <h2 className="relative z-10 text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to level up your code reviews?
            </h2>
            <p className="relative z-10 mx-auto mt-4 max-w-xl text-muted-foreground">
              Join developers who ship cleaner, safer code every day with
              AI-powered reviews.
            </p>
            <div className="relative z-10 mt-8 flex flex-wrap justify-center gap-4">
              <button
                id="cta-banner-button"
                onClick={handleGitHubLogin}
                disabled={isLoading}
                className="group inline-flex cursor-pointer items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-black transition-all hover:bg-white/90 disabled:opacity-50"
              >
                <Github className="h-4 w-4" />
                {isLoading ? "Connecting…" : "Continue with GitHub"}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-white/[0.06] py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-gradient-to-br from-blue-500 to-violet-600">
              <MessageSquareCode className="h-3 w-3 text-white" />
            </div>
            <span className="font-semibold text-foreground">ReviewHog</span>
          </div>
          <p>© {new Date().getFullYear()} ReviewHog. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;