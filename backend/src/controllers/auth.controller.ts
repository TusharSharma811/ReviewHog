import { Request, Response } from "express";
import axios from "axios";
import crypto from "crypto";
import prisma from "../db/prismaClient.js";
import { generateJWTToken } from "../utils/jwtTokenGenerator.js";
import { encryptAISecret } from "../utils/aiSettings.js";
import { logger } from "../utils/logger.js";
import { z } from "zod";

const callbackSchema = z.object({
  code: z.string().min(1, "Missing code parameter"),
  state: z.string().min(1, "Missing state parameter"),
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

// Detect deployment: NODE_ENV=production OR FRONTEND_URL is HTTPS (handles
// platforms like Render that don't set NODE_ENV automatically).
const IS_DEPLOYED =
  process.env.NODE_ENV === "production" ||
  (process.env.FRONTEND_URL?.startsWith("https://") ?? false);

// Cookie options for the JWT auth token
const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: IS_DEPLOYED,
  sameSite: (IS_DEPLOYED ? "none" : "lax") as "none" | "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (matches JWT expiry)
  path: "/",
};

// Cookie options for the OAuth state token (short-lived)
const STATE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: IS_DEPLOYED,
  sameSite: (IS_DEPLOYED ? "none" : "lax") as "none" | "lax",
  maxAge: 10 * 60 * 1000, // 10 minutes
  path: "/",
};

// SEC-3: Generate a cryptographically random state token for CSRF protection
function generateOAuthState(): string {
  return crypto.randomBytes(32).toString("hex");
}

export const githubLogin = async (_req: Request, res: Response) => {
  try {
    // SEC-3: Generate and store state in a cookie
    const state = generateOAuthState();
    res.cookie("oauth_state", state, STATE_COOKIE_OPTIONS);

    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${process.env.GITHUB_REDIRECT_URI}&scope=user:email%20repo&state=${state}`;
    res.redirect(githubAuthUrl);
  } catch (error) {
    logger.error("AUTH", "Error during GitHub login", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).send("Internal Server Error");
  }
};

export const githubCallback = async (req: Request, res: Response) => {
  const parsed = callbackSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).send(parsed.error.issues[0].message);
  }

  const { code, state } = parsed.data;

  // SEC-3 + SEC-10: Verify the state parameter matches the cookie
  const storedState = req.cookies?.oauth_state;
  if (!storedState || storedState !== state) {
    logger.warn("AUTH", "OAuth state mismatch — possible CSRF attempt", {
      hasStoredState: Boolean(storedState),
      stateMatch: storedState === state,
    });
    return res.status(403).send("Invalid OAuth state. Please try logging in again.");
  }

  // Clear the state cookie — it's single-use
  res.clearCookie("oauth_state", {
    httpOnly: true,
    secure: IS_DEPLOYED,
    sameSite: (IS_DEPLOYED ? "none" : "lax") as "none" | "lax",
    path: "/",
  });

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

    // SEC-2: Encrypt the GitHub OAuth token before storing
    const encryptedGithubToken = encryptAISecret(accessToken);

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
          githubToken: encryptedGithubToken,
        },
      });
    } else {
      // Update email, avatar, and token on every login
      user = await prisma.user.update({
        where: { id: githubId },
        data: {
          email: email || user.email,
          name: userInfo.data.login,
          avatarUrl: userInfo.data.avatar_url,
          githubToken: encryptedGithubToken,
        },
      });
    }

    const userToken = generateJWTToken({
      id: user.id,
      name: user.name ?? userInfo.data.login,
      email: user.email,
    });

    // SEC-1: Set JWT as HttpOnly cookie instead of URL parameter
    res.cookie("token", userToken, AUTH_COOKIE_OPTIONS);

    const redirectUrl = isNewUser
      ? `${process.env.FRONTEND_URL}/dashboard?new=true`
      : `${process.env.FRONTEND_URL}/dashboard`;

    return res.redirect(redirectUrl);
  } catch (err) {
    logger.error("AUTH", "Callback error", { error: err instanceof Error ? err.message : String(err) });
    return res.status(500).send("Internal Server Error");
  }
};
