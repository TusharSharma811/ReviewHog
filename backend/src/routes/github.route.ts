import { Router } from "express";
import { githubWebhook } from "../controllers/github.controller.ts";

const router = Router();


router.post("/github/callback" , (req, res) => {
  console.log("Callback received" , req);
  res.sendStatus(200);
}) 
router.post("/github/webhook", githubWebhook)


export default router;