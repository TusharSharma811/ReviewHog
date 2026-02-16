import { Router } from "express";
import { githubWebhook } from "../controllers/webhook.controller.js";
import { verifyWebhookSignature } from "../middleware/verifyWebhookSignature.js";

const router = Router();

router.post("/github/webhook", verifyWebhookSignature, githubWebhook);

export default router;