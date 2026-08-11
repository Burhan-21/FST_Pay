import { formatCurrency, getCategoryEmoji, getCategoryColor } from '../../utils/helpers';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown, Award, Star } from 'lucide-react';
import PageTransition from '../../components/ui/PageTransition';
import GlassCard from '../../components/ui/GlassCard';
import StatCard from '../../components/ui/StatCard';

const spendingData = [
  { category: 'FOOD', total: 3200, percentage: 38 },
  { category: 'SHOPPING', total: 2100, percentage: 25 },
  { category: 'TRANSPORT', total: 1500, percentage: 18 },
  { category: 'ENTERTAINMENT', total: 1020, percentage: 12 },
  { category: 'EDUCATION', total: 500, percentage: 6 },
];

const monthlyData = [
  { month: 'Jan', income: 8000, expenses: 6200 },
  { month: 'Feb', income: 8500, expenses: 7100 },
  { month: 'Mar', income: 9000, expenses: 5800 },
  { month: 'Apr', income: 8200, expenses: 6900 },
  { month: 'May', income: 10000, expenses: 7500 },
  { month: 'Jun', income: 9500, expenses: 8320 },
];

const score = { score: 78, grade: 'B+', savingsRate: 33, budgetAdherence: 85, streakDays: 12 };

export default function AnalyticsPage() {
  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Analytics</h1>
          <p className="text-surface-400 mt-1">Understand your spending patterns</p>
        </div>

        {/* Score + Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Financial Score"
            value={`${score.score}/100`}
            icon={Star}
            iconColor="text-purple-400"
          >
            <div className="mt-2 text-xs font-bold text-purple-400 bg-purple-500/10 py-1 px-2.5 rounded-full w-max">
              Grade: {score.grade}
            </div>
          </StatCard>

          <StatCard
            label="Savings Rate"
            value={`${score.savingsRate}%`}
            icon={TrendingUp}
            iconColor="text-teal-400"
            trend={{ value: 'Healthy ratio', direction: 'up' }}
          />

          <StatCard
            label="Budget Adherence"
            value={`${score.budgetAdherence}%`}
            icon={Award}
            iconColor="text-amber-400"
            trend={{ value: 'On track', direction: 'up' }}
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 page-section">
          {/* Monthly Income vs Expenses */}
          <GlassCard padding="lg">
            <h3 className="text-lg font-display font-semibold text-white mb-4">Income vs Expenses</h3>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#fff' }} formatter={(value: unknown) => typeof value === 'number' ? formatCurrency(value) : ''} />
                  <Bar dataKey="income" fill="#6366f1" radius={[4, 4, 0, 0]} name="Income" />
                  <Bar dataKey="expenses" fill="#f87171" radius={[4, 4, 0, 0]} name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          {/* Spending by Category Pie */}
          <GlassCard padding="lg">
            <h3 className="text-lg font-display font-semibold text-white mb-4">Spending by Category</h3>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="w-full sm:w-1/2 h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={spendingData} dataKey="total" nameKey="category" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} stroke="none">
                      {spendingData.map((entry) => (
                        <Cell key={entry.category} fill={getCategoryColor(entry.category)} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-3 w-full">
                {spendingData.map((cat) => (
                  <div key={cat.category} className="flex items-center gap-3 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getCategoryColor(cat.category) }} />
                    <span className="text-surface-300 flex-1">{getCategoryEmoji(cat.category)} {cat.category}</span>
                    <span className="text-white font-medium">{cat.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Monthly Insights */}
        <GlassCard padding="lg" className="page-section">
          <h3 className="text-lg font-display font-semibold text-white mb-4">This Month's Insights</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Income', value: formatCurrency(9500), icon: TrendingUp, color: 'text-accent-400' },
              { label: 'Total Expenses', value: formatCurrency(8320), icon: TrendingDown, color: 'text-danger-400' },
              { label: 'Net Savings', value: formatCurrency(1180), icon: TrendingUp, color: 'text-primary-400' },
              { label: 'Avg. Daily Spend', value: formatCurrency(277), icon: TrendingDown, color: 'text-warning-400' },
            ].map((item) => (
              <div key={item.label} className="p-4 rounded-xl bg-surface-900/40 border border-surface-700/30">
                <div className="flex items-center gap-2 mb-2">
                  <item.icon className={`w-4 h-4 ${item.color}`} />
                  <span className="text-xs text-surface-400">{item.label}</span>
                </div>
                <p className="text-xl font-bold text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </PageTransition>
  );
}
