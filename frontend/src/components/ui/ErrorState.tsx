import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';
import Button from './Button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  variant?: 'inline' | 'fullpage';
  className?: string;
}

export default function ErrorState({
  title = 'Something went wrong',
  message = 'We couldn\'t load this data. Please check your connection and try again.',
  onRetry,
  variant = 'inline',
  className = '',
}: ErrorStateProps) {
  if (variant === 'fullpage') {
    return (
      <div className={`flex flex-col items-center justify-center min-h-[60vh] px-6 text-center ${className}`}>
        <div className="p-4 rounded-2xl bg-danger-500/10 mb-4">
          <WifiOff className="w-10 h-10 text-danger-400" />
        </div>
        <h3 className="text-xl font-semibold text-surface-200 mb-2">{title}</h3>
        <p className="text-sm text-surface-400 max-w-md mb-6">{message}</p>
        {onRetry && (
          <Button variant="primary" size="sm" onClick={onRetry} leftIcon={<RefreshCw className="w-4 h-4" />}>
            Try Again
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={`glass-card p-5 flex items-center gap-4 ${className}`}>
      <div className="p-2.5 rounded-xl bg-danger-500/10 flex-shrink-0">
        <AlertTriangle className="w-5 h-5 text-danger-400" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-surface-200">{title}</h4>
        <p className="text-xs text-surface-400 truncate">{message}</p>
      </div>
      {onRetry && (
        <Button variant="ghost" size="xs" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
