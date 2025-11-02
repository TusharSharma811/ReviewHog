import { Request , Response } from "express";
import axios from "axios";

import prisma from "../db/prismaClient.js";

export const installationWebhook = async (req: Request, res: Response , action: string , payload: any) => {

  try {
     switch (action) {
    case 'created':
      await prisma.repo.createMany(
        {
          data: payload.repositories.map((repo: any) => ({
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
    case 'deleted':
     

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

  res.status(200).send('Webhook received');
  } catch (error) {
    console.error('Error processing installation webhook:', error);
    res.status(500).send('Internal Server Error');
  }

 
};