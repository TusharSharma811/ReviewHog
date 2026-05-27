import { useState } from "react";
import { ArrowRight, Menu, X, Github } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import LOGO from "../assets/47509314-ae8b-44c2-b8c0-5d5a8a7ff228.png";

interface NavbarProps {
  onGetStarted: () => void;
  isLoading: boolean;
}

const NAV_LINKS = [
  { label: "Home", href: "#home", id: "nav-home" },
  { label: "Features", href: "#features", id: "nav-features" },
];

/** Smooth-scroll to a hash target, handling the sticky navbar offset */
function scrollToHash(hash: string) {
  if (hash === "#home" || hash === "#") {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  const el = document.querySelector(hash);
  if (el) {
    const offset = 100; // clear the sticky navbar
    const y = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: y, behavior: "smooth" });
  }
}

export function Navbar({ onGetStarted, isLoading }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* ─── Liquid Glass Navbar ─── */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="lg-navbar"
        id="main-nav"
      >
        {/* Logo */}
        <a
          href="/"
          className="flex items-center gap-2.5 mr-6 no-underline"
          id="nav-logo"
        >
          <img src={LOGO} alt="ReviewHog Logo" className="h-7 w-7" />
          <span
            className="text-[22px] font-bold tracking-[-0.5px] text-[#111] whitespace-nowrap"
            style={{ fontFamily: "'Fustat', sans-serif" }}
          >
            ReviewHog
          </span>
        </a>

        {/* Desktop Nav Links */}
        <ul className="hidden md:flex items-center gap-1 list-none m-0 p-0">
          {NAV_LINKS.map((link) => (
            <li key={link.id}>
              <a
                href={link.href}
                id={link.id}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToHash(link.href);
                }}
                className="text-sm font-medium text-[#555] px-4 py-2 rounded-[10px] transition-colors no-underline hover:text-[#111] hover:bg-black/5 whitespace-nowrap cursor-pointer"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Desktop — GitHub Source Button */}
        <a
          href="https://github.com/TusharSharma811/ReviewHog"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden md:inline-flex lg-glass-btn"
          id="nav-github"
        >
          <Github className="h-3.5 w-3.5" />
          GitHub
        </a>

        {/* Desktop Sign Up Button */}
        <button
          onClick={onGetStarted}
          disabled={isLoading}
          className="hidden md:inline-flex lg-glass-btn"
          id="nav-signup"
          style={{ background: "rgba(0, 0, 0, 0.85)", color: "#fff", border: "none" }}
        >
          {isLoading ? "Connecting…" : "Get Started"}
          <ArrowRight className="h-3.5 w-3.5" />
        </button>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden ml-auto inline-flex items-center justify-center rounded-lg p-2 text-[#333] bg-transparent border-none cursor-pointer"
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </motion.nav>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="fixed top-24 left-1/2 z-40 w-[90%] max-w-sm -translate-x-1/2 rounded-2xl p-5 md:hidden"
            style={{
              background: "rgba(255, 255, 255, 0.85)",
              backdropFilter: "blur(40px)",
              WebkitBackdropFilter: "blur(40px)",
              border: "1px solid rgba(0, 0, 0, 0.08)",
              borderRadius: "14px",
              boxShadow: "0 12px 40px rgba(0, 0, 0, 0.08)",
            }}
          >
            <div className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.id}
                  href={link.href}
                  onClick={(e) => {
                    e.preventDefault();
                    setMobileOpen(false);
                    scrollToHash(link.href);
                  }}
                  className="text-sm font-medium text-[#555] px-4 py-3 rounded-[10px] transition-colors no-underline hover:text-[#111] hover:bg-black/5 cursor-pointer"
                >
                  {link.label}
                </a>
              ))}
              <a
                href="https://github.com/TusharSharma811/ReviewHog"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 text-sm font-medium text-[#555] px-4 py-3 rounded-[10px] transition-colors no-underline hover:text-[#111] hover:bg-black/5"
              >
                <Github className="h-4 w-4" />
                GitHub
              </a>
              <hr className="border-[#e5e7eb] my-2" />
              <button
                onClick={() => {
                  setMobileOpen(false);
                  onGetStarted();
                }}
                disabled={isLoading}
                className="lg-cta justify-center text-sm py-3"
              >
                {isLoading ? "Connecting…" : "Get Started"}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
