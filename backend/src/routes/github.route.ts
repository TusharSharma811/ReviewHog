import { Router } from "express";
import { githubWebhook } from "../controllers/webhook.controller.js";

const router = Router();



router.post("/github/webhook", githubWebhook)


export default router;