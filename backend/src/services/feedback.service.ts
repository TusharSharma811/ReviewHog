import { AppError } from '../middleware/errorHandler.js';

export interface FeedbackData {
  id?: string;
  pullRequestId: string;
  repository: string;
  userId: string;
  rating: number; // 1-5 stars
  comment?: string;
  helpful: boolean;
  reviewAccuracy?: number; // 1-10 scale
  tags?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface FeedbackStats {
  averageRating: number;
  totalFeedbacks: number;
  helpfulCount: number;
  accuracyScore: number;
  commonTags: Array<{ tag: string; count: number }>;
}

export interface FeedbackQuery {
  repository?: string;
  userId?: string;
  rating?: number;
  helpful?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

export class FeedbackService {
  // TODO: Implement with actual database storage (Prisma)
  private feedbacks: FeedbackData[] = []; // Temporary in-memory storage

  async createFeedback(feedback: Omit<FeedbackData, 'id' | 'createdAt' | 'updatedAt'>): Promise<FeedbackData> {
    try {
      // Validate input
      if (!feedback.pullRequestId || !feedback.repository || !feedback.userId) {
        throw new AppError('Missing required feedback fields', 400);
      }

      if (feedback.rating < 1 || feedback.rating > 5) {
        throw new AppError('Rating must be between 1 and 5', 400);
      }

      if (feedback.reviewAccuracy && (feedback.reviewAccuracy < 1 || feedback.reviewAccuracy > 10)) {
        throw new AppError('Review accuracy must be between 1 and 10', 400);
      }

      const newFeedback: FeedbackData = {
        ...feedback,
        id: this.generateId(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // TODO: Replace with Prisma database insert
      this.feedbacks.push(newFeedback);

      return newFeedback;
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Failed to create feedback: ${error.message}`, 500);
    }
  }

  async getFeedback(id: string): Promise<FeedbackData | null> {
    try {
      // TODO: Replace with Prisma database query
      const feedback = this.feedbacks.find(f => f.id === id);
      return feedback || null;
    } catch (error: any) {
      throw new AppError(`Failed to get feedback: ${error.message}`, 500);
    }
  }

  async updateFeedback(id: string, updates: Partial<FeedbackData>): Promise<FeedbackData | null> {
    try {
      // TODO: Replace with Prisma database update
      const index = this.feedbacks.findIndex(f => f.id === id);
      if (index === -1) {
        return null;
      }

      this.feedbacks[index] = {
        ...this.feedbacks[index],
        ...updates,
        updatedAt: new Date(),
      };

      return this.feedbacks[index];
    } catch (error: any) {
      throw new AppError(`Failed to update feedback: ${error.message}`, 500);
    }
  }

  async deleteFeedback(id: string): Promise<boolean> {
    try {
      // TODO: Replace with Prisma database delete
      const index = this.feedbacks.findIndex(f => f.id === id);
      if (index === -1) {
        return false;
      }

      this.feedbacks.splice(index, 1);
      return true;
    } catch (error: any) {
      throw new AppError(`Failed to delete feedback: ${error.message}`, 500);
    }
  }

  async queryFeedbacks(query: FeedbackQuery): Promise<FeedbackData[]> {
    try {
      // TODO: Replace with Prisma database query with proper filtering and pagination
      let filteredFeedbacks = [...this.feedbacks];

      if (query.repository) {
        filteredFeedbacks = filteredFeedbacks.filter(f => f.repository === query.repository);
      }

      if (query.userId) {
        filteredFeedbacks = filteredFeedbacks.filter(f => f.userId === query.userId);
      }

      if (query.rating) {
        filteredFeedbacks = filteredFeedbacks.filter(f => f.rating === query.rating);
      }

      if (query.helpful !== undefined) {
        filteredFeedbacks = filteredFeedbacks.filter(f => f.helpful === query.helpful);
      }

      if (query.dateFrom) {
        filteredFeedbacks = filteredFeedbacks.filter(f => 
          f.createdAt && f.createdAt >= query.dateFrom!
        );
      }

      if (query.dateTo) {
        filteredFeedbacks = filteredFeedbacks.filter(f => 
          f.createdAt && f.createdAt <= query.dateTo!
        );
      }

      // Apply pagination
      const offset = query.offset || 0;
      const limit = query.limit || 50;
      
      return filteredFeedbacks.slice(offset, offset + limit);
    } catch (error: any) {
      throw new AppError(`Failed to query feedbacks: ${error.message}`, 500);
    }
  }

  async getFeedbackStats(repository?: string): Promise<FeedbackStats> {
    try {
      // TODO: Replace with optimized Prisma database aggregation queries
      let relevantFeedbacks = this.feedbacks;
      
      if (repository) {
        relevantFeedbacks = this.feedbacks.filter(f => f.repository === repository);
      }

      if (relevantFeedbacks.length === 0) {
        return {
          averageRating: 0,
          totalFeedbacks: 0,
          helpfulCount: 0,
          accuracyScore: 0,
          commonTags: [],
        };
      }

      const averageRating = relevantFeedbacks.reduce((sum, f) => sum + f.rating, 0) / relevantFeedbacks.length;
      const helpfulCount = relevantFeedbacks.filter(f => f.helpful).length;
      const accuracyScore = relevantFeedbacks
        .filter(f => f.reviewAccuracy)
        .reduce((sum, f) => sum + (f.reviewAccuracy || 0), 0) / 
        relevantFeedbacks.filter(f => f.reviewAccuracy).length || 0;

      // Calculate common tags
      const tagCounts: Record<string, number> = {};
      relevantFeedbacks.forEach(f => {
        f.tags?.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      });

      const commonTags = Object.entries(tagCounts)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        averageRating: Math.round(averageRating * 100) / 100,
        totalFeedbacks: relevantFeedbacks.length,
        helpfulCount,
        accuracyScore: Math.round(accuracyScore * 100) / 100,
        commonTags,
      };
    } catch (error: any) {
      throw new AppError(`Failed to get feedback stats: ${error.message}`, 500);
    }
  }

  private generateId(): string {
    return `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}