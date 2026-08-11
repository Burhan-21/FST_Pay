import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency, getCategoryEmoji, calculatePercentage } from '../../utils/helpers';
import {
  Wallet, CreditCard, TrendingUp, Trophy, ArrowUpRight, ArrowDownRight,
  ChevronRight, Zap, Target, Brain, ReceiptText
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { walletApi, transactionApi, rewardsApi, analyticsApi } from '../../api/endpoints';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import { PageTransition, Avatar, EmptyState } from '../../components/ui';
import { DashboardSkeleton } from '../../components/skeletons/PageSkeletons';

import type { Transaction, Analytics } from '../../types';

const statCards = [
  { key: 'balance', icon: Wallet, label: 'Wallet Balance', gradient: 'from-primary-500 to-purple-600' },
  { key: 'spent', icon: ArrowDownRight, label: 'Total Spent', gradient: 'from-rose-500 to-red-600' },
  { key: 'saved', icon: TrendingUp, label: 'Total Saved', gradient: 'from-accent-500 to-teal-600' },
  { key: 'score', icon: Target, label: 'Financial Score', gradient: 'from-amber-500 to-orange-600' },
];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role === 'PARENT') {
      navigate('/parent/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const [wallet, setWallet] = useState<{ balance: number; currency: string } | null>(null);
  const [recentTxns, setRecentTxns] = useState<Transaction[]>([]);
  const [allTxnsForTrends, setAllTxnsForTrends] = useState<Transaction[]>([]);
  const [rewards, setRewards] = useState<{ points: number; streakDays: number } | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chartTab, setChartTab] = useState<'income_expense' | 'trend'>('income_expense');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [walletRes, txnRes, rewardsRes, analyticsRes] = await Promise.all([
          walletApi.getWallet().catch(() => ({ data: { data: { balance: 0, currency: 'INR' } } })),
          transactionApi.getTransactions({ size: 100 }).catch(() => ({ data: { data: { content: [] } } })),
          rewardsApi.getStatus().catch(() => ({ data: { data: { points: 0, streakDays: 0 } } })),
          analyticsApi.getAnalytics(30).catch(() => ({ data: { data: { totalCredit: 0, totalDebit: 0, netSavings: 0, spendByCategory: {} } } })),
        ]);
        setWallet(walletRes.data.data);
        const allTxns = txnRes.data.data.content || txnRes.data.data || [];
        setRecentTxns(allTxns.slice(0, 5));
        setAllTxnsForTrends(allTxns);
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

  const COLORS = ['#2070FF', '#7C3AED', '#FBBF24', '#22C55E', '#78D3FF', '#EF4444'];

  // Calculate 7-day daily trends dynamically from allTxnsForTrends
  const getDailyTrends = () => {
    const days: { [key: string]: { dateStr: string; name: string; income: number; expense: number } } = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      days[dateStr] = { dateStr, name: dayName, income: 0, expense: 0 };
    }

    allTxnsForTrends.forEach(t => {
      const dateStr = new Date(t.createdAt).toISOString().split('T')[0];
      if (days[dateStr]) {
        if (t.type === 'CREDIT') {
          days[dateStr].income += Number(t.amount);
        } else {
          days[dateStr].expense += Number(t.amount);
        }
      }
    });

    return Object.values(days);
  };

  const dailyTrendData = getDailyTrends();

  const stats = [
    { value: formatCurrency(walletBalance), trend: '+ Active', trendUp: true as const, key: 'balance' },
    { value: formatCurrency(totalSpent), trend: '30 days', trendUp: false as const, key: 'spent' },
    { value: formatCurrency(totalSaved), trend: `${calculatePercentage(totalSaved, totalCredit || 1)}% rate`, trendUp: true as const, key: 'saved' },
    { value: `${financialScore}`, sub: '/100', trend: 'Improving', trendUp: true as const, key: 'score' },
  ];

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <PageTransition className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 page-section">
        <div className="flex items-center gap-4">
          <Avatar name={user?.fullName || 'User'} size="lg" />
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
        {/* Left Column: Analytics Charts + Recent Transactions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Activity Analytics Charts */}
          <div className="glass-card p-6 page-section space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-700/50 pb-3">
              <div>
                <h3 className="text-lg font-primary font-bold text-white tracking-wide">Activity Analytics</h3>
                <p className="text-xs text-surface-400 mt-0.5">Visualize your income and expenditure patterns</p>
              </div>
              <div className="flex gap-2 bg-surface-800/80 p-1 rounded-xl border border-surface-700/60 self-start sm:self-center">
                <button
                  onClick={() => setChartTab('income_expense')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    chartTab === 'income_expense'
                      ? 'bg-primary-500 text-white shadow-lg'
                      : 'text-surface-400 hover:text-white'
                  }`}
                >
                  Income vs Expense
                </button>
                <button
                  onClick={() => setChartTab('trend')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    chartTab === 'trend'
                      ? 'bg-primary-500 text-white shadow-lg'
                      : 'text-surface-400 hover:text-white'
                  }`}
                >
                  Daily Trends
                </button>
              </div>
            </div>

            <div className="h-64 w-full">
              {chartTab === 'income_expense' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px' }}
                      labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                      itemStyle={{ color: '#94a3b8' }}
                    />
                    <Bar dataKey="income" name="Income" fill="#22C55E" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Expense" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2070FF" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#2070FF" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px' }}
                      labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                    />
                    <Area type="monotone" dataKey="expense" name="Spending" stroke="#2070FF" strokeWidth={2.5} fillOpacity={1} fill="url(#colorExpense)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="glass-card p-6 page-section">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-primary font-bold text-white tracking-wide">Recent Transactions</h3>
              <Link to="/transactions" className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors">
                View all <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-2">
              {recentTxns.length === 0 ? (
                <EmptyState
                  icon={ReceiptText}
                  title="No transactions yet"
                  description="Add money to your wallet or simulate spends to see activity here."
                  action={{ label: 'Top Up Wallet', onClick: () => navigate('/wallet') }}
                />
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
        </div>

        {/* Right Column: Spending Breakdown & Streak */}
        <div className="space-y-6">
          {/* Spending Breakdown with Pie Chart */}
          <div className="glass-card p-6 page-section flex flex-col">
            <h3 className="text-lg font-primary font-bold text-white tracking-wide mb-3">Spending Breakdown</h3>
            
            {spendingByCategory.length === 0 ? (
              <p className="text-surface-500 text-sm text-center py-8">No spending data this month</p>
            ) : (
              <>
                {/* Recharts Pie Chart */}
                <div className="h-44 w-full flex items-center justify-center py-2 border-b border-surface-800/80 pb-4 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={spendingByCategory}
                        cx="50%"
                        cy="50%"
                        innerRadius={38}
                        outerRadius={55}
                        paddingAngle={3}
                        dataKey="total"
                        nameKey="category"
                      >
                        {spendingByCategory.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px' }}
                        itemStyle={{ color: '#fff' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Categories List */}
                <div className="space-y-3.5">
                  {spendingByCategory.map((cat, i) => (
                    <div key={cat.category} className="space-y-1.5" style={{ animationDelay: `${i * 80}ms` }}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-surface-300 flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full inline-block"
                            style={{ backgroundColor: COLORS[i % COLORS.length] }}
                          />
                          <span className="text-base">{getCategoryEmoji(cat.category)}</span> {cat.category}
                        </span>
                        <span className="text-white font-semibold">{cat.percentage}%</span>
                      </div>
                      <div className="progress-bar">
                        <div
                          className="progress-bar-fill"
                          style={{
                            width: `${cat.percentage}%`,
                            backgroundColor: COLORS[i % COLORS.length],
                            transitionDelay: `${i * 100}ms`
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
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
    </PageTransition>
  );
}
