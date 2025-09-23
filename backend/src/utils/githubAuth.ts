import jwt from "jsonwebtoken";
export function generateAppJwt(): string {
  const now = Math.floor(Date.now() / 1000);

  return jwt.sign(
    { iat: now - 60, exp: now + 600, iss: process.env.GITHUB_APP_ID },
    process.env.GITHUB_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    { algorithm: "RS256" }
  );
}