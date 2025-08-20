import { Github } from "lucide-react";
import type { Repository } from "../types";

interface RepositoryListProps {
  repositories: Repository[];
  className?: string;
}

export const RepositoryList = ({ repositories, className = "" }: RepositoryListProps) => {
  if (repositories.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <Github className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No repositories found</h3>
        <p className="text-gray-500 mb-4">
          Install the CodeRevU GitHub App to start reviewing your repositories.
        </p>
        <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
          <Github className="h-4 w-4 mr-2" />
          Install GitHub App
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <h2 className="text-xl font-semibold mb-4">Your Repositories</h2>
      <div className="grid gap-4">
        {repositories.map((repo) => (
          <div 
            key={repo.id} 
            className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">{repo.name}</h3>
              {repo.description && (
                <p className="text-sm text-gray-600 mt-1">{repo.description}</p>
              )}
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                {repo.prs !== undefined && (
                  <span>{repo.prs} PR{repo.prs !== 1 ? 's' : ''}</span>
                )}
                {repo.lastActivity && (
                  <>
                    <span>•</span>
                    <span>Active {repo.lastActivity}</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex space-x-2">
              <a
                href={repo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                aria-label={`View ${repo.name} on GitHub`}
              >
                <Github className="h-4 w-4 mr-1" />
                View
              </a>
              <button className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
                View Reviews
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};