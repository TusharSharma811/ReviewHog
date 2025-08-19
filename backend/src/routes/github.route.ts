import { Router } from "express";
import { githubWebhook } from "../controllers/webhook.controller.ts";

const router = Router();


router.get("/github/callback" , (req, res) => {
  console.log("Callback received" , req);
  res.sendStatus(200);
}) 
router.post("/github/webhook", githubWebhook)


export default router;