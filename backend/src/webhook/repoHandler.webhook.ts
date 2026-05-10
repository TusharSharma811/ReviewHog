import { Request, Response } from "express";
import prisma from "../db/prismaClient.js";
import { logger } from "../utils/logger.js";
import { z } from "zod";

const repoHandlerPayloadSchema = z.object({
  action: z.string(),
  installation: z.object({
    account: z.object({
      id: z.number(),
      html_url: z.string(),
    }),
  }),
  repositories_added: z.array(z.object({
    id: z.number(),
    name: z.string(),
    full_name: z.string(),
    description: z.string().nullable(),
  })).optional(),
  repositories_removed: z.array(z.object({
    id: z.number(),
    name: z.string(),
  })).optional(),
});

async function getDefaultRepoReviewOn(ownerId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: ownerId },
    select: { defaultRepoReviewOn: true },
  });
  return user?.defaultRepoReviewOn ?? true;
}

export const repoHandlerWebhook = async (
  _req: Request,
  res: Response,
  action: string,
  payload: unknown
) => {
  try {
    const parsed = repoHandlerPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      logger.error("WEBHOOK", "Invalid repo handler webhook payload", { issues: parsed.error.issues });
      return res.status(400).send("Invalid payload");
    }

    const validPayload = parsed.data;

    switch (action) {
      case "added":
        if (validPayload.repositories_added) {
          const defaultRepoReviewOn = await getDefaultRepoReviewOn(
            validPayload.installation.account.id.toString()
          );

          await prisma.repo.createMany({
            data: validPayload.repositories_added.map((repo) => ({
              id: repo.id.toString(),
              name: repo.full_name,
              description: repo.description ?? "",
              url: validPayload.installation.account.html_url + `/${repo.name}`,
              ownerId: validPayload.installation.account.id.toString(),
              isReviewOn: defaultRepoReviewOn,
            })),
            skipDuplicates: true,
          });
        }
        break;

      case "removed":
        if (validPayload.repositories_removed) {
          // With onDelete: Cascade, deleting repos will also delete their reviews
          await prisma.repo.deleteMany({
            where: {
              id: { in: validPayload.repositories_removed.map((r) => r.id.toString()) },
            },
          });
        }
        break;

      default:
        break;
    }

    res.status(200).send("Webhook received");
  } catch (error) {
    logger.error("WEBHOOK", "Error processing repo handler webhook", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).send("Internal Server Error");
  }
};
