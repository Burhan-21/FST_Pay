import { useState, useEffect } from 'react';
import { useSearchParams, useOutletContext } from 'react-router-dom';
import axios from 'axios';
import { formatCurrency, getCategoryEmoji, formatRelativeTime, parseMoneyInput } from '../../utils/helpers';
import {
  Search, ArrowUpRight, ArrowDownRight, Plus, AlertCircle, Download, Inbox, Clock, X, Globe,
  Smartphone, Zap, Wifi, Tv, Flame, Receipt, CheckCircle2, XCircle, Copy, Check, RotateCcw
} from 'lucide-react';
import { transactionApi, fxApi } from '../../api/endpoints';
import type { Transaction, FxQuote } from '../../types';
import { PageTransition, EmptyState, Modal, Button, SettlementBadge } from '../../components/ui';
import { TransactionSkeleton } from '../../components/skeletons/PageSkeletons';
import type { AppLayoutContextType } from '../../components/layout/AppLayout';

const categories = ['ALL', 'FOOD', 'TRANSPORT', 'SHOPPING', 'ENTERTAINMENT', 'EDUCATION', 'HEALTH', 'BILLS', 'OTHER'];
const simulateCategories = ['FOOD', 'TRANSPORT', 'SHOPPING', 'ENTERTAINMENT', 'EDUCATION', 'HEALTH', 'BILLS', 'OTHER'];
const supportedCurrencies = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'CAD', 'SGD'];

export default function TransactionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const layoutCtx = useOutletContext<AppLayoutContextType | null>();

  const [txns, setTxns] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSimulateLoading, setIsSimulateLoading] = useState(false);
  const [showSimulate, setShowSimulate] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [approvalNotice, setApprovalNotice] = useState<string | null>(null);

  // Filters - synced with URL query param ?category=...
  const categoryParam = searchParams.get('category');
  const [filter, setFilter] = useState(() => (categoryParam && categories.includes(categoryParam) ? categoryParam : 'ALL'));
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'CREDIT' | 'DEBIT'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUCCESSFUL' | 'PENDING' | 'FAILED' | 'CANCELLED'>('ALL');

  // Selected Transaction for Details Modal
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [copiedTxnId, setCopiedTxnId] = useState(false);

  useEffect(() => {
    const param = searchParams.get('category');
    if (param && categories.includes(param)) {
      setFilter(param);
    } else if (!param && filter !== 'ALL') {
      // keep current or default
    }
  }, [searchParams]);

  const handleFilterChange = (cat: string) => {
    setFilter(cat);
    if (cat === 'ALL') {
      searchParams.delete('category');
      setSearchParams(searchParams, { replace: true });
    } else {
      setSearchParams({ category: cat }, { replace: true });
    }
  };

  // Simulation Form States
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [category, setCategory] = useState('FOOD');
  const [merchant, setMerchant] = useState('');
  const [description, setDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // FX Quote State
  const [fxQuote, setFxQuote] = useState<FxQuote | null>(null);
  const [isQuoteLoading, setIsQuoteLoading] = useState(false);

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      setIsExporting(true);
      const response = await transactionApi.exportTransactions(format);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transactions_${new Date().toISOString().split('T')[0]}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const fetchTransactions = async () => {
    try {
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
    let isMounted = true;
    const loadTxns = async () => {
      try {
        const res = await transactionApi.getTransactions({
          category: filter === 'ALL' ? undefined : filter,
          type: typeFilter === 'ALL' ? undefined : typeFilter,
          size: 50,
        });
        if (isMounted) {
          setTxns(res.data.data.content || res.data.data || []);
        }
      } catch (err) {
        console.error('Error fetching transactions:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    loadTxns();
    return () => { isMounted = false; };
  }, [filter, typeFilter]);

  useEffect(() => {
    const handleSettlementUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ transactionId: string; status: string }>;
      const { transactionId, status } = customEvent.detail || {};
      if (transactionId && status) {
        setTxns(prev => prev.map(t => (t.id === transactionId ? { ...t, status } : t)));
      }
      fetchTransactions();
    };

    const handleWalletUpdate = () => {
      fetchTransactions();
    };

    const handleApprovalDecision = () => {
      fetchTransactions();
    };

    window.addEventListener('fst:settlement_update', handleSettlementUpdate);
    window.addEventListener('fst:wallet_update', handleWalletUpdate);
    window.addEventListener('fst:transaction_created', handleWalletUpdate);
    window.addEventListener('fst:approval_decision', handleApprovalDecision);
    return () => {
      window.removeEventListener('fst:settlement_update', handleSettlementUpdate);
      window.removeEventListener('fst:wallet_update', handleWalletUpdate);
      window.removeEventListener('fst:transaction_created', handleWalletUpdate);
      window.removeEventListener('fst:approval_decision', handleApprovalDecision);
    };
  }, []);

  // Fetch live FX quote when foreign currency and amount are entered
  useEffect(() => {
    if (currency === 'INR') {
      setFxQuote(null);
      return;
    }
    const parsed = parseMoneyInput(amount, 0.01);
    if (!parsed || parsed <= 0) {
      setFxQuote(null);
      return;
    }

    let isCancelled = false;
    setIsQuoteLoading(true);

    const timer = setTimeout(async () => {
      try {
        const res = await fxApi.getQuote(parsed, currency, 'INR');
        if (!isCancelled && res.data?.data) {
          setFxQuote(res.data.data);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('FX quote error:', err);
          setFxQuote(null);
        }
      } finally {
        if (!isCancelled) {
          setIsQuoteLoading(false);
        }
      }
    }, 300);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [amount, currency]);

  const handleCloseSimulate = () => {
    setShowSimulate(false);
    setAmount('');
    setCurrency('INR');
    setMerchant('');
    setDescription('');
    setErrorMsg('');
    setFxQuote(null);
  };

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseMoneyInput(amount, 0.01);
    if (parsedAmount === null || parsedAmount <= 0) {
      setErrorMsg('Please enter a valid amount');
      return;
    }
    if (!merchant.trim()) {
      setErrorMsg('Please enter a merchant name');
      return;
    }

    try {
      setIsSimulateLoading(true);
      setErrorMsg('');
      const res = await transactionApi.simulateSpend({
        amount: parsedAmount,
        category,
        merchant,
        description: description || undefined,
        currency: currency !== 'INR' ? currency : undefined,
      });

      // Handle HTTP 202 Accepted (Pending Parent Approval)
      if (res.status === 202 || res.data?.data?.status === 'PENDING_APPROVAL') {
        setApprovalNotice(
          res.data?.message ||
          `Approval Request Submitted: Your spend of ${currency} ${parsedAmount.toLocaleString()} at ${merchant} exceeded spending limits and was sent to your parent for approval.`
        );
      } else {
        setApprovalNotice(null);
      }

      await fetchTransactions();
      handleCloseSimulate();
    } catch (err: unknown) {
      console.error('Simulation failed:', err);
      if (axios.isAxiosError<{ message?: string }>(err)) {
        setErrorMsg(err.response?.data?.message || 'Simulation failed. Check if wallet balance is sufficient.');
      } else {
        setErrorMsg('Simulation failed. Check if wallet balance is sufficient.');
      }
    } finally {
      setIsSimulateLoading(false);
    }
  };

  const handleDownloadTxnReceipt = (txn: Transaction) => {
    const lines = [
      '========================================',
      '        FST PAY TRANSACTION RECEIPT     ',
      '========================================',
      `Transaction ID : ${txn.id}`,
      `Date & Time    : ${new Date(txn.createdAt).toLocaleString()}`,
      `Merchant       : ${txn.merchant}`,
      `Category       : ${txn.category}`,
      `Type           : ${txn.type}`,
      `Amount         : INR ${Number(txn.amount || 0).toFixed(2)}`,
      txn.originalCurrency && txn.originalCurrency !== 'INR' ? `Foreign Amount : ${txn.originalAmount?.toFixed(2)} ${txn.originalCurrency} (FX Rate: ₹${txn.fxRate?.toFixed(2)})` : '',
      `Status         : ${txn.status}`,
      `Closing Balance: INR ${Number(txn.balanceAfter || 0).toFixed(2)}`,
      `Description    : ${txn.description || 'Payment via FST Pay'}`,
      '========================================',
      '        Fast · Secure · Trusted         ',
      '========================================'
    ].filter(Boolean).join('\n');

    const blob = new Blob([lines], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `FSTPay_Receipt_${txn.id.slice(0, 8)}.txt`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleRetryTxn = (txn: Transaction) => {
    setSelectedTxn(null);
    setMerchant(txn.merchant || '');
    setAmount(txn.amount.toString());
    setCategory(txn.category || 'FOOD');
    setDescription(`Retry: ${txn.description || txn.merchant}`);
    setShowSimulate(true);
  };

  const filtered = txns.filter((t) => {
    // Status filter
    if (statusFilter === 'SUCCESSFUL') {
      const s = (t.status || '').toUpperCase();
      if (s !== 'SUCCESSFUL' && s !== 'SETTLED' && s !== 'COMPLETED' && s !== 'SUCCESS') return false;
    } else if (statusFilter === 'PENDING') {
      const s = (t.status || '').toUpperCase();
      if (s !== 'PENDING' && s !== 'PROCESSING') return false;
    } else if (statusFilter === 'FAILED') {
      const s = (t.status || '').toUpperCase();
      if (s !== 'FAILED' && s !== 'DECLINED' && s !== 'REJECTED') return false;
    } else if (statusFilter === 'CANCELLED') {
      const s = (t.status || '').toUpperCase();
      if (s !== 'CANCELLED' && s !== 'CANCELED') return false;
    }

    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (t.merchant ?? '').toLowerCase().includes(term) ||
      (t.description ?? '').toLowerCase().includes(term) ||
      (t.category ?? '').toLowerCase().includes(term)
    );
  });

  return (
    <PageTransition className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white">Transactions</h1>
          <p className="text-slate-500 dark:text-surface-400 mt-1">Track all your spending and income</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleExport('csv')}
            disabled={isExporting}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Export CSV
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleExport('pdf')}
            disabled={isExporting}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Export PDF
          </Button>
          <Button variant="primary" size="sm" onClick={() => setShowSimulate(true)} leftIcon={<Plus className="w-4 h-4" />}>
            Simulate Spend
          </Button>
        </div>
      </div>

      {/* Pending Parent Approval Banner */}
      {approvalNotice && (
        <div className="flex items-start justify-between gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 animate-fade-in shadow-lg">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Pending Parent Authorization</p>
              <p className="text-xs text-amber-200/90 mt-0.5">{approvalNotice}</p>
            </div>
          </div>
          <button
            onClick={() => setApprovalNotice(null)}
            className="text-amber-400/80 hover:text-amber-200 transition-colors p-1 rounded-lg hover:bg-white/5"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="glass-card p-4 space-y-4 page-section">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-surface-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search transactions..."
              className="w-full pl-10 pr-4 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-surface-400 bg-slate-50 dark:bg-surface-800/80 rounded-xl border border-slate-200 dark:border-surface-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 caret-primary-600"
            />
          </div>
          <div className="flex gap-2">
            {(['ALL', 'CREDIT', 'DEBIT'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  typeFilter === t
                    ? 'bg-primary-500 text-white font-bold shadow-sm shadow-primary-500/20'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-surface-800/60 dark:hover:bg-surface-700 text-slate-600 dark:text-surface-400 dark:hover:text-white border border-slate-200 dark:border-surface-700/50'
                }`}
              >
                {t === 'ALL' ? 'All' : t === 'CREDIT' ? '↓ Income' : '↑ Expense'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => handleFilterChange(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                filter === cat
                  ? 'bg-primary-500 text-white font-bold shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-surface-800/60 dark:hover:bg-surface-700 text-slate-600 dark:text-surface-400 dark:hover:text-white border border-slate-200 dark:border-surface-700/50'
              }`}
            >
              {cat !== 'ALL' && getCategoryEmoji(cat)} {cat}
            </button>
          ))}
        </div>

        {/* Status Filter Row */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-100 dark:border-surface-800/80">
          <span className="text-xs font-bold text-slate-500 dark:text-surface-400 whitespace-nowrap mr-1">Status:</span>
          {(['ALL', 'SUCCESSFUL', 'PENDING', 'FAILED', 'CANCELLED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === st
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-surface-800/60 dark:hover:bg-surface-700 text-slate-600 dark:text-surface-400'
              }`}
            >
              {st === 'ALL' ? 'All' : st === 'SUCCESSFUL' ? '✓ Successful' : st === 'PENDING' ? '⏳ Pending' : st === 'FAILED' ? '✗ Failed' : '⊘ Cancelled'}
            </button>
          ))}
        </div>
      </div>

      {/* Dedicated Bills & Recharge Hub when category is BILLS */}
      {filter === 'BILLS' && (
        <div className="rounded-3xl p-6 bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-purple-500/10 border border-amber-200/60 dark:border-amber-900/40 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-rose-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Bills & Recharge Hub
                </h3>
                <p className="text-xs text-slate-500 dark:text-surface-400">
                  Instant mobile recharge, electricity, broadband, DTH, and utility settlements.
                </p>
              </div>
            </div>
            <div className="text-xs font-semibold text-slate-600 dark:text-surface-300 bg-white/80 dark:bg-surface-800/80 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-surface-700/60 self-start sm:self-auto">
              Available Wallet: <strong className="text-slate-900 dark:text-white">{formatCurrency(layoutCtx?.walletBalance ?? 0)}</strong>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
            {[
              { id: 'MOBILE' as const, label: 'Mobile Recharge', icon: Smartphone, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40' },
              { id: 'ELECTRICITY' as const, label: 'Electricity Bill', icon: Zap, color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/40' },
              { id: 'BROADBAND' as const, label: 'Broadband / Wi-Fi', icon: Wifi, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40' },
              { id: 'DTH' as const, label: 'DTH / Cable TV', icon: Tv, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40' },
              { id: 'WATER_GAS' as const, label: 'Piped Gas & Water', icon: Flame, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40' },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => layoutCtx?.openBillsRecharge(action.id)}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-surface-800 border border-slate-200/80 dark:border-surface-700/60 shadow-xs hover:scale-102 hover:shadow-md transition-all group text-center"
                >
                  <div className={`w-10 h-10 rounded-xl ${action.color} flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-800 dark:text-white leading-tight">
                    {action.label}
                  </span>
                  <span className="text-[9px] text-slate-400 mt-0.5">Pay Now</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="glass-card divide-y divide-surface-700/30 page-section">
        {isLoading && filtered.length === 0 ? (
          <TransactionSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No transactions found"
            description="No transactions match your current search or filter criteria."
            action={filter !== 'ALL' || typeFilter !== 'ALL' || statusFilter !== 'ALL' || searchTerm ? {
              label: 'Clear Filters',
              onClick: () => {
                setFilter('ALL');
                setTypeFilter('ALL');
                setStatusFilter('ALL');
                setSearchTerm('');
              }
            } : undefined}
          />
        ) : (
          filtered.map((txn) => (
            <div
              key={txn.id}
              onClick={() => setSelectedTxn(txn)}
              className="flex items-center gap-4 p-4 hover:bg-slate-50/80 dark:hover:bg-surface-800/40 cursor-pointer transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-surface-700/50 flex items-center justify-center text-lg">
                {getCategoryEmoji(txn.category)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{txn.merchant}</p>
                  <SettlementBadge status={txn.status} />
                  {txn.originalCurrency && txn.originalCurrency !== 'INR' && (
                    <span
                      data-testid="foreign-currency-badge"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-primary-500/15 text-primary-600 dark:text-primary-300 border border-primary-500/30"
                    >
                      <Globe className="w-3 h-3 text-primary-500 dark:text-primary-400" />
                      {txn.originalAmount !== undefined ? txn.originalAmount.toFixed(2) : ''} {txn.originalCurrency}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-surface-400">
                  {txn.description || 'Simulated transaction'} • {formatRelativeTime(txn.createdAt)}
                  {txn.fxRate && txn.originalCurrency && txn.originalCurrency !== 'INR' && (
                    <span className="text-slate-400 dark:text-surface-500"> • 1 {txn.originalCurrency} = ₹{txn.fxRate.toFixed(2)}{txn.fxFee ? ` (Fee: ₹${txn.fxFee.toFixed(2)})` : ''}</span>
                  )}
                </p>
              </div>
              <div className="text-right flex items-center gap-3">
                <div>
                  <p className={`text-sm font-bold ${txn.type === 'CREDIT' ? 'text-accent-600 dark:text-accent-400' : 'text-slate-900 dark:text-white'}`}>
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
      <Modal isOpen={showSimulate} onClose={handleCloseSimulate} title="Simulate Spend">
        <form onSubmit={handleSimulate} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-danger-500/10 border border-danger-500/20 text-danger-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="input-label">Merchant Name</label>
            <input type="text" value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="e.g. Swiggy, Netflix, Uber, Steam" className="input-field" required />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="input-label">Currency</label>
              <select
                aria-label="Currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="select-field"
              >
                {supportedCurrencies.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="input-label">Amount ({currency})</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="input-field"
                min="0.01"
                step="any"
                required
              />
            </div>
            <div>
              <label className="input-label">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="select-field">
                {simulateCategories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Live FX Quote Breakdown */}
          {currency !== 'INR' && (
            <div className="p-3.5 rounded-xl bg-primary-500/10 border border-primary-500/25 text-xs space-y-2 animate-fade-in" data-testid="fx-quote-box">
              <div className="flex items-center justify-between text-primary-300 font-semibold">
                <span className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-primary-400" />
                  Live Exchange Rate
                </span>
                {isQuoteLoading ? (
                  <span className="text-surface-400 animate-pulse">Calculating rate...</span>
                ) : fxQuote ? (
                  <span>1 {fxQuote.sourceCurrency} = ₹{fxQuote.exchangeRate.toFixed(2)}</span>
                ) : (
                  <span className="text-surface-400">Enter amount</span>
                )}
              </div>

              {fxQuote && !isQuoteLoading && (
                <div className="space-y-1.5 pt-1 border-t border-primary-500/15">
                  <div className="flex justify-between text-surface-400">
                    <span>Base Conversion:</span>
                    <span className="text-surface-200 font-medium">₹{fxQuote.convertedAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-surface-400">
                    <span>Platform FX Fee ({fxQuote.feePercentage}%):</span>
                    <span className="text-surface-200 font-medium">₹{fxQuote.feeAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-white font-semibold pt-1 border-t border-primary-500/20">
                    <span>Total Wallet Deduction:</span>
                    <span className="text-accent-400 font-bold">₹{fxQuote.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="input-label">Description (Optional)</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Steam game purchase" className="input-field" />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={handleCloseSimulate} fullWidth>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSimulateLoading} fullWidth>
              Simulate
            </Button>
          </div>
        </form>
      </Modal>

      {/* Transaction Details Modal */}
      <Modal
        isOpen={!!selectedTxn}
        onClose={() => {
          setSelectedTxn(null);
          setCopiedTxnId(false);
        }}
        title="Transaction Details"
      >
        {selectedTxn && (
          <div className="space-y-4 text-xs">
            {/* Amount Banner */}
            <div className={`p-4 rounded-2xl text-center space-y-1 ${
              selectedTxn.type === 'CREDIT'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40'
                : 'bg-slate-50 dark:bg-surface-800/60 border border-slate-200 dark:border-surface-700/60'
            }`}>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-surface-400 uppercase tracking-wider">
                {selectedTxn.type === 'CREDIT' ? 'Money Received' : 'Money Sent'}
              </span>
              <h3 className={`text-2xl font-black font-mono tracking-tight ${
                selectedTxn.type === 'CREDIT' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
              }`}>
                {selectedTxn.type === 'CREDIT' ? '+' : '-'}{formatCurrency(selectedTxn.amount)}
              </h3>
              <div className="pt-1 flex justify-center">
                <SettlementBadge status={selectedTxn.status} size="md" />
              </div>
            </div>

            {/* Details Key-Value List */}
            <div className="space-y-2.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-surface-800/40 border border-slate-100 dark:border-surface-800">
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-surface-700/40">
                <span className="text-slate-500 dark:text-surface-400">Merchant / Beneficiary</span>
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>{getCategoryEmoji(selectedTxn.category)}</span>
                  <span>{selectedTxn.merchant}</span>
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-surface-700/40">
                <span className="text-slate-500 dark:text-surface-400">Category</span>
                <span className="font-semibold text-slate-800 dark:text-surface-200 uppercase tracking-wider text-[10px]">
                  {selectedTxn.category || 'GENERAL'}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-surface-700/40">
                <span className="text-slate-500 dark:text-surface-400">Date & Time</span>
                <span className="font-medium text-slate-800 dark:text-surface-200">
                  {new Date(selectedTxn.createdAt).toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-surface-700/40">
                <span className="text-slate-500 dark:text-surface-400">Wallet Balance After</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">
                  {formatCurrency(selectedTxn.balanceAfter)}
                </span>
              </div>

              {selectedTxn.originalCurrency && selectedTxn.originalCurrency !== 'INR' && (
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-surface-700/40">
                  <span className="text-slate-500 dark:text-surface-400">Foreign Currency Amount</span>
                  <span className="font-bold text-primary-600 dark:text-primary-400 font-mono">
                    {selectedTxn.originalAmount?.toFixed(2)} {selectedTxn.originalCurrency} (FX: ₹{selectedTxn.fxRate?.toFixed(2)})
                  </span>
                </div>
              )}

              {selectedTxn.description && (
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-surface-700/40">
                  <span className="text-slate-500 dark:text-surface-400">Description / Note</span>
                  <span className="font-medium text-slate-700 dark:text-surface-300 max-w-[200px] truncate text-right">
                    {selectedTxn.description}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 dark:text-surface-400">Transaction ID</span>
                <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-600 dark:text-surface-300">
                  <span>{selectedTxn.id.slice(0, 16)}...</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedTxn.id);
                      setCopiedTxnId(true);
                      setTimeout(() => setCopiedTxnId(false), 2000);
                    }}
                    className="p-1 rounded hover:bg-slate-200 dark:hover:bg-surface-700 transition-colors text-slate-400 hover:text-slate-600"
                    title="Copy Transaction ID"
                  >
                    {copiedTxnId ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Status Information Box */}
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-surface-800/80 text-[11px] text-slate-600 dark:text-surface-300 leading-relaxed">
              {(selectedTxn.status === 'SUCCESSFUL' || selectedTxn.status === 'SETTLED' || selectedTxn.status === 'COMPLETED' || selectedTxn.status === 'SUCCESS') && (
                <p className="flex items-start gap-1.5 text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>This transaction has settled completely. Your funds and balances have updated synchronously.</span>
                </p>
              )}
              {(selectedTxn.status === 'PENDING' || selectedTxn.status === 'PROCESSING') && (
                <p className="flex items-start gap-1.5 text-amber-700 dark:text-amber-300">
                  <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span>This transaction is currently pending clearing or parental authorization. Balances will settle upon confirmation.</span>
                </p>
              )}
              {(selectedTxn.status === 'FAILED' || selectedTxn.status === 'DECLINED' || selectedTxn.status === 'REJECTED') && (
                <p className="flex items-start gap-1.5 text-rose-700 dark:text-rose-300">
                  <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>This transaction failed due to insufficient wallet funds or a network timeout. No funds were permanently debited.</span>
                </p>
              )}
              {(selectedTxn.status === 'CANCELLED' || selectedTxn.status === 'CANCELED') && (
                <p className="flex items-start gap-1.5 text-slate-600 dark:text-surface-400">
                  <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span>This transaction was voided or cancelled before settlement.</span>
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2.5 pt-2">
              {(selectedTxn.status === 'FAILED' || selectedTxn.status === 'DECLINED' || selectedTxn.status === 'REJECTED') && (
                <Button
                  onClick={() => handleRetryTxn(selectedTxn)}
                  variant="primary"
                  className="flex-1 text-xs gap-1.5"
                  leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                >
                  Retry Payment
                </Button>
              )}

              <Button
                onClick={() => handleDownloadTxnReceipt(selectedTxn)}
                variant="secondary"
                className="flex-1 text-xs gap-1.5"
                leftIcon={<Download className="w-3.5 h-3.5" />}
              >
                Download Slip
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </PageTransition>
  );
}
