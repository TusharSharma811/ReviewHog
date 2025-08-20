import { Request, Response } from "express";
import { PullRequestWebhookPayload } from "../types/github.types.js";
import { GitHubService } from "../services/github.service.js";
import { AIReviewService } from "../services/aiReview.service.js";
import { NotificationService } from "../services/notification.service.js";
import { getGithubToken } from "../utils/getGithubToken.js";
import { AppError } from "../middleware/errorHandler.js";

const githubService = new GitHubService();
const aiReviewService = new AIReviewService();
const notificationService = new NotificationService();

export const pullRequestWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const payload = req.body as PullRequestWebhookPayload;
    const action = payload.action;
    
    switch (action) {
      case 'opened':
        await handlePullRequestOpened(payload);
        break;
      case 'synchronize':
        await handlePullRequestSynchronized(payload);
        break;
      case 'closed':
        await handlePullRequestClosed(payload);
        break;
      default:
        console.log(`Unhandled pull request action: ${action}`);
        break;
    }

    res.status(200).json({ success: true, message: 'Webhook processed successfully' });
  } catch (error: any) {
    console.error('Error in pull request webhook:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

async function handlePullRequestOpened(payload: PullRequestWebhookPayload): Promise<void> {
  if (!payload.installation?.id) {
    throw new AppError('Installation ID not found in payload', 400);
  }

  const token = await getGithubToken(payload.installation.id.toString());
  const pullRequest = payload.pull_request;
  
  console.log(`Processing opened PR #${pullRequest.number} in ${payload.repository.full_name}`);

  try {
    // Get PR diff
    const diffText = await githubService.getPullRequestDiff(pullRequest.diff_url, token);
    
    // Get PR files
    const filesUrl = `${pullRequest.url}/files`;
    const prFiles = await githubService.getPullRequestFiles(filesUrl, token);

    const reviewPromises = [];

    for (const file of prFiles) {
      if (file.status === "removed") {
        console.log(`File ${file.filename} has been removed, skipping review.`);
        continue;
      }

      // Skip binary files and large files
      if (file.additions + file.deletions > 1000) {
        console.log(`File ${file.filename} is too large, skipping review.`);
        continue;
      }

      reviewPromises.push(processFileReview(file, diffText, pullRequest, token));
    }

    await Promise.all(reviewPromises);

    // Create notification for PR author (if different from sender)
    if (pullRequest.user.id !== payload.sender?.id) {
      await notificationService.createNotification({
        userId: pullRequest.user.id.toString(),
        type: 'review_completed',
        title: 'AI Review Completed',
        message: `Your pull request #${pullRequest.number} in ${payload.repository.full_name} has been reviewed by AI`,
        metadata: {
          pullRequestId: pullRequest.id.toString(),
          repository: payload.repository.full_name,
        },
        priority: 'medium',
      });
    }

  } catch (error: any) {
    console.error(`Error processing PR #${pullRequest.number}:`, error);
    throw new AppError(`Failed to process pull request: ${error.message}`, 500);
  }
}

async function handlePullRequestSynchronized(payload: PullRequestWebhookPayload): Promise<void> {
  // Handle when new commits are pushed to the PR
  console.log(`PR #${payload.pull_request.number} synchronized, triggering new review`);
  await handlePullRequestOpened(payload); // Reuse the same logic
}

async function handlePullRequestClosed(payload: PullRequestWebhookPayload): Promise<void> {
  // Handle cleanup when PR is closed
  console.log(`PR #${payload.pull_request.number} closed`);
  
  // TODO: Clean up any temporary data, stop background jobs, etc.
  // This is where we could implement cleanup logic for closed PRs
}

async function processFileReview(
  file: any,
  diffText: string,
  pullRequest: any,
  token: string
): Promise<void> {
  try {
    // Get file content
    const fullFile = await githubService.getFileContent(file.contents_url, token);

    // Generate AI review
    const review = await aiReviewService.generateReview({
      diff: diffText,
      fullFile,
      fileName: file.filename,
      pullRequestNumber: pullRequest.number,
      repository: pullRequest.head.repo.full_name,
    });

    // Format and post comment
    const formattedComment = aiReviewService.formatReviewComment(review);
    const commentBody = `## AI Review for \`${file.filename}\`\n\n${formattedComment}`;

    await githubService.createPullRequestComment(
      pullRequest.comments_url,
      commentBody,
      pullRequest.head.sha,
      token
    );

    console.log(`Review posted for file: ${file.filename}`);
  } catch (error: any) {
    console.error(`Error reviewing file ${file.filename}:`, error);
    // Don't throw here - we want to continue processing other files
  }
}