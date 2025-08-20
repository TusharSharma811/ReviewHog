import { Link } from "react-router-dom";
import { GitPullRequest, Clock, CheckCircle, AlertCircle } from "lucide-react";
import type { PullRequest } from "../types";

interface PullRequestCardProps {
  pullRequest: PullRequest;
}

export const PullRequestCard = ({ pullRequest: pr }: PullRequestCardProps) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high": return "text-red-600 border-red-200 bg-red-50";
      case "medium": return "text-yellow-600 border-yellow-200 bg-yellow-50";
      case "low": return "text-green-600 border-green-200 bg-green-50";
      default: return "text-gray-600 border-gray-200 bg-gray-50";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "reviewed":
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-2 flex-1">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <GitPullRequest className="h-4 w-4 text-primary" />
              <span>{pr.repository}</span>
              <span>#{pr.number}</span>
            </div>
            <h3 className="text-lg font-semibold leading-none tracking-tight">
              <Link 
                to={`/dashboard/${pr.repository}/${pr.number}`}
                className="hover:text-primary transition-colors"
                aria-label={`View pull request: ${pr.title}`}
              >
                {pr.title}
              </Link>
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon(pr.status)}
            <span 
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${getSeverityColor(pr.severity)}`}
              aria-label={`Severity: ${pr.severity}`}
            >
              {pr.severity}
            </span>
          </div>
        </div>
      </div>
      
      <div className="p-6 pt-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <div className="flex items-center space-x-1">
              <div className="relative flex h-5 w-5 shrink-0 overflow-hidden rounded-full">
                <img 
                  src={`https://github.com/${pr.author}.png`} 
                  alt={`${pr.author}'s avatar`}
                  className="aspect-square h-full w-full"
                />
              </div>
              <span>{pr.author}</span>
            </div>
            <span aria-hidden="true">•</span>
            <time dateTime={pr.createdAt}>
              {new Date(pr.createdAt).toLocaleDateString()}
            </time>
          </div>
          <div className="flex items-center space-x-4 text-sm">
            <span className="text-green-600 font-medium" aria-label={`AI Score: ${pr.aiScore}%`}>
              Score: {pr.aiScore}%
            </span>
            <span className="text-yellow-600" aria-label={`${pr.issuesFound} issues found`}>
              {pr.issuesFound} issues
            </span>
            <span className="text-blue-600" aria-label={`${pr.suggestionsCount} suggestions`}>
              {pr.suggestionsCount} suggestions
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};