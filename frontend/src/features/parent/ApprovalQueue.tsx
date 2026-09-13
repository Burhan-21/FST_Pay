import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { parentalApi } from '../../api/endpoints';
import { Check, X, Loader2, Info, MessageSquare, Clock, Calendar, AlertCircle, Search, Radio, ShieldCheck } from 'lucide-react';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  
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

    // Real-time listener: automatically reload queue when child submits approval request via SSE
    const handleApprovalRequest = () => {
      if (isMounted) {
        loadData();
      }
    };

    window.addEventListener('fst:approval_request', handleApprovalRequest);

    return () => {
      isMounted = false;
      window.removeEventListener('fst:approval_request', handleApprovalRequest);
    };
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

  const activeApprovals = activeTab === 'pending' ? pending : history;

  const filteredApprovals = useMemo(() => {
    return activeApprovals.filter((app) => {
      const matchesType = selectedType === 'ALL' || app.requestType === selectedType;
      const teenName = app.childName || app.child?.fullName || '';
      const desc = app.description || '';
      const merchant = app.merchant || '';
      const cat = app.category || '';
      const term = searchTerm.toLowerCase();

      const matchesSearch = !searchTerm ||
        teenName.toLowerCase().includes(term) ||
        desc.toLowerCase().includes(term) ||
        merchant.toLowerCase().includes(term) ||
        cat.toLowerCase().includes(term);

      return matchesType && matchesSearch;
    });
  }, [activeApprovals, selectedType, searchTerm]);

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

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header with Live SSE Indicator */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-700/50 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-primary-400" />
              <h1 className="text-xl font-bold text-white tracking-tight">Parent Approval Center</h1>
            </div>
            <p className="text-xs text-surface-400 mt-0.5">
              Review and authorize high-value spends, card state changes, and allowance approvals.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Radio className="w-3.5 h-3.5" />
            <span>Live Stream Active</span>
          </div>
        </div>

        {/* Tab & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex gap-4 border-b sm:border-b-0 border-surface-700/50 pb-2 sm:pb-0">
            <button
              onClick={() => setActiveTab('pending')}
              className={`text-sm font-bold pb-1.5 border-b-2 transition-all ${
                activeTab === 'pending'
                  ? 'border-primary-500 text-white'
                  : 'border-transparent text-surface-400 hover:text-white'
              }`}
            >
              Pending Requests ({pending.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`text-sm font-bold pb-1.5 border-b-2 transition-all ${
                activeTab === 'history'
                  ? 'border-primary-500 text-white'
                  : 'border-transparent text-surface-400 hover:text-white'
              }`}
            >
              Resolution History ({history.length})
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by teen, merchant..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-surface-800/60 border border-surface-700/60 text-xs text-white placeholder-surface-500 focus:outline-none focus:border-primary-500 transition-colors"
              />
            </div>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-surface-800/60 border border-surface-700/60 text-xs text-surface-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-primary-500"
            >
              <option value="ALL">All Types</option>
              <option value="SPEND">Spends</option>
              <option value="CARD_FREEZE">Card Freeze</option>
              <option value="CARD_UNFREEZE">Card Unfreeze</option>
              <option value="CARD_GENERATE">Card Generate</option>
            </select>
          </div>
        </div>

        {filteredApprovals.length === 0 ? (
          <GlassCard padding="none" className="text-center max-w-md mx-auto space-y-4 p-12">
            <Info className="w-10 h-10 text-surface-500 mx-auto" />
            <p className="text-surface-400 text-sm font-medium">
              {searchTerm || selectedType !== 'ALL'
                ? 'No approval requests match the filter criteria.'
                : activeTab === 'pending'
                ? 'No pending approval requests! Everything is clear.'
                : 'No approval history found.'}
            </p>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredApprovals.map((app) => {
              const isPending = app.status === 'PENDING';
              const isApproved = app.status === 'APPROVED';
              const teenDisplayName = app.childName || app.child?.fullName || 'Teen Account';

              return (
                <GlassCard key={app.id} padding="md" className="flex flex-col justify-between space-y-4 border border-white/5 hover:border-primary-500/10 transition-all">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-primary-400 font-bold uppercase tracking-wider block">TEENAGER</span>
                        <span className="text-sm text-white font-bold mt-0.5">{teenDisplayName}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-surface-400 font-bold uppercase tracking-wider block">TYPE</span>
                        <span className="text-xs text-primary-300 font-semibold mt-0.5 px-2 py-0.5 rounded bg-primary-500/10 border border-primary-500/20 inline-block">
                          {app.requestType}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-surface-900/40 border border-white/3 space-y-2">
                      <p className="text-xs text-surface-300 font-medium">{app.description}</p>
                      {app.amount && app.amount > 0 && (
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-surface-800/40">
                          <span className="text-surface-400">Requested Amount</span>
                          <span className="text-emerald-400 font-bold text-sm">₹{app.amount.toLocaleString()}</span>
                        </div>
                      )}
                      {app.merchant && (
                        <div className="flex items-center justify-between text-[11px] text-surface-400 pt-0.5">
                          <span>Merchant: <strong className="text-surface-200">{app.merchant}</strong></span>
                          {app.category && <span>Category: <strong className="text-surface-200">{app.category}</strong></span>}
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
                        <MessageSquare className="w-4 h-4 text-surface-500 shrink-0" />
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
                        <span className={`font-bold px-2 py-0.5 rounded text-xs ${
                          isApproved 
                            ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' 
                            : 'text-rose-400 bg-rose-500/10 border border-rose-500/20'
                        }`}>
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
                          <span>Resolved: {new Date(app.decidedAt).toLocaleString()}</span>
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
