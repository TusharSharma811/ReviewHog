import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();
export function generateAppJwt(): string {
  const now = Math.floor(Date.now() / 1000);
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY?.replace(/\\n/g, "\n");
  console.log("Private Key:", privateKey); // Debugging line
  
  if (!privateKey) {
    throw new Error("GITHUB_APP_PRIVATE_KEY is not defined");
  }
  return jwt.sign(
    { iat: now - 60, exp: now + 600, iss: process.env.GITHUB_APP_ID },
    privateKey,
    { algorithm: "RS256" }
  );
}