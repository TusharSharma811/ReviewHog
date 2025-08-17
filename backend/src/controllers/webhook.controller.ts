import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import axios from "axios";
import chain from "../utils/aiUtil.ts";
import dotenv from "dotenv";
import prisma from "../db/prismaClient.ts";
import { generateAppJwt } from "../utils/githubAuth.ts";
dotenv.config();

export const githubWebhook = async (req: Request, res: Response) => {
  try {
    const event = req.headers["x-github-event"];
    const payload = req.body;
    const jwttoken = generateAppJwt();
    const installationId = payload.installation.id;
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
    if (event === "installation" && payload.action === "created") {

      const repo_URL = payload.installation.repositories_url;
      
      axios.get(repo_URL, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
        },
      }).then((response) => {
        console.log("Repository details", response.data);

      });
      
    } else if (event === "pull_request" && payload.action === "opened") {
      const URL = payload.pull_request.comments_url;
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
