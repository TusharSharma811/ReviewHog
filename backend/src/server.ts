import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import githubRoutes from "./routes/github.route.js";
import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";
import feedbackRoutes from "./routes/feedback.route.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));

app.use("/api", githubRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users/data", userRoutes);
app.use("/api/feedback", feedbackRoutes);

app.get("/", (req, res) => {
    res.json({ 
        success: true, 
        message: "CodeRevU API is running",
        version: "1.0.0",
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use(notFound);

// Error handling middleware (must be last)
app.use(errorHandler);

app.listen(3000, () => {
    try {
        console.log("🚀 Server started successfully on port 3000");
        console.log("📱 Environment:", process.env.NODE_ENV || 'development');
    } catch (error) {
        console.error("❌ Error starting server:", error);
        process.exit(1);
    }
});