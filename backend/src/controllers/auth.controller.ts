import { Request, Response } from "express";
import axios from "axios";
import prisma from "../db/prismaClient.js";
import { generateJWTToken } from "../utils/jwtTokenGenerator.js";
export const githubLogin = async (req: Request, res: Response) => {
    try{
        console.log("GitHub Login Initiated" , process.env.GITHUB_REDIRECT_URI);
        const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${process.env.GITHUB_REDIRECT_URI}&scope=user:email%20repo`;
        res.redirect(githubAuthUrl);
    } catch (error) {
        console.error("Error during GitHub login:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const githubCallback = async (req: Request, res: Response) => {
  const { code } = req.query;
  console.log("GitHub Callback Received, code:", code);
  
  if (!code) return res.status(400).send("Missing code parameter");

  try {
    const tokenRes : any = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      },
      { headers: { Accept: "application/json" } }
    );

    if (tokenRes.data.error) {
      return res.status(400).send(tokenRes.data.error);
    }

    const accessToken = tokenRes.data.access_token;

  
    const userInfo : any = await axios.get("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    // const userEmail : any = await axios.get("https://api.github.com/user/emails", {
    //   headers: { Authorization: `Bearer ${accessToken}` },
    // });

    // const primaryEmail = userEmail.data.find((e: any) => e.primary)?.email;


    let user = await prisma.user.findUnique({
      where: { id: userInfo.data.id.toString() }, 
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: userInfo.data.id.toString(),
          email: "",
          name: userInfo.data.login,
        },
      });

      return res.redirect("https://github.com/apps/reviewhog/installations/new");
    }
    const userToken = generateJWTToken(user);
    return res
      .cookie("token", userToken, { httpOnly: true })
      .redirect(`https://review-hog.vercel.app/dashboard?uid=${user.id}`);
  } catch (err) {
    console.error("Callback error:", err);
    return res.status(500).send("Internal Server Error");
  }
};
