import { Request, Response } from "express";
import prisma from "../db/prismaClient.js";

interface RepoHandlerPayload {
  action: string;
  installation: {
    account: {
      id: number;
      html_url: string;
    };
  };
  repositories_added?: Array<{
    id: number;
    name: string;
    full_name: string;
    description: string | null;
  }>;
  repositories_removed?: Array<{
    id: number;
    name: string;
  }>;
}

export const repoHandlerWebhook = async (
  _req: Request,
  res: Response,
  action: string,
  payload: RepoHandlerPayload
) => {
  try {
    switch (action) {
      case "added":
        if (payload.repositories_added) {
          await prisma.repo.createMany({
            data: payload.repositories_added.map((repo) => ({
              id: repo.id.toString(),
              name: repo.full_name,
              description: repo.description ?? "",
              url: payload.installation.account.html_url + `/${repo.name}`,
              ownerId: payload.installation.account.id.toString(),
              isReviewOn: true,
            })),
            skipDuplicates: true,
          });
        }
        break;

      case "removed":
        if (payload.repositories_removed) {
          await prisma.repo.deleteMany({
            where: {
              id: { in: payload.repositories_removed.map((r) => r.id.toString()) },
            },
          });
        }
        break;

      default:
        break;
    }

    res.status(200).send("Webhook received");
  } catch (error) {
    console.error("Error processing repo handler webhook:", error);
    res.status(500).send("Internal Server Error");
  }
};