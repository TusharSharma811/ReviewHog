import { Request, Response } from 'express';
import { FeedbackService } from '../services/feedback.service.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const feedbackService = new FeedbackService();

export const createFeedback = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const feedbackData = req.body;
  const feedback = await feedbackService.createFeedback(feedbackData);
  
  res.status(201).json({
    success: true,
    data: feedback,
    message: 'Feedback created successfully'
  });
});

export const getFeedback = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const feedback = await feedbackService.getFeedback(id);
  
  if (!feedback) {
    res.status(404).json({
      success: false,
      message: 'Feedback not found'
    });
    return;
  }
  
  res.json({
    success: true,
    data: feedback
  });
});

export const updateFeedback = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const updates = req.body;
  const feedback = await feedbackService.updateFeedback(id, updates);
  
  if (!feedback) {
    res.status(404).json({
      success: false,
      message: 'Feedback not found'
    });
    return;
  }
  
  res.json({
    success: true,
    data: feedback,
    message: 'Feedback updated successfully'
  });
});

export const queryFeedbacks = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const query = req.query;
  const feedbacks = await feedbackService.queryFeedbacks(query as any);
  
  res.json({
    success: true,
    data: feedbacks,
    count: feedbacks.length
  });
});

export const getFeedbackStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { repository } = req.query;
  const stats = await feedbackService.getFeedbackStats(repository as string);
  
  res.json({
    success: true,
    data: stats
  });
});