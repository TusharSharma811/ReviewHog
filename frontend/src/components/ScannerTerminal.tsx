import { useEffect, useState } from "react";
import { TriangleAlert, CircleX, Check } from "lucide-react";
import { motion, useAnimation } from "motion/react";

/* ─── Fake scanner data ─── */
const SCAN_FILES = [
    { name: "src/components/AuthProvider.tsx", errors: 0, warnings: 1 },
    { name: "src/hooks/useSession.ts", errors: 2, warnings: 0 },
    { name: "src/lib/apiClient.ts", errors: 0, warnings: 0 },
    { name: "src/utils/validate.ts", errors: 1, warnings: 2 },
    { name: "src/pages/Settings.tsx", errors: 0, warnings: 0 },
    { name: "src/components/Dashboard.tsx", errors: 1, warnings: 1 },
    { name: "src/store/userSlice.ts", errors: 0, warnings: 3 },
    { name: "src/middleware/auth.ts", errors: 0, warnings: 0 },
    { name: "src/components/Modal.tsx", errors: 0, warnings: 1 },
    { name: "src/controllers/webhook.ts", errors: 3, warnings: 0 },
];

/* ─── Fake review comment data ─── */
const REVIEW_COMMENTS = [
    {
        file: "useSession.ts",
        line: 42,
        severity: "error",
        message: "Potential memory leak: unsubscribe from observer in cleanup.",
    },
    {
        file: "validate.ts",
        line: 17,
        severity: "warning",
        message: "Consider using zod schema instead of manual validation.",
    },
    {
        file: "webhook.ts",
        line: 88,
        severity: "error",
        message: "Missing HMAC signature verification on incoming payload.",
    },
];

export function ScannerTerminal() {
    const [visibleLines, setVisibleLines] = useState(0);
    const [showComments, setShowComments] = useState(false);
    const controls = useAnimation();

    useEffect(() => {
        const interval = setInterval(() => {
            setVisibleLines((prev) => {
                if (prev >= SCAN_FILES.length) {
                    clearInterval(interval);
                    setTimeout(() => setShowComments(true), 400);
                    return prev;
                }
                return prev + 1;
            });
        }, 280);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (showComments) {
            controls.start({ opacity: 1, y: 0 });
        }
    }, [showComments, controls]);

    return (
        <div className="terminal-glow relative w-full overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a0a0a]">
            {/* Terminal header */}
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
                <div className="h-3 w-3 rounded-full bg-[#ff5f56]" />
                <div className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
                <div className="h-3 w-3 rounded-full bg-[#27c93f]" />
                <span className="ml-3 font-mono text-xs text-muted-foreground">
                    reviewhog scan — pull-request #47
                </span>
            </div>

            {/* File scan lines */}
            <div className="p-4 font-mono text-[13px] leading-relaxed">
                <div className="mb-3 text-muted-foreground">
                    <span className="text-blue-400">$</span> reviewhog scan
                    --pr=47
                </div>
                {SCAN_FILES.slice(0, visibleLines).map((file, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center justify-between py-[3px]"
                    >
                        <span className="truncate text-white/70">
                            <span className="mr-2 text-muted-foreground">
                                {String(i + 1).padStart(2, " ")}
                            </span>
                            {file.name}
                        </span>
                        <span className="ml-4 flex shrink-0 items-center gap-3">
                            {file.errors > 0 && (
                                <span className="flex items-center gap-1 text-red-400">
                                    <CircleX className="h-3 w-3" />
                                    {file.errors} {file.errors === 1 ? "error" : "errors"}
                                </span>
                            )}
                            {file.warnings > 0 && (
                                <span className="flex items-center gap-1 text-amber-400">
                                    <TriangleAlert className="h-3 w-3" />
                                    {file.warnings}
                                </span>
                            )}
                            {file.errors === 0 && file.warnings === 0 && (
                                <span className="flex items-center gap-1 text-emerald-400">
                                    <Check className="h-3 w-3" />
                                </span>
                            )}
                        </span>
                    </motion.div>
                ))}

                {/* Scan progress indicator */}
                {visibleLines < SCAN_FILES.length && (
                    <div className="mt-2 flex items-center gap-2 text-blue-400">
                        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-400" />
                        Scanning for issues…
                    </div>
                )}

                {/* Review comments */}
                {showComments && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={controls}
                        transition={{ duration: 0.4 }}
                        className="mt-4 space-y-2 border-t border-white/[0.06] pt-4"
                    >
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            AI Review Comments
                        </div>
                        {REVIEW_COMMENTS.map((c, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -6 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.2, duration: 0.3 }}
                                className={`rounded-md border px-3 py-2 text-xs ${c.severity === "error"
                                    ? "border-red-500/20 bg-red-500/5 text-red-300"
                                    : "border-amber-500/20 bg-amber-500/5 text-amber-300"
                                    }`}
                            >
                                <span className="font-semibold">
                                    {c.file}:{c.line}
                                </span>{" "}
                                — {c.message}
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </div>
        </div>
    );
}
