import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
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
  Plus,
  Gift,
  ReceiptText,
  Mail,
  Phone,
  ShieldCheck,
  CheckCircle2,
  Settings,
  Wallet,
  Bot,
  Sparkles,
  AlertCircle,
  Loader2,
  Target
} from 'lucide-react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { walletApi, transactionApi, rewardsApi, analyticsApi, aiApi, goalsApi } from '../../api/endpoints';
import type { Transaction, Analytics, HealthScoreData } from '../../types';
import type { AppLayoutContextType } from '../../components/layout/AppLayout';
import Modal from '../../components/ui/Modal';

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
  const [goals, setGoals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showBalance, setShowBalance] = useState(true);

  // AI Money Coach states
  const [healthScore, setHealthScore] = useState<HealthScoreData | null>(null);
  const [aiTips, setAiTips] = useState<string[]>([]);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [isAskingAi, setIsAskingAi] = useState(false);

  // Withdraw Modal states
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawBankName, setWithdrawBankName] = useState('HDFC Bank');
  const [withdrawAccountNo, setWithdrawAccountNo] = useState('');
  const [withdrawIfsc, setWithdrawIfsc] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');
  const [withdrawSuccess, setWithdrawSuccess] = useState('');

  const fetchData = async () => {
    try {
      setIsLoading(true);
      let safeGoalsApi: any = null;
      try {
        safeGoalsApi = goalsApi;
      } catch {
        safeGoalsApi = null;
      }

      const [walletRes, txnRes, rewardsRes, analyticsRes, healthRes, tipsRes, goalsRes] = await Promise.all([
        Promise.resolve(walletApi?.getWallet ? walletApi.getWallet() : null).catch(() => null),
        Promise.resolve(transactionApi?.getTransactions ? transactionApi.getTransactions({ size: 10 }) : null).catch(() => null),
        Promise.resolve(rewardsApi?.getStatus ? rewardsApi.getStatus() : null).catch(() => null),
        Promise.resolve(analyticsApi?.getAnalytics ? analyticsApi.getAnalytics(30) : null).catch(() => null),
        Promise.resolve(aiApi?.getHealthScore ? aiApi.getHealthScore() : null).catch(() => null),
        Promise.resolve(aiApi?.getTips ? aiApi.getTips() : null).catch(() => null),
        Promise.resolve(safeGoalsApi?.getGoals ? safeGoalsApi.getGoals() : null).catch(() => null),
      ]);
      if (walletRes?.data?.data) {
        setWallet(walletRes.data.data);
      }
      const allTxns = txnRes?.data?.data?.content || txnRes?.data?.data || [];
      setRecentTxns(Array.isArray(allTxns) ? allTxns.slice(0, 5) : []);
      if (rewardsRes?.data?.data) {
        setRewards(rewardsRes.data.data);
      }
      if (analyticsRes?.data?.data) {
        setAnalytics(analyticsRes.data.data);
      }
      if (healthRes?.data?.data) {
        setHealthScore(healthRes.data.data);
      }
      if (tipsRes?.data?.data && Array.isArray(tipsRes.data.data)) {
        setAiTips(tipsRes.data.data);
      }
      if (goalsRes?.data) {
        const goalList = Array.isArray(goalsRes.data.data) ? goalsRes.data.data : Array.isArray(goalsRes.data) ? goalsRes.data : [];
        setGoals(goalList);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAskAiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuestion.trim() || isAskingAi) return;
    const prompt = aiQuestion.trim();
    setIsAskingAi(true);
    setAiAnswer(null);
    try {
      const res = await aiApi.chat(prompt);
      setAiAnswer(res.data?.data?.reply || 'Good question! Keep your savings rate above 20% to stay on track.');
      setAiQuestion('');
    } catch {
      setAiAnswer('I am currently analyzing your transaction logs. Please try asking again in a moment!');
    } finally {
      setIsAskingAi(false);
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(withdrawAmount);
    if (!amt || amt <= 0) {
      setWithdrawError('Please enter a valid withdrawal amount.');
      return;
    }
    if (amt > walletBalance) {
      setWithdrawError(`Withdrawal amount cannot exceed available balance (${formatCurrency(walletBalance)}).`);
      return;
    }

    setIsWithdrawing(true);
    setWithdrawError('');
    setWithdrawSuccess('');
    try {
      await walletApi.withdraw({
        amount: amt,
        bankName: withdrawBankName,
        accountNumber: withdrawAccountNo,
        ifscCode: withdrawIfsc,
      });
      setWithdrawSuccess(`Successfully initiated withdrawal of ${formatCurrency(amt)} to ${withdrawBankName}.`);
      setWithdrawAmount('');
      setWithdrawAccountNo('');
      setWithdrawIfsc('');
      if (layoutCtx) layoutCtx.triggerRefresh();
      fetchData();
      setTimeout(() => {
        setIsWithdrawOpen(false);
        setWithdrawSuccess('');
      }, 2000);
    } catch (err: unknown) {
      if (axios.isAxiosError<{ message?: string }>(err)) {
        setWithdrawError(err.response?.data?.message || 'Withdrawal failed. Please check details and try again.');
      } else {
        setWithdrawError('Withdrawal failed. Please try again.');
      }
    } finally {
      setIsWithdrawing(false);
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

  const handleOpenBillsRecharge = (category: 'MOBILE' | 'ELECTRICITY' = 'MOBILE') => {
    if (layoutCtx?.openBillsRecharge) {
      layoutCtx.openBillsRecharge(category);
    } else if (layoutCtx?.openSend) {
      layoutCtx.openSend(category === 'MOBILE' ? 'Mobile Recharge' : 'Utility Bill');
    }
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

      {/* ── AUTHENTICATED USER PROFILE BAR ── */}
      <div className="bg-white dark:bg-surface-900 rounded-3xl p-5 border border-slate-100 dark:border-surface-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-primary-500 via-primary-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-primary-500/20">
              {user?.fullName
                ? user.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                : user?.email ? user.email.slice(0, 2).toUpperCase() : 'U'}
            </div>
            {user?.isActive !== false && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white dark:border-surface-900 flex items-center justify-center text-white shadow-xs" title="Verified Active Account">
                <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
              </div>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {user?.fullName || user?.email?.split('@')[0] || 'User'}
              </h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-300 border border-primary-200 dark:border-primary-800/50">
                <ShieldCheck className="w-3 h-3 text-primary-500" />
                {user?.role === 'PARENT' ? 'Parent Account' : user?.role === 'ADMIN' ? 'Admin Account' : 'Teen Account'}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                Verified
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-surface-400">
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{user?.email}</span>
              </span>
              {user?.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{user.phone}</span>
                </span>
              )}
              <span className="flex items-center gap-1 font-mono text-[11px] bg-slate-50 dark:bg-surface-800 px-2 py-0.5 rounded-lg border border-slate-200/60 dark:border-surface-700">
                <span className="text-slate-400 font-sans">UPI ID:</span>
                <span className="font-semibold text-slate-700 dark:text-surface-300">{user?.email ? `${user.email.split('@')[0]}@fstpay` : 'user@fstpay'}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-center shrink-0">
          <Link
            to="/settings"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-surface-700 hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400 text-xs font-bold text-slate-700 dark:text-surface-200 bg-white dark:bg-surface-800 shadow-xs transition-all"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Profile & Settings</span>
          </Link>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Dedicated Wallet Overview Card (Desktop 5 cols / Mobile full) */}
        <div className="lg:col-span-5 bg-white dark:bg-surface-900 rounded-3xl p-6 border border-slate-100 dark:border-surface-800 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-primary-500/15 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Wallet Overview</h4>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active • KYC Verified
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowBalance(!showBalance)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-surface-800 transition-colors"
                title={showBalance ? 'Hide balance' : 'Show balance'}
              >
                {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>

            {/* Balances & Limits */}
            <div>
              <span className="text-[11px] font-medium text-slate-500 dark:text-surface-400">Total & Available Balance</span>
              <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight font-mono mt-0.5">
                {showBalance ? formatCurrency(walletBalance) : '••••••••'}
              </h3>
              <div className="flex items-center gap-2 text-xs pt-1 text-slate-500 dark:text-surface-400">
                <span>Daily Limit: <strong className="text-slate-700 dark:text-surface-200">₹1,00,000</strong></span>
                <span>•</span>
                <span>Tier: <strong className="text-emerald-600 dark:text-emerald-400">Level 2 (Full)</strong></span>
              </div>
            </div>

            {/* Quick Stats Grid: Inflow, Outflow, Net Savings */}
            <div className="grid grid-cols-3 gap-2 pt-0.5">
              <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-surface-800/50 border border-slate-100 dark:border-surface-800/80">
                <span className="text-[10px] text-slate-500 dark:text-surface-400 font-medium block">Monthly Inflow</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block truncate">
                  +{formatCurrency(analytics?.totalCredit || 0)}
                </span>
              </div>
              <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-surface-800/50 border border-slate-100 dark:border-surface-800/80">
                <span className="text-[10px] text-slate-500 dark:text-surface-400 font-medium block">Monthly Outflow</span>
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400 mt-0.5 block truncate">
                  -{formatCurrency(analytics?.totalDebit || 0)}
                </span>
              </div>
              <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-surface-800/50 border border-slate-100 dark:border-surface-800/80">
                <span className="text-[10px] text-slate-500 dark:text-surface-400 font-medium block">Net Savings</span>
                <span className="text-xs font-bold text-primary-600 dark:text-primary-400 mt-0.5 block truncate">
                  {formatCurrency(analytics?.netSavings || 0)} {growthRate ? `(+${growthRate}%)` : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons: Add Money, Withdraw, Details */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-surface-800">
            <button
              onClick={handleOpenAdd}
              className="flex-1 py-2.5 px-3 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold shadow-md shadow-primary-500/20 transition-all active:scale-98 flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Money</span>
            </button>
            <button
              onClick={() => setIsWithdrawOpen(true)}
              className="flex-1 py-2.5 px-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-surface-800 dark:hover:bg-surface-700 text-slate-700 dark:text-surface-200 text-xs font-bold transition-all active:scale-98 flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 rotate-180" />
              <span>Withdraw</span>
            </button>
            <Link
              to="/transactions"
              className="py-2.5 px-3 rounded-2xl border border-slate-200 dark:border-surface-700 hover:bg-slate-50 dark:hover:bg-surface-800 text-slate-600 dark:text-surface-300 text-xs font-bold transition-all flex items-center justify-center"
              title="View full transactions & statements"
            >
              Details
            </Link>
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
              onClick={() => handleOpenBillsRecharge('MOBILE')}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/30 flex items-center justify-center group-hover:scale-105 group-hover:shadow-md transition-all">
                <Zap className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-semibold text-slate-700 dark:text-surface-300">Recharge</span>
            </button>

            {/* 5. Pay Bills */}
            <button
              onClick={() => handleOpenBillsRecharge('ELECTRICITY')}
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

      {/* ── SAVINGS GOALS ROW ── */}
      <div className="bg-white dark:bg-surface-900 rounded-3xl p-6 border border-slate-100 dark:border-surface-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">Savings Goals</h4>
              <p className="text-[11px] text-slate-500 dark:text-surface-400">Track and fund your dreams with automated spare change round-ups</p>
            </div>
          </div>
          <Link
            to="/goals"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-600 dark:text-primary-400 hover:text-primary-700 transition-colors"
          >
            <span>View All & Add Goal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {goals.length === 0 ? (
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-surface-800/40 border border-dashed border-slate-200 dark:border-surface-700/60 gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <p className="text-xs font-bold text-slate-800 dark:text-white">No savings goals created yet</p>
              <p className="text-[11px] text-slate-500 dark:text-surface-400">
                Set a target for a new gadget, travel, or emergency fund, and allocate pocket money anytime!
              </p>
            </div>
            <Link
              to="/goals"
              className="px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold shadow-xs transition-all shrink-0"
            >
              + Create First Goal
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {goals.slice(0, 3).map((goal) => {
              const current = Number(goal.currentAmount || 0);
              const target = Number(goal.targetAmount || 1);
              const pct = Math.min(100, Math.round((current / target) * 100));
              return (
                <div
                  key={goal.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-surface-800/40 border border-slate-100 dark:border-surface-800 space-y-2.5 hover:border-primary-300 dark:hover:border-surface-700 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg">{goal.icon || '🎯'}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300">
                      {pct}% Completed
                    </span>
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">{goal.name}</h5>
                    <p className="text-[11px] text-slate-500 dark:text-surface-400 font-mono mt-0.5">
                      {formatCurrency(current)} / {formatCurrency(target)}
                    </p>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-surface-700 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-primary-500 to-indigo-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
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

        {/* Scan. Pay. Go. Card & AI Money Coach & Invite & Earn (Desktop 5 cols / Mobile full) */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* AI Money Coach Section */}
          <div className="bg-white dark:bg-surface-900 rounded-3xl p-5 border border-slate-100 dark:border-surface-800 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <span>AI Money Coach</span>
                    <Sparkles className="w-3 h-3 text-amber-500" />
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-surface-400">
                    Smart savings & spending insights
                  </p>
                </div>
              </div>

              {/* Dynamic Health Score Status */}
              {recentTxns.length > 0 && healthScore && (
                <div className="px-2.5 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-800/50 text-right">
                  <span className="text-[9px] text-purple-600 dark:text-purple-400 uppercase font-bold tracking-wider block">Health Score</span>
                  <span className="text-xs font-black text-purple-700 dark:text-purple-300 font-mono">
                    {healthScore.score}/100 • {healthScore.rating}
                  </span>
                </div>
              )}
            </div>

            {recentTxns.length === 0 ? (
              <div className="p-3.5 rounded-2xl border border-dashed border-slate-200 dark:border-surface-700 bg-slate-50/50 dark:bg-surface-800/30 text-center space-y-2">
                <p className="text-xs font-bold text-slate-800 dark:text-white">Start spending to unlock AI coaching</p>
                <p className="text-[11px] text-slate-500 dark:text-surface-400">
                  Transact with FST Pay to unlock real-time financial health diagnostics and automated savings tips.
                </p>
                <Link
                  to="/ai-coach"
                  className="inline-flex items-center gap-1 text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline pt-0.5"
                >
                  <span>Explore AI Coach</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {/* 1-2 AI-generated insights/tips */}
                <div className="space-y-2">
                  {aiTips && aiTips.length > 0 ? (
                    aiTips.slice(0, 2).map((tip, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-purple-50/60 dark:bg-surface-800/60 border border-purple-100/70 dark:border-surface-700/60 text-xs text-slate-700 dark:text-surface-200 flex items-start gap-2 leading-relaxed"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                        <span>{tip}</span>
                      </div>
                    ))
                  ) : (
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-surface-800/60 text-xs text-slate-600 dark:text-surface-300">
                      {healthScore?.description || 'Your spending looks healthy! Continue building your regular savings.'}
                    </div>
                  )}
                </div>

                {/* Interactive Ask AI Coach input */}
                <form onSubmit={handleAskAiSubmit} className="relative">
                  <input
                    type="text"
                    value={aiQuestion}
                    onChange={(e) => setAiQuestion(e.target.value)}
                    placeholder="Ask Coach: 'Can I afford dining out?'"
                    className="w-full pl-3 pr-9 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 bg-slate-50 dark:bg-surface-800 rounded-xl border border-slate-200 dark:border-surface-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                  <button
                    type="submit"
                    disabled={isAskingAi || !aiQuestion.trim()}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white transition-colors"
                    title="Send to AI Coach"
                  >
                    {isAskingAi ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Send className="w-3 h-3" />
                    )}
                  </button>
                </form>

                {aiAnswer && (
                  <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs space-y-1 animate-slide-down">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1">
                        <Bot className="w-3 h-3" />
                        AI Coach
                      </span>
                      <button
                        type="button"
                        onClick={() => setAiAnswer(null)}
                        className="text-slate-400 hover:text-slate-600 text-[10px]"
                      >
                        Dismiss
                      </button>
                    </div>
                    <p className="text-slate-700 dark:text-surface-200 leading-relaxed">{aiAnswer}</p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-0.5 text-xs">
                  <span className="text-[10px] text-slate-400">Personalized money advice</span>
                  <Link
                    to="/ai-coach"
                    className="font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 flex items-center gap-1 transition-colors text-[11px]"
                  >
                    <span>Full AI Coach</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            )}
          </div>

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

      {/* Withdraw Modal */}
      <Modal
        isOpen={isWithdrawOpen}
        onClose={() => {
          setIsWithdrawOpen(false);
          setWithdrawError('');
          setWithdrawSuccess('');
        }}
        title="Withdraw to Bank Account"
      >
        <form onSubmit={handleWithdrawSubmit} className="space-y-4">
          {withdrawError && (
            <div className="p-3 rounded-xl bg-danger-500/10 border border-danger-500/20 text-danger-600 dark:text-danger-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{withdrawError}</span>
            </div>
          )}

          {withdrawSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{withdrawSuccess}</span>
            </div>
          )}

          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="withdrawAmt" className="text-xs font-semibold text-slate-700 dark:text-surface-200">
                Withdrawal Amount (₹)
              </label>
              <span className="text-[11px] text-slate-500 dark:text-surface-400">
                Available: <strong className="text-slate-800 dark:text-white">{formatCurrency(walletBalance)}</strong>
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
              <input
                id="withdrawAmt"
                type="number"
                min="1"
                step="any"
                required
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-slate-900 dark:text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="bankNameInput" className="text-xs font-semibold text-slate-700 dark:text-surface-200 block mb-1">
              Bank Name
            </label>
            <input
              id="bankNameInput"
              type="text"
              required
              value={withdrawBankName}
              onChange={(e) => setWithdrawBankName(e.target.value)}
              placeholder="e.g. State Bank of India, HDFC Bank"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="accNumInput" className="text-xs font-semibold text-slate-700 dark:text-surface-200 block mb-1">
                Account Number
              </label>
              <input
                id="accNumInput"
                type="text"
                required
                value={withdrawAccountNo}
                onChange={(e) => setWithdrawAccountNo(e.target.value)}
                placeholder="11 to 16 digits"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-slate-900 dark:text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label htmlFor="ifscInput" className="text-xs font-semibold text-slate-700 dark:text-surface-200 block mb-1">
                IFSC Code
              </label>
              <input
                id="ifscInput"
                type="text"
                required
                value={withdrawIfsc}
                onChange={(e) => setWithdrawIfsc(e.target.value.toUpperCase())}
                placeholder="e.g. SBIN0001234"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-slate-900 dark:text-white text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface-800/60 border border-slate-100 dark:border-surface-700 text-xs text-slate-500 dark:text-surface-400 space-y-1">
            <div className="flex justify-between">
              <span>Transfer Mode:</span>
              <span className="font-semibold text-slate-700 dark:text-surface-200">IMPS / Instant RTGS</span>
            </div>
            <div className="flex justify-between">
              <span>Settlement Fee:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">₹0.00 (Free)</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isWithdrawing || !withdrawAmount || parseFloat(withdrawAmount) <= 0}
            className="w-full py-3 rounded-2xl bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-primary-500/20 transition-all flex items-center justify-center gap-2"
          >
            {isWithdrawing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing Withdrawal...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 rotate-180" />
                <span>Confirm Withdrawal</span>
              </>
            )}
          </button>
        </form>
      </Modal>

    </div>
  );
}
