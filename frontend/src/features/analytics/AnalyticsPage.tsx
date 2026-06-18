import { formatCurrency, getCategoryEmoji, getCategoryColor } from '../../utils/helpers';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown, Award } from 'lucide-react';

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Analytics</h1>
        <p className="text-surface-400 mt-1">Understand your spending patterns</p>
      </div>

      {/* Score + Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5 flex items-center gap-4 page-section">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
            <span className="text-2xl font-bold text-white">{score.grade}</span>
          </div>
          <div>
            <p className="text-sm text-surface-400">Financial Score</p>
            <p className="text-2xl font-bold text-white">{score.score}/100</p>
          </div>
        </div>
        <div className="glass-card p-5 flex items-center gap-4 page-section">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-500 to-teal-600 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-surface-400">Savings Rate</p>
            <p className="text-2xl font-bold text-white">{score.savingsRate}%</p>
          </div>
        </div>
        <div className="glass-card p-5 flex items-center gap-4 page-section">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Award className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-surface-400">Budget Adherence</p>
            <p className="text-2xl font-bold text-white">{score.budgetAdherence}%</p>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 page-section">
        {/* Monthly Income vs Expenses */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-display font-semibold text-white mb-4">Income vs Expenses</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#fff' }} formatter={(value: any) => formatCurrency(value)} />
              <Bar dataKey="income" fill="#6366f1" radius={[4, 4, 0, 0]} name="Income" />
              <Bar dataKey="expenses" fill="#f87171" radius={[4, 4, 0, 0]} name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Spending by Category Pie */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-display font-semibold text-white mb-4">Spending by Category</h3>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="50%" height={220}>
              <PieChart>
                <Pie data={spendingData} dataKey="total" nameKey="category" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} stroke="none">
                  {spendingData.map((entry) => (
                    <Cell key={entry.category} fill={getCategoryColor(entry.category)} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-3">
              {spendingData.map((cat) => (
                <div key={cat.category} className="flex items-center gap-3 text-sm">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getCategoryColor(cat.category) }} />
                  <span className="text-surface-300 flex-1">{getCategoryEmoji(cat.category)} {cat.category}</span>
                  <span className="text-white font-medium">{cat.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Insights */}
      <div className="glass-card p-6 page-section">
        <h3 className="text-lg font-display font-semibold text-white mb-4">This Month's Insights</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Income', value: formatCurrency(9500), icon: TrendingUp, color: 'text-accent-400' },
            { label: 'Total Expenses', value: formatCurrency(8320), icon: TrendingDown, color: 'text-danger-400' },
            { label: 'Net Savings', value: formatCurrency(1180), icon: TrendingUp, color: 'text-primary-400' },
            { label: 'Avg. Daily Spend', value: formatCurrency(277), icon: TrendingDown, color: 'text-warning-400' },
          ].map((item) => (
            <div key={item.label} className="p-4 rounded-xl glass border border-surface-700/30">
              <div className="flex items-center gap-2 mb-2">
                <item.icon className={`w-4 h-4 ${item.color}`} />
                <span className="text-xs text-surface-400">{item.label}</span>
              </div>
              <p className="text-xl font-bold text-white">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
