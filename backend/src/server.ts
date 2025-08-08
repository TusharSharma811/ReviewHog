import express from "express";
import githubRoutes from "./routes/github.route.ts";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", githubRoutes);
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