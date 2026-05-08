import axios from "axios";
import { generateAppJwt } from "./githubAuth.js";

interface CachedToken {
  token: string;
  expiresAt: number;
}

// In-memory cache for GitHub installation access tokens (valid ~1 hour)
const tokenCache = new Map<string, CachedToken>();
const TOKEN_TTL_MS = 50 * 60 * 1000; // 50 minutes (tokens expire after 60 min)

export const getGithubToken = async (installationId: string): Promise<string> => {
  const cached = tokenCache.get(installationId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.token;
  }

  const jwttoken = generateAppJwt();
  const tokenRes = await axios.post(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {},
    {
      headers: {
        Authorization: `Bearer ${jwttoken}`,
        Accept: "application/vnd.github+json",
      },
    }
  );

  const token = (tokenRes.data as { token: string }).token;

  tokenCache.set(installationId, {
    token,
    expiresAt: Date.now() + TOKEN_TTL_MS,
  });

  return token;
};
