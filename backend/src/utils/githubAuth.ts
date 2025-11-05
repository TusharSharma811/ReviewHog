import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export function generateAppJwt(): string {
  if (!process.env.GITHUB_APP_PRIVATE_KEY) {
    throw new Error("GITHUB_APP_PRIVATE_KEY is not set");
  }
  
  if (!process.env.GITHUB_APP_ID) {
    throw new Error("GITHUB_APP_ID is not set");
  }

  const now = Math.floor(Date.now() / 1000);
  
  // Clean up the private key string
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY
    .replace(/\\n/g, "\n")
    .replace(/^["']|["']$/g, '');
  
  try {
    return jwt.sign(
      { 
        iat: now - 60, 
        exp: now + 600, 
        iss: parseInt(process.env.GITHUB_APP_ID, 10)
      },
      privateKey, 
      { algorithm: "RS256" }
    );
  } catch (error) {
    console.error("JWT signing failed:", error);
    throw new Error(`Failed to generate JWT: ${(error as Error).message}`);
  }
}