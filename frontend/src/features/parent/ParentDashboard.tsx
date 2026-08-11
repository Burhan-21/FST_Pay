import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../hooks/useAuth';
import { parentalApi } from '../../api/endpoints';
import { formatCurrency } from '../../utils/helpers';
import { Link } from 'react-router-dom';
import {
  Wallet, Shield, ArrowUpRight, Check, Bell,
  Loader2, Send, ToggleLeft, ToggleRight, Info, Users, Target, Activity, AlertCircle
} from 'lucide-react';
import type { ParentDashboardData, ChildSummary } from '../../types';
import PageTransition from '../../components/ui/PageTransition';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import StatCard from '../../components/ui/StatCard';

export default function ParentDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<ParentDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modals state
  const [selectedChild, setSelectedChild] = useState<ChildSummary | null>(null);
  const [pocketMoneyOpen, setPocketMoneyOpen] = useState(false);
  const [limitsOpen, setLimitsOpen] = useState(false);

  // Custom alert state
  const [alertConfig, setAlertConfig] = useState<{ title: string; message: string } | null>(null);

  // Form values
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDesc, setTransferDesc] = useState('Monthly pocket money');
  const [maxTxnLimit, setMaxTxnLimit] = useState('');
  const [dailyLimit, setDailyLimit] = useState('');
  const [weeklyLimit, setWeeklyLimit] = useState('');
  const [monthlyLimit, setMonthlyLimit] = useState('');
  const [restrictedCats, setRestrictedCats] = useState('');
  const [controlsEnabled, setControlsEnabled] = useState(true);
  const [submittingAction, setSubmittingAction] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const res = await parentalApi.getDashboard();
      if (res.data?.data) {
        setData(res.data.data);
      }
    } catch (err: unknown) {
      console.error('Failed to load parent dashboard:', err);
      setError('Could not retrieve dashboard information. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const loadDashboard = async () => {
      try {
        const res = await parentalApi.getDashboard();
        if (isMounted && res.data?.data) {
          setData(res.data.data);
        }
      } catch (err: unknown) {
        console.error('Failed to load parent dashboard:', err);
        if (isMounted) setError('Could not retrieve dashboard information. Please try again.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    loadDashboard();
    return () => { isMounted = false; };
  }, []);

  const handleSendPocketMoney = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChild || !transferAmount) return;
    setSubmittingAction(true);
    try {
      await parentalApi.sendPocketMoney({
        childId: selectedChild.id,
        amount: parseFloat(transferAmount),
        description: transferDesc
      });
      setPocketMoneyOpen(false);
      setTransferAmount('');
      fetchDashboardData();
    } catch (err: unknown) {
      setAlertConfig({
        title: 'Transfer Failed',
        message: axios.isAxiosError<{ message?: string }>(err)
          ? err.response?.data?.message || 'Transfer failed. Check your wallet balance.'
          : 'Transfer failed. Check your wallet balance.'
      });
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleSaveLimits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChild) return;
    setSubmittingAction(true);
    try {
      await parentalApi.setSpendingLimits(selectedChild.id, {
        parentalControlEnabled: controlsEnabled,
        parentalMaxTxnAmount: maxTxnLimit ? parseFloat(maxTxnLimit) : 0,
        parentalDailyLimit: dailyLimit ? parseFloat(dailyLimit) : 0,
        parentalWeeklyLimit: weeklyLimit ? parseFloat(weeklyLimit) : 0,
        parentalMonthlyLimit: monthlyLimit ? parseFloat(monthlyLimit) : 0,
        parentalRestrictedCategories: restrictedCats
      });
      setLimitsOpen(false);
      fetchDashboardData();
    } catch (err: unknown) {
      setAlertConfig({
        title: 'Limit Adjust Failed',
        message: axios.isAxiosError<{ message?: string }>(err)
          ? err.response?.data?.message || 'Failed to update spending limits.'
          : 'Failed to update spending limits.'
      });
    } finally {
      setSubmittingAction(false);
    }
  };

  const openPocketMoneyModal = (child: ChildSummary) => {
    setSelectedChild(child);
    setTransferAmount('');
    setTransferDesc('Monthly pocket money');
    setPocketMoneyOpen(true);
  };

  const openLimitsModal = (child: ChildSummary) => {
    setSelectedChild(child);
    setControlsEnabled(child.parentalControlEnabled ?? true);
    setMaxTxnLimit(child.parentalMaxTxnAmount ? child.parentalMaxTxnAmount.toString() : '');
    setDailyLimit(child.parentalDailyLimit ? child.parentalDailyLimit.toString() : '');
    setWeeklyLimit(child.parentalWeeklyLimit ? child.parentalWeeklyLimit.toString() : '');
    setMonthlyLimit(child.parentalMonthlyLimit ? child.parentalMonthlyLimit.toString() : '');
    setRestrictedCats(child.parentalRestrictedCategories || '');
    setLimitsOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center animate-pulse-glow shadow-glow">
          <Loader2 className="w-6 h-6 text-white animate-spin" />
        </div>
        <p className="text-surface-400 text-sm animate-pulse">Loading parent workspace...</p>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 page-section">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl gradient-card flex items-center justify-center shadow-2xl shadow-primary-500/20 text-white">
              <span className="text-2xl font-bold">{user?.fullName?.charAt(0).toUpperCase() || 'P'}</span>
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-white">
                Parental Dashboard
              </h1>
              <p className="text-surface-400 text-sm mt-0.5">Protecting and empowering your family's future</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/parent/approvals" className="btn-glass text-sm gap-2 flex items-center">
              <Shield className="w-4 h-4" />
              Approvals Queue
              {data && data.pendingApprovalsCount > 0 && (
                <span className="bg-danger-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold">
                  {data.pendingApprovalsCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-danger-500/10 border border-danger-500/20 text-danger-400 text-sm animate-slide-down">
            {error}
          </div>
        )}

        {/* Stats Cards Widget Row */}
        {data && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Linked Children"
              value={`${data.children.length} Teens`}
              icon={Users}
              iconColor="text-blue-400"
            />
            <StatCard
              label="Kids Net Balance"
              value={formatCurrency(data.totalChildrenBalance)}
              icon={Wallet}
              iconColor="text-primary-400"
            />
            <StatCard
              label="Allowance Sent (This Month)"
              value={formatCurrency(data.totalPocketMoneySentThisMonth)}
              icon={ArrowUpRight}
              iconColor="text-accent-400"
            />
            <StatCard
              label="Pending Approvals"
              value={`${data.pendingApprovalsCount} Requests`}
              icon={Shield}
              iconColor="text-amber-400"
            />
          </div>
        )}

        {/* Kids overview list */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <GlassCard padding="lg" className="space-y-4">
              <h3 className="text-lg font-display font-bold text-white tracking-wide border-b border-surface-700/50 pb-3">
                Linked Teen Accounts
              </h3>

              {(!data || data.children.length === 0) ? (
                <div className="text-center py-12 border border-dashed border-surface-700 rounded-2xl">
                  <Info className="w-10 h-10 text-surface-500 mx-auto mb-3" />
                  <p className="text-surface-400 text-sm font-medium">No children linked to your parent account.</p>
                  <p className="text-xs text-surface-500 mt-1 max-w-xs mx-auto">
                    Have your teen initiate an invitation from their FST Pay dashboard to link with you.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.children.map((child) => (
                    <div key={child.id} className="p-4 rounded-xl border border-white/5 bg-white/3 space-y-4 hover:border-primary-500/20 transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h4 className="text-base font-bold text-white">{child.fullName}</h4>
                          <p className="text-xs text-surface-500 mt-0.5">{child.email}</p>
                        </div>
                        <Link to={`/parent/child/${child.id}`} className="text-xs text-primary-400 hover:text-primary-300 font-semibold flex items-center gap-1">
                          View Full Profile & Cards <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-3 rounded-lg bg-surface-900/40">
                        <div>
                          <span className="text-[10px] text-surface-400 font-medium block">LIMITS</span>
                          <span className="text-xs text-warning-400 font-bold mt-0.5">
                            {child.parentalControlEnabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-surface-400 font-medium block">DAILY LIMIT</span>
                          <span className="text-xs text-white font-semibold mt-0.5">
                            {child.parentalDailyLimit && child.parentalDailyLimit > 0 ? `₹${child.parentalDailyLimit}` : 'None'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-surface-400 font-medium block">MONTHLY LIMIT</span>
                          <span className="text-xs text-white font-semibold mt-0.5">
                            {child.parentalMonthlyLimit && child.parentalMonthlyLimit > 0 ? `₹${child.parentalMonthlyLimit}` : 'None'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-surface-400 font-medium block">MAX TRANS</span>
                          <span className="text-xs text-white font-semibold mt-0.5">
                            {child.parentalMaxTxnAmount && child.parentalMaxTxnAmount > 0 ? `₹${child.parentalMaxTxnAmount}` : 'None'}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button
                          onClick={() => openPocketMoneyModal(child)}
                          variant="ghost"
                          size="sm"
                          className="text-xs gap-1.5 px-3 py-1.5 border border-surface-700/60"
                        >
                          <Send className="w-3.5 h-3.5 text-accent-400" />
                          Send Pocket Money
                        </Button>
                        <Button
                          onClick={() => openLimitsModal(child)}
                          variant="ghost"
                          size="sm"
                          className="text-xs gap-1.5 px-3 py-1.5 border border-surface-700/60"
                        >
                          <Shield className="w-3.5 h-3.5 text-primary-400" />
                          Adjust Limits
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>

            {/* Activity Timeline / Recent Activities */}
            {data && data.activityTimeline.length > 0 && (
              <GlassCard padding="lg">
                <div className="flex items-center gap-2 border-b border-surface-700/50 pb-3 mb-4">
                  <Activity className="w-5 h-5 text-primary-400" />
                  <h3 className="text-lg font-display font-bold text-white tracking-wide">
                    Recent Activities
                  </h3>
                </div>
                <div className="relative border-l border-surface-700 ml-3 pl-5 space-y-5">
                  {data.activityTimeline.map((event, i) => (
                    <div key={i} className="relative">
                      <span className="absolute -left-[26px] top-0 bg-surface-900 border border-surface-700 rounded-full w-3.5 h-3.5 flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-400" />
                      </span>
                      <div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs text-surface-400 font-bold uppercase tracking-wider">{event.type}</span>
                          <span className="text-[10px] text-surface-500 font-medium">
                            {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-sm text-white font-medium mt-1">{event.title}</p>
                        <p className="text-xs text-surface-400 mt-0.5">
                          {event.childName} · {event.description}
                        </p>
                        {event.amount && event.amount > 0 && (
                          <p className="text-xs text-accent-400 font-bold mt-1">₹{event.amount.toLocaleString()}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}
          </div>

          {/* Right Panel: Pending Approvals & Goals Status */}
          <div className="space-y-6">
            {/* Action Required Quick Approvals */}
            <GlassCard padding="lg" className="space-y-4">
              <h3 className="text-lg font-display font-bold text-white tracking-wide border-b border-surface-700/50 pb-2 flex items-center gap-2">
                <Shield className="w-4 h-4 text-warning-400" />
                <span>Action Required</span>
              </h3>

              {(!data || data.pendingApprovalsCount === 0) ? (
                <p className="text-surface-500 text-xs text-center py-6">All clear! No pending approval requests.</p>
              ) : (
                <div className="space-y-3">
                  {data.activityTimeline
                    .filter(e => e.type === 'APPROVAL_REQUEST')
                    .slice(0, 3)
                    .map((req, idx) => (
                      <div key={idx} className="p-3 rounded-lg border border-white/5 bg-white/3 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-primary-300 font-bold">{req.childName}</span>
                          <span className="text-surface-400 font-medium">₹{req.amount}</span>
                        </div>
                        <p className="text-xs text-surface-400">{req.description}</p>
                        <Link to="/parent/approvals" className="text-[10px] text-primary-400 hover:underline block text-right font-medium">
                          Go resolve request →
                        </Link>
                      </div>
                    ))}
                </div>
              )}
            </GlassCard>

            {/* Goals Status Widget */}
            <GlassCard padding="lg" className="space-y-4">
              <div className="flex items-center gap-2 border-b border-surface-700/50 pb-3">
                <Target className="w-5 h-5 text-accent-400" />
                <h3 className="text-lg font-display font-bold text-white tracking-wide">
                  Teen Goals Status
                </h3>
              </div>
              
              {(!data || data.children.length === 0) ? (
                <p className="text-surface-500 text-xs text-center py-4">No active savings goals found.</p>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-white">Save for College Laptop</span>
                      <span className="text-accent-400">₹15,000 / ₹25,000 (60%)</span>
                    </div>
                    <div className="w-full bg-surface-900 rounded-full h-1.5">
                      <div className="bg-gradient-to-r from-accent-500 to-teal-500 h-1.5 rounded-full" style={{ width: '60%' }}></div>
                    </div>
                    <p className="text-[10px] text-surface-500">Owner: {data.children[0]?.fullName || 'Teen'}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-white">Summer Coding BootCamp</span>
                      <span className="text-primary-400">₹8,000 / ₹10,000 (80%)</span>
                    </div>
                    <div className="w-full bg-surface-900 rounded-full h-1.5">
                      <div className="bg-gradient-to-r from-primary-500 to-purple-500 h-1.5 rounded-full" style={{ width: '80%' }}></div>
                    </div>
                    <p className="text-[10px] text-surface-500">Owner: {data.children[0]?.fullName || 'Teen'}</p>
                  </div>
                </div>
              )}
            </GlassCard>

            {/* Notifications feed */}
            {data && data.recentNotifications.length > 0 && (
              <GlassCard padding="lg">
                <h3 className="text-lg font-display font-bold text-white tracking-wide border-b border-surface-700/50 pb-3 mb-3 flex items-center justify-between">
                  <span>Alerts History</span>
                  <button
                    onClick={async () => {
                      await parentalApi.markNotificationsAsRead();
                      fetchDashboardData();
                    }}
                    className="text-xs text-primary-400 hover:text-primary-300 transition-colors font-medium"
                  >
                    Clear All
                  </button>
                </h3>
                <div className="space-y-3">
                  {data.recentNotifications.slice(0, 5).map((noti) => (
                    <div key={noti.id} className={`p-2.5 rounded-lg flex gap-3 text-xs border ${noti.isRead ? 'border-white/3 bg-white/1' : 'border-primary-500/10 bg-primary-500/5'}`}>
                      <div className="shrink-0 mt-0.5 text-primary-400">
                        <Bell className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">{noti.title}</p>
                        <p className="text-surface-400 mt-0.5">{noti.message}</p>
                        <p className="text-[10px] text-surface-500 mt-1">
                          {new Date(noti.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}
          </div>
        </div>

        {/* Pocket Money Modal */}
        <Modal
          isOpen={pocketMoneyOpen && selectedChild !== null}
          onClose={() => setPocketMoneyOpen(false)}
          title="Send Pocket Money"
        >
          {selectedChild && (
            <form onSubmit={handleSendPocketMoney} className="space-y-4">
              <div>
                <label className="input-label">Transfer To</label>
                <p className="text-sm text-white font-medium">{selectedChild.fullName} ({selectedChild.email})</p>
              </div>

              <div>
                <label htmlFor="pocketMoneyAmt" className="input-label">Amount (₹)</label>
                <input
                  id="pocketMoneyAmt"
                  type="number"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="200"
                  required
                  min={1}
                  className="input-field text-xl font-bold py-3 focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label htmlFor="pocketMoneyDesc" className="input-label">Transfer Description</label>
                <input
                  id="pocketMoneyDesc"
                  type="text"
                  value={transferDesc}
                  onChange={(e) => setTransferDesc(e.target.value)}
                  placeholder="Weekly pocket money"
                  required
                  className="input-field py-2 focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <Button
                type="submit"
                disabled={submittingAction}
                variant="primary"
                className="w-full py-2.5 flex items-center justify-center gap-2 text-sm font-bold"
              >
                {submittingAction ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Confirm Pocket Money Send
                    <ArrowUpRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>
          )}
        </Modal>

        {/* Spending Limits Modal */}
        <Modal
          isOpen={limitsOpen && selectedChild !== null}
          onClose={() => setLimitsOpen(false)}
          title="Adjust Spending Limits"
        >
          {selectedChild && (
            <form onSubmit={handleSaveLimits} className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-surface-900/40 border border-white/5">
                <div>
                  <p className="text-sm font-semibold text-white">Parental Controls</p>
                  <p className="text-xs text-surface-500">Enable spending limit rules for this child</p>
                </div>
                <button
                  type="button"
                  onClick={() => setControlsEnabled(!controlsEnabled)}
                  className="text-primary-400"
                >
                  {controlsEnabled ? <ToggleRight className="w-12 h-8" /> : <ToggleLeft className="w-12 h-8 text-surface-600" />}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="maxTxLimit" className="input-label">Per-Transaction Limit (₹)</label>
                  <input
                    id="maxTxLimit"
                    type="number"
                    value={maxTxnLimit}
                    onChange={(e) => setMaxTxnLimit(e.target.value)}
                    placeholder="Enter limit amount"
                    className="input-field py-2 text-sm focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label htmlFor="dayLimit" className="input-label">Daily Limit (₹)</label>
                  <input
                    id="dayLimit"
                    type="number"
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(e.target.value)}
                    placeholder="Enter daily limit"
                    className="input-field py-2 text-sm focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="weekLimit" className="input-label">Weekly Limit (₹)</label>
                  <input
                    id="weekLimit"
                    type="number"
                    value={weeklyLimit}
                    onChange={(e) => setWeeklyLimit(e.target.value)}
                    placeholder="Enter weekly limit"
                    className="input-field py-2 text-sm focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label htmlFor="monthLimit" className="input-label">Monthly Limit (₹)</label>
                  <input
                    id="monthLimit"
                    type="number"
                    value={monthlyLimit}
                    onChange={(e) => setMonthlyLimit(e.target.value)}
                    placeholder="Enter monthly limit"
                    className="input-field py-2 text-sm focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="restrictedCats" className="input-label">Restricted Categories (Comma Separated)</label>
                <input
                  id="restrictedCats"
                  type="text"
                  value={restrictedCats}
                  onChange={(e) => setRestrictedCats(e.target.value)}
                  placeholder="GAMING, ENTERTAINMENT, LIQUOR"
                  className="input-field py-2 text-sm focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <Button
                type="submit"
                disabled={submittingAction}
                variant="primary"
                className="w-full py-2.5 flex items-center justify-center gap-2 text-sm font-bold"
              >
                {submittingAction ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Save spending limits
                    <Check className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>
          )}
        </Modal>

        {/* CUSTOM ALERT MODAL */}
        <Modal
          isOpen={alertConfig !== null}
          onClose={() => setAlertConfig(null)}
          title={alertConfig?.title}
        >
          <div className="space-y-4" aria-live="polite">
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
      </div>
    </PageTransition>
  );
}
