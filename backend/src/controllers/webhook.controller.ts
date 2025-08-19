import { Request, Response } from "express";
import axios from "axios";
import dotenv from "dotenv";
import { generateAppJwt } from "../utils/githubAuth.ts";
dotenv.config();
import { installationWebhook } from "../webhook/installation.webhook.ts";
import { pullRequestWebhook } from "../webhook/pullRequest.webhook.ts";

export const githubWebhook = async (req: Request, res: Response) => {
  try {
    const event = req.headers["x-github-event"];
    const payload = req.body;
    
    if (event === "installation") {
      installationWebhook(req, res, payload.action, payload);
    } else if (event === "pull_request" ) {
      pullRequestWebhook(req, res, payload.action, payload);
    }
  } catch (error) {
    console.log("Error in githubWebhook", error);
    res.sendStatus(500);
  }
};
