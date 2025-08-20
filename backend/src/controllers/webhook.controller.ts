import { Request, Response } from "express";
import { GitHubWebhookPayload } from "../types/github.types.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { installationWebhook } from "../webhook/installation.webhook.js";
import { pullRequestWebhook } from "../webhook/pullRequest.webhook.js";

export const githubWebhook = asyncHandler(async (req: Request, res: Response) => {
  const event = req.headers["x-github-event"] as string;
  const payload = req.body as GitHubWebhookPayload;
  
  if (!event) {
    return res.status(400).json({ success: false, error: 'Missing x-github-event header' });
  }

  if (!payload.action) {
    return res.status(400).json({ success: false, error: 'Missing action in payload' });
  }

  console.log(`Received GitHub webhook: ${event}/${payload.action}`);
  
  switch (event) {
    case "installation":
      await installationWebhook(req, res);
      break;
    case "pull_request":
      await pullRequestWebhook(req, res);
      break;
    default:
      console.log(`Unhandled webhook event: ${event}`);
      res.status(200).json({ success: true, message: `Event ${event} not handled` });
      break;
  }
});
