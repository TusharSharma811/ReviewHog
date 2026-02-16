import { Request, Response } from "express";
import { installationWebhook } from "../webhook/installation.webhook.js";
import { pullRequestWebhook } from "../webhook/pullRequest.webhook.js";
import { repoHandlerWebhook } from "../webhook/repoHandler.webhook.js";

export const githubWebhook = async (req: Request, res: Response) => {
  try {
    const event = req.headers["x-github-event"] as string | undefined;
    const payload = req.body;

    if (event === "installation") {
      await installationWebhook(req, res, payload.action, payload);
    } else if (event === "installation_repositories") {
      await repoHandlerWebhook(req, res, payload.action, payload);
    } else if (event === "pull_request") {
      await pullRequestWebhook(req, res, payload.action, payload);
    } else {
      res.status(200).send("Event not handled");
    }
  } catch (error) {
    console.error("Error in githubWebhook:", error);
    res.sendStatus(500);
  }
};
