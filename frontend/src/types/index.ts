export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

export interface Repository {
  id: string;
  name: string;
  description?: string;
  url: string;
  ownerId: string;
  prs?: number;
  lastActivity?: string;
}

export interface PullRequest {
  id: number;
  title: string;
  repository: string;
  number: number;
  author: string;
  status: 'pending' | 'reviewed' | 'approved' | 'rejected';
  severity: 'low' | 'medium' | 'high';
  createdAt: string;
  aiScore: number;
  issuesFound: number;
  suggestionsCount: number;
  url?: string;
}

export interface AIReview {
  id: string;
  pullRequestId: string;
  content: string;
  score?: number;
  issues?: Array<{
    line?: number;
    severity: 'low' | 'medium' | 'high';
    type: string;
    message: string;
  }>;
  suggestions?: Array<{
    line?: number;
    type: string;
    message: string;
    code?: string;
  }>;
  confidence?: number;
  createdAt: string;
}

export interface Feedback {
  id?: string;
  pullRequestId: string;
  repository: string;
  userId: string;
  rating: number; // 1-5 stars
  comment?: string;
  helpful: boolean;
  reviewAccuracy?: number; // 1-10 scale
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface FeedbackStats {
  averageRating: number;
  totalFeedbacks: number;
  helpfulCount: number;
  accuracyScore: number;
  commonTags: Array<{ tag: string; count: number }>;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
  message?: string;
}

export interface LoadingState {
  isLoading: boolean;
  error?: string;
}

export interface DashboardData {
  pullRequests: PullRequest[];
  repositories: Repository[];
  stats: {
    totalPRs: number;
    averageScore: number;
    totalIssues: number;
    totalSuggestions: number;
  };
}