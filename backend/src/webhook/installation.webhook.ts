import { Request, Response } from "express";
import prisma from "../db/prismaClient.js";

interface InstallationPayload {
  action: string;
  installation: {
    account: {
      id: number;
      html_url: string;
    };
  };
  repositories: Array<{
    id: number;
    name: string;
    full_name: string;
    description: string | null;
  }>;
}

export const installationWebhook = async (
  _req: Request,
  res: Response,
  action: string,
  payload: InstallationPayload
) => {
  try {
    switch (action) {
      case "created":
        await prisma.repo.createMany({
          data: payload.repositories.map((repo) => ({
            id: repo.id.toString(),
            name: repo.full_name,
            description: repo.description ?? "",
            url: payload.installation.account.html_url + `/${repo.name}`,
            ownerId: payload.installation.account.id.toString(),
            isReviewOn: true,
          })),
          skipDuplicates: true,
        });
        break;

      case "deleted":
        await prisma.repo.deleteMany({
          where: {
            ownerId: payload.installation.account.id.toString(),
          },
        });

        await prisma.user.delete({
          where: {
            id: payload.installation.account.id.toString(),
          },
        });
        break;

      default:
        break;
    }

    res.status(200).send("Webhook received");
  } catch (error) {
    console.error("Error processing installation webhook:", error);
    res.status(500).send("Internal Server Error");
  }
};