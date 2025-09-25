import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import crypto from "crypto";
dotenv.config();

export function generateAppJwt(): string {
  if (!process.env.GITHUB_APP_PRIVATE_KEY) {
    throw new Error("GITHUB_APP_PRIVATE_KEY is not set");
  }

  const now = Math.floor(Date.now() / 1000);
  const keyString = process.env.GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, "\n");

  const privateKey = crypto.createPrivateKey({ key: keyString, format: "pem" });

  return jwt.sign(
    { iat: now - 60, exp: now + 600, iss: process.env.GITHUB_APP_ID },
    privateKey,
    { algorithm: "RS256" }
  );
}
