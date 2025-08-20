import { Request, Response } from "express";
import { InstallationWebhookPayload } from "../types/github.types.js";
import { GitHubService } from "../services/github.service.js";
import { NotificationService } from "../services/notification.service.js";
import { getGithubToken } from "../utils/getGithubToken.js";
import { AppError } from "../middleware/errorHandler.js";
import prisma from "../db/prismaClient.js";

const githubService = new GitHubService();
const notificationService = new NotificationService();

export const installationWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const payload = req.body as InstallationWebhookPayload;
    const action = payload.action;
    
    switch (action) {
      case 'created':
        await handleInstallationCreated(payload);
        break;
      case 'deleted':
        await handleInstallationDeleted(payload);
        break;
      case 'suspend':
        await handleInstallationSuspended(payload);
        break;
      case 'unsuspend':
        await handleInstallationUnsuspended(payload);
        break;
      default:
        console.log(`Unhandled installation action: ${action}`);
        break;
    }

    res.status(200).json({ success: true, message: 'Installation webhook processed successfully' });
  } catch (error: any) {
    console.error('Error in installation webhook:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

async function handleInstallationCreated(payload: InstallationWebhookPayload): Promise<void> {
  try {
    console.log(`Processing installation created for account: ${payload.installation.account.login}`);

    const token = await getGithubToken(payload.installation.id.toString());
    
    // Store repositories in database
    if (payload.repositories && payload.repositories.length > 0) {
      await prisma.repos.createMany({
        data: payload.repositories.map((repo) => ({
          id: repo.id.toString(),
          name: repo.full_name,
          description: repo.description || "",
          url: repo.html_url,
          ownerId: payload.installation.account.id.toString(),
        })),
        skipDuplicates: true
      });

      console.log(`Stored ${payload.repositories.length} repositories for installation ${payload.installation.id}`);
    }

    // Create welcome notification
    await notificationService.createNotification({
      userId: payload.installation.account.id.toString(),
      type: 'system_update',
      title: 'Welcome to CodeRevU!',
      message: `Your GitHub app installation is complete. AI-powered code reviews are now active for your repositories.`,
      metadata: {
        installationId: payload.installation.id.toString(),
      },
      priority: 'medium',
    });

  } catch (error: any) {
    console.error('Error handling installation created:', error);
    throw new AppError(`Failed to process installation creation: ${error.message}`, 500);
  }
}

async function handleInstallationDeleted(payload: InstallationWebhookPayload): Promise<void> {
  try {
    console.log(`Processing installation deleted for account: ${payload.installation.account.login}`);

    // Clean up user data
    await prisma.user.delete({
      where: {
        id: payload.installation.account.id.toString(),
      },
    }).catch((error: any) => {
      // User might not exist, log but don't throw
      console.log(`User ${payload.installation.account.id} not found in database:`, error.message);
    });

    // Clean up repositories
    await prisma.repos.deleteMany({
      where: {
        ownerId: payload.installation.account.id.toString(),
      },
    });

    console.log(`Cleaned up data for installation ${payload.installation.id}`);

    // TODO: Clean up any background jobs, cached data, etc.
    // TODO: Send farewell notification (if user preferences allow)

  } catch (error: any) {
    console.error('Error handling installation deleted:', error);
    throw new AppError(`Failed to process installation deletion: ${error.message}`, 500);
  }
}

async function handleInstallationSuspended(payload: InstallationWebhookPayload): Promise<void> {
  try {
    console.log(`Installation suspended for account: ${payload.installation.account.login}`);

    // TODO: Implement suspension logic
    // - Mark repositories as suspended
    // - Stop background processing
    // - Send notification to user

    await notificationService.createNotification({
      userId: payload.installation.account.id.toString(),
      type: 'system_update',
      title: 'CodeRevU Installation Suspended',
      message: 'Your CodeRevU installation has been suspended. AI reviews are temporarily disabled.',
      metadata: {
        installationId: payload.installation.id.toString(),
      },
      priority: 'high',
    });

  } catch (error: any) {
    console.error('Error handling installation suspended:', error);
    throw new AppError(`Failed to process installation suspension: ${error.message}`, 500);
  }
}

async function handleInstallationUnsuspended(payload: InstallationWebhookPayload): Promise<void> {
  try {
    console.log(`Installation unsuspended for account: ${payload.installation.account.login}`);

    // TODO: Implement unsuspension logic
    // - Mark repositories as active
    // - Resume background processing
    // - Send notification to user

    await notificationService.createNotification({
      userId: payload.installation.account.id.toString(),
      type: 'system_update',
      title: 'CodeRevU Installation Restored',
      message: 'Your CodeRevU installation has been restored. AI reviews are now active again.',
      metadata: {
        installationId: payload.installation.id.toString(),
      },
      priority: 'medium',
    });

  } catch (error: any) {
    console.error('Error handling installation unsuspended:', error);
    throw new AppError(`Failed to process installation restoration: ${error.message}`, 500);
  }
}