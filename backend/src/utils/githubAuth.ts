import jwt from "jsonwebtoken";
import fs from "fs";
import { logger } from "./logger.js";

const SECRET_KEY_PATH = "/etc/secrets/github-private-key.pem";

function getPrivateKey(): string {
  // Priority 1: Render Secret File (cleanest for PEM keys)
  try {
    if (fs.existsSync(SECRET_KEY_PATH)) {
      const key = fs.readFileSync(SECRET_KEY_PATH, "utf-8").trim();
      if (key.includes("BEGIN")) {
        logger.debug("AUTH", "Using private key from secret file");
        return key;
      }
    }
  } catch {
    // Fall through to env var
  }

  // Priority 2: Environment variable
  if (!process.env.GITHUB_APP_PRIVATE_KEY) {
    throw new Error("GITHUB_APP_PRIVATE_KEY is not set and no secret file found");
  }

  return process.env.GITHUB_APP_PRIVATE_KEY
    .replace(/\\n/g, "\n")
    .replace(/^["']|["']$/g, "");
}

export function generateAppJwt(): string {
  if (!process.env.GITHUB_APP_ID) {
    throw new Error("GITHUB_APP_ID is not set");
  }

  const now = Math.floor(Date.now() / 1000);
  const privateKey = getPrivateKey();

  try {
    return jwt.sign(
      {
        iat: now - 60,
        exp: now + 600,
        iss: parseInt(process.env.GITHUB_APP_ID, 10),
      },
      privateKey,
      { algorithm: "RS256" }
    );
  } catch (error) {
    logger.error("AUTH", "JWT signing failed", { error: (error as Error).message });
    throw new Error(`Failed to generate JWT: ${(error as Error).message}`);
  }
}