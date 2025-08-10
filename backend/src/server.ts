import express from "express";
import cors from "cors";

import githubRoutes from "./routes/github.route.ts";
import authRoutes from "./routes/auth.route.ts";


const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors(
    {
        origin: "http://localhost:5173",
        methods: ["GET", "POST", "PUT", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true
    }
))

app.use("/api", githubRoutes);
app.use("/api/auth", authRoutes);
app.get("/" , (req , res)=>{
    res.send("Service is alive") ;
})
app.listen(3000, () => {
    try {
        console.log("Server started successfully");
    } catch (error) {
        console.error("Error starting server:", error);
    }
    
});