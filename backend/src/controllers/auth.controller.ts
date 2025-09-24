import { Request, Response } from "express";
import axios from "axios";
import prisma from "../db/prismaClient.js";
import { generateJWTToken } from "../utils/jwtTokenGenerator.js";
export const githubLogin = async (req: Request, res: Response) => {
    try{
        const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_url=${process.env.GITHUB_REDIRECT_URI}&scope=user:email%20repo`;
        res.redirect(githubAuthUrl);
    } catch (error) {
        console.error("Error during GitHub login:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const githubCallback = async (req: Request, res: Response) => {
    const { code } = req.query;
    if (!code) {
        return res.status(400).send("Missing code parameter");
    }

   axios(
       {
           method: "POST",
           url: `https://github.com/login/oauth/access_token`,
           params : {
               client_id: process.env.GITHUB_CLIENT_ID,
               client_secret: process.env.GITHUB_CLIENT_SECRET,
               code,
           },
           headers: {
               Accept: "application/json",
           }
       }
   ).then(async (response : any) => {
       if (response.data.error) {
           return res.status(400).send(response.data.error);
       }

         const accessToken = response.data.access_token;

         const userInfo : any = await axios.get("https://api.github.com/user", {
             headers: {
                 Authorization: `Bearer ${accessToken}`,
                 Accept: "application/json",
             },
         });
         console.log("User Info:", userInfo);
         const userEmail :any = await axios.get("https://api.github.com/user/emails", {
             headers: {
                 Authorization: `Bearer ${accessToken}`,
                 Accept: "application/json",
             },
         });

         const primaryEmail = userEmail.data.find((email: any) => email.primary)?.email;

         const doesUserExist = await prisma.user.findUnique({
             where: {
                 id: userInfo.data.id.toString(),
             },
         });
       

         if (!doesUserExist) {
             await prisma.user.create(
                 {
                     data: {
                         id: `${userInfo.data.id}`,
                         email: primaryEmail,
                         name: userInfo.data.login,
                      
                     },
                 }
             );
              return res.redirect("https://github.com/apps/CodeRevu/installations/new");

         }
         const userToken = generateJWTToken(doesUserExist);
         return res.cookie("token", userToken, { httpOnly: true }).redirect(`http://review-hog.vercel.app/dashboard?uid=${doesUserExist?.id}`);

   }).catch((error) => {
       console.error("Error exchanging code for access token:", error);
       res.status(500).send("Internal Server Error");
   });
};