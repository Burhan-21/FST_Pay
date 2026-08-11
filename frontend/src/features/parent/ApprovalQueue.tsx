import { useState, useEffect } from 'react';
import axios from 'axios';
import { parentalApi } from '../../api/endpoints';
import { Check, X, Loader2, Info, MessageSquare, Clock, Calendar, AlertCircle } from 'lucide-react';
import type { TransactionApproval } from '../../types';
import PageTransition from '../../components/ui/PageTransition';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';

export default function ApprovalQueue() {
  const [pending, setPending] = useState<TransactionApproval[]>([]);
  const [history, setHistory] = useState<TransactionApproval[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [isLoading, setIsLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  
  // Note inputs state mapping (approvalId -> noteText)
  const [notes, setNotes] = useState<Record<string, string>>({});

  // Custom alert modal state
  const [alertConfig, setAlertConfig] = useState<{ title: string; message: string } | null>(null);

  const fetchQueueData = async () => {
    try {
      const [pendingRes, historyRes] = await Promise.all([
        parentalApi.getPendingApprovals(),
        parentalApi.getParentApprovalHistory()
      ]);
      if (pendingRes.data?.data) setPending(pendingRes.data.data);
      if (historyRes.data?.data) setHistory(historyRes.data.data);
    } catch (err: unknown) {
      console.error('Failed to load approvals queue:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const [pendingRes, historyRes] = await Promise.all([
          parentalApi.getPendingApprovals(),
          parentalApi.getParentApprovalHistory()
        ]);
        if (isMounted) {
          if (pendingRes.data?.data) setPending(pendingRes.data.data);
          if (historyRes.data?.data) setHistory(historyRes.data.data);
        }
      } catch (err: unknown) {
        console.error('Failed to load approvals queue:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    loadData();
    return () => { isMounted = false; };
  }, []);

  const handleResolve = async (id: string, decision: 'APPROVED' | 'REJECTED') => {
    setSubmittingId(id);
    try {
      const parentNote = notes[id] || `Request ${decision.toLowerCase()} by parent.`;
      await parentalApi.decideApproval(id, { decision, parentNote });
      // Clear note
      setNotes(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      fetchQueueData();
    } catch (err: unknown) {
      setAlertConfig({
        title: 'Decision Error',
        message: axios.isAxiosError<{ message?: string }>(err)
          ? err.response?.data?.message || 'Failed to resolve request.'
          : 'Failed to resolve request.'
      });
    } finally {
      setSubmittingId(null);
    }
  };

  const handleNoteChange = (id: string, text: string) => {
    setNotes(prev => ({
      ...prev,
      [id]: text
    }));
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center animate-pulse-glow shadow-glow">
          <Loader2 className="w-6 h-6 text-white animate-spin" />
        </div>
        <p className="text-surface-400 text-sm">Loading approvals queue...</p>
      </div>
    );
  }

  const activeApprovals = activeTab === 'pending' ? pending : history;

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Tab Selectors */}
        <div className="flex justify-between items-center border-b border-surface-700/50 pb-3">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('pending')}
              className={`text-base font-bold pb-2 border-b-2 transition-all ${
                activeTab === 'pending'
                  ? 'border-primary-500 text-white'
                  : 'border-transparent text-surface-400 hover:text-white'
              }`}
            >
              Pending Requests ({pending.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`text-base font-bold pb-2 border-b-2 transition-all ${
                activeTab === 'history'
                  ? 'border-primary-500 text-white'
                  : 'border-transparent text-surface-400 hover:text-white'
              }`}
            >
              Resolution History
            </button>
          </div>
        </div>

        {activeApprovals.length === 0 ? (
          <GlassCard padding="none" className="text-center max-w-md mx-auto space-y-4 p-12">
            <Info className="w-10 h-10 text-surface-500 mx-auto" />
            <p className="text-surface-400 text-sm font-medium">
              {activeTab === 'pending' ? 'No pending approval requests!' : 'No approval history found.'}
            </p>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeApprovals.map((app) => {
              const isPending = app.status === 'PENDING';
              const isApproved = app.status === 'APPROVED';
              return (
                <GlassCard key={app.id} padding="md" className="flex flex-col justify-between space-y-4 border border-white/5 hover:border-primary-500/10 transition-all">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-primary-400 font-bold uppercase tracking-wider block">TEEN</span>
                        <span className="text-sm text-white font-bold mt-0.5">{app.child?.fullName || 'Child'}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-surface-400 font-bold uppercase tracking-wider block">TYPE</span>
                        <span className="text-xs text-white font-semibold mt-0.5">{app.requestType}</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-surface-900/40 border border-white/3 space-y-2">
                      <p className="text-xs text-surface-300 font-medium">{app.description}</p>
                      {app.amount && app.amount > 0 && (
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-surface-800/40">
                          <span className="text-surface-400">Requested Amount</span>
                          <span className="text-accent-400 font-bold">₹{app.amount.toLocaleString()}</span>
                        </div>
                      )}
                      {app.merchant && (
                        <div className="flex items-center justify-between text-[10px] text-surface-500">
                          <span>Merchant: {app.merchant}</span>
                          <span>Category: {app.category}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-surface-500">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Requested: {new Date(app.createdAt).toLocaleString()}</span>
                    </div>
                  </div>

                  {isPending ? (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center gap-2 input-field px-2.5 py-1">
                        <MessageSquare className="w-4 h-4 text-surface-500" />
                        <input
                          type="text"
                          value={notes[app.id] || ''}
                          onChange={(e) => handleNoteChange(app.id, e.target.value)}
                          placeholder="Add decision note (optional)"
                          className="bg-transparent flex-1 py-2 text-white focus:outline-none text-xs"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          onClick={() => handleResolve(app.id, 'REJECTED')}
                          disabled={submittingId === app.id}
                          variant="ghost"
                          size="sm"
                          className="text-danger-400 border-danger-500/10 hover:bg-danger-500/15 py-2 flex items-center justify-center gap-1.5 font-bold"
                        >
                          {submittingId === app.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                          Reject
                        </Button>
                        <Button
                          onClick={() => handleResolve(app.id, 'APPROVED')}
                          disabled={submittingId === app.id}
                          variant="primary"
                          size="sm"
                          className="py-2 flex items-center justify-center gap-1.5 font-bold"
                        >
                          {submittingId === app.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          Approve & Execute
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-surface-800/60 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-surface-400">Resolution status</span>
                        <span className={`font-bold ${isApproved ? 'text-accent-400' : 'text-rose-400'}`}>
                          {app.status}
                        </span>
                      </div>
                      {app.parentNote && (
                        <p className="text-[11px] text-surface-400 bg-white/2 p-2 rounded border border-white/3 italic">
                          Note: "{app.parentNote}"
                        </p>
                      )}
                      {app.decidedAt && (
                        <div className="flex items-center gap-1.5 text-[10px] text-surface-500">
                          <Calendar className="w-3 h-3" />
                          <span>Resolved at: {new Date(app.decidedAt).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  )}
                </GlassCard>
              );
            })}
          </div>
        )}

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
