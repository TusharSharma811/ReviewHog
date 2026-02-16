import { Request, Response } from "express";
import axios from "axios";
import prisma from "../db/prismaClient.js";
import { generateJWTToken } from "../utils/jwtTokenGenerator.js";
import { z } from "zod";

const callbackSchema = z.object({
  code: z.string().min(1, "Missing code parameter"),
});

interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  error?: string;
  error_description?: string;
}

interface GitHubUser {
  id: number;
  login: string;
  avatar_url: string;
  email: string | null;
}

interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

export const githubLogin = async (_req: Request, res: Response) => {
  try {
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${process.env.GITHUB_REDIRECT_URI}&scope=user:email%20repo`;
    res.redirect(githubAuthUrl);
  } catch (error) {
    console.error("Error during GitHub login:", error);
    res.status(500).send("Internal Server Error");
  }
};

export const githubCallback = async (req: Request, res: Response) => {
  const parsed = callbackSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).send(parsed.error.issues[0].message);
  }

  const { code } = parsed.data;

  try {
    const tokenRes = await axios.post<GitHubTokenResponse>(
      "https://github.com/login/oauth/access_token",
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      },
      { headers: { Accept: "application/json" } }
    );

    if (tokenRes.data.error) {
      return res.status(400).send(tokenRes.data.error_description || tokenRes.data.error);
    }

    const accessToken = tokenRes.data.access_token;
    const headers = { Authorization: `Bearer ${accessToken}` };

    const userInfo = await axios.get<GitHubUser>("https://api.github.com/user", { headers });

    // Fetch primary verified email
    let email = userInfo.data.email || "";
    try {
      const emailsRes = await axios.get<GitHubEmail[]>("https://api.github.com/user/emails", {
        headers,
      });
      const primaryEmail = emailsRes.data.find((e) => e.primary && e.verified);
      if (primaryEmail) {
        email = primaryEmail.email;
      }
    } catch {
      // Email fetch failed — use whatever we have
    }

    const githubId = userInfo.data.id.toString();

    let user = await prisma.user.findUnique({
      where: { id: githubId },
    });

    const isNewUser = !user;

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: githubId,
          email,
          name: userInfo.data.login,
          avatarUrl: userInfo.data.avatar_url,
        },
      });
    } else {
      // Update email and avatar on every login
      await prisma.user.update({
        where: { id: githubId },
        data: {
          email: email || user.email,
          name: userInfo.data.login,
          avatarUrl: userInfo.data.avatar_url,
        },
      });
    }

    const userToken = generateJWTToken({
      id: user.id,
      name: user.name ?? userInfo.data.login,
      email: user.email,
    });

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: (process.env.NODE_ENV === "production" ? "none" : "lax") as "none" | "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };

    const redirectUrl = isNewUser
      ? `${process.env.FRONTEND_URL}/dashboard?new=true`
      : `${process.env.FRONTEND_URL}/dashboard`;

    return res.cookie("token", userToken, cookieOptions).redirect(redirectUrl);
  } catch (err) {
    console.error("Callback error:", err);
    return res.status(500).send("Internal Server Error");
  }
};
