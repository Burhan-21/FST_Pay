interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'card' | 'circle' | 'rect';
  width?: string;
  height?: string;
  lines?: number;
}

function SkeletonLine({ className = '', width, height }: { className?: string; width?: string; height?: string }) {
  return (
    <div
      className={`skeleton rounded-lg ${className}`}
      style={{ width: width || '100%', height: height || '1rem' }}
    />
  );
}

export default function Skeleton({
  className = '',
  variant = 'text',
  width,
  height,
  lines = 1,
}: SkeletonProps) {
  if (variant === 'circle') {
    return (
      <div
        className={`skeleton rounded-full ${className}`}
        style={{ width: width || '3rem', height: height || '3rem' }}
      />
    );
  }

  if (variant === 'card') {
    return (
      <div
        className={`skeleton rounded-2xl ${className}`}
        style={{ width: width || '100%', height: height || '8rem' }}
      />
    );
  }

  if (variant === 'rect') {
    return (
      <div
        className={`skeleton rounded-xl ${className}`}
        style={{ width: width || '100%', height: height || '3rem' }}
      />
    );
  }

  // text variant — supports multiple lines
  if (lines > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <SkeletonLine
            key={i}
            width={i === lines - 1 ? '70%' : width}
            height={height}
          />
        ))}
      </div>
    );
  }

  return <SkeletonLine className={className} width={width} height={height} />;
}

// Pre-built composite skeletons
export function SkeletonStatCard() {
  return (
    <div className="glass-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton variant="circle" width="2.5rem" height="2.5rem" />
        <Skeleton width="3rem" height="0.75rem" />
      </div>
      <Skeleton width="60%" height="1.75rem" />
      <Skeleton width="40%" height="0.75rem" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 p-4">
      <Skeleton variant="circle" width="2.5rem" height="2.5rem" />
      <div className="flex-1 space-y-2">
        <Skeleton width="60%" />
        <Skeleton width="35%" height="0.75rem" />
      </div>
      <Skeleton width="4rem" height="1.25rem" />
    </div>
  );
}
