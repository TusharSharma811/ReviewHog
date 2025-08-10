import { Request, Response } from "express";
import axios from "axios";
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
   ).then((response : any) => {
       if (response.data.error) {
           console.log(response.data);
           return res.status(400).send(response.data.error);
       }
       res.redirect("https://github.com/apps/CodeRevu/installations/new");
   }).catch((error) => {
       console.error("Error exchanging code for access token:", error);
       res.status(500).send("Internal Server Error");
   });
};