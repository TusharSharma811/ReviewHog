import { Request , Response } from "express";

import prisma from "../db/prismaClient.ts";

export const repoHandlerWebhook = async (req: Request, res: Response , action: string , payload: any) => {


  switch (action) {
    case 'added':

      await prisma.repos.createMany(
        {
          data: payload.repositories_added.map((repo: any) => ({
            id: repo.id.toString(),
            name: repo.full_name,
            description: repo.description ? repo.description : "",
            url: payload.installation.account.html_url + `/${repo.name}`,
            ownerId: payload.installation.account.id.toString(),
          })),
          skipDuplicates : true
        });
      break;
    case 'removed':
     
      await prisma.repos.deleteMany({
        where: {
          id: payload.installation.repositories_removed.id.toString(),
        },
      });

      break;
    default:
      // Handle unknown action
      break;
  }

  res.status(200).send('Webhook received');
};