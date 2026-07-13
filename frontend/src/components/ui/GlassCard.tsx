import { type HTMLAttributes, type ReactNode, forwardRef } from 'react';

type GlassVariant = 'default' | 'hover' | 'interactive' | 'panel' | 'border';

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: GlassVariant;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: ReactNode;
}

const variantMap: Record<GlassVariant, string> = {
  default: 'glass-card',
  hover: 'glass-card-hover',
  interactive: 'glass-card-interactive',
  panel: 'glass-panel',
  border: 'glass-border',
};

const paddingMap: Record<string, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ variant = 'default', padding = 'md', children, className = '', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`${variantMap[variant]} ${paddingMap[padding]} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassCard.displayName = 'GlassCard';

export default GlassCard;
