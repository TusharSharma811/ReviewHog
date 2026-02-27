import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import LOGO from "../assets/Gemini_Generated_Image_azcybkazcybkazcy-removebg-preview.png"


interface NavbarProps {
    onGetStarted: () => void;
    isLoading: boolean;
}

export function Navbar({ onGetStarted, isLoading }: NavbarProps) {
    return (
        <motion.nav
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-black/70 backdrop-blur-xl"
        >
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
                {/* Logo */}
                <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-600">
                        <img src={LOGO} alt="Logo" className="h-8 w-8" />
                    </div>
                    <span className="text-lg font-bold tracking-tight">ReviewHog</span>
                </div>

                {/* Links */}
                <div className="hidden items-center gap-8 md:flex">
                    <a
                        href="#features"
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                        Features
                    </a>
                    <a
                        href="#how-it-works"
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                        How it Works
                    </a>
                    <a
                        href="https://github.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                        GitHub
                    </a>
                </div>

                {/* CTA */}
                <button
                    onClick={onGetStarted}
                    disabled={isLoading}
                    className="group inline-flex cursor-pointer items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition-all hover:bg-white/90 disabled:opacity-50"
                >
                    Get Started
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </button>
            </div>
        </motion.nav>
    );
}
