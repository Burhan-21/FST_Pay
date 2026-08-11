import { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { parentalApi } from '../../api/endpoints';
import { formatCurrency, getCategoryEmoji } from '../../utils/helpers';
import { ArrowLeft, Trash2, Loader2, AlertCircle } from 'lucide-react';
import type { ChildDetail, VirtualCard } from '../../types';
import PageTransition from '../../components/ui/PageTransition';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';

export default function ChildOverview() {
  const { childId } = useParams<{ childId: string }>();
  const navigate = useNavigate();
  const [child, setChild] = useState<ChildDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  // Custom alert/confirm state to replace browser native APIs
  const [alertConfig, setAlertConfig] = useState<{ title: string; message: string } | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  const fetchChildDetails = async () => {
    if (!childId) return;
    try {
      const res = await parentalApi.getChildDetails(childId);
      if (res.data?.data) {
        setChild(res.data.data);
      }
    } catch (err: unknown) {
      console.error('Failed to load child details:', err);
      setError('Could not retrieve child profile details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!childId) return;
    let isMounted = true;
    const loadDetails = async () => {
      try {
        const res = await parentalApi.getChildDetails(childId);
        if (isMounted && res.data?.data) {
          setChild(res.data.data);
        }
      } catch (err: unknown) {
        console.error('Failed to load child details:', err);
        if (isMounted) setError('Could not retrieve child profile details.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    loadDetails();
    return () => { isMounted = false; };
  }, [childId]);

  const handleToggleFreeze = async (card: VirtualCard) => {
    if (!childId) return;
    setSubmittingAction(true);
    try {
      if (card.status === 'ACTIVE') {
        await parentalApi.freezeChildCard(childId, card.id);
      } else {
        await parentalApi.unfreezeChildCard(childId, card.id);
      }
      fetchChildDetails();
    } catch (err: unknown) {
      setAlertConfig({
        title: 'Error',
        message: axios.isAxiosError<{ message?: string }>(err)
          ? err.response?.data?.message || 'Failed to toggle card status'
          : 'Failed to toggle card status'
      });
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleUnlink = async () => {
    if (!childId) return;
    setConfirmConfig({
      title: 'Unlink Account',
      message: `Are you sure you want to unlink from ${child?.fullName}? You will lose access to their spending analytics and limits.`,
      onConfirm: async () => {
        setConfirmConfig(null);
        setSubmittingAction(true);
        try {
          await parentalApi.unlinkChild(childId);
          navigate('/parent/dashboard');
        } catch (err: unknown) {
          setAlertConfig({
            title: 'Error',
            message: axios.isAxiosError<{ message?: string }>(err)
              ? err.response?.data?.message || 'Failed to unlink account.'
              : 'Failed to unlink account.'
          });
        } finally {
          setSubmittingAction(false);
        }
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center animate-pulse-glow shadow-glow">
          <Loader2 className="w-6 h-6 text-white animate-spin" />
        </div>
        <p className="text-surface-400 text-sm">Retrieving profile analytics...</p>
      </div>
    );
  }

  if (error || !child) {
    return (
      <div className="p-6 glass-card text-center max-w-md mx-auto my-12 space-y-4">
        <p className="text-danger-400 text-sm font-medium">{error || 'Child profile not found'}</p>
        <Link to="/parent/dashboard" className="btn-glass text-xs inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Back Breadcrumb */}
        <div>
          <Link to="/parent/dashboard" className="text-sm text-surface-400 hover:text-white flex items-center gap-2 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Parental Dashboard
          </Link>
        </div>

        {/* Child profile banner */}
        <GlassCard padding="lg" className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-16 h-16 rounded-2xl gradient-card flex items-center justify-center text-2xl font-bold shadow-lg shadow-primary-500/10 text-white">
              {child.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-display font-bold text-white">{child.fullName}</h2>
              <p className="text-xs text-surface-400 mt-1">{child.email} · linked as <span className="text-primary-400 font-semibold">{child.relationship}</span></p>
            </div>
          </div>

          <div className="flex items-center gap-4 relative z-10">
            <div className="text-left md:text-right">
              <span className="text-[10px] text-surface-400 font-bold uppercase tracking-wider block">Wallet Balance</span>
              <p className="text-2xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-accent-400 mt-1">
                {formatCurrency(child.walletBalance)}
              </p>
            </div>
            <Button
              onClick={handleUnlink}
              disabled={submittingAction}
              variant="ghost"
              size="sm"
              className="border-danger-500/20 text-danger-400 hover:bg-danger-500/15 gap-1.5 px-3 py-2 font-bold"
            >
              <Trash2 className="w-4 h-4" /> Unlink Account
            </Button>
          </div>
        </GlassCard>

        {/* Virtual Cards section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <GlassCard padding="lg" className="space-y-5">
              <h3 className="text-lg font-display font-bold text-white tracking-wide border-b border-surface-700/50 pb-3 flex items-center justify-between">
                <span>Virtual Cards</span>
                <span className="text-xs text-surface-400 font-normal">Active cards assigned to {child.fullName}</span>
              </h3>

              {child.virtualCards.length === 0 ? (
                <p className="text-surface-500 text-xs py-6 text-center">No virtual cards generated yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {child.virtualCards.map((card) => {
                    const isFrozen = card.status === 'FROZEN';
                    const parsedDesign = card.cardDesign ? JSON.parse(card.cardDesign) : { bg: 'gradient-primary', mascot: '⚡' };
                    return (
                      <div key={card.id} className="p-4 rounded-2xl border border-white/5 bg-white/3 flex flex-col justify-between space-y-4 hover:border-primary-500/20 transition-all">
                        {/* Premium card preview */}
                        <div className={`rounded-xl p-4 text-white relative overflow-hidden h-36 flex flex-col justify-between shadow-lg ${parsedDesign.bg} ${isFrozen ? 'brightness-50 grayscale' : ''}`}>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider">{card.cardType || 'PREPAID CARD'}</span>
                            <span className="text-lg">{parsedDesign.mascot}</span>
                          </div>
                          <div>
                            <p className="text-lg font-mono tracking-widest mt-4">•••• •••• •••• {card.cardNumber.slice(-4)}</p>
                            <div className="flex items-center justify-between mt-4">
                              <span className="text-[10px] uppercase font-medium text-white/70">{card.cardHolder}</span>
                              <span className="text-[10px] font-semibold text-white/90">{String(card.expiryMonth).padStart(2, '0')}/{String(card.expiryYear).slice(-2)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Card details and status actions */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-surface-400">Card Status</span>
                            <span className={`font-bold uppercase tracking-wider ${isFrozen ? 'text-rose-400' : 'text-accent-400'}`}>
                              {card.status}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-surface-400">Monthly Limit</span>
                            <span className="font-semibold text-white">
                              {card.spendingLimit && card.spendingLimit > 0 ? `₹${card.spendingLimit}` : 'No limit'}
                            </span>
                          </div>

                          <Button
                            onClick={() => handleToggleFreeze(card)}
                            disabled={submittingAction}
                            variant={isFrozen ? 'primary' : 'ghost'}
                            size="sm"
                            className={`w-full py-2 font-bold ${
                              isFrozen
                                ? 'bg-accent-500/10 text-accent-400 border border-accent-500/20 hover:bg-accent-500/25'
                                : 'bg-danger-500/10 text-danger-400 border border-danger-500/20 hover:bg-danger-500/25'
                            }`}
                          >
                            {isFrozen ? 'Activate / Unfreeze Card' : 'Freeze Card'}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </GlassCard>

            {/* Child transactions list */}
            <GlassCard padding="lg">
              <h3 className="text-lg font-display font-bold text-white tracking-wide border-b border-surface-700/50 pb-3 mb-4">
                Recent Transactions
              </h3>
              {child.recentTransactions.length === 0 ? (
                <p className="text-surface-500 text-xs py-8 text-center">No transaction logs recorded.</p>
              ) : (
                <div className="space-y-2">
                  {child.recentTransactions.map((txn, idx) => (
                    <div key={txn.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-surface-800/30 transition-all" style={{ animationDelay: `${idx * 50}ms` }}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${txn.type === 'CREDIT' ? 'bg-accent-500/10' : 'bg-surface-700/50'}`}>
                        {getCategoryEmoji(txn.category)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{txn.merchant || txn.description}</p>
                        <p className="text-xs text-surface-500">{txn.category} · {new Date(txn.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold font-display ${txn.type === 'CREDIT' ? 'text-accent-400' : 'text-white'}`}>
                          {txn.type === 'CREDIT' ? '+' : '-'}{formatCurrency(txn.amount)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </div>

          {/* Goals list sidebar */}
          <GlassCard padding="lg" className="space-y-4">
            <h3 className="text-lg font-display font-bold text-white tracking-wide border-b border-surface-700/50 pb-2">
              Active Budget Goals
            </h3>

            {child.activeGoals.length === 0 ? (
              <p className="text-surface-500 text-xs text-center py-6">No active goals found for {child.fullName}.</p>
            ) : (
              <div className="space-y-4">
                {child.activeGoals.map((goal) => {
                  const percentage = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
                  return (
                    <div key={goal.id} className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white font-semibold flex items-center gap-1.5">
                          <span className="text-base">{goal.icon || '🎯'}</span>
                          {goal.name}
                        </span>
                        <span className="text-primary-300 font-bold">{percentage}%</span>
                      </div>
                      <div className="w-full bg-surface-900 rounded-full h-1.5">
                        <div className="bg-gradient-to-r from-primary-500 to-purple-500 h-1.5 rounded-full" style={{ width: `${percentage}%` }} />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-surface-400">
                        <span>Saved: ₹{goal.currentAmount}</span>
                        <span>Target: ₹{goal.targetAmount}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </GlassCard>
        </div>

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
                Confirm
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </PageTransition>
  );
}
