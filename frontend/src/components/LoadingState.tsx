import { type ReactNode } from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner = ({ size = 'md', className = '' }: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div 
      className={`animate-spin rounded-full border-2 border-gray-300 border-t-primary ${sizeClasses[size]} ${className}`}
      aria-label="Loading"
    />
  );
};

interface LoadingStateProps {
  isLoading: boolean;
  error?: string;
  children: ReactNode;
  loadingComponent?: ReactNode;
  errorComponent?: ReactNode;
}

export const LoadingState = ({ 
  isLoading, 
  error, 
  children, 
  loadingComponent, 
  errorComponent 
}: LoadingStateProps) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8" role="status" aria-live="polite">
        {loadingComponent || (
          <div className="text-center">
            <LoadingSpinner />
            <p className="mt-2 text-muted-foreground">Loading...</p>
          </div>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8" role="alert" aria-live="assertive">
        {errorComponent || (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-red-800 font-medium">Error</h3>
            <p className="text-red-700 mt-1">{error}</p>
          </div>
        )}
      </div>
    );
  }

  return <>{children}</>;
};

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}

export const EmptyState = ({ title, description, action, icon }: EmptyStateProps) => {
  return (
    <div className="text-center py-12">
      {icon && <div className="mb-4 flex justify-center">{icon}</div>}
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">{description}</p>
      {action && action}
    </div>
  );
};