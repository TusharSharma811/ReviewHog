import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Github,
  Shield,
  Zap,
  GitPullRequest,
  MessageSquareCode,
  ArrowRight,
  Link2,
  Sparkles,
  Twitter,
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
    accent: "bg-amber-50 text-amber-600",
  },
  {
    icon: Shield,
    title: "Security First",
    description:
      "Automatically detect vulnerabilities, leaked secrets, and insecure patterns before they reach production.",
    accent: "bg-emerald-50 text-emerald-600",
  },
  {
    icon: Github,
    title: "GitHub Native",
    description:
      "Zero-config integration. Install the GitHub App, and ReviewHog comments directly on your pull requests.",
    accent: "bg-indigo-50 text-indigo-600",
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

  /* ─── loading state ─── */
  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ─── Navbar ─── */}
      <Navbar onGetStarted={handleGitHubLogin} isLoading={isLoading} />

      {/* ─── Hero ─── */}
      <section className="relative flex min-h-screen items-center overflow-hidden pt-24">
        {/* Ambient glow blobs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="glow-blob absolute -left-60 top-20 h-[500px] w-[500px] bg-indigo-200/60" />
          <div className="glow-blob absolute -right-40 bottom-10 h-[400px] w-[400px] bg-violet-200/50" />
          <div className="glow-blob absolute left-1/3 top-1/2 h-[300px] w-[300px] bg-purple-200/40" />
        </div>

        <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-12 px-6 lg:grid-cols-2 lg:gap-20">
          {/* Left — copy */}
          <div className="flex flex-col justify-center space-y-8">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                AI-Powered Code Reviews for GitHub
              </span>
            </motion.div>

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
                className="group inline-flex cursor-pointer items-center gap-2.5 rounded-full bg-foreground px-7 py-3.5 text-sm font-semibold text-background shadow-lg shadow-black/10 transition-all hover:bg-foreground/90 hover:shadow-xl hover:shadow-black/15 disabled:opacity-50"
              >
                {isLoading ? "Connecting…" : "Get Started Free"}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
              <a
                href="https://github.com/TusharSharma811/ReviewHog"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-7 py-3.5 text-sm font-medium text-foreground transition-all hover:bg-gray-50 hover:border-gray-300"
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
                className="card-hover group rounded-2xl border border-border bg-white p-8"
              >
                <div
                  className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl ${f.accent}`}
                >
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">
                  {f.title}
                </h3>
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
          <div className="glow-blob absolute left-1/2 top-0 h-[500px] w-[700px] -translate-x-1/2 bg-indigo-100/50" />
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
                className="card-hover relative rounded-2xl border border-border bg-white p-8"
              >
                <span className="absolute right-6 top-6 font-mono text-5xl font-black text-gray-100">
                  {s.step}
                </span>
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-gray-50">
                  <s.icon className="h-5 w-5 text-indigo-500" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">
                  {s.title}
                </h3>
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
            className="relative overflow-hidden rounded-3xl border border-border bg-white p-12 text-center shadow-lg md:p-20"
          >
            {/* Decorative glow */}
            <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-indigo-100/50 blur-[100px]" />
            <div className="pointer-events-none absolute -left-20 -bottom-20 h-60 w-60 rounded-full bg-violet-100/50 blur-[80px]" />

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
                className="group inline-flex cursor-pointer items-center gap-2.5 rounded-full bg-foreground px-7 py-3.5 text-sm font-semibold text-background transition-all hover:bg-foreground/90 disabled:opacity-50"
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
      <footer className="border-t border-border bg-white py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-12 md:grid-cols-4">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground">
                  <MessageSquareCode className="h-3.5 w-3.5 text-background" />
                </div>
                <span className="text-base font-bold text-foreground">
                  ReviewHog
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                AI-powered code reviews for every GitHub pull request.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="mb-4 text-sm font-semibold text-foreground">
                Product
              </h4>
              <ul className="space-y-3">
                <li>
                  <a
                    href="#features"
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <a
                    href="#how-it-works"
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    How it Works
                  </a>
                </li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="mb-4 text-sm font-semibold text-foreground">
                Resources
              </h4>
              <ul className="space-y-3">
                <li>
                  <a
                    href="https://github.com/TusharSharma811/ReviewHog"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    GitHub
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/TusharSharma811/ReviewHog/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Support
                  </a>
                </li>
              </ul>
            </div>

            {/* Social */}
            <div>
              <h4 className="mb-4 text-sm font-semibold text-foreground">
                Connect
              </h4>
              <div className="flex items-center gap-3">
                <a
                  href="https://github.com/TusharSharma811/ReviewHog"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-gray-50 hover:text-foreground"
                >
                  <Github className="h-4 w-4" />
                </a>
                <a
                  href="#"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-gray-50 hover:text-foreground"
                >
                  <Twitter className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-12 border-t border-border pt-8 text-center">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} ReviewHog. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;