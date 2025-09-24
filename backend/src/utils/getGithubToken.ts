import axios from "axios";
import { generateAppJwt } from "./githubAuth.js";

export const getGithubToken = async (installationId: string) => {
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
  return (tokenRes.data as { token: string }).token;
};
