import { ArrowRight, Github } from "lucide-react";
import { motion } from "motion/react";
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
  return (
    <>
      {/* ─── Liquid Glass Navbar (desktop only) ─── */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="lg-navbar hidden md:flex"
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

        {/* Nav Links */}
        <ul className="flex items-center gap-1 list-none m-0 p-0">
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

        {/* GitHub Source Button */}
        <a
          href="https://github.com/TusharSharma811/ReviewHog"
          target="_blank"
          rel="noopener noreferrer"
          className="lg-glass-btn"
          id="nav-github"
        >
          <Github className="h-3.5 w-3.5" />
          GitHub
        </a>

        {/* Sign Up Button */}
        <button
          onClick={onGetStarted}
          disabled={isLoading}
          className="lg-glass-btn"
          id="nav-signup"
          style={{ background: "rgba(0, 0, 0, 0.85)", color: "#fff", border: "none" }}
        >
          {isLoading ? "Connecting…" : "Get Started"}
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </motion.nav>
    </>
  );
}
