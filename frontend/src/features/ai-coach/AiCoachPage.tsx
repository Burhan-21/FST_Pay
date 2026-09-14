import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import {
  Bot,
  Send,
  Loader2,
  Sparkles,
  User,
  Target,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Trash2,
  ShieldCheck,
  Info,
  AlertCircle,
  BellRing,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Zap,
  TrendingDown
} from 'lucide-react';
import { aiApi, goalsApi, walletApi } from '../../api/endpoints';
import type { WalletGoal, HealthScoreData, ForecastData, BudgetPlanData, AiBudgetAnomaly, RoundUpRule } from '../../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Line,
  AreaChart,
  Area
} from 'recharts';
import PageTransition from '../../components/ui/PageTransition';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import GlassCard from '../../components/ui/GlassCard';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const welcomeMessage: Message = {
  id: '0',
  role: 'assistant',
  content: `Hi! I'm your **AI Money Coach** 🤖💰\n\nI can help you with:\n• Monthly budget planning\n• Savings recommendations\n• Expense analysis\n• Beginner investment tips\n• Overspending alerts\n\nTell me about your monthly income and spending, or ask me anything about managing your finances!`,
  timestamp: new Date().toISOString(),
};

const educationalLessons = [
  {
    title: 'What is an Emergency Fund?',
    description: 'An emergency fund is money you set aside specifically for unexpected expenses, like urgent medical bills or minor repairs. For teens, this could be saving for a rainy day so you do not have to borrow from parents.',
    icon: '🏥',
    tip: 'Aim to save at least 3 months of basic expenses!'
  },
  {
    title: 'Understanding SIPs (Mutual Funds)',
    description: 'Systematic Investment Plan (SIP) is a method where you invest a fixed amount of money regularly (e.g., monthly) in a mutual fund. It helps you benefit from compounding interest over long horizons without timing the market.',
    icon: '📈',
    tip: 'Start small! Even ₹500 a month can grow significantly over 5 years.'
  },
  {
    title: 'UPI Safety & Security',
    description: 'Unified Payments Interface (UPI) is convenient, but requires safety rules. Never share your UPI PIN with anyone, do not scan QR codes to receive money (scanning is only for sending), and verify merchant names before payment.',
    icon: '🔒',
    tip: 'Your PIN is only needed to pay money, never to receive it!'
  },
  {
    title: 'Rule of 72: Doubling Your Money',
    description: 'The Rule of 72 is a quick way to estimate how long it takes to double your money. Divide 72 by your annual interest rate. For example, at an 8% return, your money doubles in about 9 years (72 / 8).',
    icon: '🧮',
    tip: 'A higher compound interest rate accelerates this doubling time.'
  }
];

export default function AiCoachPage() {
  const [activeTab, setActiveTab] = useState<'chat' | 'health' | 'goals' | 'budget' | 'alerts' | 'learning'>('chat');

  // Chat states
  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);
  const [input, setInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Analytical data states
  const [healthData, setHealthData] = useState<HealthScoreData | null>(null);
  const [tips, setTips] = useState<string[]>([]);
  const [forecastData, setForecastData] = useState<ForecastData | null>(null);
  const [budgetData, setBudgetData] = useState<BudgetPlanData | null>(null);
  const [goals, setGoals] = useState<WalletGoal[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(0);

  // Proactive Alerts state
  const [alerts, setAlerts] = useState<AiBudgetAnomaly[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  // Global UI states
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Modal states
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isFundModalOpen, setIsFundModalOpen] = useState(false);
  const [isRoundUpModalOpen, setIsRoundUpModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<WalletGoal | null>(null);
  const [fundAction, setFundAction] = useState<'allocate' | 'withdraw'>('allocate');
  const [fundAmount, setFundAmount] = useState('');

  // Round-Up Rule States
  const [roundUpRule, setRoundUpRule] = useState<RoundUpRule | null>(null);
  const [roundUpGoalId, setRoundUpGoalId] = useState('');
  const [roundUpNearest, setRoundUpNearest] = useState<number>(10);
  const [isSavingRoundUp, setIsSavingRoundUp] = useState(false);

  // Custom alert/confirm state to replace browser native APIs
  const [alertConfig, setAlertConfig] = useState<{ title: string; message: string } | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  // Create Goal Form state
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalDesc, setNewGoalDesc] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalDate, setNewGoalDate] = useState('');
  const [newGoalPriority, setNewGoalPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [newGoalIcon, setNewGoalIcon] = useState('🎯');
  const [newGoalColor, setNewGoalColor] = useState('#2070FF');

  const iconsList = ['🎯', '💻', '🎓', '📱', '👟', '🍕', '🎮', '🚗', '🏖️', '🏠'];
  const colorsList = ['#2070FF', '#7C3AED', '#22C55E', '#F59E0B', '#EF4444', '#EC4899'];

  const fetchAnalyticsAndGoals = async () => {
    try {
      setIsLoadingData(true);
      const [healthRes, tipsRes, forecastRes, budgetRes, goalsRes, walletRes, alertsRes, roundUpRes] = await Promise.all([
        aiApi.getHealthScore(),
        aiApi.getTips(),
        aiApi.getForecast(),
        aiApi.getBudgetPlan(),
        goalsApi.getGoals(),
        walletApi.getWallet(),
        aiApi.getAlerts().catch(() => ({ data: { data: [] } })),
        goalsApi.getRoundUp().catch(() => ({ data: { data: null } }))
      ]);

      setHealthData(healthRes.data.data);
      setTips(tipsRes.data.data);
      setForecastData(forecastRes.data.data);
      setBudgetData(budgetRes.data.data);
      setGoals(goalsRes.data.data);
      setWalletBalance(walletRes.data.data?.balance || 0);
      setAlerts(alertsRes.data.data || []);
      if (roundUpRes.data?.data) {
        setRoundUpRule(roundUpRes.data.data);
        if (roundUpRes.data.data.goalId) {
          setRoundUpGoalId(roundUpRes.data.data.goalId);
          setRoundUpNearest(roundUpRes.data.data.roundUpNearest || 10);
        }
      }
    } catch (err) {
      console.error('Failed to load analytical metrics:', err);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleSaveRoundUp = async () => {
    if (!roundUpGoalId) return;
    try {
      setIsSavingRoundUp(true);
      const res = await goalsApi.setRoundUp(roundUpGoalId, roundUpNearest);
      setRoundUpRule(res.data.data);
      setIsRoundUpModalOpen(false);
      await fetchAnalyticsAndGoals();
    } catch (err) {
      console.error('Failed to set round-up:', err);
      setAlertConfig({
        title: 'Round-Up Failed',
        message: 'Could not enable round-up rule. Please ensure the goal is active.',
      });
    } finally {
      setIsSavingRoundUp(false);
    }
  };

  const handleDisableRoundUp = async () => {
    try {
      await goalsApi.disableRoundUp();
      setRoundUpRule({ enabled: false, accumulatedAmount: 0 });
      await fetchAnalyticsAndGoals();
    } catch (err) {
      console.error('Failed to disable round-up:', err);
    }
  };

  const handleRunScan = async () => {
    try {
      setIsScanning(true);
      const res = await aiApi.runScan();
      setAlerts(res.data.data || []);
    } catch (err) {
      console.error('Failed to run proactive scan:', err);
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    const handleAiAlertEvent = (e: Event) => {
      const customEvent = e as CustomEvent<AiBudgetAnomaly>;
      if (customEvent.detail) {
        setAlerts((prev) => [customEvent.detail, ...prev]);
      }
    };
    window.addEventListener('fst:ai_alert', handleAiAlertEvent);
    return () => window.removeEventListener('fst:ai_alert', handleAiAlertEvent);
  }, []);

  useEffect(() => {
    if (activeTab === 'chat') {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTab, messages]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- data-fetching effect: async setState after await is architecturally correct
  useEffect(() => { if (activeTab !== 'chat') fetchAnalyticsAndGoals(); }, [activeTab]);

  const sendMessage = async () => {
    if (!input.trim() || isChatLoading) return;

    const textToSend = input.trim();
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsChatLoading(true);

    try {
      const res = await aiApi.chat(textToSend);
      const reply = res.data.data?.reply || 'I processed your query, but received an empty response.';

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: reply,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, aiResponse]);
    } catch (err) {
      console.error('AI chat failed:', err);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I am having trouble connecting to my servers. Please try again in a few moments.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalName.trim() || !newGoalTarget || !newGoalDate) return;

    try {
      await goalsApi.createGoal({
        name: newGoalName,
        description: newGoalDesc,
        targetAmount: parseFloat(newGoalTarget),
        targetDate: newGoalDate,
        priority: newGoalPriority,
        icon: newGoalIcon,
        color: newGoalColor
      });

      // Reset Form & reload
      setNewGoalName('');
      setNewGoalDesc('');
      setNewGoalTarget('');
      setNewGoalDate('');
      setNewGoalPriority('MEDIUM');
      setIsGoalModalOpen(false);
      fetchAnalyticsAndGoals();
    } catch (err: unknown) {
      setAlertConfig({
        title: 'Error Creating Goal',
        message: axios.isAxiosError<{ message?: string }>(err)
          ? err.response?.data?.message || 'Failed to create savings goal. Please verify inputs.'
          : 'Failed to create savings goal. Please verify inputs.'
      });
    }
  };

  const handleFundAction = async () => {
    if (!selectedGoal || !fundAmount) return;
    const amount = parseFloat(fundAmount);
    if (isNaN(amount) || amount <= 0) return;

    try {
      if (fundAction === 'allocate') {
        await goalsApi.allocateFunds(selectedGoal.id, amount);
      } else {
        await goalsApi.withdrawFunds(selectedGoal.id, amount);
      }
      setFundAmount('');
      setIsFundModalOpen(false);
      fetchAnalyticsAndGoals();
    } catch (err: unknown) {
      setAlertConfig({
        title: 'Funding Error',
        message: axios.isAxiosError<{ message?: string }>(err)
          ? err.response?.data?.message || 'Failed to process savings allocation.'
          : 'Failed to process savings allocation.'
      });
    }
  };

  const handleDeleteGoal = (id: string) => {
    setConfirmConfig({
      title: 'Cancel Savings Goal',
      message: 'Are you sure you want to cancel this goal? Any saved funds will be returned to your wallet.',
      onConfirm: async () => {
        try {
          await goalsApi.deleteGoal(id);
          fetchAnalyticsAndGoals();
        } catch (err: unknown) {
          setAlertConfig({
            title: 'Error',
            message: axios.isAxiosError<{ message?: string }>(err)
              ? err.response?.data?.message || 'Failed to cancel goal.'
              : 'Failed to cancel goal.'
          });
        } finally {
          setConfirmConfig(null);
        }
      }
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500 stroke-emerald-500';
    if (score >= 60) return 'text-primary-500 stroke-primary-500';
    if (score >= 40) return 'text-warning-500 stroke-warning-500';
    return 'text-danger-500 stroke-danger-500';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-emerald-500/10 text-emerald-400';
    if (score >= 60) return 'bg-primary-500/10 text-primary-400';
    if (score >= 40) return 'bg-warning-500/10 text-warning-400';
    return 'bg-danger-500/10 text-danger-400';
  };

  return (
    <PageTransition>
      <div className="flex flex-col h-[calc(100vh-7rem)]">
        {/* Tabs Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Bot className="w-7 h-7 text-purple-500 dark:text-purple-400" /> AI Money Assistant
            </h1>
            <p className="text-slate-500 dark:text-surface-400 text-sm">Smart diagnostics, budgeting, and savings coach</p>
          </div>

          <div className="flex flex-wrap bg-surface-800/80 p-1 rounded-xl border border-surface-700/30 backdrop-blur gap-1">
            {[
              { id: 'chat', label: 'Money Coach' },
              { id: 'alerts', label: 'Proactive Alerts', count: alerts.length },
              { id: 'health', label: 'Health Score' },
              { id: 'goals', label: 'Savings Goals' },
              { id: 'budget', label: 'Budget & Forecast' },
              { id: 'learning', label: 'Financial Learning' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`relative px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all flex items-center gap-1.5 ${
                  activeTab === tab.id 
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25' 
                    : 'text-surface-400 hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-danger-500 text-white animate-pulse">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {isLoadingData && activeTab !== 'chat' ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            <p className="text-surface-400 text-sm">Computing analytics metrics...</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-1">
            {/* TAB 1: CHAT */}
            {activeTab === 'chat' && (
              <div className="flex flex-col h-[calc(100vh-12rem)]">
                <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center ${msg.role === 'assistant' ? 'bg-purple-500/20' : 'bg-primary-500/20'}`}>
                        {msg.role === 'assistant' ? <Bot className="w-4 h-4 text-purple-400" /> : <User className="w-4 h-4 text-primary-400" />}
                      </div>
                      <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'assistant' ? 'glass-card text-surface-200' : 'bg-primary-600 text-white rounded-tr-sm'}`}>
                        {msg.content.split('\n').map((line, i) => (
                          <p key={i} className={i > 0 ? 'mt-1' : ''}>
                            {line.startsWith('•') || line.startsWith('-') ? (
                              <span className="block pl-3 -indent-3">{line}</span>
                            ) : (
                              line.replace(/\*\*(.*?)\*\*/g, '$1')
                            )}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                  {isChatLoading && (
                    <div className="flex gap-3 animate-pulse">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-purple-400" />
                      </div>
                      <div className="glass-card p-4 rounded-2xl">
                        <div className="flex items-center gap-2 text-surface-400 text-sm">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Thinking...
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>

                {/* Chat Input */}
                <div className="mt-4 glass-card p-3 flex items-center gap-3 page-section">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Ask about budgeting, saving, investing..."
                    aria-label="Ask AI financial assistant"
                    className="flex-1 bg-transparent text-white placeholder-surface-500 text-sm focus:outline-none px-2"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || isChatLoading}
                    aria-label="Send message"
                    className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition-colors disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* TAB: PROACTIVE ALERTS */}
            {activeTab === 'alerts' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                      <BellRing className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-base">Proactive Anomaly Monitor</h3>
                      <p className="text-xs text-surface-400">Automated weekly diagnostic scans with instant anomaly detection</p>
                    </div>
                  </div>

                  <Button
                    onClick={handleRunScan}
                    disabled={isScanning}
                    variant="primary"
                    size="sm"
                    className="flex items-center gap-2 self-start sm:self-center shadow-lg shadow-purple-500/25"
                  >
                    <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
                    <span>{isScanning ? 'Scanning...' : 'Run Instant Scan'}</span>
                  </Button>
                </div>

                {alerts.length === 0 ? (
                  <GlassCard padding="none" className="text-center p-12">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto mb-3">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h3 className="text-white font-semibold text-lg">All Clear! No Budget Anomalies</h3>
                    <p className="text-surface-400 text-sm mt-1 max-w-md mx-auto">
                      Your recent spending is well-aligned with your baseline. Category thresholds, goals, and burn rates are completely healthy.
                    </p>
                    <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5" /> Next automated scan scheduled for Monday 08:00 AM
                    </div>
                  </GlassCard>
                ) : (
                  <div className="space-y-4">
                    {alerts.map((alert, idx) => {
                      const isAlert = alert.severity === 'ALERT';
                      const isWarning = alert.severity === 'WARNING';
                      const borderClass = isAlert
                        ? 'border-rose-500/40 bg-rose-950/10'
                        : isWarning
                        ? 'border-amber-500/40 bg-amber-950/10'
                        : 'border-purple-500/40 bg-purple-950/10';

                      const badgeClass = isAlert
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        : isWarning
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        : 'bg-purple-500/20 text-purple-300 border-purple-500/30';

                      return (
                        <div
                          key={idx}
                          className={`glass-card p-5 border ${borderClass} transition-all relative overflow-hidden`}
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2">
                              {isAlert ? (
                                <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
                              ) : (
                                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                              )}
                              <h4 className="font-display font-bold text-white text-base">{alert.title}</h4>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase ${badgeClass}`}>
                                {alert.severity}
                              </span>
                              <span className="text-[10px] text-surface-500 font-mono">
                                {alert.detectedAt ? new Date(alert.detectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                            </div>
                          </div>

                          <p className="text-sm text-surface-300 mt-1 mb-3">{alert.message}</p>

                          {alert.currentAmount !== undefined && alert.baselineAmount !== undefined && (
                            <div className="grid grid-cols-2 gap-3 mb-3 p-3 rounded-xl bg-surface-900/60 border border-surface-700/30">
                              <div>
                                <span className="text-[10px] text-surface-400 uppercase tracking-wider block">Current Value</span>
                                <span className="text-sm font-bold text-white">₹{Number(alert.currentAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-surface-400 uppercase tracking-wider block">Expected Baseline</span>
                                <span className="text-sm font-bold text-surface-300">₹{Number(alert.baselineAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                              </div>
                            </div>
                          )}

                          {alert.actionableAdvice && (
                            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-200 text-xs">
                              <Sparkles className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                              <div>
                                <span className="font-semibold text-purple-300 block mb-0.5">Coach Recommendation</span>
                                <span>{alert.actionableAdvice}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: HEALTH SCORE */}
            {activeTab === 'health' && healthData && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Radial gauge card */}
                  <GlassCard padding="lg" className="flex flex-col items-center text-center justify-center min-h-[300px]">
                    <h3 className="text-sm font-semibold text-surface-400 mb-6">Financial Health Index</h3>
                    <div className="relative w-40 h-40">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 140 140">
                        <circle cx="70" cy="70" r="60" className="stroke-surface-700" strokeWidth="10" fill="transparent" />
                        <circle
                          cx="70"
                          cy="70"
                          r="60"
                          className={`transition-all duration-1000 ${getScoreColor(healthData.score)}`}
                          strokeWidth="10"
                          fill="transparent"
                          strokeDasharray="377"
                          strokeDashoffset={377 - (377 * healthData.score) / 100}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-4xl font-display font-extrabold text-white">{healthData.score}</span>
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full mt-1 ${getScoreBg(healthData.score)}`}>
                          {healthData.rating}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-surface-300 mt-6 max-w-xs">{healthData.description}</p>
                  </GlassCard>

                  {/* Score breakdown bar scales */}
                  <GlassCard padding="lg" className="lg:col-span-2 space-y-4">
                    <h3 className="text-sm font-semibold text-white mb-4">Diagnostic Score Breakdown</h3>
                    {[
                      { label: 'Savings Rate (Pocket Money ratio)', key: 'savingsRate', max: 30, desc: 'How much pocket money you saved vs spent' },
                      { label: 'Expense-to-Income Ratio', key: 'expenseRatio', max: 25, desc: 'Keeping expenses below 50% of credit inflow' },
                      { label: 'Budget Allocation Adherence', key: 'budgetAdherence', max: 20, desc: 'Sticking to 50/30/20 category partitions' },
                      { label: 'Daily Streak Consistency', key: 'streak', max: 10, desc: 'FST Pay active daily check-ins' },
                      { label: 'Goal Accumulation Progress', key: 'goalsProgress', max: 10, desc: 'Active savings goals progress averages' },
                      { label: 'Payment Continuity Activity', key: 'consistency', max: 5, desc: 'Keeping wallet active' },
                    ].map((item) => {
                      const value = healthData.breakdown[item.key as keyof typeof healthData.breakdown] || 0;
                      const pct = (value / item.max) * 100;
                      return (
                        <div key={item.key} className="space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <div>
                              <span className="text-white font-medium">{item.label}</span>
                              <p className="text-[10px] text-surface-500">{item.desc}</p>
                            </div>
                            <span className="text-surface-300 font-bold">{value} / {item.max} pts</span>
                          </div>
                          <div className="w-full bg-surface-700/30 rounded-full h-2 overflow-hidden">
                            <div className="bg-purple-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </GlassCard>
                </div>

                {/* Personalized Tips list */}
                <GlassCard padding="lg">
                  <h3 className="text-sm font-semibold text-white mb-4">Personalized Advice from your Coach</h3>
                  <div className="space-y-3">
                    {tips.map((tip, idx) => (
                      <div key={idx} className="flex gap-3 p-4 rounded-xl border border-surface-700/20 bg-surface-800/40">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 flex-shrink-0">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <p className="text-sm text-surface-200 self-center">{tip}</p>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </div>
            )}

            {/* TAB 3: SAVINGS GOALS */}
            {activeTab === 'goals' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div className="glass-card px-4 py-2 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center text-primary-400">
                      <Target className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-surface-400 block uppercase">Wallet Balance</span>
                      <span className="text-sm font-bold text-white">₹{walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  <Button
                    onClick={() => setIsGoalModalOpen(true)}
                    variant="primary"
                    size="sm"
                    className="flex items-center gap-1.5 shadow-lg shadow-purple-500/25"
                  >
                    <Plus className="w-4 h-4" /> Create Goal
                  </Button>
                </div>

                {/* Round-Up Micro-Savings Banner */}
                <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-surface-800/40 border border-purple-500/25" data-testid="round-up-banner">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-300">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-white">Auto Spare Change Round-Ups</h4>
                        {roundUpRule?.enabled ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Active (Nearest ₹{roundUpRule.roundUpNearest})
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-700/50 text-surface-400">
                            Disabled
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-surface-400 mt-0.5">
                        {roundUpRule?.enabled
                          ? `Rounding card spends up to nearest ₹${roundUpRule.roundUpNearest} into "${roundUpRule.goalName}". Total saved: ₹${(roundUpRule.accumulatedAmount || 0).toFixed(2)}`
                          : 'Automatically round up card purchases and sweep spare change into your targeted goal.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {roundUpRule?.enabled && (
                      <Button variant="ghost" size="sm" onClick={handleDisableRoundUp} className="text-xs text-danger-400 hover:text-danger-300">
                        Disable
                      </Button>
                    )}
                    <Button variant="secondary" size="sm" onClick={() => setIsRoundUpModalOpen(true)} className="text-xs flex items-center gap-1.5 shadow-sm">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      {roundUpRule?.enabled ? 'Change Rule' : 'Configure Round-Up'}
                    </Button>
                  </div>
                </div>

                {goals.length === 0 ? (
                  <GlassCard padding="none" className="text-center p-12">
                    <Target className="w-12 h-12 text-surface-600 mx-auto mb-3" />
                    <h3 className="text-white font-semibold text-lg">No active savings goals</h3>
                    <p className="text-surface-400 text-sm mt-1 max-w-sm mx-auto">
                      Create a savings goal (like laptop, college fund, or gaming gear) and dedicate funds from your wallet to achieve it!
                    </p>
                    <Button
                      onClick={() => setIsGoalModalOpen(true)}
                      variant="primary"
                      className="mt-4"
                    >
                      Start Saving Now
                    </Button>
                  </GlassCard>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {goals.map((goal) => {
                      const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
                      return (
                        <div
                          key={goal.id}
                          className="glass-card relative overflow-hidden p-5 flex flex-col justify-between min-h-[220px]"
                          style={{ borderLeft: `4px solid ${goal.color || '#2070FF'}` }}
                        >
                          <div>
                            <div className="flex justify-between items-start gap-2 mb-2">
                              <div className="flex gap-2">
                                <span className="text-2xl" role="img" aria-label="Goal Icon">{goal.icon || '🎯'}</span>
                                <div>
                                  <h4 className="font-display font-bold text-white text-sm truncate max-w-[140px]">{goal.name}</h4>
                                  <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                      goal.priority === 'HIGH' ? 'bg-danger-500/10 text-danger-400' :
                                      goal.priority === 'LOW' ? 'bg-surface-600/30 text-surface-400' : 'bg-warning-500/10 text-warning-400'
                                    }`}>
                                      {goal.priority}
                                    </span>
                                    {goal.roundUpEnabled && (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30" data-testid="goal-round-up-badge">
                                        <Zap className="w-2.5 h-2.5 text-purple-400" /> Round-Up (₹{goal.roundUpNearest || 10})
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[10px] font-bold uppercase ${
                                  goal.status === 'COMPLETED' ? 'text-emerald-400' :
                                  goal.status === 'CANCELLED' ? 'text-danger-400' : 'text-primary-400'
                                }`}>
                                  {goal.status}
                                </span>
                                {goal.status === 'ACTIVE' && (
                                  <button
                                    onClick={() => handleDeleteGoal(goal.id)}
                                    className="text-surface-500 hover:text-danger-400 p-1 transition-colors"
                                    aria-label={`Cancel goal ${goal.name}`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                            {goal.description && (
                              <p className="text-xs text-surface-400 line-clamp-2 mt-1 mb-2">{goal.description}</p>
                            )}
                          </div>

                          <div className="my-4">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-surface-400">Progress</span>
                              <span className="text-white font-semibold">₹{goal.currentAmount} / ₹{goal.targetAmount}</span>
                            </div>
                            <div className="w-full bg-surface-700/30 rounded-full h-2 overflow-hidden">
                              <div
                                className="h-2 rounded-full transition-all"
                                style={{
                                  width: `${Math.min(progress, 100)}%`,
                                  backgroundColor: goal.color || '#2070FF'
                                }}
                              />
                            </div>
                            <div className="flex justify-between text-[10px] text-surface-500 mt-1">
                              <span>{progress.toFixed(0)}% saved</span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> {new Date(goal.targetDate).toLocaleDateString()}
                              </span>
                            </div>

                            {/* 4-Step Milestone Checkpoints */}
                            <div className="grid grid-cols-4 gap-1.5 mt-2.5 pt-2 border-t border-surface-800/60" data-testid="goal-milestones">
                              {[
                                { pct: 25, label: '25%', reward: '+25 pts' },
                                { pct: 50, label: '50%', reward: '+50 pts' },
                                { pct: 75, label: '75%', reward: '+75 pts' },
                                { pct: 100, label: '100%', reward: '+100 pts' }
                              ].map((m) => {
                                const isReached = progress >= m.pct;
                                return (
                                  <div
                                    key={m.pct}
                                    className={`text-center py-1 px-1 rounded-md border text-[10px] transition-all ${
                                      isReached
                                        ? 'bg-amber-500/15 border-amber-500/30 text-amber-300 font-bold shadow-sm'
                                        : 'bg-surface-800/30 border-surface-700/40 text-surface-500'
                                    }`}
                                    title={`Milestone ${m.label} (${m.reward}) - ${isReached ? 'Unlocked! 🎉' : 'Locked'}`}
                                  >
                                    <span className="block leading-tight">{m.label}</span>
                                    <span className="text-[8px] opacity-80 block">{isReached ? '✨ Done' : m.reward}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            {goal.status === 'ACTIVE' ? (
                              <>
                                <Button
                                  onClick={() => {
                                    setSelectedGoal(goal);
                                    setFundAction('allocate');
                                    setIsFundModalOpen(true);
                                  }}
                                  variant="secondary"
                                  size="sm"
                                  className="flex-1 text-xs font-semibold flex items-center justify-center gap-1"
                                >
                                  <ArrowUpRight className="w-3.5 h-3.5" /> Allocate
                                </Button>
                                <Button
                                  onClick={() => {
                                    setSelectedGoal(goal);
                                    setFundAction('withdraw');
                                    setIsFundModalOpen(true);
                                  }}
                                  disabled={goal.currentAmount <= 0}
                                  variant="ghost"
                                  size="sm"
                                  className="flex-1 text-xs font-semibold flex items-center justify-center gap-1 border border-surface-600/30"
                                >
                                  <ArrowDownLeft className="w-3.5 h-3.5" /> Withdraw
                                </Button>
                              </>
                            ) : goal.status === 'COMPLETED' ? (
                              <div className="w-full py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold text-center rounded-xl flex items-center justify-center gap-1.5">
                                <ShieldCheck className="w-4 h-4" /> Goal Achieved! 🎉
                              </div>
                            ) : (
                              <div className="w-full py-2 bg-danger-500/10 border border-danger-500/20 text-danger-400 text-xs font-semibold text-center rounded-xl">
                                Goal Cancelled
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: BUDGET & FORECAST */}
            {activeTab === 'budget' && (
              <div className="space-y-6">
                {/* Cashflow Health & Risk KPI Cards */}
                {forecastData && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="cashflow-kpis">
                    <GlassCard padding="md">
                      <div className="flex items-center gap-2 text-surface-400 text-xs mb-1">
                        <TrendingDown className="w-4 h-4 text-purple-400" />
                        <span>Daily Burn Rate</span>
                      </div>
                      <div className="text-lg font-bold text-white">
                        ₹{(forecastData.dailyBurnMean || 0).toFixed(2)}
                      </div>
                      <p className="text-[11px] text-surface-400 mt-0.5">
                        Volatility: ±₹{(forecastData.dailyBurnStdDev || 0).toFixed(2)}/day
                      </p>
                    </GlassCard>

                    <GlassCard padding="md">
                      <div className="flex items-center gap-2 text-surface-400 text-xs mb-1">
                        <AlertTriangle className={`w-4 h-4 ${(forecastData.runoutProbability || 0) > 0.3 ? 'text-rose-400' : 'text-emerald-400'}`} />
                        <span>30-Day Runout Risk</span>
                      </div>
                      <div className={`text-lg font-bold ${(forecastData.runoutProbability || 0) > 0.3 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {((forecastData.runoutProbability || 0) * 100).toFixed(1)}%
                      </div>
                      <p className="text-[11px] text-surface-400 mt-0.5">
                        {(forecastData.runoutProbability || 0) > 0.3 ? 'High depletion risk' : 'Safe reserve margin'}
                      </p>
                    </GlassCard>

                    <GlassCard padding="md">
                      <div className="flex items-center gap-2 text-surface-400 text-xs mb-1">
                        <Calendar className="w-4 h-4 text-blue-400" />
                        <span>Projected Runway</span>
                      </div>
                      <div className="text-lg font-bold text-white">
                        {forecastData.estimatedRunoutDays != null ? `${forecastData.estimatedRunoutDays} Days` : '> 30 Days'}
                      </div>
                      <p className="text-[11px] text-surface-400 mt-0.5">
                        Balance: ₹{(forecastData.currentBalance ?? walletBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                    </GlassCard>

                    <GlassCard padding="md">
                      <div className="flex items-center gap-2 text-surface-400 text-xs mb-1">
                        <Zap className="w-4 h-4 text-amber-400" />
                        <span>Forecast Engine</span>
                      </div>
                      <div className="text-xs font-bold text-purple-300 mt-1 uppercase tracking-wide">
                        Monte Carlo (M=200)
                      </div>
                      <p className="text-[11px] text-surface-400 mt-1">
                        10th, 50th & 90th percentile bands
                      </p>
                    </GlassCard>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {budgetData && (
                    <GlassCard padding="lg">
                      <h3 className="text-sm font-semibold text-white mb-2">50/30/20 Budget Allocator</h3>
                      <p className="text-xs text-surface-400 mb-6">Compare recommended guideline partitions vs actual expenses (Needs, Wants, Savings)</p>
                      <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={[
                              {
                                name: 'Needs (50%)',
                                Recommended: budgetData.recommendedAllocation.Needs,
                                Actual: budgetData.actualAllocation.Needs
                              },
                              {
                                name: 'Wants (30%)',
                                Recommended: budgetData.recommendedAllocation.Wants,
                                Actual: budgetData.actualAllocation.Wants
                              },
                              {
                                name: 'Savings (20%)',
                                Recommended: budgetData.recommendedAllocation.Savings,
                                Actual: budgetData.actualAllocation.Savings
                              }
                            ]}
                            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                            <YAxis stroke="#94a3b8" fontSize={11} />
                            <Tooltip
                              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                              labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                            />
                            <Legend wrapperStyle={{ fontSize: '11px' }} />
                            <Bar dataKey="Recommended" fill="#2070FF" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Actual" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </GlassCard>
                  )}

                  {forecastData && (
                    <GlassCard padding="lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="text-sm font-semibold text-white">30-Day Predictive Cashflow Simulation</h3>
                          <p className="text-xs text-surface-400">Monte Carlo confidence bands across stochastic spend paths</p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {forecastData.modelUsed || 'MONTE_CARLO'}
                        </span>
                      </div>
                      <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={forecastData.points} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorOptimistic" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                              </linearGradient>
                              <linearGradient id="colorMedian" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.35} />
                                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.05} />
                              </linearGradient>
                              <linearGradient id="colorPessimistic" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="#F43F5E" stopOpacity={0.0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                            <XAxis dataKey="label" stroke="#94a3b8" fontSize={9} interval={4} />
                            <YAxis stroke="#94a3b8" fontSize={11} />
                            <Tooltip
                              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                              labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                              formatter={(value: any) => [`₹${Number(value || 0).toFixed(2)}`, '']}
                            />
                            <Legend wrapperStyle={{ fontSize: '11px' }} />
                            <Area
                              type="monotone"
                              dataKey="optimisticBalance"
                              name="Optimistic (90th %ile)"
                              stroke="#10B981"
                              fillOpacity={1}
                              fill="url(#colorOptimistic)"
                              strokeWidth={1.5}
                            />
                            <Area
                              type="monotone"
                              dataKey="medianBalance"
                              name="Median Path (50th %ile)"
                              stroke="#8B5CF6"
                              fillOpacity={1}
                              fill="url(#colorMedian)"
                              strokeWidth={2.5}
                            />
                            <Area
                              type="monotone"
                              dataKey="pessimisticBalance"
                              name="Pessimistic (10th %ile)"
                              stroke="#F43F5E"
                              fillOpacity={1}
                              fill="url(#colorPessimistic)"
                              strokeWidth={1.5}
                            />
                            <Line
                              type="monotone"
                              dataKey="predictedCumulativeSpend"
                              name="Projected Spend"
                              stroke="#64748B"
                              strokeWidth={1.5}
                              strokeDasharray="4 4"
                              dot={false}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </GlassCard>
                  )}
                </div>

                {/* Goal Feasibility Matrix */}
                {forecastData?.goalFeasibilities && forecastData.goalFeasibilities.length > 0 && (
                  <GlassCard padding="lg" data-testid="goal-feasibility-card">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                          <Target className="w-4 h-4 text-purple-400" />
                          Savings Goal Feasibility Analysis
                        </h3>
                        <p className="text-xs text-surface-400 mt-0.5">
                          Monte Carlo completion likelihood based on current savings rate and projected stochastic burn
                        </p>
                      </div>
                      <span className="text-xs text-surface-400 font-mono">
                        {forecastData.goalFeasibilities.length} Active {forecastData.goalFeasibilities.length === 1 ? 'Goal' : 'Goals'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {forecastData.goalFeasibilities.map((feasibility) => {
                        const isHigh = feasibility.probabilityPercentage >= 70;
                        const isMedium = feasibility.probabilityPercentage >= 40 && feasibility.probabilityPercentage < 70;
                        return (
                          <div
                            key={feasibility.goalId}
                            className="p-4 rounded-xl border border-surface-700/40 bg-surface-800/40 space-y-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="text-sm font-bold text-white truncate max-w-[160px]">{feasibility.goalName}</h4>
                                <span className="text-[11px] text-surface-400">Target: {feasibility.targetDate}</span>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  feasibility.status === 'ON_TRACK'
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                    : feasibility.status === 'AT_RISK'
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                }`}
                              >
                                {feasibility.status === 'ON_TRACK' ? 'On Track' : feasibility.status === 'AT_RISK' ? 'At Risk' : 'Critical'}
                              </span>
                            </div>

                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-surface-400">Probability</span>
                                <span className={`font-bold ${isHigh ? 'text-emerald-400' : isMedium ? 'text-amber-400' : 'text-rose-400'}`}>
                                  {feasibility.probabilityPercentage.toFixed(0)}%
                                </span>
                              </div>
                              <div className="w-full bg-surface-700/40 rounded-full h-2 overflow-hidden">
                                <div
                                  className={`h-2 rounded-full transition-all ${
                                    isHigh ? 'bg-emerald-500' : isMedium ? 'bg-amber-500' : 'bg-rose-500'
                                  }`}
                                  style={{ width: `${Math.min(100, Math.max(5, feasibility.probabilityPercentage))}%` }}
                                />
                              </div>
                            </div>

                            <div className="flex justify-between items-center text-[11px] text-surface-400 pt-1 border-t border-surface-700/30">
                              <span>Saved: ₹{feasibility.currentAmount.toFixed(2)}</span>
                              <span>Target: ₹{feasibility.targetAmount.toFixed(2)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </GlassCard>
                )}
              </div>
            )}

            {/* TAB 5: FINANCIAL LITERACY */}
            {activeTab === 'learning' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {educationalLessons.map((lesson, idx) => (
                  <GlassCard key={idx} padding="md" className="hover:border-purple-500/40 transition-all duration-300">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl" role="img" aria-hidden="true">{lesson.icon}</span>
                      <h3 className="text-white font-display font-semibold text-base">{lesson.title}</h3>
                    </div>
                    <p className="text-xs text-surface-400 leading-relaxed mb-4">{lesson.description}</p>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                      <Info className="w-4 h-4 text-purple-400 flex-shrink-0" />
                      <span className="text-[11px] text-purple-300 font-medium">{lesson.tip}</span>
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CREATE GOAL MODAL */}
        <Modal
          isOpen={isGoalModalOpen}
          onClose={() => setIsGoalModalOpen(false)}
          title="Create Savings Goal"
        >
          <form onSubmit={handleCreateGoal} className="space-y-4">
            <div>
              <label htmlFor="newGoalName" className="block text-xs text-surface-400 mb-1">Goal Name *</label>
              <input
                id="newGoalName"
                type="text"
                required
                value={newGoalName}
                onChange={(e) => setNewGoalName(e.target.value)}
                placeholder="e.g. College Laptop, Summer Trip"
                className="w-full bg-surface-900 border border-surface-700/60 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label htmlFor="newGoalDesc" className="block text-xs text-surface-400 mb-1">Short Description</label>
              <textarea
                id="newGoalDesc"
                value={newGoalDesc}
                onChange={(e) => setNewGoalDesc(e.target.value)}
                placeholder="What is this goal for?"
                rows={2}
                className="w-full bg-surface-900 border border-surface-700/60 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="newGoalTarget" className="block text-xs text-surface-400 mb-1">Target Amount (₹) *</label>
                <input
                  id="newGoalTarget"
                  type="number"
                  required
                  min="1"
                  value={newGoalTarget}
                  onChange={(e) => setNewGoalTarget(e.target.value)}
                  placeholder="10000"
                  className="w-full bg-surface-900 border border-surface-700/60 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label htmlFor="newGoalDate" className="block text-xs text-surface-400 mb-1">Target Date *</label>
                <input
                  id="newGoalDate"
                  type="date"
                  required
                  value={newGoalDate}
                  onChange={(e) => setNewGoalDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full bg-surface-900 border border-surface-700/60 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="newGoalPriority" className="block text-xs text-surface-400 mb-1">Priority</label>
                <select
                  id="newGoalPriority"
                  value={newGoalPriority}
                  onChange={(e) => setNewGoalPriority(e.target.value as 'LOW' | 'MEDIUM' | 'HIGH')}
                  className="w-full bg-surface-900 border border-surface-700/60 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>
              <div>
                <span className="block text-xs text-surface-400 mb-1">Choose Icon</span>
                <div className="flex gap-1.5 overflow-x-auto py-1">
                  {iconsList.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setNewGoalIcon(ic)}
                      className={`text-lg p-1 rounded transition-all focus:outline-none focus:ring-1 focus:ring-primary-500 ${newGoalIcon === ic ? 'bg-primary-500/20 scale-110' : 'hover:bg-surface-800'}`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <span className="block text-xs text-surface-400 mb-1">Theme Color</span>
              <div className="flex gap-2">
                {colorsList.map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setNewGoalColor(col)}
                    aria-label={`Select theme color ${col}`}
                    className={`w-6 h-6 rounded-full transition-all border focus:outline-none focus:ring-2 focus:ring-white ${newGoalColor === col ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`}
                    style={{ backgroundColor: col }}
                  />
                ))}
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-4"
            >
              Create Goal
            </Button>
          </form>
        </Modal>

        {/* ALLOCATE / WITHDRAW FUNDS MODAL */}
        <Modal
          isOpen={isFundModalOpen && selectedGoal !== null}
          onClose={() => setIsFundModalOpen(false)}
          title={fundAction === 'allocate' ? 'Allocate Savings' : 'Withdraw Savings'}
        >
          {selectedGoal && (
            <>
              <p className="text-xs text-surface-400 mb-4">
                {fundAction === 'allocate'
                  ? `Allocate funds from your wallet to '${selectedGoal.name}'`
                  : `Withdraw funds from '${selectedGoal.name}' back to your wallet`}
              </p>

              <div className="bg-surface-900/60 p-3 rounded-xl border border-surface-800 mb-4 space-y-2">
                <div className="flex justify-between text-xs text-surface-400">
                  <span>Wallet Balance:</span>
                  <span className="text-white font-bold">₹{walletBalance}</span>
                </div>
                <div className="flex justify-between text-xs text-surface-400">
                  <span>Currently Saved:</span>
                  <span className="text-white font-bold">₹{selectedGoal.currentAmount}</span>
                </div>
                <div className="flex justify-between text-xs text-surface-400">
                  <span>Target Balance:</span>
                  <span className="text-white font-bold">₹{selectedGoal.targetAmount}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="fundAmount" className="block text-xs text-surface-400 mb-1">Enter Amount (₹)</label>
                  <input
                    id="fundAmount"
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={fundAmount}
                    onChange={(e) => setFundAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-surface-900 border border-surface-700/60 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <Button
                  onClick={handleFundAction}
                  disabled={!fundAmount || parseFloat(fundAmount) <= 0}
                  variant="primary"
                  className="w-full"
                >
                  {fundAction === 'allocate' ? 'Confirm Allocation' : 'Confirm Withdrawal'}
                </Button>
              </div>
            </>
          )}
        </Modal>

        {/* ROUND-UP CONFIGURATION MODAL */}
        <Modal
          isOpen={isRoundUpModalOpen}
          onClose={() => setIsRoundUpModalOpen(false)}
          title="Configure Auto Round-Up"
        >
          <div className="space-y-4" data-testid="round-up-modal">
            <p className="text-xs text-surface-300">
              Spare change from every card payment will be automatically rounded up and swept into your selected savings goal.
            </p>

            <div>
              <label htmlFor="roundup-goal-select" className="block text-xs font-semibold text-surface-300 mb-1.5">Target Savings Goal</label>
              <select
                id="roundup-goal-select"
                aria-label="Target Savings Goal"
                value={roundUpGoalId}
                onChange={(e) => setRoundUpGoalId(e.target.value)}
                className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
              >
                <option value="">Select an Active Goal</option>
                {goals.filter(g => g.status === 'ACTIVE').map(goal => (
                  <option key={goal.id} value={goal.id}>
                    {goal.icon} {goal.name} (Current: ₹{goal.currentAmount.toFixed(2)} / ₹{goal.targetAmount.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-surface-300 mb-1.5">Round-Up Threshold</label>
              <div className="grid grid-cols-3 gap-2">
                {[10, 50, 100].map((step) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => setRoundUpNearest(step)}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                      roundUpNearest === step
                        ? 'bg-purple-600/30 border-purple-500 text-purple-200 shadow-sm'
                        : 'bg-surface-800/40 border-surface-700/50 text-surface-400 hover:text-white'
                    }`}
                  >
                    Nearest ₹{step}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-surface-400 mt-1.5">
                Example: A spend of ₹85 rounds to {roundUpNearest === 10 ? '₹90 (+₹5 spare change)' : roundUpNearest === 50 ? '₹100 (+₹15 spare change)' : '₹100 (+₹15 spare change)'}.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsRoundUpModalOpen(false)}
                className="border border-surface-700"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveRoundUp}
                disabled={!roundUpGoalId || isSavingRoundUp}
                className="bg-purple-600 hover:bg-purple-500"
              >
                {isSavingRoundUp ? 'Saving...' : 'Activate Round-Up'}
              </Button>
            </div>
          </div>
        </Modal>

        {/* CUSTOM ALERT MODAL */}
        <Modal
          isOpen={alertConfig !== null}
          onClose={() => setAlertConfig(null)}
          title={alertConfig?.title}
        >
          <div className="space-y-4" aria-live="assertive">
            <div className="flex items-start gap-3 p-1">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <p className="text-sm text-surface-200">{alertConfig?.message}</p>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={() => setAlertConfig(null)} variant="primary" size="sm">
                Dismiss
              </Button>
            </div>
          </div>
        </Modal>

        {/* CUSTOM CONFIRM MODAL */}
        <Modal
          isOpen={confirmConfig !== null}
          onClose={() => setConfirmConfig(null)}
          title={confirmConfig?.title}
        >
          <div className="space-y-4">
            <p className="text-sm text-surface-200">{confirmConfig?.message}</p>
            <div className="flex justify-end gap-3 pt-2">
              <Button onClick={() => setConfirmConfig(null)} variant="ghost" size="sm" className="border border-surface-700">
                Cancel
              </Button>
              <Button onClick={confirmConfig?.onConfirm || (() => {})} variant="primary" size="sm" className="bg-rose-600 hover:bg-rose-500">
                Confirm Action
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </PageTransition>
  );
}
