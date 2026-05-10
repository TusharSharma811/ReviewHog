import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
import githubRoutes from "./routes/github.route.js";
import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

app.set("trust proxy", 1);

// --- Rate Limiting ---
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many auth requests, please try again later." },
});

// --- CORS Origins ---
function getCorsOrigins(): (string | RegExp)[] {
  const origins: string[] = [
    "https://review-hog.vercel.app",  // Production frontend
    "http://localhost:5173",           // Local dev
  ];

  if (process.env.FRONTEND_URL) {
    origins.push(process.env.FRONTEND_URL);
  }

  if (process.env.CORS_ORIGINS) {
    origins.push(...process.env.CORS_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean));
  }

  // Deduplicate
  return [...new Set(origins)];
}

// --- Middleware ---
// Capture raw body for webhook signature verification
app.use("/api/github", express.json({
  verify: (req: Request, _res: Response, buf: Buffer) => {
    (req as Request & { rawBody?: Buffer }).rawBody = buf;
  },
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({
  origin: getCorsOrigins(),
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
}));
app.use(globalLimiter);

// --- Routes ---
app.use("/api", githubRoutes);
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/users/data", userRoutes);

app.get("/", (_req: Request, res: Response) => {
  res.send("Service is alive");
});

// --- Global Error Handler ---
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Server started successfully on port ${PORT}`);
});