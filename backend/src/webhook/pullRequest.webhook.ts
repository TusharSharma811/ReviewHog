import { Request, Response } from "express";
import chain from "../utils/aiUtil.js";
import axios, { get } from "axios";
import { getGithubToken } from "../utils/getGithubToken.js";

function extractJsonFromCodeBlock(input: string): any {
  // Remove ```json ... ``` wrappers
  const cleaned = input
    .replace(/^```json\s*/, "") // remove starting ```json
    .replace(/\s*```$/, ""); // remove ending ```

  try {
    console.log(cleaned);

    return JSON.parse(cleaned);
  } catch (err) {
    throw new Error("Invalid JSON inside code block: " + err);
  }
}

export const pullRequestWebhook = async (
  req: Request,
  res: Response,
  action: string,
  payload: any
) => {
  switch (action) {
    case "opened":
      const token = await getGithubToken(payload.installation.id);
      const URL = payload.pull_request.comments_url;
      const diffUrl = payload.pull_request.diff_url;
      const diffRes = await axios.get(diffUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3.diff",
        },
      });
      await axios.post(
        `${URL}`,
        {
          body: `
            > **Note**  
> Coderevu is currently analyzing the latest changes in this PR.  
> This may take a few minutes — sit tight, good things take time!

---

### 📥 Commits  

### 📒 Files selected for review (1)  

---



            `,
          commit_id: payload.pull_request.head.sha,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
          },
        }
      );

      const diffText = diffRes.data;
      const prFilesUrl = `${payload.pull_request.url}/files`;
      const prFilesRes = await axios.get(prFilesUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      });
      const createResp: any = await axios.post(
        `https://api.github.com/repos/${payload.repository.owner.login}/${payload.repository.name}/check-runs`,
        {
          name: "AI Code Review",
          head_sha: payload.pull_request.head.sha,
          status: "in_progress",
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
          },
        }
      );
      const checkRunId = createResp.data.id;
      const file_data: string[] = [];
      for (const file of prFilesRes.data as any[]) {
        if (file.status === "removed") {
          console.log(
            `File ${file.filename} has been removed, skipping review.`
          );
        }
        const contentUrl = file.contents_url;
        const ContentRes: any = await axios.get(contentUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3.raw",
          },
        });
        const full_file = ContentRes.data;
        file_data.push(
          `File Path: ${file.filename}\nContent:\n${full_file}\n\n`
        );
      }
      const response = await chain.invoke({
        diff: diffText,
        full_file: file_data,
      });
      console.log(response);
      const rawContent = response.content;
      const extracted = extractJsonFromCodeBlock(rawContent as string);

      await axios.post(
        `${URL}`,
        {
          body: `${extracted.comment}`,
          commit_id: payload.pull_request.head.sha,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
          },
        }
      );
      await axios.patch(
        `https://api.github.com/repos/${payload.repository.owner.login}/${payload.repository.name}/check-runs/${checkRunId}`,
        {
          name: "AI Code Review",
          head_sha: payload.pull_request.head.sha,
          status: "completed",
          conclusion: extracted.conclusion,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
          },
        }
      );

      break;
    case "deleted":
      // Handle installation deleted
      break;
    default:
      // Handle unknown action
      break;
  }

  res.status(200).send("Webhook received");
};
