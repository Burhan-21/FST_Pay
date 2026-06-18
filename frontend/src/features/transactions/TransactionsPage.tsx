import { useState, useEffect } from 'react';
import { formatCurrency, getCategoryEmoji, formatRelativeTime, parseMoneyInput } from '../../utils/helpers';
import { Search, Filter, ArrowUpRight, ArrowDownRight, Plus, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { transactionApi } from '../../api/endpoints';
import type { Transaction } from '../../types';

const categories = ['ALL', 'FOOD', 'TRANSPORT', 'SHOPPING', 'ENTERTAINMENT', 'EDUCATION', 'HEALTH', 'BILLS', 'OTHER'];
const simulateCategories = ['FOOD', 'TRANSPORT', 'SHOPPING', 'ENTERTAINMENT', 'EDUCATION', 'HEALTH', 'BILLS', 'OTHER'];

export default function TransactionsPage() {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSimulateLoading, setIsSimulateLoading] = useState(false);
  const [showSimulate, setShowSimulate] = useState(false);

  // Filters
  const [filter, setFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'CREDIT' | 'DEBIT'>('ALL');

  // Simulation Form States
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('FOOD');
  const [merchant, setMerchant] = useState('');
  const [description, setDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      const res = await transactionApi.getTransactions({
        category: filter === 'ALL' ? undefined : filter,
        type: typeFilter === 'ALL' ? undefined : typeFilter,
        size: 50,
      });
      setTxns(res.data.data.content || res.data.data || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [filter, typeFilter]);

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseMoneyInput(amount, 1);
    if (parsedAmount === null) {
      setErrorMsg('Please enter a valid amount (minimum ₹1)');
      return;
    }
    if (!merchant.trim()) {
      setErrorMsg('Please enter a merchant name');
      return;
    }

    try {
      setIsSimulateLoading(true);
      setErrorMsg('');
      await transactionApi.simulateSpend({
        amount: parsedAmount,
        category,
        merchant,
        description: description || undefined,
      });
      await fetchTransactions();
      setShowSimulate(false);
      setAmount('');
      setMerchant('');
      setDescription('');
    } catch (err: any) {
      console.error('Simulation failed:', err);
      setErrorMsg(err.response?.data?.message || 'Simulation failed. Check if wallet balance is sufficient.');
    } finally {
      setIsSimulateLoading(false);
    }
  };

  const filtered = txns.filter((t) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (t.merchant ?? '').toLowerCase().includes(term) ||
      (t.description ?? '').toLowerCase().includes(term) ||
      (t.category ?? '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Transactions</h1>
          <p className="text-surface-400 mt-1">Track all your spending and income</p>
        </div>
        <button onClick={() => setShowSimulate(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Simulate Spend
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 space-y-4 page-section">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search transactions..." className="input-field pl-10 py-2.5 text-sm" />
          </div>
          <div className="flex gap-2">
            {(['ALL', 'CREDIT', 'DEBIT'] as const).map((t) => (
              <button key={t} onClick={() => setTypeFilter(t)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${typeFilter === t ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30' : 'bg-surface-800/50 text-surface-400 border border-surface-700/50 hover:text-white'}`}>
                {t === 'ALL' ? 'All' : t === 'CREDIT' ? '↓ Income' : '↑ Expense'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button key={cat} onClick={() => setFilter(cat)} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${filter === cat ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30' : 'bg-surface-800/50 text-surface-400 border border-surface-700/50 hover:text-white'}`}>
              {cat !== 'ALL' && getCategoryEmoji(cat)} {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction List */}
      <div className="glass-card divide-y divide-surface-700/30 page-section">
        {isLoading && filtered.length === 0 ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Filter className="w-12 h-12 text-surface-600 mx-auto mb-3" />
            <p className="text-surface-400">No transactions found</p>
          </div>
        ) : (
          filtered.map((txn) => (
            <div key={txn.id} className="flex items-center gap-4 p-4 hover:bg-surface-800/30 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-surface-700/50 flex items-center justify-center text-lg">
                {getCategoryEmoji(txn.category)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{txn.merchant}</p>
                <p className="text-xs text-surface-400">{txn.description || 'Simulated transaction'} • {formatRelativeTime(txn.createdAt)}</p>
              </div>
              <div className="text-right flex items-center gap-3">
                <div>
                  <p className={`text-sm font-semibold ${txn.type === 'CREDIT' ? 'text-accent-400' : 'text-white'}`}>
                    {txn.type === 'CREDIT' ? '+' : '-'}{formatCurrency(txn.amount)}
                  </p>
                  <p className="text-xs text-surface-500">Bal: {formatCurrency(txn.balanceAfter)}</p>
                </div>
                {txn.type === 'CREDIT' ? <ArrowDownRight className="w-4 h-4 text-accent-400" /> : <ArrowUpRight className="w-4 h-4 text-surface-500" />}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Simulate Modal */}
      {showSimulate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form onSubmit={handleSimulate} className="glass-card p-6 w-full max-w-md space-y-4 animate-slide-up">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-display font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary-400" /> Simulate Spend
              </h3>
              <button type="button" onClick={() => setShowSimulate(false)} className="text-surface-400 hover:text-white text-xl">✕</button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-danger-500/10 border border-danger-500/20 text-danger-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="input-label">Merchant Name</label>
              <input type="text" value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="e.g. Swiggy, Netflix, Uber" className="input-field" required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="input-label">Amount (₹)</label>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="input-field" min="1" step="any" required />
              </div>
              <div>
                <label className="input-label">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-field">
                  {simulateCategories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="input-label">Description (Optional)</label>
              <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. dinner with friends" className="input-field" />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowSimulate(false)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={isSimulateLoading} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {isSimulateLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Simulate</>}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
