import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { parentalApi, webauthnApi } from '../../api/endpoints';
import {
  Check,
  X,
  Loader2,
  Info,
  MessageSquare,
  Clock,
  Calendar,
  AlertCircle,
  Search,
  Radio,
  ShieldCheck,
  Fingerprint,
  KeyRound,
  Shield
} from 'lucide-react';
import type { TransactionApproval, WebAuthnCredential } from '../../types';
import { isWebAuthnSupported, createPasskeyCredential, getPasskeyAssertion } from '../../utils/webauthn';
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
  const [coSigningId, setCoSigningId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');

  // WebAuthn / Passkey state
  const [credentials, setCredentials] = useState<WebAuthnCredential[]>([]);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [isEnrollingPasskey, setIsEnrollingPasskey] = useState(false);
  const [passkeyDeviceName, setPasskeyDeviceName] = useState('');
  
  // Note inputs state mapping (approvalId -> noteText)
  const [notes, setNotes] = useState<Record<string, string>>({});

  // Custom alert modal state
  const [alertConfig, setAlertConfig] = useState<{ title: string; message: string } | null>(null);

  const fetchQueueData = async () => {
    try {
      const [pendingRes, historyRes, credsRes] = await Promise.all([
        parentalApi.getPendingApprovals(),
        parentalApi.getParentApprovalHistory(),
        webauthnApi.getCredentials().catch(() => ({ data: { data: [] } }))
      ]);
      if (pendingRes.data?.data) setPending(pendingRes.data.data);
      if (historyRes.data?.data) setHistory(historyRes.data.data);
      if (credsRes.data?.data) setCredentials(credsRes.data.data);
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
        const [pendingRes, historyRes, credsRes] = await Promise.all([
          parentalApi.getPendingApprovals(),
          parentalApi.getParentApprovalHistory(),
          webauthnApi.getCredentials().catch(() => ({ data: { data: [] } }))
        ]);
        if (isMounted) {
          if (pendingRes.data?.data) setPending(pendingRes.data.data);
          if (historyRes.data?.data) setHistory(historyRes.data.data);
          if (credsRes.data?.data) setCredentials(credsRes.data.data);
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

  const handleEnrollPasskey = async () => {
    try {
      setIsEnrollingPasskey(true);
      const optionsRes = await webauthnApi.getRegisterOptions();
      if (!optionsRes.data?.data) {
        throw new Error('Failed to retrieve registration challenge from server.');
      }
      const payload = await createPasskeyCredential(
        optionsRes.data.data,
        passkeyDeviceName || 'Guardian Authenticator'
      );
      await webauthnApi.verifyRegistration(payload);
      setIsEnrollModalOpen(false);
      setAlertConfig({
        title: 'Passkey Enrolled',
        message: 'Your biometric authenticator is registered. You can now co-sign approvals with Touch ID / Windows Hello.',
      });
      fetchQueueData();
    } catch (err: unknown) {
      console.error('Failed to enroll passkey:', err);
      setAlertConfig({
        title: 'Passkey Registration Failed',
        message: err instanceof Error ? err.message : 'Could not complete biometric registration.',
      });
    } finally {
      setIsEnrollingPasskey(false);
    }
  };

  const handleBiometricCoSign = async (id: string) => {
    try {
      setCoSigningId(id);
      const challengeRes = await webauthnApi.getApprovalChallenge(id);
      if (!challengeRes.data?.data) {
        throw new Error('Failed to obtain biometric challenge for this approval.');
      }
      const assertion = await getPasskeyAssertion(challengeRes.data.data);
      const parentNote = notes[id] || 'Co-signed via Biometric Passkey';
      await parentalApi.decideApproval(id, {
        decision: 'APPROVED',
        parentNote,
        biometricCredentialId: assertion.credentialId,
        clientDataJSON: assertion.clientDataJSON,
        authenticatorData: assertion.authenticatorData,
        signature: assertion.signature,
      });
      setNotes(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      fetchQueueData();
    } catch (err: unknown) {
      console.error('Biometric co-signing failed:', err);
      setAlertConfig({
        title: 'Biometric Co-Sign Error',
        message: err instanceof Error ? err.message : 'Biometric verification cancelled or failed.',
      });
    } finally {
      setCoSigningId(null);
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
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Parent Approval Center</h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-surface-400 mt-0.5">
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

        {/* Guardian Passkey / Biometrics Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-primary-500/5 dark:from-purple-950/40 dark:via-indigo-950/30 dark:to-surface-900/60 border border-purple-500/20 flex flex-wrap items-center justify-between gap-4" data-testid="guardian-passkey-banner">
          <div className="flex items-center gap-3.5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${credentials.length > 0 ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300' : 'bg-purple-500/20 text-purple-600 dark:text-purple-300'}`}>
              <Fingerprint className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Guardian Biometric Protection</h4>
                {credentials.length > 0 ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Passkey Enrolled ({credentials.length})
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                    Not Enrolled
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 dark:text-surface-400 mt-0.5">
                {credentials.length > 0
                  ? `Co-sign teen transactions instantly with Touch ID, Windows Hello, or Face ID (${credentials[0].deviceName || 'Hardware Key'}).`
                  : 'Enroll your device passkey for instant cryptographic biometric approval and guardian co-signing.'}
              </p>
            </div>
          </div>

          <Button
            onClick={() => setIsEnrollModalOpen(true)}
            variant={credentials.length > 0 ? 'secondary' : 'primary'}
            size="sm"
            className="text-xs flex items-center gap-1.5 shadow-sm"
          >
            <KeyRound className="w-3.5 h-3.5" />
            {credentials.length > 0 ? 'Manage / Add Passkey' : 'Enroll Biometric Passkey'}
          </Button>
        </div>

        {/* Tab & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex gap-4 border-b sm:border-b-0 border-slate-200 dark:border-surface-700/50 pb-2 sm:pb-0">
            <button
              onClick={() => setActiveTab('pending')}
              className={`text-sm font-bold pb-1.5 border-b-2 transition-all ${
                activeTab === 'pending'
                  ? 'border-primary-500 text-slate-900 dark:text-white'
                  : 'border-transparent text-slate-500 dark:text-surface-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Pending Requests ({pending.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`text-sm font-bold pb-1.5 border-b-2 transition-all ${
                activeTab === 'history'
                  ? 'border-primary-500 text-slate-900 dark:text-white'
                  : 'border-transparent text-slate-500 dark:text-surface-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Resolution History ({history.length})
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 dark:text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by teen, merchant..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white dark:bg-surface-800/60 border border-slate-300 dark:border-surface-700/60 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-surface-500 focus:outline-none focus:border-primary-500 transition-colors"
              />
            </div>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-white dark:bg-surface-800/60 border border-slate-300 dark:border-surface-700/60 text-xs text-slate-800 dark:text-surface-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-primary-500"
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
            <Info className="w-10 h-10 text-slate-400 dark:text-surface-500 mx-auto" />
            <p className="text-slate-600 dark:text-surface-400 text-sm font-medium">
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
                <GlassCard key={app.id} padding="md" className="flex flex-col justify-between space-y-4 border border-slate-200/80 dark:border-white/5 hover:border-primary-500/20 transition-all shadow-sm">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-primary-600 dark:text-primary-400 font-bold uppercase tracking-wider block">TEENAGER</span>
                        <span className="text-sm text-slate-900 dark:text-white font-bold mt-0.5">{teenDisplayName}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 dark:text-surface-400 font-bold uppercase tracking-wider block">TYPE</span>
                        <span className="text-xs text-primary-700 dark:text-primary-300 font-semibold mt-0.5 px-2 py-0.5 rounded bg-primary-500/10 border border-primary-500/20 inline-block">
                          {app.requestType}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-surface-900/40 border border-slate-200/60 dark:border-white/5 space-y-2">
                      <p className="text-xs text-slate-700 dark:text-surface-300 font-medium">{app.description}</p>
                      {app.amount && app.amount > 0 && (
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200 dark:border-surface-800/40">
                          <span className="text-slate-500 dark:text-surface-400">Requested Amount</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">₹{app.amount.toLocaleString()}</span>
                        </div>
                      )}
                      {app.merchant && (
                        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-surface-400 pt-0.5">
                          <span>Merchant: <strong className="text-slate-800 dark:text-surface-200">{app.merchant}</strong></span>
                          {app.category && <span>Category: <strong className="text-slate-800 dark:text-surface-200">{app.category}</strong></span>}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-surface-500">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Requested: {new Date(app.createdAt).toLocaleString()}</span>
                    </div>
                  </div>

                  {isPending ? (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center gap-2 input-field px-2.5 py-1">
                        <MessageSquare className="w-4 h-4 text-slate-400 dark:text-surface-500 shrink-0" />
                        <input
                          type="text"
                          value={notes[app.id] || ''}
                          onChange={(e) => handleNoteChange(app.id, e.target.value)}
                          placeholder="Add decision note (optional)"
                          className="bg-transparent flex-1 py-2 text-slate-900 dark:text-white focus:outline-none text-xs placeholder:text-slate-400 dark:placeholder:text-surface-500"
                        />
                      </div>

                      {credentials.length > 0 && isWebAuthnSupported() && (
                        <Button
                          onClick={() => handleBiometricCoSign(app.id)}
                          disabled={submittingId === app.id || coSigningId === app.id}
                          variant="primary"
                          size="sm"
                          className="w-full py-2 flex items-center justify-center gap-1.5 font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-md shadow-purple-500/20"
                          data-testid="biometric-cosign-btn"
                        >
                          {coSigningId === app.id ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Verifying Passkey...</span>
                            </>
                          ) : (
                            <>
                              <Fingerprint className="w-4 h-4 text-purple-200" />
                              <span>Biometric Co-Sign</span>
                            </>
                          )}
                        </Button>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          onClick={() => handleResolve(app.id, 'REJECTED')}
                          disabled={submittingId === app.id || coSigningId === app.id}
                          variant="ghost"
                          size="sm"
                          className="text-danger-500 dark:text-danger-400 border border-danger-500/20 hover:bg-danger-500/15 py-2 flex items-center justify-center gap-1.5 font-bold"
                        >
                          {submittingId === app.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                          Reject
                        </Button>
                        <Button
                          onClick={() => handleResolve(app.id, 'APPROVED')}
                          disabled={submittingId === app.id || coSigningId === app.id}
                          variant={credentials.length > 0 && isWebAuthnSupported() ? 'secondary' : 'primary'}
                          size="sm"
                          className="py-2 flex items-center justify-center gap-1.5 font-bold"
                        >
                          {submittingId === app.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          {credentials.length > 0 && isWebAuthnSupported() ? 'Manual Approve' : 'Approve & Execute'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-slate-200 dark:border-surface-800/60 space-y-2">
                      <div className="flex items-center justify-between text-xs flex-wrap gap-1">
                        <span className="text-slate-500 dark:text-surface-400">Resolution status</span>
                        <div className="flex items-center gap-1.5">
                          {app.biometricVerified && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                              <Fingerprint className="w-3 h-3 text-emerald-500 dark:text-emerald-400" /> Co-Signed via Passkey
                            </span>
                          )}
                          <span className={`font-bold px-2 py-0.5 rounded text-xs ${
                            isApproved 
                              ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' 
                              : 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20'
                          }`}>
                            {app.status}
                          </span>
                        </div>
                      </div>
                      {app.parentNote && (
                        <p className="text-[11px] text-slate-600 dark:text-surface-400 bg-slate-50 dark:bg-surface-800/30 p-2 rounded border border-slate-200/60 dark:border-white/5 italic">
                          Note: "{app.parentNote}"
                        </p>
                      )}
                      {app.decidedAt && (
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-surface-500">
                          <Calendar className="w-3.5 h-3.5" />
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

        {/* ENROLL BIOMETRIC PASSKEY MODAL */}
        <Modal
          isOpen={isEnrollModalOpen}
          onClose={() => setIsEnrollModalOpen(false)}
          title="Enroll Biometric Passkey"
        >
          <div className="space-y-4" data-testid="enroll-passkey-modal">
            <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 flex items-start gap-3">
              <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
              <p className="text-xs text-purple-800 dark:text-purple-200 leading-relaxed font-medium">
                Use your device's built-in authenticator (Windows Hello, Touch ID, Face ID, or PIN) to co-sign teen approvals without entering passwords.
              </p>
            </div>

            <div>
              <label htmlFor="device-name-input" className="block text-xs font-semibold text-slate-700 dark:text-surface-300 mb-1.5">Authenticator Nickname</label>
              <input
                id="device-name-input"
                type="text"
                value={passkeyDeviceName}
                onChange={(e) => setPasskeyDeviceName(e.target.value)}
                placeholder="e.g. MacBook Touch ID, Windows Hello"
                className="w-full bg-slate-50 dark:bg-surface-800 border border-slate-300 dark:border-surface-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-surface-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
            </div>

            {credentials.length > 0 && (
              <div>
                <span className="block text-xs font-semibold text-slate-600 dark:text-surface-400 mb-2">Enrolled Passkeys ({credentials.length})</span>
                <div className="space-y-2 max-h-36 overflow-y-auto">
                  {credentials.map((cred) => (
                    <div key={cred.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-100 dark:bg-surface-800/40 border border-slate-200 dark:border-surface-700/40 text-xs">
                      <div className="flex items-center gap-2">
                        <KeyRound className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        <span className="text-slate-900 dark:text-white font-medium">{cred.deviceName || 'Hardware Passkey'}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-surface-500">{new Date(cred.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEnrollModalOpen(false)}
                className="border border-slate-300 dark:border-surface-700 text-slate-700 dark:text-surface-300 hover:bg-slate-100 dark:hover:bg-surface-800"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleEnrollPasskey}
                disabled={isEnrollingPasskey}
                className="bg-purple-600 hover:bg-purple-500 flex items-center gap-1.5 font-bold"
              >
                {isEnrollingPasskey ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Waiting for Biometrics...</span>
                  </>
                ) : (
                  <>
                    <Fingerprint className="w-4 h-4" />
                    <span>Enroll This Device</span>
                  </>
                )}
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
          <div className="space-y-4" aria-live="polite">
            <div className="flex items-start gap-3 p-1">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <p className="text-sm text-slate-700 dark:text-surface-200">{alertConfig?.message}</p>
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
