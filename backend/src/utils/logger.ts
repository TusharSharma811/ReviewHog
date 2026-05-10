/**
 * Structured logger with timestamps, log levels, and context tags.
 * Outputs structured JSON lines for easy parsing in production (Render logs, etc.)
 */

type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

const LOG_COLORS: Record<LogLevel, string> = {
  DEBUG: "\x1b[90m",  // gray
  INFO: "\x1b[36m",   // cyan
  WARN: "\x1b[33m",   // yellow
  ERROR: "\x1b[31m",  // red
};
const RESET = "\x1b[0m";

function formatLog(level: LogLevel, tag: string, message: string, meta?: Record<string, unknown>): void {
  const timestamp = new Date().toISOString();
  const color = LOG_COLORS[level];

  // Structured JSON for production log aggregation
  const logEntry = {
    timestamp,
    level,
    tag,
    message,
    ...(meta && Object.keys(meta).length > 0 ? { meta } : {}),
  };

  // Pretty print in dev, JSON in production
  const isDev = process.env.NODE_ENV !== "production";

  if (isDev) {
    const metaStr = meta && Object.keys(meta).length > 0
      ? ` ${JSON.stringify(meta)}`
      : "";
    const line = `${color}[${timestamp}] [${level}] [${tag}]${RESET} ${message}${metaStr}`;

    if (level === "ERROR") {
      console.error(line);
    } else if (level === "WARN") {
      console.warn(line);
    } else {
      console.log(line);
    }
  } else {
    // JSON lines for production (Render, Docker, etc.)
    const output = JSON.stringify(logEntry);
    if (level === "ERROR") {
      console.error(output);
    } else {
      console.log(output);
    }
  }
}

export const logger = {
  debug: (tag: string, message: string, meta?: Record<string, unknown>) =>
    formatLog("DEBUG", tag, message, meta),

  info: (tag: string, message: string, meta?: Record<string, unknown>) =>
    formatLog("INFO", tag, message, meta),

  warn: (tag: string, message: string, meta?: Record<string, unknown>) =>
    formatLog("WARN", tag, message, meta),

  error: (tag: string, message: string, meta?: Record<string, unknown>) =>
    formatLog("ERROR", tag, message, meta),
};
