import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import axios from "axios";
import chain from "../utils/aiUtil.ts";
import dotenv from "dotenv";

dotenv.config();

export const githubWebhook = async (req: Request, res: Response) => {
  try {
    const event = req.headers["x-github-event"];
    const payload = req.body;

    const GITHUB_APP_ID = process.env.GITHUB_APP_ID;
    const GITHUB_PRIVATE_KEY = process.env.GITHUB_PRIVATE_KEY?.replace(
      /\\n/g,
      "\n"
    );
    const installationId = payload.installation.id;
    if (event === "installation" && payload.action === "created") {
      console.log("Webhook received", payload);
      return res.sendStatus(200);
    } else if (event === "pull_request" && payload.action === "opened") {
      console.log("Pull request opened", payload);
      const URL = payload.pull_request.comments_url;
      const now = Math.floor(Date.now() / 1000);
      const JWTpayload = {
        iat: now - 60,
        exp: now + 600,
        iss: GITHUB_APP_ID,
      };
      const jwttoken = jwt.sign(JWTpayload, GITHUB_PRIVATE_KEY!, {
        algorithm: "RS256",
      });
      const tokenRes = await axios.post(
        `https://api.github.com/app/installations/${installationId}/access_tokens`,
        {},
        {
          headers: {
            Authorization: `Bearer ${jwttoken}`,
            Accept: "application/vnd.github+json",
          },
        }
      );
      const token = (tokenRes.data as { token: string }).token;
      const diffUrl = payload.pull_request.diff_url;

      const diffRes = await axios.get(diffUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3.diff",
        },
      });

      const diffText = diffRes.data;
      const prFilesUrl = `${payload.pull_request.url}/files`;

      const prFilesRes = await axios.get(prFilesUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      });
      console.log("Response from file", prFilesRes);

      for (const file of prFilesRes.data as any[]) {
        if (file.status === "removed") {
          console.log(
            `File ${file.filename} has been removed, skipping review.`
          );
        }
        const contentUrl = file.contents_url;
        const ContentRes : any = await axios.get(contentUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3.raw",
          },
        });
        console.log("Content Response", ContentRes.data);
        // If the content is base64-encoded:
        const full_file = ContentRes.data;

        const response = await chain.invoke({ diff: diffText , full_file });
        console.log(response);
        await axios.post(
          `${URL}`,
          {
            body: `AI Review: ${response.content}`,
            commit_id: payload.pull_request.head.sha,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/vnd.github+json",
            },
          }
        );
      }
    }
  } catch (error) {
    console.log("Error in githubWebhook", error);
    res.sendStatus(500);
  }
};
