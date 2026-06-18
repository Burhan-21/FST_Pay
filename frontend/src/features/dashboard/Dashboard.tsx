import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, getCategoryEmoji, calculatePercentage } from '../../utils/helpers';
import {
  Wallet, CreditCard, TrendingUp, Trophy, ArrowUpRight, ArrowDownRight,
  ChevronRight, Loader2, Zap, Target, Brain
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { walletApi, transactionApi, rewardsApi, analyticsApi } from '../../api/endpoints';

const statCards = [
  { key: 'balance', icon: Wallet, label: 'Wallet Balance', gradient: 'from-primary-500 to-purple-600' },
  { key: 'spent', icon: ArrowDownRight, label: 'Total Spent', gradient: 'from-rose-500 to-red-600' },
  { key: 'saved', icon: TrendingUp, label: 'Total Saved', gradient: 'from-accent-500 to-teal-600' },
  { key: 'score', icon: Target, label: 'Financial Score', gradient: 'from-amber-500 to-orange-600' },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<{ balance: number; currency: string } | null>(null);
  const [recentTxns, setRecentTxns] = useState<any[]>([]);
  const [rewards, setRewards] = useState<{ points: number; streakDays: number } | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [walletRes, txnRes, rewardsRes, analyticsRes] = await Promise.all([
          walletApi.getWallet().catch(() => ({ data: { data: { balance: 0, currency: 'INR' } } })),
          transactionApi.getTransactions({ size: 5 }).catch(() => ({ data: { data: { content: [] } } })),
          rewardsApi.getRewards().catch(() => ({ data: { data: { points: 0, streakDays: 0 } } })),
          analyticsApi.getAnalytics(30).catch(() => ({ data: { data: { totalCredit: 0, totalDebit: 0, netSavings: 0, spendByCategory: {} } } })),
        ]);
        setWallet(walletRes.data.data);
        setRecentTxns(txnRes.data.data.content || txnRes.data.data || []);
        setRewards(rewardsRes.data.data);
        setAnalytics(analyticsRes.data.data);
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const walletBalance = wallet?.balance ?? 0;
  const totalSpent = Number(analytics?.totalDebit) || 0;
  const totalSaved = Number(analytics?.netSavings) || 0;
  const rewardPoints = rewards?.points ?? 0;
  const totalCredit = Number(analytics?.totalCredit) || 0;
  const financialScore = Math.max(50, Math.min(100, Math.round(50 + (totalCredit > 0 ? (totalSaved / totalCredit) * 50 : 25))));

  const categoryMap = analytics?.spendByCategory || {};
  const spendingByCategory = Object.entries(categoryMap)
    .map(([category, amount]) => ({ category, total: Number(amount), percentage: calculatePercentage(Number(amount), totalSpent) }))
    .sort((a, b) => b.total - a.total).slice(0, 5);

  const stats = [
    { value: formatCurrency(walletBalance), trend: '+ Active', trendUp: true as const, key: 'balance' },
    { value: formatCurrency(totalSpent), trend: '30 days', trendUp: false as const, key: 'spent' },
    { value: formatCurrency(totalSaved), trend: `${calculatePercentage(totalSaved, totalCredit || 1)}% rate`, trendUp: true as const, key: 'saved' },
    { value: `${financialScore}`, sub: '/100', trend: 'Improving', trendUp: true as const, key: 'score' },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center animate-pulse-glow shadow-glow">
          <Loader2 className="w-6 h-6 text-white animate-spin" />
        </div>
        <p className="text-surface-400 text-sm animate-pulse">Loading your financial overview...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 page-section">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl gradient-card flex items-center justify-center shadow-2xl shadow-primary-500/20">
            <span className="text-2xl">{user?.fullName?.charAt(0).toUpperCase() || 'U'}</span>
          </div>
          <div>
            <h1 className="text-2xl font-primary font-bold text-white">
              {greeting()}, {user?.fullName?.split(' ')[0] || 'there'}
            </h1>
            <p className="text-surface-400 text-sm mt-0.5">Here's your financial overview</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {rewards && (
            <Link to="/rewards" className="flex items-center gap-1.5 px-4 py-2 rounded-xl glass text-xs font-semibold text-warning-300 hover:bg-white/10 transition-all haptic-tap">
              <Trophy className="w-3.5 h-3.5" />
              <span>{rewardPoints.toLocaleString()} pts</span>
            </Link>
          )}
          <Link to="/ai-coach" className="btn-glass text-sm gap-2">
            <Brain className="w-4 h-4" />
            AI Coach
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => {
          const stat = stats.find(s => s.key === card.key)!;
          return (
            <div
              key={card.key}
              className="glass-card-hover p-5 relative overflow-hidden group page-section"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className={`absolute top-0 right-0 w-32 h-32 rounded-full bg-gradient-to-br ${card.gradient} opacity-5 -translate-y-12 translate-x-12 group-hover:scale-150 transition-transform duration-1000`} />
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-lg`}>
                  <card.icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm text-surface-400 font-medium">{card.label}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <p className="text-2xl font-primary font-bold text-white stat-card-value">{stat.value}</p>
                {'sub' in stat && stat.sub && <span className="text-sm text-surface-500">/100</span>}
              </div>
              <div className={`flex items-center gap-1 mt-2 text-xs ${stat.trendUp ? 'text-accent-400' : 'text-surface-500'}`}>
                {stat.trendUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : null}
                <span>{stat.trend}</span>
              </div>
              {card.key === 'score' && (
                <div className="progress-bar mt-3">
                  <div className="progress-bar-fill" style={{ width: `${financialScore}%` }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transactions */}
        <div className="lg:col-span-2 glass-card p-6 page-section">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-primary font-bold text-white tracking-wide">Recent Transactions</h3>
            <Link to="/transactions" className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors">
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-2">
            {recentTxns.length === 0 ? (
              <p className="text-surface-500 text-sm py-8 text-center">No transactions yet. Add money or simulate spends to start!</p>
            ) : (
              recentTxns.map((txn, i) => (
                <div
                  key={txn.id}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-surface-800/30 transition-all group"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${txn.type === 'CREDIT' ? 'bg-accent-500/10' : 'bg-surface-700/50'}`}>
                    {getCategoryEmoji(txn.category)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{txn.merchant || txn.description}</p>
                    <p className="text-xs text-surface-500">{txn.category} · {new Date(txn.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold font-primary ${txn.type === 'CREDIT' ? 'text-accent-400' : 'text-white'}`}>
                      {txn.type === 'CREDIT' ? '+' : '-'}{formatCurrency(txn.amount)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Spending Breakdown */}
          <div className="glass-card p-6 page-section">
            <h3 className="text-lg font-primary font-bold text-white tracking-wide mb-4">Spending Breakdown</h3>
            <div className="space-y-4">
              {spendingByCategory.length === 0 ? (
                <p className="text-surface-500 text-sm text-center py-4">No spending data this month</p>
              ) : (
                spendingByCategory.map((cat, i) => (
                  <div key={cat.category} className="space-y-1.5" style={{ animationDelay: `${i * 80}ms` }}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-surface-300 flex items-center gap-2">
                        <span className="text-base">{getCategoryEmoji(cat.category)}</span> {cat.category}
                      </span>
                      <span className="text-white font-semibold">{cat.percentage}%</span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-bar-fill"
                        style={{ width: `${cat.percentage}%`, transitionDelay: `${i * 100}ms` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="glass-card p-6 page-section">
            <h3 className="text-lg font-primary font-bold text-white tracking-wide mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Zap, label: 'Top Up', path: '/wallet', gradient: 'from-primary-500 to-purple-500' },
                { icon: CreditCard, label: 'New Card', path: '/cards', gradient: 'from-accent-500 to-teal-500' },
                { icon: Brain, label: 'AI Advice', path: '/ai-coach', gradient: 'from-blue-500 to-cyan-500' },
                { icon: Trophy, label: 'Rewards', path: '/rewards', gradient: 'from-amber-500 to-orange-500' },
              ].map((action) => (
                <Link
                  key={action.label}
                  to={action.path}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl glass hover:bg-white/10 border border-white/5 hover:border-primary-500/30 hover:-translate-y-1 transition-all duration-300 haptic-tap group"
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center shadow-lg transition-all duration-300 group-hover:scale-110`}>
                    <action.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-surface-300">{action.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Streak */}
          <div className="clay-primary p-5 relative overflow-hidden group page-section">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-12 translate-x-12 group-hover:scale-150 transition-transform duration-700" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-5 h-5 text-warning-300" />
                <span className="text-sm font-semibold text-white/80">Budget Streak</span>
              </div>
              <p className="text-3xl font-primary font-bold text-white">{rewards?.streakDays || 0} <span className="text-lg">days</span></p>
              <p className="text-sm text-white/60 mt-1">Keep it up! Claim daily streak bonus under Rewards.</p>
              <div className="mt-3 flex gap-1">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className={`h-1.5 flex-1 rounded-full ${i < (rewards?.streakDays || 0) % 7 ? 'bg-white/50' : 'bg-white/10'}`} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
