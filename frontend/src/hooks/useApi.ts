import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../utils/api';
import type { Repository, PullRequest, DashboardData, LoadingState } from '../types';

export const useRepositories = (userId?: string) => {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState<LoadingState>({ isLoading: true });

  const fetchRepositories = useCallback(async () => {
    if (!userId) return;
    
    try {
      setLoading({ isLoading: true });
      const response = await apiClient.get<{ repos: Repository[] }>(
        '/users/data/repositories',
        { id: userId }
      );
      
      if (response.success && response.data) {
        setRepositories(response.data.repos || []);
      }
      
      setLoading({ isLoading: false });
    } catch (error) {
      setLoading({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch repositories' 
      });
    }
  }, [userId]);

  useEffect(() => {
    fetchRepositories();
  }, [fetchRepositories]);

  return { repositories, loading, refetch: fetchRepositories };
};

export const usePullRequests = (repository?: string) => {
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [loading, setLoading] = useState<LoadingState>({ isLoading: true });

  const fetchPullRequests = useCallback(async () => {
    try {
      setLoading({ isLoading: true });
      const params = repository ? { repository } : undefined;
      const response = await apiClient.get<PullRequest[]>('/pull-requests', params);
      
      if (response.success && response.data) {
        setPullRequests(response.data);
      }
      
      setLoading({ isLoading: false });
    } catch (error) {
      setLoading({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch pull requests' 
      });
    }
  }, [repository]);

  useEffect(() => {
    fetchPullRequests();
  }, [fetchPullRequests]);

  return { pullRequests, loading, refetch: fetchPullRequests };
};

export const useDashboardData = (userId?: string) => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<LoadingState>({ isLoading: true });

  const fetchDashboardData = useCallback(async () => {
    if (!userId) return;
    
    try {
      setLoading({ isLoading: true });
      
      // Fetch repositories
      const reposResponse = await apiClient.get<{ repos: Repository[] }>(
        '/users/data/repositories',
        { id: userId }
      );
      
      const repositories = reposResponse.success ? reposResponse.data?.repos || [] : [];
      
      // For now, use mock data for pull requests since the endpoint might not exist yet
      const mockPullRequests: PullRequest[] = [
        {
          id: 1,
          title: "Add user authentication system",
          repository: "acme-corp/web-app",
          number: 123,
          author: "john-doe",
          status: "reviewed",
          severity: "medium",
          createdAt: "2024-01-15T10:30:00Z",
          aiScore: 85,
          issuesFound: 3,
          suggestionsCount: 5
        },
        {
          id: 2,
          title: "Fix memory leak in data processing",
          repository: "acme-corp/api-server",
          number: 456,
          author: "jane-smith",
          status: "pending",
          severity: "high",
          createdAt: "2024-01-14T15:45:00Z",
          aiScore: 92,
          issuesFound: 7,
          suggestionsCount: 12
        },
        {
          id: 3,
          title: "Update documentation for v2 API",
          repository: "acme-corp/docs",
          number: 789,
          author: "dev-team",
          status: "approved",
          severity: "low",
          createdAt: "2024-01-13T09:15:00Z",
          aiScore: 95,
          issuesFound: 1,
          suggestionsCount: 2
        }
      ];

      const stats = {
        totalPRs: mockPullRequests.length,
        averageScore: Math.round(mockPullRequests.reduce((sum, pr) => sum + pr.aiScore, 0) / mockPullRequests.length),
        totalIssues: mockPullRequests.reduce((sum, pr) => sum + pr.issuesFound, 0),
        totalSuggestions: mockPullRequests.reduce((sum, pr) => sum + pr.suggestionsCount, 0),
      };

      setDashboardData({
        pullRequests: mockPullRequests,
        repositories,
        stats,
      });
      
      setLoading({ isLoading: false });
    } catch (error) {
      setLoading({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch dashboard data' 
      });
    }
  }, [userId]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const refetch = useCallback(async () => {
    if (userId) {
      await fetchDashboardData();
    }
  }, [userId, fetchDashboardData]);

  return { dashboardData, loading, refetch };
};