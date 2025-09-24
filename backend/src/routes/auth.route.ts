import { Router } from "express";
import { githubCallback, githubLogin } from "../controllers/auth.controller.js";
const router = Router();

router.get("/github", githubLogin);

router.get("/github/callback", githubCallback);

export default router;
