import { useState, useEffect, useMemo } from 'react';
import { formatCurrency, getCategoryEmoji, getCategoryColor } from '../../utils/helpers';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';
import {
  TrendingUp,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
  BarChart3,
  AlertCircle,
  RefreshCw,
  Download,
  Sparkles,
  Mail,
} from 'lucide-react';
import { analyticsApi, transactionApi, reportsApi } from '../../api/endpoints';
import type { Analytics, Transaction } from '../../types';
import PageTransition from '../../components/ui/PageTransition';
import GlassCard from '../../components/ui/GlassCard';
import StatCard from '../../components/ui/StatCard';
import Button from '../../components/ui/Button';
import { useTheme } from '../../hooks/useTheme';

export default function AnalyticsPage() {
  const { theme } = useTheme();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [recentTxns, setRecentTxns] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isRequestingEmail, setIsRequestingEmail] = useState(false);
  const [emailNotice, setEmailNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<7 | 30 | 90>(30);

  const isDark = theme === 'dark' || theme === 'amoled';

  const tooltipStyle = {
    backgroundColor: isDark ? '#0f172a' : '#ffffff',
    borderColor: isDark ? '#334155' : '#e2e8f0',
    borderRadius: '14px',
    color: isDark ? '#ffffff' : '#0f172a',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    fontSize: '12px',
    fontWeight: 600,
  };

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      setIsExporting(true);
      const res = await transactionApi.exportTransactions(format);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `financial_analytics_${timeframe}d_${new Date().toISOString().split('T')[0]}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleEmailStatement = async () => {
    setIsRequestingEmail(true);
    setEmailNotice(null);
    try {
      await reportsApi.requestMonthlyReport();
      setEmailNotice('Monthly statement PDF dispatched! Check your email inbox shortly. 📧');
      setTimeout(() => setEmailNotice(null), 5000);
    } catch (err) {
      console.error('Failed to request statement:', err);
      setEmailNotice('Failed to dispatch monthly statement email. Please try again.');
      setTimeout(() => setEmailNotice(null), 5000);
    } finally {
      setIsRequestingEmail(false);
    }
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [analyticsRes, txnsRes] = await Promise.all([
        analyticsApi.getAnalytics(timeframe).catch(() => ({ data: { data: null } })),
        transactionApi.getTransactions({ size: 50 }).catch(() => ({ data: { data: { content: [] } } }))
      ]);

      if (analyticsRes.data?.data) {
        setAnalytics(analyticsRes.data.data);
      }
      const txns = txnsRes.data?.data?.content || txnsRes.data?.data || [];
      setRecentTxns(txns);
    } catch (err) {
      console.error('Failed to load analytics data:', err);
      setError('Unable to load analytics data. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [timeframe]);

  const totalCredit = Number(analytics?.totalCredit || 0);
  const totalDebit = Number(analytics?.totalDebit || 0);
  const netSavings = Number(analytics?.netSavings || 0);
  const dailyAvg = Number(analytics?.dailyAverageSpend ?? (totalDebit > 0 ? Math.round(totalDebit / timeframe) : 0));
  const hasData = totalCredit > 0 || totalDebit > 0 || recentTxns.length > 0;

  // Compute spending breakdown
  const spendingEntries = Object.entries(analytics?.spendByCategory || {});
  const spendingData = spendingEntries.map(([category, amount]) => {
    const total = Number(amount);
    const percentage = totalDebit > 0 ? Math.round((total / totalDebit) * 100) : 0;
    return { category, total, percentage };
  }).sort((a, b) => b.total - a.total);

  // Savings rate calculation
  const savingsRate = totalCredit > 0 ? Math.max(0, Math.round((netSavings / totalCredit) * 100)) : 0;

  const flowData = [
    { label: 'Inflow', amount: totalCredit, fill: '#10b981' },
    { label: 'Outflow', amount: totalDebit, fill: '#f43f5e' },
    { label: 'Net Retained', amount: Math.max(0, netSavings), fill: '#6366f1' },
  ];

  // Spending trend over time grouped by date
  const trendData = useMemo(() => {
    if (recentTxns.length === 0) return [];
    const map = new Map<string, { date: string; debit: number; credit: number }>();
    const sorted = [...recentTxns].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    sorted.forEach((txn) => {
      const d = new Date(txn.createdAt);
      const key = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
      const current = map.get(key) || { date: key, debit: 0, credit: 0 };
      const val = Number(txn.amount) || 0;
      if (txn.type === 'DEBIT') {
        current.debit += val;
      } else {
        current.credit += val;
      }
      map.set(key, current);
    });

    return Array.from(map.values());
  }, [recentTxns]);

  return (
    <PageTransition>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-white">
              Financial Analytics
            </h1>
            <p className="text-slate-500 dark:text-surface-400 text-sm mt-1">
              Live, transaction-backed visibility into spending velocity, cash flow, and savings performance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
            {/* Export Reports */}
            <div className="flex items-center gap-1.5">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleExport('csv')}
                disabled={isExporting || !hasData}
                className="text-xs font-semibold"
                leftIcon={<Download className="w-3.5 h-3.5" />}
              >
                CSV
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleExport('pdf')}
                disabled={isExporting || !hasData}
                className="text-xs font-semibold"
                leftIcon={<Download className="w-3.5 h-3.5" />}
              >
                PDF
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleEmailStatement}
                disabled={isRequestingEmail}
                isLoading={isRequestingEmail}
                className="text-xs font-semibold"
                leftIcon={<Mail className="w-3.5 h-3.5" />}
              >
                Email Statement
              </Button>
            </div>

            {/* Timeframe Selector */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-surface-800/80 p-1 rounded-2xl border border-slate-200/80 dark:border-surface-700/60">
              <button
                type="button"
                onClick={() => setTimeframe(7)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  timeframe === 7
                    ? 'bg-white dark:bg-surface-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-surface-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                7 Days
              </button>
              <button
                type="button"
                onClick={() => setTimeframe(30)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  timeframe === 30
                    ? 'bg-white dark:bg-surface-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-surface-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                30 Days
              </button>
              <button
                type="button"
                onClick={() => setTimeframe(90)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  timeframe === 90
                    ? 'bg-white dark:bg-surface-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-surface-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                90 Days
              </button>
            </div>
          </div>
        </div>

        {emailNotice && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center justify-between animate-fade-in shadow-xs">
            <span>{emailNotice}</span>
            <button type="button" onClick={() => setEmailNotice(null)} className="text-emerald-500 hover:text-emerald-700 font-bold ml-2">✕</button>
          </div>
        )}

        {/* Dynamic Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Inflow"
            value={formatCurrency(totalCredit)}
            icon={ArrowDownLeft}
            iconColor="text-emerald-500 dark:text-emerald-400"
          />
          <StatCard
            label="Total Outflow"
            value={formatCurrency(totalDebit)}
            icon={ArrowUpRight}
            iconColor="text-rose-500 dark:text-rose-400"
          />
          <StatCard
            label="Net Savings"
            value={formatCurrency(netSavings)}
            icon={Wallet}
            iconColor="text-primary-500 dark:text-primary-400"
            trend={{ value: `${savingsRate}% saved`, direction: savingsRate >= 20 ? 'up' : 'down' }}
          />
          <StatCard
            label="Avg. Daily Outflow"
            value={formatCurrency(dailyAvg)}
            icon={TrendingUp}
            iconColor="text-amber-500 dark:text-amber-400"
          />
        </div>

        {/* Financial Health Spotlight Banner */}
        {hasData && !isLoading && (
          <div className="rounded-3xl p-5 bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-purple-50/50 dark:from-surface-900 dark:via-surface-900/90 dark:to-surface-800 border border-slate-200/70 dark:border-surface-800 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Savings Rate & Efficiency Ratio */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-primary-500/15 text-primary-600 dark:text-primary-400 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Savings Efficiency
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-surface-400">
                      Percentage of income retained in your wallet
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-extrabold px-2.5 py-1 rounded-xl ${
                  savingsRate >= 30
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                    : savingsRate >= 15
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                    : 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                }`}>
                  {savingsRate >= 30 ? '🔥 High Savings (>30%)' : savingsRate >= 15 ? '✨ Balanced (15-30%)' : '⚠️ High Outflow Velocity'}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="w-full bg-slate-200 dark:bg-surface-700 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-2.5 rounded-full bg-gradient-to-r from-primary-500 to-emerald-500 transition-all duration-700"
                    style={{ width: `${Math.min(savingsRate, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 dark:text-surface-400 font-semibold">
                  <span>Current: {savingsRate}% Saved</span>
                  <span>Target Benchmark: 20%+</span>
                </div>
              </div>
            </div>

            {/* Top Spending Category Driver */}
            <div className="p-4 rounded-2xl bg-white/80 dark:bg-surface-800/80 border border-slate-200/60 dark:border-surface-700/60 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Top Outflow Category ({timeframe}d)
                </span>
                {spendingData.length > 0 ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{getCategoryEmoji(spendingData[0].category)}</span>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        {spendingData[0].category}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-surface-400">
                        {spendingData[0].percentage}% of your expenses ({formatCurrency(spendingData[0].total)})
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No categorised debits yet</p>
                )}
              </div>
              <div className="text-right pl-3 border-l border-slate-200 dark:border-surface-700">
                <span className="text-[10px] text-slate-400 block">Outflow Share</span>
                <span className="text-sm font-extrabold text-rose-600 dark:text-rose-400 font-mono">
                  {spendingData.length > 0 ? `${spendingData[0].percentage}%` : '0%'}
                </span>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin mb-3" />
            <p className="text-xs text-slate-500 dark:text-surface-400">Loading live analytics data...</p>
          </div>
        ) : error ? (
          <GlassCard padding="lg" className="text-center py-12">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 mx-auto flex items-center justify-center mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{error}</h3>
            <button
              onClick={loadData}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-300 text-xs font-bold hover:bg-primary-100 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </GlassCard>
        ) : !hasData ? (
          <GlassCard padding="lg" className="text-center py-16">
            <div className="w-12 h-12 rounded-2xl bg-primary-500/10 text-primary-500 mx-auto flex items-center justify-center mb-3">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No Analytics Recorded Yet</h3>
            <p className="text-xs text-slate-500 dark:text-surface-400 max-w-sm mx-auto mt-1">
              Start making transfers, paying merchants, or funding savings goals to build your personalized financial breakdown.
            </p>
          </GlassCard>
        ) : (
          <div className="space-y-6">
            {/* Charts Row: Inflow vs Outflow + Spending by Category */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Cashflow Bar Chart */}
              <GlassCard padding="lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-display font-semibold text-slate-900 dark:text-white">
                    Inflow vs Outflow
                  </h3>
                  <span className="text-[11px] font-semibold text-slate-400">
                    Last {timeframe} Days
                  </span>
                </div>
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart data={flowData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(148, 163, 184, 0.15)' : 'rgba(203, 213, 225, 0.6)'} vertical={false} />
                      <XAxis dataKey="label" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} />
                      <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(val) => `₹${val}`} />
                      <Tooltip
                        formatter={(val: unknown) => [formatCurrency(Number(val) || 0), 'Amount']}
                        contentStyle={tooltipStyle}
                      />
                      <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                        {flowData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>

              {/* Spending by Category Pie */}
              <GlassCard padding="lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-display font-semibold text-slate-900 dark:text-white">
                    Spending by Category
                  </h3>
                  <span className="text-[11px] font-semibold text-slate-400">
                    {spendingData.length} Categories
                  </span>
                </div>
                {spendingData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[240px] text-slate-400 dark:text-surface-500 text-xs">
                    <p>No expense categories recorded yet for this period.</p>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="w-full sm:w-1/2 h-[220px]">
                      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <PieChart>
                          <Pie
                            data={spendingData}
                            dataKey="total"
                            nameKey="category"
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={85}
                            paddingAngle={3}
                            stroke="none"
                          >
                            {spendingData.map((entry) => (
                              <Cell key={entry.category} fill={getCategoryColor(entry.category)} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(val: unknown) => [formatCurrency(Number(val) || 0), 'Spent']}
                            contentStyle={tooltipStyle}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 space-y-3 w-full max-h-[230px] overflow-y-auto pr-1">
                      {spendingData.map((cat) => (
                        <div key={cat.category} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm">{getCategoryEmoji(cat.category)}</span>
                              <span className="font-semibold text-slate-800 dark:text-surface-200">{cat.category}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(cat.total)}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold bg-slate-100 dark:bg-surface-700 text-slate-600 dark:text-surface-300">
                                {cat.percentage}%
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-surface-700 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-1.5 rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.min(cat.percentage, 100)}%`,
                                backgroundColor: getCategoryColor(cat.category),
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </GlassCard>
            </div>

            {/* Spending Trends Area Chart */}
            {trendData.length > 0 && (
              <GlassCard padding="lg">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-display font-semibold text-slate-900 dark:text-white">
                      Spending & Inflow Velocity Trends
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-surface-400">
                      Chronological day-by-day cashflow timeline from your actual transactions
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-semibold">
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span>Inflow</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                      <span>Outflow</span>
                    </div>
                  </div>
                </div>

                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                      <defs>
                        <linearGradient id="colorCredit" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorDebit" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(148, 163, 184, 0.15)' : 'rgba(203, 213, 225, 0.6)'} vertical={false} />
                      <XAxis dataKey="date" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} />
                      <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(val) => `₹${val}`} />
                      <Tooltip
                        formatter={(val: unknown, name: unknown) => [
                          formatCurrency(Number(val) || 0),
                          name === 'credit' ? 'Inflow' : 'Outflow'
                        ]}
                        contentStyle={tooltipStyle}
                      />
                      <Area type="monotone" dataKey="credit" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorCredit)" name="credit" />
                      <Area type="monotone" dataKey="debit" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorDebit)" name="debit" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>
            )}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
