import Skeleton, { SkeletonStatCard, SkeletonRow } from '../ui/Skeleton';

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stat cards row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart area */}
        <div className="lg:col-span-2">
          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton width="40%" height="1.25rem" />
              <Skeleton width="6rem" height="2rem" />
            </div>
            <Skeleton variant="card" height="16rem" />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="glass-card p-5 space-y-3">
            <Skeleton width="50%" height="1rem" />
            <Skeleton variant="rect" height="3rem" />
            <Skeleton variant="rect" height="3rem" />
          </div>
          <div className="glass-card p-5 space-y-3">
            <Skeleton width="40%" height="1rem" />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        </div>
      </div>
    </div>
  );
}

export function WalletSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Balance card */}
      <div className="glass-card p-8 space-y-4">
        <Skeleton width="30%" height="1rem" />
        <Skeleton width="50%" height="2.5rem" />
        <div className="flex gap-3 pt-2">
          <Skeleton variant="rect" width="8rem" height="2.5rem" />
          <Skeleton variant="rect" width="8rem" height="2.5rem" />
        </div>
      </div>

      {/* Transaction history */}
      <div className="glass-card p-5 space-y-1">
        <Skeleton width="40%" height="1.25rem" className="mb-4" />
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </div>
    </div>
  );
}

export function TransactionSkeleton() {
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Skeleton variant="rect" width="8rem" height="2.5rem" />
        <Skeleton variant="rect" width="8rem" height="2.5rem" />
        <Skeleton variant="rect" width="8rem" height="2.5rem" />
      </div>

      {/* Transaction list */}
      <div className="glass-card divide-y divide-surface-700/30">
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton variant="card" height="13rem" className="rounded-2xl" />
        <Skeleton variant="card" height="13rem" className="rounded-2xl" />
      </div>

      {/* Card details */}
      <div className="glass-card p-6 space-y-4">
        <Skeleton width="30%" height="1.25rem" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton variant="rect" height="3rem" />
          <Skeleton variant="rect" height="3rem" />
          <Skeleton variant="rect" height="3rem" />
          <Skeleton variant="rect" height="3rem" />
        </div>
      </div>
    </div>
  );
}

export function RewardsSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Level XP Card */}
      <div className="glass-card p-8 space-y-4 bg-gradient-to-br from-surface-800/50 to-surface-900/50">
        <Skeleton width="20%" height="1rem" />
        <Skeleton width="40%" height="2.5rem" />
        <Skeleton width="90%" height="0.75rem" className="rounded-full" />
      </div>

      {/* Badges rack */}
      <div className="glass-card p-6 space-y-4">
        <Skeleton width="30%" height="1.25rem" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-4 border border-surface-800 rounded-2xl flex flex-col items-center gap-2">
              <Skeleton variant="circle" width="3rem" height="3rem" />
              <Skeleton width="60%" height="1rem" />
              <Skeleton width="80%" height="0.75rem" />
            </div>
          ))}
        </div>
      </div>

      {/* Rewards Shop catalog */}
      <div className="glass-card p-6 space-y-4">
        <Skeleton width="30%" height="1.25rem" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-5 border border-surface-800 rounded-2xl space-y-3">
              <Skeleton variant="rect" width="3rem" height="3rem" className="rounded-xl" />
              <Skeleton width="70%" height="1.25rem" />
              <Skeleton width="90%" height="1.5rem" />
              <Skeleton variant="rect" height="2rem" className="rounded-xl pt-2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2">
        <Skeleton width="15rem" height="2rem" />
        <Skeleton width="20rem" height="1rem" />
      </div>
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="glass-card p-4 lg:w-56 flex lg:flex-col gap-2">
          <Skeleton variant="rect" height="2.5rem" />
          <Skeleton variant="rect" height="2.5rem" />
          <Skeleton variant="rect" height="2.5rem" />
        </div>
        <div className="flex-1 glass-card p-6 space-y-4">
          <Skeleton width="40%" height="1.5rem" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Skeleton variant="rect" height="3rem" />
            <Skeleton variant="rect" height="3rem" />
            <Skeleton variant="rect" height="3rem" />
            <Skeleton variant="rect" height="3rem" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2">
        <Skeleton width="18rem" height="2rem" />
        <Skeleton width="25rem" height="1rem" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>
      <div className="glass-card p-6 space-y-4">
        <Skeleton width="30%" height="1.5rem" />
        <Skeleton variant="rect" height="10rem" />
      </div>
    </div>
  );
}

export function ParentSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="flex items-center gap-4">
          <Skeleton variant="circle" width="3.5rem" height="3.5rem" />
          <div className="space-y-2">
            <Skeleton width="12rem" height="1.5rem" />
            <Skeleton width="18rem" height="1rem" />
          </div>
        </div>
        <Skeleton variant="rect" width="10rem" height="2.5rem" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6 space-y-4">
            <Skeleton width="40%" height="1.5rem" />
            <Skeleton variant="rect" height="8rem" />
            <Skeleton variant="rect" height="8rem" />
          </div>
        </div>
        <div className="glass-card p-6 space-y-4">
          <Skeleton width="50%" height="1.5rem" />
          <Skeleton variant="rect" height="6rem" />
          <Skeleton variant="rect" height="6rem" />
        </div>
      </div>
    </div>
  );
}

export function AnalyticsSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2">
        <Skeleton width="12rem" height="2rem" />
        <Skeleton width="20rem" height="1rem" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 space-y-4">
          <Skeleton width="50%" height="1.25rem" />
          <Skeleton variant="card" height="15rem" />
        </div>
        <div className="glass-card p-6 space-y-4">
          <Skeleton width="50%" height="1.25rem" />
          <Skeleton variant="card" height="15rem" />
        </div>
      </div>
    </div>
  );
}

