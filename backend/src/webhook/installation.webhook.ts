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

async function getDefaultRepoReviewOn(ownerId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: ownerId },
    select: { defaultRepoReviewOn: true },
  });
  return user?.defaultRepoReviewOn ?? true;
}

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
      case "created": {
        const ownerId = validPayload.installation.account.id.toString();

        // Ensure user exists — the webhook can fire before the user has
        // completed OAuth login, so the User record may not exist yet.
        // Create a stub user that will be updated with full details on login.
        await prisma.user.upsert({
          where: { id: ownerId },
          update: {},  // Don't overwrite existing user data
          create: {
            id: ownerId,
            email: "",
            name: validPayload.installation.account.html_url.split("/").pop() || "github-user",
          },
        });

        const defaultRepoReviewOn = await getDefaultRepoReviewOn(ownerId);

        if (validPayload.repositories.length > 0) {
          await prisma.repo.createMany({
            data: validPayload.repositories.map((repo) => ({
              id: repo.id.toString(),
              name: repo.full_name,
              description: repo.description ?? "",
              url: validPayload.installation.account.html_url + `/${repo.name}`,
              ownerId,
              isReviewOn: defaultRepoReviewOn,
            })),
            skipDuplicates: true,
          });

          logger.info("WEBHOOK", "Installation repos created", {
            ownerId,
            repoCount: validPayload.repositories.length,
            repos: validPayload.repositories.map(r => r.full_name),
          });
        }
        break;
      }

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
