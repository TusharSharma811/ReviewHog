import { useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import LOGO from "../assets/Gemini_Generated_Image_azcybkazcybkazcy-removebg-preview.png";

interface NavbarProps {
  onGetStarted: () => void;
  isLoading: boolean;
}

export function Navbar({ onGetStarted, isLoading }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="fixed top-5 left-1/2 z-50 w-[95%] max-w-5xl -translate-x-1/2 rounded-full glass-nav"
      >
        <div className="flex h-14 items-center justify-between px-6">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2.5">
            <img src={LOGO} alt="ReviewHog Logo" className="h-8 w-8" />
            <span className="text-base font-bold tracking-tight text-foreground">
              ReviewHog
            </span>
          </a>

          {/* Desktop Links */}
          <div className="hidden items-center gap-8 md:flex">
            <a
              href="#features"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              How it Works
            </a>
            <a
              href="https://github.com/TusharSharma811/ReviewHog"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              GitHub
            </a>
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:block">
            <button
              onClick={onGetStarted}
              disabled={isLoading}
              className="group inline-flex cursor-pointer items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-all hover:bg-foreground/90 disabled:opacity-50"
            >
              Get Started
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="inline-flex items-center justify-center rounded-lg p-2 text-foreground md:hidden"
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </motion.nav>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="fixed top-24 left-1/2 z-40 w-[90%] max-w-sm -translate-x-1/2 rounded-2xl border border-border bg-white p-6 shadow-xl md:hidden"
          >
            <div className="flex flex-col gap-4">
              <a
                href="#features"
                onClick={() => setMobileOpen(false)}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Features
              </a>
              <a
                href="#how-it-works"
                onClick={() => setMobileOpen(false)}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                How it Works
              </a>
              <a
                href="https://github.com/TusharSharma811/ReviewHog"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                GitHub
              </a>
              <hr className="border-border" />
              <button
                onClick={() => {
                  setMobileOpen(false);
                  onGetStarted();
                }}
                disabled={isLoading}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-all hover:bg-foreground/90 disabled:opacity-50"
              >
                Get Started
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
