import { useState, useRef, useEffect } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { aiApi, goalsApi, walletApi } from '../../api/endpoints';
import type { WalletGoal, HealthScoreData, ForecastData, BudgetPlanData } from '../../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line
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
  const [activeTab, setActiveTab] = useState<'chat' | 'health' | 'goals' | 'budget' | 'learning'>('chat');

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

  // Global UI states
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Modal states
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isFundModalOpen, setIsFundModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<WalletGoal | null>(null);
  const [fundAction, setFundAction] = useState<'allocate' | 'withdraw'>('allocate');
  const [fundAmount, setFundAmount] = useState('');

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

  useEffect(() => {
    if (activeTab === 'chat') {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      fetchAnalyticsAndGoals();
    }
  }, [activeTab, messages]);

  const fetchAnalyticsAndGoals = async () => {
    try {
      setIsLoadingData(true);
      const [healthRes, tipsRes, forecastRes, budgetRes, goalsRes, walletRes] = await Promise.all([
        aiApi.getHealthScore(),
        aiApi.getTips(),
        aiApi.getForecast(),
        aiApi.getBudgetPlan(),
        goalsApi.getGoals(),
        walletApi.getWallet()
      ]);

      setHealthData(healthRes.data.data);
      setTips(tipsRes.data.data);
      setForecastData(forecastRes.data.data);
      setBudgetData(budgetRes.data.data);
      setGoals(goalsRes.data.data);
      setWalletBalance(walletRes.data.data?.balance || 0);
    } catch (err) {
      console.error('Failed to load analytical metrics:', err);
    } finally {
      setIsLoadingData(false);
    }
  };

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
    } catch (err: any) {
      setAlertConfig({
        title: 'Error Creating Goal',
        message: err.response?.data?.message || 'Failed to create savings goal. Please verify inputs.'
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
    } catch (err: any) {
      setAlertConfig({
        title: 'Funding Error',
        message: err.response?.data?.message || 'Failed to process savings allocation.'
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
        } catch (err: any) {
          setAlertConfig({
            title: 'Error',
            message: err.response?.data?.message || 'Failed to cancel goal.'
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
            <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
              <Bot className="w-7 h-7 text-purple-400" /> AI Money Assistant
            </h1>
            <p className="text-surface-400 text-sm">Smart diagnostics, budgeting, and savings coach</p>
          </div>

          <div className="flex bg-surface-800/80 p-1 rounded-xl border border-surface-700/30 backdrop-blur">
            {['chat', 'health', 'goals', 'budget', 'learning'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${
                  activeTab === tab 
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25' 
                    : 'text-surface-400 hover:text-white'
                }`}
              >
                {tab === 'chat' ? 'Money Coach' : tab === 'goals' ? 'Savings Goals' : tab === 'budget' ? 'Budget & Forecast' : tab === 'learning' ? 'Financial Learning' : 'Health Score'}
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
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                    goal.priority === 'HIGH' ? 'bg-danger-500/10 text-danger-400' :
                                    goal.priority === 'LOW' ? 'bg-surface-600/30 text-surface-400' : 'bg-warning-500/10 text-warning-400'
                                  }`}>
                                    {goal.priority}
                                  </span>
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
                      <h3 className="text-sm font-semibold text-white mb-2">30-Day Spending Forecast</h3>
                      <p className="text-xs text-surface-400 mb-6">Deterministic cumulative projections based on daily transactional burn rates</p>
                      <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={forecastData.points} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                            <XAxis dataKey="label" stroke="#94a3b8" fontSize={9} interval={4} />
                            <YAxis stroke="#94a3b8" fontSize={11} />
                            <Tooltip
                              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                              labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                            />
                            <Legend wrapperStyle={{ fontSize: '11px' }} />
                            <Line
                              type="monotone"
                              dataKey="predictedCumulativeSpend"
                              name="Projected Spending"
                              stroke="#7C3AED"
                              strokeWidth={2}
                              strokeDasharray="5 5"
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </GlassCard>
                  )}
                </div>
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
                  onChange={(e) => setNewGoalPriority(e.target.value as any)}
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
