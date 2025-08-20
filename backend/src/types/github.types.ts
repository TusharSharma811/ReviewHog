// GitHub webhook payload interfaces
export interface GitHubUser {
  id: number;
  login: string;
  avatar_url: string;
  html_url: string;
  name?: string;
  email?: string;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  owner: GitHubUser;
  private: boolean;
  html_url: string;
  description?: string;
  fork: boolean;
  url: string;
  clone_url: string;
  default_branch: string;
}

export interface GitHubInstallation {
  id: number;
  account: GitHubUser;
  repository_selection: 'all' | 'selected';
  access_tokens_url: string;
  repositories_url: string;
  html_url: string;
  app_id: number;
  target_id: number;
  target_type: string;
  permissions: Record<string, string>;
  events: string[];
  created_at: string;
  updated_at: string;
  single_file_name?: string;
}

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  body?: string;
  state: 'open' | 'closed' | 'draft';
  user: GitHubUser;
  assignee?: GitHubUser;
  assignees: GitHubUser[];
  requested_reviewers: GitHubUser[];
  head: {
    ref: string;
    sha: string;
    repo: GitHubRepository;
    user: GitHubUser;
  };
  base: {
    ref: string;
    sha: string;
    repo: GitHubRepository;
    user: GitHubUser;
  };
  html_url: string;
  diff_url: string;
  patch_url: string;
  comments_url: string;
  commits_url: string;
  statuses_url: string;
  url: string;
  created_at: string;
  updated_at: string;
  closed_at?: string;
  merged_at?: string;
  merge_commit_sha?: string;
  draft: boolean;
  merged: boolean;
  mergeable?: boolean;
  mergeable_state: string;
  additions: number;
  deletions: number;
  changed_files: number;
}

export interface GitHubPullRequestFile {
  sha: string;
  filename: string;
  status: 'added' | 'removed' | 'modified' | 'renamed' | 'copied' | 'changed' | 'unchanged';
  additions: number;
  deletions: number;
  changes: number;
  blob_url: string;
  raw_url: string;
  contents_url: string;
  patch?: string;
  previous_filename?: string;
}

// Webhook payload interfaces
export interface InstallationWebhookPayload {
  action: 'created' | 'deleted' | 'suspend' | 'unsuspend' | 'new_permissions_accepted';
  installation: GitHubInstallation;
  repositories?: GitHubRepository[];
  sender: GitHubUser;
}

export interface PullRequestWebhookPayload {
  action: 'opened' | 'closed' | 'edited' | 'reopened' | 'synchronize' | 'assigned' | 'unassigned' | 'review_requested' | 'review_request_removed' | 'labeled' | 'unlabeled' | 'ready_for_review' | 'converted_to_draft';
  number: number;
  pull_request: GitHubPullRequest;
  repository: GitHubRepository;
  installation?: GitHubInstallation;
  sender: GitHubUser;
  changes?: Record<string, any>;
  requested_reviewer?: GitHubUser;
  requested_team?: any;
  label?: any;
}

// Generic webhook payload
export interface GitHubWebhookPayload {
  action?: string;
  installation?: GitHubInstallation;
  pull_request?: GitHubPullRequest;
  repository?: GitHubRepository;
  sender?: GitHubUser;
  [key: string]: any;
}

// Response types
export interface GitHubApiResponse<T = any> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

export interface GitHubAccessTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

export interface GitHubUserEmail {
  email: string;
  primary: boolean;
  verified: boolean;
  visibility: 'public' | 'private';
}