import { Request , Response } from "express";

import prisma from "../db/prismaClient.js";

export const repoHandlerWebhook = async (req: Request, res: Response , action: string , payload: any) => {
try {
   switch (action) {
    case 'added':

      await prisma.repo.createMany(
        {
          data: payload.repositories_added.map((repo: any) => ({
            id: repo.id.toString(),
            name: repo.full_name,
            description: repo.description ? repo.description : "",
            url: payload.installation.account.html_url + `/${repo.name}`,
            ownerId: payload.installation.account.id.toString(),
            isReviewOn: true
          })),
          skipDuplicates : true
        });
      break;
    case 'removed':
     
      await prisma.repo.deleteMany({
        where: {
          id: payload.installation.repositories_removed.id.toString(),
        },
      });

      break;
    default:
   
      break;
  }

  res.status(200).send('Webhook received');
  
} catch (error) {
  console.error('Error processing repo handler webhook:', error);
  res.status(500).send('Internal Server Error');
}

 
};