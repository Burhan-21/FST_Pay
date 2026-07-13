import { type ReactNode } from 'react';

type BadgeVariant = 'primary' | 'accent' | 'danger' | 'warning' | 'glass' | 'neutral';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
  dot?: boolean;
}

const variantMap: Record<BadgeVariant, string> = {
  primary: 'badge-primary',
  accent: 'badge-accent',
  danger: 'badge-danger',
  warning: 'badge-warning',
  glass: 'badge-glass',
  neutral: 'badge bg-surface-700/40 text-surface-300 border border-surface-600/30',
};

const dotColorMap: Record<BadgeVariant, string> = {
  primary: 'bg-primary-400',
  accent: 'bg-accent-400',
  danger: 'bg-danger-400',
  warning: 'bg-warning-400',
  glass: 'bg-white',
  neutral: 'bg-surface-400',
};

export default function Badge({ variant = 'primary', children, className = '', dot = false }: BadgeProps) {
  return (
    <span className={`${variantMap[variant]} ${className}`}>
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColorMap[variant]} mr-1`} />
      )}
      {children}
    </span>
  );
}
