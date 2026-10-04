import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Target,
  Plus,
  Zap,
  TrendingUp,
  CheckCircle2,
  Calendar,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Edit2,
  Trash2,
  AlertCircle,
  Search,
  ShieldCheck,
  Award
} from 'lucide-react';
import { goalsApi, walletApi } from '../../api/endpoints';
import type { WalletGoal, RoundUpRule } from '../../types';
import { PageTransition, Modal, Button, GlassCard, StatCard } from '../../components/ui';
import { formatCurrency } from '../../utils/helpers';

const ICONS_LIST = ['🎯', '💻', '🎓', '📱', '👟', '🍕', '🎮', '🚗', '🏖️', '🏠'];
const COLORS_LIST = ['#2070FF', '#7C3AED', '#22C55E', '#F59E0B', '#EF4444', '#EC4899'];

export default function GoalsPage() {
  const [goals, setGoals] = useState<WalletGoal[]>([]);
  const [roundUpRule, setRoundUpRule] = useState<RoundUpRule | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<WalletGoal | null>(null);
  const [allocatingGoal, setAllocatingGoal] = useState<WalletGoal | null>(null);
  const [withdrawingGoal, setWithdrawingGoal] = useState<WalletGoal | null>(null);
  const [roundUpModalOpen, setRoundUpModalOpen] = useState(false);
  const [confirmDeleteGoal, setConfirmDeleteGoal] = useState<{ id: string; name: string } | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [icon, setIcon] = useState('🎯');
  const [color, setColor] = useState('#2070FF');

  // Action amount (allocate / withdraw)
  const [actionAmount, setActionAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Round-Up config state
  const [selectedRoundUpGoalId, setSelectedRoundUpGoalId] = useState('');
  const [selectedNearest, setSelectedNearest] = useState(10);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setErrorMsg('');
      const [goalsRes, roundUpRes, walletRes] = await Promise.all([
        Promise.resolve(goalsApi?.getGoals ? goalsApi.getGoals() : null).catch(() => ({ data: { data: [] } })),
        Promise.resolve(goalsApi?.getRoundUp ? goalsApi.getRoundUp() : null).catch(() => ({ data: { data: null } })),
        Promise.resolve(walletApi?.getWallet ? walletApi.getWallet() : null).catch(() => ({ data: { data: { balance: 0 } } })),
      ]);

      const fetchedGoals: WalletGoal[] = goalsRes?.data?.data || [];
      setGoals(fetchedGoals);
      setRoundUpRule(roundUpRes?.data?.data || null);
      setWalletBalance(walletRes?.data?.data?.balance || 0);

      if (fetchedGoals.length > 0 && !selectedRoundUpGoalId) {
        setSelectedRoundUpGoalId(fetchedGoals[0].id);
      }
    } catch (err) {
      console.error('Failed to load goals:', err);
      setErrorMsg('Failed to load savings goals. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const handleSync = () => fetchData();
    window.addEventListener('fst:wallet_update', handleSync);
    return () => window.removeEventListener('fst:wallet_update', handleSync);
  }, []);

  const resetForm = () => {
    setName('');
    setDescription('');
    setTargetAmount('');
    setTargetDate('');
    setPriority('MEDIUM');
    setIcon('🎯');
    setColor('#2070FF');
    setActionAmount('');
    setErrorMsg('');
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (goal: WalletGoal) => {
    setEditingGoal(goal);
    setName(goal.name);
    setDescription(goal.description || '');
    setTargetAmount(goal.targetAmount.toString());
    setTargetDate(goal.targetDate ? goal.targetDate.split('T')[0] : '');
    setPriority(goal.priority || 'MEDIUM');
    setIcon(goal.icon || '🎯');
    setColor(goal.color || '#2070FF');
    setErrorMsg('');
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Goal name is required');
      return;
    }
    const amt = parseFloat(targetAmount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg('Please enter a valid target amount greater than 0');
      return;
    }
    if (!targetDate) {
      setErrorMsg('Please select a target completion date');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');
      await goalsApi.createGoal({
        name: name.trim(),
        description: description.trim() || undefined,
        targetAmount: amt,
        targetDate,
        priority,
        icon,
        color,
      });

      setIsCreateOpen(false);
      resetForm();
      setSuccessMsg('Savings goal created successfully!');
      setTimeout(() => setSuccessMsg(''), 3500);
      await fetchData();
    } catch (err: unknown) {
      if (axios.isAxiosError<{ message?: string }>(err)) {
        setErrorMsg(err.response?.data?.message || 'Failed to create goal.');
      } else {
        setErrorMsg('Failed to create goal.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGoal) return;
    const amt = parseFloat(targetAmount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg('Please enter a valid target amount');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');
      await goalsApi.updateGoal(editingGoal.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        targetAmount: amt,
        targetDate: targetDate || undefined,
        priority,
        icon,
        color,
      });

      setEditingGoal(null);
      resetForm();
      setSuccessMsg('Goal updated successfully!');
      setTimeout(() => setSuccessMsg(''), 3500);
      await fetchData();
    } catch (err: unknown) {
      if (axios.isAxiosError<{ message?: string }>(err)) {
        setErrorMsg(err.response?.data?.message || 'Failed to update goal.');
      } else {
        setErrorMsg('Failed to update goal.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGoal = (id: string, goalName: string) => {
    setConfirmDeleteGoal({ id, name: goalName });
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteGoal) return;
    const { id, name: goalName } = confirmDeleteGoal;
    setConfirmDeleteGoal(null);

    try {
      await goalsApi.deleteGoal(id);
      setSuccessMsg(`Deleted "${goalName}" successfully.`);
      setTimeout(() => setSuccessMsg(''), 3500);
      await fetchData();
    } catch (err) {
      console.error('Failed to delete goal:', err);
      setErrorMsg('Failed to delete goal. Please try again.');
    }
  };

  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocatingGoal) return;
    const amt = parseFloat(actionAmount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg('Please enter a valid amount to save');
      return;
    }
    if (amt > walletBalance) {
      setErrorMsg(`Insufficient wallet balance (Available: ${formatCurrency(walletBalance)})`);
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');
      await goalsApi.allocateFunds(allocatingGoal.id, amt);

      setAllocatingGoal(null);
      setActionAmount('');
      setSuccessMsg(`Allocated ${formatCurrency(amt)} to "${allocatingGoal.name}"! 🎉`);
      setTimeout(() => setSuccessMsg(''), 3500);

      window.dispatchEvent(new CustomEvent('fst:wallet_update'));
      await fetchData();
    } catch (err: unknown) {
      if (axios.isAxiosError<{ message?: string }>(err)) {
        setErrorMsg(err.response?.data?.message || 'Allocation failed. Check balance.');
      } else {
        setErrorMsg('Allocation failed.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawingGoal) return;
    const amt = parseFloat(actionAmount);
    const availableInGoal = withdrawingGoal.currentAmount || 0;
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg('Please enter a valid amount');
      return;
    }
    if (amt > availableInGoal) {
      setErrorMsg(`Cannot withdraw more than saved amount (${formatCurrency(availableInGoal)})`);
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');
      await goalsApi.withdrawFunds(withdrawingGoal.id, amt);

      setWithdrawingGoal(null);
      setActionAmount('');
      setSuccessMsg(`Withdrew ${formatCurrency(amt)} back to your wallet.`);
      setTimeout(() => setSuccessMsg(''), 3500);

      window.dispatchEvent(new CustomEvent('fst:wallet_update'));
      await fetchData();
    } catch (err: unknown) {
      if (axios.isAxiosError<{ message?: string }>(err)) {
        setErrorMsg(err.response?.data?.message || 'Withdrawal failed.');
      } else {
        setErrorMsg('Withdrawal failed.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleRoundUp = async () => {
    try {
      setIsSubmitting(true);
      if (roundUpRule?.enabled) {
        await goalsApi.disableRoundUp();
        setRoundUpRule(null);
        setSuccessMsg('Auto Round-Up disabled.');
      } else {
        if (!selectedRoundUpGoalId && goals.length > 0) {
          setSelectedRoundUpGoalId(goals[0].id);
        }
        await goalsApi.setRoundUp(selectedRoundUpGoalId || goals[0].id, selectedNearest);
        setSuccessMsg(`Auto Round-Up enabled to nearest ₹${selectedNearest}!`);
      }
      setRoundUpModalOpen(false);
      setTimeout(() => setSuccessMsg(''), 3500);
      await fetchData();
    } catch (err) {
      console.error('Round-up toggle failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick date setter
  const applyDateOffset = (months: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setTargetDate(`${yyyy}-${mm}-${dd}`);
  };

  // KPIs
  const totalTarget = goals.reduce((sum, g) => sum + (g.targetAmount || 0), 0);
  const totalSaved = goals.reduce((sum, g) => sum + (g.currentAmount || 0), 0);
  const overallProgress = totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0;
  const activeCount = goals.filter((g) => g.status === 'ACTIVE' || !g.status).length;
  const completedCount = goals.filter((g) => g.status === 'COMPLETED' || g.currentAmount >= g.targetAmount).length;

  // Filtered goals
  const filteredGoals = goals.filter((g) => {
    const matchesSearch = (g.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const isGoalCompleted = g.status === 'COMPLETED' || g.currentAmount >= g.targetAmount;

    if (statusFilter === 'ACTIVE') return matchesSearch && !isGoalCompleted;
    if (statusFilter === 'COMPLETED') return matchesSearch && isGoalCompleted;
    return matchesSearch;
  });

  return (
    <PageTransition className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Target className="w-7 h-7 text-primary-500" />
            <span>Savings Goals</span>
          </h1>
          <p className="text-slate-500 dark:text-surface-400 text-sm mt-1">
            Create milestone savings goals, set automated round-ups, and fund your aspirations directly from your wallet.
          </p>
        </div>
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Button
            onClick={() => setRoundUpModalOpen(true)}
            variant="secondary"
            size="sm"
            leftIcon={<Zap className="w-4 h-4 text-amber-500" />}
            className="text-xs font-semibold"
          >
            Auto Round-Up
          </Button>
          <Button
            onClick={handleOpenCreate}
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            className="text-xs font-bold shadow-md shadow-primary-500/25"
          >
            New Goal
          </Button>
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Saved"
          value={formatCurrency(totalSaved)}
          icon={Wallet}
          iconColor="text-emerald-500 dark:text-emerald-400"
          trend={{ value: `${overallProgress}% funded`, direction: overallProgress >= 50 ? 'up' : 'neutral' }}
        />
        <StatCard
          label="Total Target"
          value={formatCurrency(totalTarget)}
          icon={Target}
          iconColor="text-primary-500 dark:text-primary-400"
        />
        <StatCard
          label="Active Goals"
          value={`${activeCount} in progress`}
          icon={TrendingUp}
          iconColor="text-amber-500 dark:text-amber-400"
        />
        <StatCard
          label="Completed Goals"
          value={`${completedCount} achieved`}
          icon={Award}
          iconColor="text-purple-500 dark:text-purple-400"
        />
      </div>

      {/* Auto Round-Up Feature Spotlight Card */}
      <div className="rounded-3xl p-5 bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-blue-500/10 border border-purple-200/70 dark:border-purple-900/40 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-purple-500 text-white flex items-center justify-center shadow-md shadow-purple-500/25 shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Spare Change Micro-Savings (Round-Up)
              </h3>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                roundUpRule?.enabled
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-200 dark:bg-surface-700 text-slate-600 dark:text-surface-400'
              }`}>
                {roundUpRule?.enabled ? `Active (Nearest ₹${roundUpRule.roundUpNearest || 10})` : 'Paused'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-surface-400 mt-0.5">
              Automatically rounds up every purchase to the nearest ₹10 or ₹50 and sweeps spare change straight into your goal.
            </p>
          </div>
        </div>
        <Button
          onClick={() => setRoundUpModalOpen(true)}
          variant="secondary"
          size="sm"
          className="text-xs font-bold shrink-0 self-end md:self-center"
        >
          {roundUpRule?.enabled ? 'Manage Round-Up' : 'Enable Round-Up'}
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search savings goals..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="flex gap-1.5 bg-slate-100 dark:bg-surface-800/80 p-1 rounded-2xl border border-slate-200/80 dark:border-surface-700/60 self-start sm:self-auto">
          {(['ALL', 'ACTIVE', 'COMPLETED'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              type="button"
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                statusFilter === filter
                  ? 'bg-white dark:bg-surface-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-surface-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {filter === 'ALL' ? 'All Goals' : filter === 'ACTIVE' ? 'In Progress' : 'Completed'}
            </button>
          ))}
        </div>
      </div>

      {/* Goals Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-60 rounded-3xl bg-slate-100 dark:bg-surface-800/50 animate-pulse border border-slate-200/60 dark:border-surface-700/40" />
          ))}
        </div>
      ) : filteredGoals.length === 0 ? (
        <GlassCard padding="lg" className="text-center py-16 space-y-4">
          <div className="w-14 h-14 rounded-3xl bg-primary-500/10 text-primary-500 mx-auto flex items-center justify-center">
            <Target className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {searchQuery ? 'No matching goals found' : 'No savings goals yet'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-surface-400 max-w-sm mx-auto mt-1">
              {searchQuery
                ? 'Try adjusting your search keywords or clearing your status filter.'
                : 'Start setting targets for college, gadgets, trips, or emergency funds.'}
            </p>
          </div>
          {!searchQuery && (
            <Button onClick={handleOpenCreate} variant="primary" size="sm" className="text-xs font-bold">
              <Plus className="w-4 h-4 mr-1.5" /> Create Your First Goal
            </Button>
          )}
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredGoals.map((goal) => {
            const current = Number(goal.currentAmount || 0);
            const target = Number(goal.targetAmount || 1);
            const pct = Math.min(100, Math.round((current / target) * 100));
            const isFinished = pct >= 100 || goal.status === 'COMPLETED';
            const remaining = Math.max(0, target - current);

            return (
              <div
                key={goal.id}
                className={`rounded-3xl p-5 border transition-all relative flex flex-col justify-between ${
                  isFinished
                    ? 'bg-gradient-to-br from-emerald-50/60 via-white to-white dark:from-emerald-950/20 dark:via-surface-900 dark:to-surface-900 border-emerald-200 dark:border-emerald-800/40 shadow-sm'
                    : 'bg-white dark:bg-surface-900 border-slate-200/80 dark:border-surface-800 hover:shadow-md hover:border-primary-500/30 shadow-xs'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-xs"
                        style={{ backgroundColor: `${goal.color || '#2070FF'}15` }}
                      >
                        {goal.icon || '🎯'}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                          {goal.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            goal.priority === 'HIGH'
                              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                              : goal.priority === 'MEDIUM'
                              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                              : 'bg-slate-100 dark:bg-surface-800 text-slate-600 dark:text-surface-300'
                          }`}>
                            {goal.priority || 'MEDIUM'}
                          </span>
                          {isFinished && (
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                              <CheckCircle2 className="w-3 h-3" /> Goal Achieved!
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions Menu */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(goal)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-surface-800 transition-colors"
                        title="Edit Goal"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteGoal(goal.id, goal.name)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Delete Goal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  {goal.description && (
                    <p className="text-xs text-slate-500 dark:text-surface-400 mt-3 line-clamp-2">
                      {goal.description}
                    </p>
                  )}

                  {/* Progress Bar & Amounts */}
                  <div className="space-y-2 mt-4">
                    <div className="flex justify-between items-baseline text-xs">
                      <div>
                        <span className="text-xs text-slate-500 dark:text-surface-400">Saved: </span>
                        <strong className="text-slate-900 dark:text-white font-mono text-sm">{formatCurrency(current)}</strong>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-400">Target: </span>
                        <span className="font-semibold text-slate-700 dark:text-surface-300 font-mono">{formatCurrency(target)}</span>
                      </div>
                    </div>

                    {/* Bar */}
                    <div className="w-full h-2.5 bg-slate-100 dark:bg-surface-800 rounded-full overflow-hidden p-0.5 border border-slate-200/50 dark:border-surface-700/50">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: goal.color || '#2070FF',
                        }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-surface-400 pt-0.5">
                      <span className="font-bold text-slate-800 dark:text-white">{pct}% funded</span>
                      <span>
                        {isFinished ? 'Completed' : `${formatCurrency(remaining)} to go`}
                      </span>
                    </div>
                  </div>

                  {/* Target Date Pill */}
                  {goal.targetDate && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-surface-400 mt-3 pt-2.5 border-t border-slate-100 dark:border-surface-800">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Target: <strong>{new Date(goal.targetDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</strong></span>
                    </div>
                  )}
                </div>

                {/* Bottom Card Action Buttons */}
                <div className="flex gap-2 mt-5 pt-3 border-t border-slate-100 dark:border-surface-800">
                  <Button
                    onClick={() => {
                      setAllocatingGoal(goal);
                      setActionAmount('');
                      setErrorMsg('');
                    }}
                    variant="primary"
                    size="sm"
                    className="flex-1 text-xs font-bold flex items-center justify-center gap-1 shadow-sm"
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                    <span>Add Money</span>
                  </Button>
                  <Button
                    onClick={() => {
                      setWithdrawingGoal(goal);
                      setActionAmount('');
                      setErrorMsg('');
                    }}
                    disabled={current <= 0}
                    variant="ghost"
                    size="sm"
                    className="text-xs font-semibold border border-slate-200 dark:border-surface-700 text-slate-700 dark:text-surface-300 hover:bg-slate-50 dark:hover:bg-surface-800"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>Withdraw</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: CREATE GOAL */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create a New Savings Goal">
        <form onSubmit={handleCreateGoal} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-danger-500/10 border border-danger-500/20 text-danger-500 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label htmlFor="goalTitle" className="input-label">Goal Title *</label>
            <input
              id="goalTitle"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. New Laptop, College Fund, Trip to Goa"
              className="input-field text-xs"
            />
          </div>

          <div>
            <label className="input-label">Short Description (Optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Saving ₹500/week from allowance"
              className="input-field text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="input-label">Target Amount (₹) *</label>
              <input
                type="number"
                required
                min="1"
                step="any"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="5000"
                className="input-field text-xs font-mono font-bold"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="targetDate" className="input-label mb-0">Target Date *</label>
                <div className="flex gap-1">
                  {[
                    { label: '+1M', m: 1 },
                    { label: '+3M', m: 3 },
                    { label: '+6M', m: 6 },
                    { label: '+1Y', m: 12 },
                  ].map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => applyDateOffset(chip.m)}
                      className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-surface-700 text-slate-600 dark:text-surface-300 hover:bg-primary-500 hover:text-white text-[10px] font-bold transition-colors"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
              <input
                id="targetDate"
                type="date"
                required
                min={new Date().toISOString().split('T')[0]}
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="input-field text-xs [color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>
          </div>

          {/* Priority & Icon Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="input-label">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'LOW' | 'MEDIUM' | 'HIGH')}
                className="select-field text-xs"
              >
                <option value="LOW">Low Priority</option>
                <option value="MEDIUM">Medium Priority</option>
                <option value="HIGH">High Priority</option>
              </select>
            </div>
            <div>
              <label className="input-label">Accent Color</label>
              <div className="flex gap-2 pt-1">
                {COLORS_LIST.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-full transition-transform ${color === c ? 'ring-2 ring-offset-2 ring-primary-500 scale-110' : 'opacity-80 hover:opacity-100'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="input-label">Icon Emoji</label>
            <div className="flex flex-wrap gap-2 pt-1">
              {ICONS_LIST.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setIcon(em)}
                  className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all ${
                    icon === em
                      ? 'bg-primary-50 dark:bg-primary-950/50 ring-2 ring-primary-500 scale-110'
                      : 'bg-slate-100 dark:bg-surface-800 hover:bg-slate-200 dark:hover:bg-surface-700'
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2.5 pt-3 border-t border-slate-100 dark:border-surface-800">
            <Button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              variant="secondary"
              size="sm"
              className="flex-1 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              className="flex-1 text-xs font-bold shadow-md shadow-primary-500/25"
            >
              Create Goal
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: EDIT GOAL */}
      <Modal isOpen={!!editingGoal} onClose={() => setEditingGoal(null)} title="Edit Savings Goal">
        <form onSubmit={handleUpdateGoal} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-danger-500/10 border border-danger-500/20 text-danger-500 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="input-label">Goal Title *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field text-xs"
            />
          </div>

          <div>
            <label className="input-label">Short Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">Target Amount (₹) *</label>
              <input
                type="number"
                required
                min="1"
                step="any"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="input-field text-xs font-mono font-bold"
              />
            </div>
            <div>
              <label className="input-label">Target Date</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="input-field text-xs [color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>
          </div>

          <div className="flex gap-2.5 pt-3 border-t border-slate-100 dark:border-surface-800">
            <Button
              type="button"
              onClick={() => setEditingGoal(null)}
              variant="secondary"
              size="sm"
              className="flex-1 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              className="flex-1 text-xs font-bold"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: ALLOCATE / ADD MONEY TO GOAL */}
      <Modal
        isOpen={!!allocatingGoal}
        onClose={() => setAllocatingGoal(null)}
        title={allocatingGoal ? `Add Money to "${allocatingGoal.name}"` : 'Add Money to Goal'}
      >
        <form onSubmit={handleAllocate} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-danger-500/10 border border-danger-500/20 text-danger-500 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-surface-800/80 border border-slate-200/60 dark:border-surface-700/60 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 dark:text-surface-400">Available Wallet Balance</span>
              <p className="text-sm font-bold text-slate-900 dark:text-white font-mono">{formatCurrency(walletBalance)}</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500 dark:text-surface-400">Currently Saved</span>
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">{formatCurrency(allocatingGoal?.currentAmount || 0)}</p>
            </div>
          </div>

          <div>
            <label className="input-label">Amount to Add (₹) *</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
              <input
                type="number"
                required
                min="1"
                max={walletBalance}
                step="any"
                value={actionAmount}
                onChange={(e) => setActionAmount(e.target.value)}
                placeholder="500"
                className="input-field pl-8 font-mono font-bold text-sm"
              />
            </div>

            {/* Quick Chips */}
            <div className="flex gap-1.5 mt-2">
              {[100, 250, 500, 1000].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  disabled={chip > walletBalance}
                  onClick={() => setActionAmount(chip.toString())}
                  className="flex-1 py-1 px-2 rounded-lg bg-slate-100 dark:bg-surface-800 hover:bg-primary-50 dark:hover:bg-primary-950/40 text-slate-700 dark:text-surface-300 text-xs font-semibold disabled:opacity-40"
                >
                  +₹{chip}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2.5 pt-3 border-t border-slate-100 dark:border-surface-800">
            <Button
              type="button"
              onClick={() => setAllocatingGoal(null)}
              variant="secondary"
              size="sm"
              className="flex-1 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !actionAmount || parseFloat(actionAmount) > walletBalance}
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              className="flex-1 text-xs font-bold shadow-md shadow-primary-500/25"
            >
              Transfer to Goal
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 4: WITHDRAW FROM GOAL BACK TO WALLET */}
      <Modal
        isOpen={!!withdrawingGoal}
        onClose={() => setWithdrawingGoal(null)}
        title={withdrawingGoal ? `Withdraw from "${withdrawingGoal.name}"` : 'Withdraw from Goal'}
      >
        <form onSubmit={handleWithdraw} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-danger-500/10 border border-danger-500/20 text-danger-500 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-surface-800/80 border border-slate-200/60 dark:border-surface-700/60 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 dark:text-surface-400">Available in Goal</span>
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                {formatCurrency(withdrawingGoal?.currentAmount || 0)}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500 dark:text-surface-400">Destination</span>
              <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-primary-500" />
                FST Pay Wallet
              </p>
            </div>
          </div>

          <div>
            <label className="input-label">Amount to Withdraw (₹) *</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
              <input
                type="number"
                required
                min="1"
                max={withdrawingGoal?.currentAmount || 0}
                step="any"
                value={actionAmount}
                onChange={(e) => setActionAmount(e.target.value)}
                placeholder="100"
                className="input-field pl-8 font-mono font-bold text-sm"
              />
            </div>
          </div>

          <div className="flex gap-2.5 pt-3 border-t border-slate-100 dark:border-surface-800">
            <Button
              type="button"
              onClick={() => setWithdrawingGoal(null)}
              variant="secondary"
              size="sm"
              className="flex-1 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !actionAmount}
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              className="flex-1 text-xs font-bold"
            >
              Confirm Withdrawal
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 5: AUTO ROUND-UP CONFIGURATION */}
      <Modal
        isOpen={roundUpModalOpen}
        onClose={() => setRoundUpModalOpen(false)}
        title="Automated Spare Change Round-Ups"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-surface-300">
            Whenever you make a purchase or spend online, FST Pay rounds up the total amount to the nearest selected denomination and automatically deposits the difference into your chosen savings goal.
          </p>

          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs">
            <strong>How it works:</strong> If you buy coffee for ₹184 and choose <em>Nearest ₹10</em>, you pay ₹190. The ₹6 difference goes straight into your savings goal!
          </div>

          {goals.length === 0 ? (
            <div className="text-center py-4 text-xs text-slate-500">
              Please create at least one savings goal first before configuring Round-Up.
            </div>
          ) : (
            <>
              <div>
                <label className="input-label">Target Savings Goal</label>
                <select
                  value={selectedRoundUpGoalId}
                  onChange={(e) => setSelectedRoundUpGoalId(e.target.value)}
                  className="select-field text-xs"
                >
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.icon || '🎯'} {g.name} ({formatCurrency(g.currentAmount)} / {formatCurrency(g.targetAmount)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="input-label">Round Up Denomination</label>
                <div className="grid grid-cols-3 gap-2">
                  {[10, 50, 100].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setSelectedNearest(amt)}
                      className={`p-3 rounded-2xl border text-center font-bold text-xs transition-all ${
                        selectedNearest === amt
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 ring-2 ring-primary-500/30'
                          : 'border-slate-200 dark:border-surface-700 text-slate-700 dark:text-surface-300 hover:bg-slate-50 dark:hover:bg-surface-800'
                      }`}
                    >
                      Nearest ₹{amt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-slate-100 dark:border-surface-800">
                <Button
                  type="button"
                  onClick={() => setRoundUpModalOpen(false)}
                  variant="secondary"
                  size="sm"
                  className="flex-1 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleToggleRoundUp}
                  disabled={isSubmitting}
                  variant={roundUpRule?.enabled ? 'danger' : 'primary'}
                  size="sm"
                  isLoading={isSubmitting}
                  className="flex-1 text-xs font-bold"
                >
                  {roundUpRule?.enabled ? 'Pause Round-Ups' : 'Activate Round-Ups'}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Accessible Goal Deletion Confirmation Modal */}
      <Modal
        isOpen={confirmDeleteGoal !== null}
        onClose={() => setConfirmDeleteGoal(null)}
        title="Delete Savings Goal"
      >
        <div className="space-y-4" aria-live="polite">
          <div className="flex items-start gap-3 p-1">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <p className="text-sm text-slate-700 dark:text-surface-200">
              Are you sure you want to delete the goal <strong className="text-slate-900 dark:text-white">&ldquo;{confirmDeleteGoal?.name}&rdquo;</strong>? Any allocated funds will remain securely stored in your wallet.
            </p>
          </div>
          <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-surface-800">
            <Button
              type="button"
              onClick={() => setConfirmDeleteGoal(null)}
              variant="secondary"
              size="sm"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmDelete}
              variant="danger"
              size="sm"
              className="bg-rose-600 hover:bg-rose-700 font-bold"
            >
              Delete Goal
            </Button>
          </div>
        </div>
      </Modal>
    </PageTransition>
  );
}
