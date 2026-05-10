import { Request, Response } from "express";
import prisma from "../db/prismaClient.js";
import { logger } from "../utils/logger.js";
import { z } from "zod";

const installationPayloadSchema = z.object({
  action: z.string(),
  installation: z.object({
    account: z.object({
      id: z.number(),
      html_url: z.string(),
    }),
  }),
  repositories: z.array(z.object({
    id: z.number(),
    name: z.string(),
    full_name: z.string(),
    description: z.string().nullable(),
  })).optional().default([]),
});

type InstallationPayload = z.infer<typeof installationPayloadSchema>;

export const installationWebhook = async (
  _req: Request,
  res: Response,
  action: string,
  payload: unknown
) => {
  try {
    const parsed = installationPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      logger.error("WEBHOOK", "Invalid installation webhook payload", { issues: parsed.error.issues });
      return res.status(400).send("Invalid payload");
    }

    const validPayload = parsed.data;

    switch (action) {
      case "created":
        await prisma.repo.createMany({
          data: validPayload.repositories.map((repo) => ({
            id: repo.id.toString(),
            name: repo.full_name,
            description: repo.description ?? "",
            url: validPayload.installation.account.html_url + `/${repo.name}`,
            ownerId: validPayload.installation.account.id.toString(),
            isReviewOn: true,
          })),
          skipDuplicates: true,
        });
        break;

      case "deleted":
        // With onDelete: Cascade in schema, deleting the user will
        // automatically cascade-delete their repos, reviews, and insights.
        await prisma.user.delete({
          where: {
            id: validPayload.installation.account.id.toString(),
          },
        }).catch((err: Error) => {
          // User might not exist (e.g., never logged in via OAuth)
          logger.warn("WEBHOOK", "User delete failed (may not exist)", { error: err.message });
        });
        break;

      default:
        break;
    }

    res.status(200).send("Webhook received");
  } catch (error) {
    logger.error("WEBHOOK", "Error processing installation webhook", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).send("Internal Server Error");
  }
};