import { Request , Response } from "express";
import axios from "axios";
import { getGithubToken } from "../utils/getGithubToken.ts";
import prisma from "../db/prismaClient.ts";

export const installationWebhook = async (req: Request, res: Response , action: string , payload: any) => {


  switch (action) {
    case 'created':
        const token = await getGithubToken(payload.installation.id);
        const repo_URL = payload.installation.repositories_url;
      // axios.get(repo_URL, {
      //   headers: {
      //     Authorization: `Bearer ${token}`,
      //     Accept: "application/vnd.github+json",
      //   },
      // }).then((response) => {

      //  console.log("Repository details", response.data);
       
      // });

      await prisma.repos.createMany(
        {
          data: payload.repositories.map((repo: any) => ({
            id: repo.id.toString(),
            name: repo.full_name,
            description: repo.description ? repo.description : "",
            url: payload.installation.account.html_url + `/${repo.name}`,
            ownerId: payload.installation.account.id.toString(),
          })),
          skipDuplicates : true
        });
      break;
    case 'deleted':
      console.log("Installation deleted", payload);
      // Handle installation deletion logic here

      await prisma.user.delete({
        where: {
          id: payload.installation.account.id.toString(),
        },
      });

      await prisma.repos.deleteMany({
        where: {
          ownerId: payload.installation.account.id.toString(),
        },
      });

      break;
    default:
      // Handle unknown action
      break;
  }

  res.status(200).send('Webhook received');
};