import axios from 'axios';
import { 
  GitHubApiResponse, 
  GitHubPullRequestFile, 
  GitHubAccessTokenResponse,
  GitHubUser,
  GitHubUserEmail
} from '../types/github.types.js';
import { AppError } from '../middleware/errorHandler.js';

export class GitHubService {
  private baseURL = 'https://api.github.com';

  async getInstallationAccessToken(installationId: number, appJWT: string): Promise<string> {
    try {
      const response = await axios.post(
        `${this.baseURL}/app/installations/${installationId}/access_tokens`,
        {},
        {
          headers: {
            Authorization: `Bearer ${appJWT}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );
      return (response.data as { token: string }).token;
    } catch (error: any) {
      throw new AppError(`Failed to get installation access token: ${error.message}`, 500);
    }
  }

  async exchangeCodeForAccessToken(code: string): Promise<GitHubAccessTokenResponse> {
    try {
      const response = await axios.post(
        'https://github.com/login/oauth/access_token',
        {
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
        },
        {
          headers: {
            Accept: 'application/json',
          },
        }
      );

      const responseData = response.data as GitHubAccessTokenResponse;
      if (!responseData.access_token) {
        throw new AppError('Failed to exchange code for access token', 400);
      }

      return responseData;
    } catch (error: any) {
      throw new AppError(`OAuth token exchange failed: ${error.message}`, 400);
    }
  }

  async getUserInfo(accessToken: string): Promise<GitHubUser> {
    try {
      const response = await axios.get(
        `${this.baseURL}/user`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          },
        }
      );
      return response.data as GitHubUser;
    } catch (error: any) {
      throw new AppError(`Failed to get user info: ${error.message}`, 500);
    }
  }

  async getUserEmails(accessToken: string): Promise<GitHubUserEmail[]> {
    try {
      const response = await axios.get(
        `${this.baseURL}/user/emails`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          },
        }
      );
      return response.data as GitHubUserEmail[];
    } catch (error: any) {
      throw new AppError(`Failed to get user emails: ${error.message}`, 500);
    }
  }

  async getPullRequestDiff(diffUrl: string, token: string): Promise<string> {
    try {
      const response = await axios.get(diffUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3.diff',
        },
      });
      return response.data as string;
    } catch (error: any) {
      throw new AppError(`Failed to get PR diff: ${error.message}`, 500);
    }
  }

  async getPullRequestFiles(filesUrl: string, token: string): Promise<GitHubPullRequestFile[]> {
    try {
      const response = await axios.get(filesUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });
      return response.data as GitHubPullRequestFile[];
    } catch (error: any) {
      throw new AppError(`Failed to get PR files: ${error.message}`, 500);
    }
  }

  async getFileContent(contentUrl: string, token: string): Promise<string> {
    try {
      const response = await axios.get(contentUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3.raw',
        },
      });
      return response.data as string;
    } catch (error: any) {
      throw new AppError(`Failed to get file content: ${error.message}`, 500);
    }
  }

  async createPullRequestComment(
    commentsUrl: string,
    comment: string,
    commitId: string,
    token: string
  ): Promise<void> {
    try {
      await axios.post(
        commentsUrl,
        {
          body: comment,
          commit_id: commitId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
          },
        }
      );
    } catch (error: any) {
      throw new AppError(`Failed to create PR comment: ${error.message}`, 500);
    }
  }
}