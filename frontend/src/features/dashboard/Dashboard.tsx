import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency } from '../../utils/helpers';
import {
  Zap,
  Send,
  Download,
  Scan,
  Receipt,
  LayoutGrid,
  ArrowRight,
  Eye,
  EyeOff,
  MoreVertical,
  Plus,
  Gift,
  ReceiptText
} from 'lucide-react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { walletApi, transactionApi, rewardsApi, analyticsApi } from '../../api/endpoints';
import type { Transaction, Analytics } from '../../types';
import type { AppLayoutContextType } from '../../components/layout/AppLayout';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Connect to layout context for interactive modals
  const layoutCtx = useOutletContext<AppLayoutContextType | null>();

  useEffect(() => {
    if (user?.role === 'PARENT') {
      navigate('/parent/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const [wallet, setWallet] = useState<{ balance: number; currency: string } | null>(null);
  const [recentTxns, setRecentTxns] = useState<Transaction[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [rewards, setRewards] = useState<{ points: number; streakDays: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showBalance, setShowBalance] = useState(true);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [walletRes, txnRes, rewardsRes, analyticsRes] = await Promise.all([
        walletApi.getWallet().catch(() => ({ data: { data: { balance: 0, currency: 'INR' } } })),
        transactionApi.getTransactions({ size: 10 }).catch(() => ({ data: { data: { content: [] } } })),
        rewardsApi.getStatus().catch(() => ({ data: { data: { points: 0, streakDays: 0 } } })),
        analyticsApi.getAnalytics(30).catch(() => ({ data: { data: { totalCredit: 0, totalDebit: 0, netSavings: 0 } } })),
      ]);
      setWallet(walletRes.data.data);
      const allTxns = txnRes.data.data.content || txnRes.data.data || [];
      setRecentTxns(allTxns.slice(0, 5));
      setRewards(rewardsRes.data.data);
      setAnalytics(analyticsRes.data.data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [layoutCtx?.refreshTrigger]);

  const firstName = user?.fullName
    ? user.fullName.split(' ')[0]
    : user?.email
    ? user.email.split('@')[0]
    : '';
  const walletBalance = wallet?.balance ?? layoutCtx?.walletBalance ?? 0;

  // Real calculated growth rate based on net savings vs total debit
  const growthRate = useMemo(() => {
    const savings = Number(analytics?.netSavings) || 0;
    const debit = Number(analytics?.totalDebit) || 0;
    if (debit > 0 && savings > 0) {
      return ((savings / debit) * 10).toFixed(1);
    }
    return null;
  }, [analytics]);

  const handleOpenSend = (recipient?: string) => {
    if (layoutCtx) layoutCtx.openSend(recipient);
  };

  const handleOpenReceive = () => {
    if (layoutCtx) layoutCtx.openReceive();
  };

  const handleOpenScan = () => {
    if (layoutCtx) layoutCtx.openScan();
  };

  const handleOpenAdd = () => {
    if (layoutCtx) layoutCtx.openAdd();
  };

  // Helper to format transaction date
  const formatTxnDate = (isoString?: string) => {
    if (!isoString) return 'Recent';
    const d = new Date(isoString);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `Today, ${timeStr}`;
    return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* ── MOBILE HERO GREETING (Phone 1) ── */}
      <div className="lg:hidden flex items-center justify-between pt-1">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {firstName ? `Hi, ${firstName} 👋` : 'Welcome back 👋'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-surface-400">
            Make everyday payments simple.
          </p>
        </div>
      </div>

      {/* ── DESKTOP HERO BANNER CARD (Mockup Top Banner) ── */}
      <div className="hidden lg:block relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-purple-50/60 dark:from-surface-900 dark:via-surface-900/90 dark:to-surface-800 border border-slate-200/70 dark:border-surface-800 p-8 shadow-sm">
        <div className="relative z-10 flex items-center justify-between">
          <div className="space-y-2 max-w-xl">
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
              Payments for <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 via-indigo-600 to-purple-600">
                a Brighter Tomorrow
              </span>
            </h2>
            <p className="text-sm text-slate-600 dark:text-surface-300 font-medium flex items-center gap-1.5 pt-1">
              <span>Simple. Secure. Built for You.</span>
              <span>💙</span>
            </p>
            
            {/* Playful Handwritten Note */}
            <div className="pt-2 inline-flex items-center gap-2 text-xs font-semibold text-primary-700 dark:text-primary-300">
              <span className="text-base">😊</span>
              <span className="italic font-serif">Good Money, Good Days</span>
            </div>
          </div>

          {/* Right Brand Badge & Artwork */}
          <div className="relative flex flex-col items-end text-right">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 dark:bg-surface-800/80 backdrop-blur-md border border-slate-200/60 dark:border-surface-700 shadow-xs mb-2">
              <Zap className="w-3.5 h-3.5 text-primary-500 fill-current" />
              <span className="text-xs font-bold text-slate-800 dark:text-white">Fast · Secure · Trusted</span>
            </div>
            
            {/* Subtle stylized mountains silhouette */}
            <div className="w-64 h-24 opacity-60 dark:opacity-30 pointer-events-none flex items-end justify-end">
              <svg viewBox="0 0 300 100" className="w-full h-full text-primary-300 dark:text-primary-800 fill-current">
                <path d="M0,100 L60,40 L120,80 L180,20 L240,60 L300,100 Z" opacity="0.4" />
                <path d="M40,100 L110,30 L170,70 L230,10 L290,50 L300,100 Z" opacity="0.7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* ── ROW 1: BALANCE & QUICK ACTIONS (Mockup First Row) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Total Balance Card (Desktop 5 cols / Mobile full) */}
        <div className="lg:col-span-5 bg-white dark:bg-surface-900 rounded-3xl p-6 border border-slate-100 dark:border-surface-800 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold text-slate-500 dark:text-surface-400">Total Balance</p>
              <button
                onClick={() => setShowBalance(!showBalance)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-surface-200 transition-colors"
                title={showBalance ? 'Hide balance' : 'Show balance'}
              >
                {showBalance ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>
            </div>
            <button className="text-slate-400 hover:text-slate-600 p-1">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>

          <div>
            <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {showBalance ? formatCurrency(walletBalance) : '••••••••'}
            </h3>
            {growthRate ? (
              <div className="flex items-center gap-1.5 mt-1">
                <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  ↗ +{growthRate}%
                </span>
                <span className="text-[11px] text-slate-400">this month</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[11px] text-slate-400">Available balance</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleOpenAdd}
              className="flex-1 py-3 px-4 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold shadow-md shadow-primary-500/20 transition-all active:scale-98 flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Money</span>
            </button>
            <button
              onClick={() => handleOpenSend()}
              className="flex-1 py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-surface-800 dark:hover:bg-surface-700 text-slate-700 dark:text-surface-200 text-xs font-bold transition-all active:scale-98 flex items-center justify-center gap-1.5"
            >
              <span>Withdraw</span>
            </button>
          </div>
        </div>

        {/* Quick Actions Grid (Desktop 7 cols / Mobile full) */}
        <div className="lg:col-span-7 bg-white dark:bg-surface-900 rounded-3xl p-6 border border-slate-100 dark:border-surface-800 shadow-sm flex flex-col justify-between">
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-6 gap-4 items-center justify-items-center my-auto py-1">
            {/* 1. Send */}
            <button
              onClick={() => handleOpenSend()}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary-600 dark:bg-primary-950/30 flex items-center justify-center group-hover:scale-105 group-hover:shadow-md transition-all">
                <Send className="w-5 h-5 -rotate-12" />
              </div>
              <span className="text-[11px] font-semibold text-slate-700 dark:text-surface-300">Send</span>
            </button>

            {/* 2. Receive */}
            <button
              onClick={handleOpenReceive}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 flex items-center justify-center group-hover:scale-105 group-hover:shadow-md transition-all">
                <Download className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-semibold text-slate-700 dark:text-surface-300">Receive</span>
            </button>

            {/* 3. Scan & Pay */}
            <button
              onClick={handleOpenScan}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-950/30 flex items-center justify-center group-hover:scale-105 group-hover:shadow-md transition-all">
                <Scan className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-semibold text-slate-700 dark:text-surface-300 whitespace-nowrap">Scan & Pay</span>
            </button>

            {/* 4. Recharge */}
            <button
              onClick={() => handleOpenSend('Mobile Recharge')}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/30 flex items-center justify-center group-hover:scale-105 group-hover:shadow-md transition-all">
                <Zap className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-semibold text-slate-700 dark:text-surface-300">Recharge</span>
            </button>

            {/* 5. Pay Bills */}
            <button
              onClick={() => handleOpenSend('Utility Bill')}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/30 flex items-center justify-center group-hover:scale-105 group-hover:shadow-md transition-all">
                <Receipt className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-semibold text-slate-700 dark:text-surface-300 whitespace-nowrap">Pay Bills</span>
            </button>

            {/* 6. More */}
            <button
              onClick={() => navigate('/transactions')}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 dark:bg-surface-800 flex items-center justify-center group-hover:scale-105 group-hover:shadow-md transition-all">
                <LayoutGrid className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-semibold text-slate-700 dark:text-surface-300">More</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── ROW 2: RECENT TRANSACTIONS & SCAN. PAY. GO. (Mockup Second Row) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Recent Transactions List (Desktop 7 cols / Mobile full) */}
        <div className="lg:col-span-7 bg-white dark:bg-surface-900 rounded-3xl p-6 border border-slate-100 dark:border-surface-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-bold text-slate-900 dark:text-white">Recent Transactions</h4>
            <Link
              to="/transactions"
              className="text-xs font-semibold text-primary-500 hover:text-primary-600 flex items-center gap-1 transition-colors"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* SKELETON LOADER STATE */}
          {isLoading ? (
            <div className="space-y-3 pt-1">
              {[1, 2, 3].map((n) => (
                <div key={n} className="flex items-center justify-between p-2 rounded-2xl animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-surface-800" />
                    <div className="space-y-1.5">
                      <div className="w-28 h-3.5 bg-slate-100 dark:bg-surface-800 rounded" />
                      <div className="w-20 h-2.5 bg-slate-100 dark:bg-surface-800 rounded" />
                    </div>
                  </div>
                  <div className="w-16 h-4 bg-slate-100 dark:bg-surface-800 rounded" />
                </div>
              ))}
            </div>
          ) : recentTxns.length > 0 ? (
            /* REAL DATA LIST (ZERO DEMO DATA) */
            <div className="divide-y divide-slate-100 dark:divide-surface-800">
              {recentTxns.map((txn) => {
                const isCredit = txn.type === 'CREDIT';
                const name = txn.merchant || txn.description || 'Transaction';
                const initial = name.charAt(0).toUpperCase();
                return (
                  <div
                    key={txn.id}
                    className="py-3 flex items-center justify-between first:pt-0 last:pb-0 hover:bg-slate-50/50 dark:hover:bg-surface-800/40 px-2 rounded-2xl transition-colors"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs ${
                        isCredit
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                      }`}>
                        {initial}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-white">
                          {name}
                        </p>
                        <p className="text-[11px] text-slate-400 capitalize">
                          {txn.category ? txn.category.toLowerCase().replace('_', ' ') : 'Payment'} • {formatTxnDate(txn.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className={`text-xs font-bold ${
                        isCredit
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-900 dark:text-white'
                      }`}>
                        {isCredit ? `+ ${formatCurrency(txn.amount)}` : `- ${formatCurrency(txn.amount)}`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* EMPTY STATE (ZERO FAKE DATA) */
            <div className="py-8 text-center px-4 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-surface-800 text-slate-400 mx-auto flex items-center justify-center">
                <ReceiptText className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-800 dark:text-white">No transactions yet</p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Your payment activity will appear here once you make your first transfer or top-up.
                </p>
              </div>
              <button
                onClick={() => handleOpenSend()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-950/40 text-xs font-bold hover:bg-primary-100 transition-colors"
              >
                <span>Make a Payment</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Scan. Pay. Go. Card & Invite & Earn (Desktop 5 cols / Mobile full) */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Scan. Pay. Go. Card */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-50/80 via-indigo-50/40 to-slate-50 dark:from-surface-900 dark:to-surface-800 border border-slate-200/70 dark:border-surface-800 p-6 shadow-sm flex items-center justify-between">
            <div className="space-y-2.5 max-w-[200px]">
              <h4 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                Scan. Pay. Go.
              </h4>
              <p className="text-xs text-slate-500 dark:text-surface-400 leading-snug">
                Instant payments, everywhere.
              </p>
              <button
                onClick={handleOpenScan}
                className="py-2 px-4 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs shadow-md shadow-primary-500/20 transition-all inline-flex items-center gap-1.5"
              >
                <Scan className="w-3.5 h-3.5" />
                <span>Scan QR</span>
              </button>
            </div>

            {/* QR Card Graphic */}
            <div className="w-24 h-24 rounded-2xl bg-white dark:bg-surface-800 p-2 shadow-md flex items-center justify-center border border-slate-100 dark:border-surface-700">
              <Scan className="w-14 h-14 text-primary-500 stroke-[1.5]" />
            </div>
          </div>

          {/* Invite & Earn Banner (Mockup) */}
          <Link
            to="/rewards"
            className="flex items-center justify-between p-4 rounded-3xl bg-white dark:bg-surface-900 border border-slate-100 dark:border-surface-800 shadow-sm hover:border-primary-200 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-pink-50 text-pink-500 flex items-center justify-center shadow-xs">
                <Gift className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-primary-600 transition-colors">
                  Invite & Earn
                </p>
                <p className="text-[11px] text-slate-400">
                  {rewards && rewards.points > 0
                    ? `You have ${rewards.points} reward points • Invite friends to earn more!`
                    : 'Invite friends to earn ₹100 reward points!'}
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-primary-500 group-hover:translate-x-0.5 transition-all" />
          </Link>

        </div>
      </div>

    </div>
  );
}
