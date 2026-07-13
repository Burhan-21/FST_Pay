import { type ReactNode } from 'react';
import { type LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    direction: 'up' | 'down' | 'neutral';
  };
  iconColor?: string;
  className?: string;
  children?: ReactNode;
}

const trendColors: Record<string, string> = {
  up: 'stat-card-trend-up',
  down: 'stat-card-trend-down',
  neutral: 'text-surface-400 text-xs',
};

export default function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  iconColor = 'text-primary-400',
  className = '',
  children,
}: StatCardProps) {
  return (
    <div className={`stat-card ${className}`}>
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded-xl bg-surface-700/30 ${iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <span className={trendColors[trend.direction]}>
            {trend.direction === 'up' && '↑'}
            {trend.direction === 'down' && '↓'}
            {' '}{trend.value}
          </span>
        )}
      </div>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
      {children}
    </div>
  );
}
