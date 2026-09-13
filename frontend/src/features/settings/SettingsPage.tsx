import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../hooks/useAuth';
import { User, Lock, Shield, Bell, Palette, Loader2, Check, AlertCircle, QrCode, Copy, Download, RefreshCw, KeyRound, ShieldCheck } from 'lucide-react';
import { userApi, parentalApi, totpApi } from '../../api/endpoints';
import type { ParentInvitation, TransactionApproval, TotpSetupResponse, TotpStatusResponse } from '../../types';
import PageTransition from '../../components/ui/PageTransition';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import GlassCard from '../../components/ui/GlassCard';

export default function SettingsPage() {
  const { user, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 2FA TOTP States
  const [totpStatus, setTotpStatus] = useState<TotpStatusResponse | null>(null);
  const [totpLoading, setTotpLoading] = useState(false);
  const [showTotpSetupModal, setShowTotpSetupModal] = useState(false);
  const [totpSetupData, setTotpSetupData] = useState<TotpSetupResponse | null>(null);
  const [totpSetupCode, setTotpSetupCode] = useState('');
  const [totpSetupError, setTotpSetupError] = useState('');
  const [totpSetupSubmitting, setTotpSetupSubmitting] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableError, setDisableError] = useState('');
  const [disableLoading, setDisableLoading] = useState(false);
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [regenerateCode, setRegenerateCode] = useState('');
  const [regenerateError, setRegenerateError] = useState('');
  const [regeneratedCodes, setRegeneratedCodes] = useState<string[] | null>(null);
  const [regenerateLoading, setRegenerateLoading] = useState(false);

  // Profile Form States
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');

  // Parental Controls Link & Invitation States
  const [activeInvite, setActiveInvite] = useState<ParentInvitation | null>(null);
  const [approvalsHistory, setApprovalsHistory] = useState<TransactionApproval[]>([]);
  const [parentEmailInput, setParentEmailInput] = useState('');
  const [relationship, setRelationship] = useState('MOTHER');
  const [parentalLoading, setParentalLoading] = useState(false);
  const [parentalError, setParentalError] = useState('');
  const [parentalSuccess, setParentalSuccess] = useState('');

  // Request Approval Form States
  const [reqType, setReqType] = useState('SPEND');
  const [reqAmount, setReqAmount] = useState('');
  const [reqCategory, setReqCategory] = useState('SHOPPING');
  const [reqMerchant, setReqMerchant] = useState('');
  const [reqDescription, setReqDescription] = useState('');
  const [reqTargetId, setReqTargetId] = useState('');

  // Custom alert/confirm states to ban window.alert and window.confirm
  const [alertConfig, setAlertConfig] = useState<{ title: string; message: string } | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  const fetchParentalData = async () => {
    try {
      const [inviteRes, historyRes] = await Promise.all([
        parentalApi.getInvitationStatus().catch(() => ({ data: { data: null } })),
        parentalApi.getTeenApprovalHistory().catch(() => ({ data: { data: [] } }))
      ]);
      setActiveInvite(inviteRes.data?.data || null);
      setApprovalsHistory(historyRes.data?.data || []);
    } catch (err: unknown) {
      console.error('Failed to load parent invitation data:', err);
    } finally {
      setParentalLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'parental') return;
    let isMounted = true;
    const loadParental = async () => {
      try {
        const [inviteRes, historyRes] = await Promise.all([
          parentalApi.getInvitationStatus().catch(() => ({ data: { data: null } })),
          parentalApi.getTeenApprovalHistory().catch(() => ({ data: { data: [] } }))
        ]);
        if (isMounted) {
          setActiveInvite(inviteRes.data?.data || null);
          setApprovalsHistory(historyRes.data?.data || []);
        }
      } catch (err: unknown) {
        console.error('Failed to load parent invitation data:', err);
      } finally {
        if (isMounted) setParentalLoading(false);
      }
    };
    loadParental();
    return () => { isMounted = false; };
  }, [activeTab]);

  const fetchTotpStatus = async () => {
    try {
      const res = await totpApi.getStatus();
      if (res.data?.data) {
        setTotpStatus(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch TOTP status:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'security') {
      fetchTotpStatus();
    }
  }, [activeTab]);

  const startTotpSetup = async () => {
    setTotpLoading(true);
    setTotpSetupError('');
    setTotpSetupCode('');
    setCopiedSecret(false);
    setCopiedCodes(false);
    try {
      const res = await totpApi.setup();
      if (res.data?.data) {
        setTotpSetupData(res.data.data);
        setShowTotpSetupModal(true);
      }
    } catch (err: unknown) {
      setErrorMsg(axios.isAxiosError<{ message?: string }>(err) ? err.response?.data?.message || 'Failed to initialize 2FA setup.' : 'Failed to initialize 2FA setup.');
    } finally {
      setTotpLoading(false);
    }
  };

  const handleConfirmTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpSetupData) return;
    setTotpSetupSubmitting(true);
    setTotpSetupError('');
    try {
      const res = await totpApi.enable({
        secret: totpSetupData.secret,
        code: totpSetupCode,
        backupCodes: totpSetupData.backupCodes,
      });
      if (res.data?.data) {
        setTotpStatus(res.data.data);
      }
      setShowTotpSetupModal(false);
      setAlertConfig({
        title: '2FA Enabled Successfully',
        message: 'Two-Factor Authentication is now active. Make sure your emergency recovery codes are stored safely!',
      });
      refreshProfile();
    } catch (err: unknown) {
      setTotpSetupError(axios.isAxiosError<{ message?: string }>(err) ? err.response?.data?.message || 'Invalid verification code.' : 'Invalid verification code.');
    } finally {
      setTotpSetupSubmitting(false);
    }
  };

  const handleDisableTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    setDisableLoading(true);
    setDisableError('');
    try {
      const res = await totpApi.disable({ password: disablePassword });
      if (res.data?.data) {
        setTotpStatus(res.data.data);
      }
      setShowDisableModal(false);
      setDisablePassword('');
      setAlertConfig({
        title: '2FA Disabled',
        message: 'Two-Factor Authentication has been deactivated for your account.',
      });
      refreshProfile();
    } catch (err: unknown) {
      setDisableError(axios.isAxiosError<{ message?: string }>(err) ? err.response?.data?.message || 'Failed to disable 2FA. Check password.' : 'Failed to disable 2FA. Check password.');
    } finally {
      setDisableLoading(false);
    }
  };

  const handleRegenerateCodes = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegenerateLoading(true);
    setRegenerateError('');
    try {
      const res = await totpApi.regenerateBackupCodes(regenerateCode);
      if (res.data?.data) {
        setRegeneratedCodes(res.data.data);
        fetchTotpStatus();
      }
    } catch (err: unknown) {
      setRegenerateError(axios.isAxiosError<{ message?: string }>(err) ? err.response?.data?.message || 'Failed to regenerate backup codes.' : 'Failed to regenerate backup codes.');
    } finally {
      setRegenerateLoading(false);
    }
  };

  const handleCopyCodes = (codes: string[]) => {
    navigator.clipboard.writeText(codes.join('\n'));
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  const handleDownloadCodes = (codes: string[]) => {
    const content = `FST PAY EMERGENCY RECOVERY BACKUP CODES\nGenerated: ${new Date().toISOString()}\nAccount: ${user?.email}\n\n` +
      codes.map((c, i) => `${i + 1}. ${c}`).join('\n') +
      '\n\nTreat these codes like passwords. Each code can be used once to access your account if you lose your phone.';
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'fstpay-backup-codes.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setParentalLoading(true);
    setParentalError('');
    setParentalSuccess('');
    try {
      await parentalApi.inviteParent({ parentEmail: parentEmailInput, relationship });
      setParentalSuccess('Invitation sent successfully! An email has been dispatched to your parent.');
      setParentEmailInput('');
      fetchParentalData();
    } catch (err: unknown) {
      setParentalError(axios.isAxiosError<{ message?: string }>(err) ? err.response?.data?.message || 'Failed to dispatch parental invitation.' : 'Failed to dispatch parental invitation.');
    } finally {
      setParentalLoading(false);
    }
  };

  const handleCancelInvite = (id: string) => {
    setConfirmConfig({
      title: 'Cancel Invitation',
      message: 'Are you sure you want to cancel this pending invitation?',
      onConfirm: async () => {
        setParentalLoading(true);
        setConfirmConfig(null);
        try {
          await parentalApi.cancelInvitation(id);
          setParentalSuccess('Invitation cancelled.');
          fetchParentalData();
        } catch (err: unknown) {
          setParentalError(axios.isAxiosError<{ message?: string }>(err) ? err.response?.data?.message || 'Failed to cancel invitation.' : 'Failed to cancel invitation.');
        } finally {
          setParentalLoading(false);
        }
      }
    });
  };

  const handleRequestApprovalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setParentalLoading(true);
    setParentalError('');
    setParentalSuccess('');
    try {
      await parentalApi.requestApproval({
        requestType: reqType,
        amount: reqType === 'SPEND' ? parseFloat(reqAmount) : undefined,
        category: reqType === 'SPEND' ? reqCategory : undefined,
        merchant: reqType === 'SPEND' ? reqMerchant : undefined,
        description: reqDescription,
        targetId: reqTargetId || undefined
      });
      setParentalSuccess('Approval request submitted to parent.');
      setReqAmount('');
      setReqMerchant('');
      setReqDescription('');
      setReqTargetId('');
      fetchParentalData();
    } catch (err: unknown) {
      setParentalError(axios.isAxiosError<{ message?: string }>(err) ? err.response?.data?.message || 'Failed to submit approval request.' : 'Failed to submit approval request.');
    } finally {
      setParentalLoading(false);
    }
  };

  // Password Change Modal States
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const handleSave = async () => {
    try {
      setIsLoading(true);
      setErrorMsg('');
      await userApi.updateProfile({
        fullName,
        phone: phone || undefined,
      });
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: unknown) {
      console.error('Failed to update profile:', err);
      setErrorMsg(axios.isAxiosError<{ message?: string }>(err) ? err.response?.data?.message || 'Failed to update profile.' : 'Failed to update profile.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    try {
      setIsPasswordLoading(true);
      setPasswordError('');
      await userApi.changePassword({
        currentPassword,
        newPassword,
      });
      setAlertConfig({
        title: 'Success',
        message: 'Password updated successfully! 🎉'
      });
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      console.error('Failed to change password:', err);
      setPasswordError(axios.isAxiosError<{ message?: string }>(err) ? err.response?.data?.message || 'Failed to change password. Make sure current password is correct.' : 'Failed to change password. Make sure current password is correct.');
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', icon: User, label: 'Profile' },
    { id: 'security', icon: Lock, label: 'Security' },
    { id: 'parental', icon: Shield, label: 'Parental Controls' },
    { id: 'notifications', icon: Bell, label: 'Notifications' },
    { id: 'privacy', icon: Shield, label: 'Privacy' },
  ];

  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Settings</h1>
          <p className="text-surface-400 mt-1">Manage your account preferences</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 page-section">
          {/* Tabs */}
          <GlassCard padding="none" className="p-2 lg:w-56 flex lg:flex-col gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id)}
                aria-label={`Settings tab ${tab.label}`}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap focus:outline-none focus:ring-1 focus:ring-primary-500 ${activeTab === tab.id ? 'bg-primary-500/15 text-primary-400' : 'text-surface-400 hover:bg-surface-800'}`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </GlassCard>

          {/* Content */}
          <GlassCard padding="lg" className="flex-1">
            {activeTab === 'profile' && (
              <div className="space-y-5">
                <h3 className="text-lg font-display font-semibold text-white">Profile Information</h3>
                
                {errorMsg && (
                  <div className="p-3 rounded-xl bg-danger-500/10 border border-danger-500/20 text-danger-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-2xl font-bold text-white">
                    {user?.fullName?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <p className="font-medium text-white">{user?.fullName}</p>
                    <p className="text-sm text-surface-400">{user?.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="fullName" className="input-label">Full Name</label>
                    <input id="fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="input-field focus:ring-2 focus:ring-primary-500" />
                  </div>
                  <div>
                    <label htmlFor="phone" className="input-label">Phone</label>
                    <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" className="input-field focus:ring-2 focus:ring-primary-500" />
                  </div>
                  <div>
                    <label htmlFor="email" className="input-label">Email</label>
                    <input id="email" type="email" value={user?.email || ''} disabled className="input-field opacity-50 cursor-not-allowed" />
                  </div>
                  <div>
                    <label htmlFor="dob" className="input-label">Date of Birth</label>
                    <input id="dob" type="date" value={user?.dateOfBirth || ''} disabled className="input-field opacity-50 cursor-not-allowed" />
                  </div>
                </div>
                <Button onClick={handleSave} disabled={isLoading} className="flex items-center gap-2">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <><Check className="w-4 h-4" /> Saved</> : 'Save Changes'}
                </Button>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-display font-semibold text-white">Security & Authentication</h3>
                  <p className="text-xs text-surface-400 mt-1">Manage password credentials and multi-factor authentication methods.</p>
                </div>

                <div className="space-y-4">
                  {/* Password Card */}
                  <div className="p-4 rounded-xl bg-surface-800/30 border border-surface-700/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">Account Password</p>
                        <p className="text-xs text-surface-400 mt-1">Update your login password regularly for safety</p>
                      </div>
                      <Button onClick={() => setShowPasswordModal(true)} variant="secondary" size="sm">Change</Button>
                    </div>
                  </div>

                  {/* 2FA Authenticator App (TOTP) Card */}
                  <div className="p-5 rounded-xl bg-surface-800/30 border border-surface-700/30 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-500/10 border border-primary-500/20 text-primary-400 flex items-center justify-center shrink-0 mt-0.5">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-white">Authenticator App (TOTP)</p>
                            {totpStatus?.totpEnabled ? (
                              <span className="badge-accent">Enabled</span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-700/50 text-surface-400 border border-surface-600/30">
                                Not Enabled
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-surface-400 mt-1 max-w-lg">
                            Use Google Authenticator, Authy, or 1Password to generate secure one-time verification codes during sign-in.
                          </p>
                        </div>
                      </div>

                      {totpStatus?.totpEnabled ? (
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => {
                              setShowRegenerateModal(true);
                              setRegeneratedCodes(null);
                              setRegenerateCode('');
                              setRegenerateError('');
                            }}
                            variant="secondary"
                            size="sm"
                            className="flex items-center gap-1.5"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Backup Codes
                          </Button>
                          <Button
                            onClick={() => {
                              setShowDisableModal(true);
                              setDisablePassword('');
                              setDisableError('');
                            }}
                            variant="ghost"
                            size="sm"
                            className="text-danger-400 hover:text-danger-300 hover:bg-danger-500/10"
                          >
                            Disable
                          </Button>
                        </div>
                      ) : (
                        <Button
                          onClick={startTotpSetup}
                          disabled={totpLoading}
                          variant="primary"
                          size="sm"
                          className="flex items-center gap-2"
                        >
                          {totpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                          Enable 2FA
                        </Button>
                      )}
                    </div>

                    {totpStatus?.totpEnabled && (
                      <div className="pt-2 border-t border-surface-700/30 flex items-center justify-between text-xs text-surface-400">
                        <span className="flex items-center gap-1.5">
                          <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                          Emergency Recovery Codes Remaining:
                          <strong className="text-white font-mono">{totpStatus.backupCodesRemaining} of 8</strong>
                        </span>
                        {totpStatus.backupCodesRemaining <= 2 && (
                          <span className="text-amber-400 text-[11px] font-medium">
                            Low on recovery codes. Consider regenerating new ones.
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Email OTP Fallback Card */}
                  <div className="p-4 rounded-xl bg-surface-800/20 border border-surface-700/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">Email Verification Fallback</p>
                        <p className="text-xs text-surface-400 mt-1">Single-use verification codes sent to {user?.email}</p>
                      </div>
                      <span className="text-xs text-surface-400">Default Active</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'parental' && (
              <div className="space-y-6">
                <h3 className="text-lg font-display font-semibold text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary-400" />
                  Parent-Teen Integration
                </h3>
                <p className="text-xs text-surface-400">
                  Link with your parent to enable pocket money transfers, request action approvals, and track safety metrics.
                </p>

                {parentalError && (
                  <div className="p-3 rounded-xl bg-danger-500/10 border border-danger-500/20 text-danger-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{parentalError}</span>
                  </div>
                )}

                {parentalSuccess && (
                  <div className="p-3 rounded-xl bg-accent-500/10 border border-accent-500/20 text-accent-400 text-xs flex items-center gap-2 animate-slide-down">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>{parentalSuccess}</span>
                  </div>
                )}

                {parentalLoading && (
                  <div className="flex items-center gap-2 text-xs text-surface-400 py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary-400" />
                    <span>Synchronizing status...</span>
                  </div>
                )}

                {user?.parentEmail ? (
                  <div className="space-y-6">
                    <div className="p-4 rounded-xl border border-accent-500/10 bg-accent-500/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-accent-400 font-bold uppercase tracking-wider">Active Parent Link</span>
                        <span className="badge-accent">Connected</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                        <div>
                          <span className="text-[10px] text-surface-400 font-semibold uppercase block">Parent Email</span>
                          <span className="text-sm text-white font-medium">{user.parentEmail}</span>
                        </div>
                        {user.parentName && (
                          <div>
                            <span className="text-[10px] text-surface-400 font-semibold uppercase block">Parent Name</span>
                            <span className="text-sm text-white font-medium">{user.parentName}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Form: Request Action Approval */}
                    <form onSubmit={handleRequestApprovalSubmit} className="p-4 rounded-xl border border-white/5 bg-white/3 space-y-4">
                      <h4 className="text-sm font-semibold text-white">Request Parent Approval</h4>
                      <p className="text-xs text-surface-400">Ask your parent to approve a transaction or card action that exceeds standard controls.</p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="reqType" className="text-xs text-surface-400 font-medium mb-1 block">Request Type</label>
                          <select
                            id="reqType"
                            value={reqType}
                            onChange={(e) => setReqType(e.target.value)}
                            className="w-full bg-surface-800 border border-surface-700/60 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
                          >
                            <option value="SPEND">Simulate Transaction (Spend)</option>
                            <option value="CARD_GENERATE">Generate New Virtual Card</option>
                            <option value="CARD_FREEZE">Freeze Virtual Card</option>
                            <option value="CARD_UNFREEZE">Unfreeze Virtual Card</option>
                          </select>
                        </div>

                        {reqType === 'SPEND' && (
                          <div>
                            <label htmlFor="reqAmount" className="text-xs text-surface-400 font-medium mb-1 block">Amount (₹)</label>
                            <input
                              id="reqAmount"
                              type="number"
                              value={reqAmount}
                              onChange={(e) => setReqAmount(e.target.value)}
                              placeholder="500"
                              required
                              min={1}
                              className="w-full bg-surface-800 border border-surface-700/60 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
                            />
                          </div>
                        )}

                        {(reqType === 'CARD_FREEZE' || reqType === 'CARD_UNFREEZE') && (
                          <div>
                            <label htmlFor="reqTargetId" className="text-xs text-surface-400 font-medium mb-1 block">Virtual Card ID</label>
                            <input
                              id="reqTargetId"
                              type="text"
                              value={reqTargetId}
                              onChange={(e) => setReqTargetId(e.target.value)}
                              placeholder="Enter Card UUID"
                              required
                              className="w-full bg-surface-800 border border-surface-700/60 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
                            />
                          </div>
                        )}
                      </div>

                      {reqType === 'SPEND' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="reqMerchant" className="text-xs text-surface-400 font-medium mb-1 block">Merchant Name</label>
                            <input
                              id="reqMerchant"
                              type="text"
                              value={reqMerchant}
                              onChange={(e) => setReqMerchant(e.target.value)}
                              placeholder="Steam Games"
                              required
                              className="w-full bg-surface-800 border border-surface-700/60 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
                            />
                          </div>
                          <div>
                            <label htmlFor="reqCategory" className="text-xs text-surface-400 font-medium mb-1 block">Category</label>
                            <select
                              id="reqCategory"
                              value={reqCategory}
                              onChange={(e) => setReqCategory(e.target.value)}
                              className="w-full bg-surface-800 border border-surface-700/60 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
                            >
                              <option value="GAMING">Gaming</option>
                              <option value="ENTERTAINMENT">Entertainment</option>
                              <option value="SHOPPING">Shopping</option>
                              <option value="FOOD">Food & Dining</option>
                            </select>
                          </div>
                        </div>
                      )}

                      <div>
                        <label htmlFor="reqDescription" className="text-xs text-surface-400 font-medium mb-1 block">Reason / Message for Parent</label>
                        <input
                          id="reqDescription"
                          type="text"
                          value={reqDescription}
                          onChange={(e) => setReqDescription(e.target.value)}
                          placeholder="Need extra funds for school supplies or subscription renew"
                          required
                          className="w-full bg-surface-800 border border-surface-700/60 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      <Button
                        type="submit"
                        disabled={parentalLoading}
                        variant="primary"
                        className="text-xs py-2 px-4 flex items-center justify-center gap-1.5 font-bold"
                      >
                        {parentalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        Submit Approval Request
                      </Button>
                    </form>

                    {/* History of Requests */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-white">Recent Approval Requests</h4>
                      {approvalsHistory.length === 0 ? (
                        <p className="text-xs text-surface-500 py-3">No approval requests submitted yet.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {approvalsHistory.slice(0, 4).map((app) => (
                            <div key={app.id} className="p-3 rounded-lg border border-white/5 bg-white/2 space-y-2 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-white">{app.requestType}</span>
                                <span className={`font-bold uppercase ${
                                  app.status === 'APPROVED' ? 'text-accent-400' :
                                  app.status === 'REJECTED' ? 'text-rose-400' : 'text-amber-400'
                                }`}>
                                  {app.status}
                                </span>
                              </div>
                              <p className="text-surface-400 text-[11px]">{app.description}</p>
                              {app.amount && app.amount > 0 && <p className="text-accent-400 font-bold">₹{app.amount}</p>}
                              {app.parentNote && <p className="text-[10px] text-surface-500 italic">Parent response: "{app.parentNote}"</p>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : activeInvite ? (
                  <div className="p-4 rounded-xl border border-amber-500/10 bg-amber-500/5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-amber-400 font-bold uppercase tracking-wider">Invitation Dispatched</span>
                      <span className="badge-glass text-amber-400">PENDING ACCEPTANCE</span>
                    </div>

                    <div className="text-xs text-surface-300 space-y-1">
                      <p>We sent a signup token to: <span className="text-white font-semibold">{activeInvite.parentEmail}</span></p>
                      <p>Relationship selected: <span className="text-white font-semibold">{activeInvite.relationship}</span></p>
                      <p>Sent: {new Date(activeInvite.createdAt).toLocaleString()}</p>
                    </div>

                    <div className="pt-2">
                      <Button
                        onClick={() => handleCancelInvite(activeInvite.id)}
                        disabled={parentalLoading}
                        variant="ghost"
                        size="sm"
                        className="border border-danger-500/20 text-danger-400 hover:bg-danger-500/15"
                      >
                        {parentalLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1 inline" /> : null}
                        Cancel Invitation
                      </Button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSendInvite} className="p-4 rounded-xl border border-white/5 bg-white/3 space-y-4">
                    <h4 className="text-sm font-semibold text-white">Invite Parent</h4>
                    <p className="text-xs text-surface-400">
                      Input your parent's email to send them a secure link to register and link accounts.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="parentEmail" className="input-label">Parent's Email Address</label>
                        <input
                          id="parentEmail"
                          type="email"
                          value={parentEmailInput}
                          onChange={(e) => setParentEmailInput(e.target.value)}
                          placeholder="parent@example.com"
                          required
                          className="input-field py-2 text-xs focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label htmlFor="parentRelationship" className="input-label">Relationship Type</label>
                        <select
                          id="parentRelationship"
                          value={relationship}
                          onChange={(e) => setRelationship(e.target.value)}
                          className="input-field py-2 text-xs focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="MOTHER">Mother</option>
                          <option value="FATHER">Father</option>
                          <option value="GUARDIAN">Guardian</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={parentalLoading}
                      variant="primary"
                      className="text-xs py-2 px-4 flex items-center justify-center gap-1.5 font-bold"
                    >
                      {parentalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      Send Invitation Email
                    </Button>
                  </form>
                )}
              </div>
            )}

            {(activeTab === 'notifications' || activeTab === 'privacy') && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Palette className="w-12 h-12 text-surface-600 mb-3" />
                <p className="text-surface-400">Coming soon in the next update</p>
              </div>
            )}
          </GlassCard>
        </div>

        {/* Password Change Modal */}
        <Modal
          isOpen={showPasswordModal}
          onClose={() => setShowPasswordModal(false)}
          title="Change Password"
        >
          <form onSubmit={handlePasswordChangeSubmit} className="space-y-4 animate-slide-up">
            {passwordError && (
              <div className="p-3 rounded-xl bg-danger-500/10 border border-danger-500/20 text-danger-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <div>
              <label htmlFor="currentPassword" className="input-label">Current Password</label>
              <input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" className="input-field focus:ring-2 focus:ring-primary-500" required />
            </div>

            <div>
              <label htmlFor="newPassword" className="input-label">New Password</label>
              <input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" className="input-field focus:ring-2 focus:ring-primary-500" required />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="input-label">Confirm New Password</label>
              <input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className="input-field focus:ring-2 focus:ring-primary-500" required />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" onClick={() => setShowPasswordModal(false)} variant="secondary" className="flex-1">Cancel</Button>
              <Button type="submit" disabled={isPasswordLoading} variant="primary" className="flex-1 flex items-center justify-center gap-2">
                {isPasswordLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* TOTP SETUP MODAL */}
        <Modal
          isOpen={showTotpSetupModal}
          onClose={() => setShowTotpSetupModal(false)}
          title="Set Up Authenticator App 2FA"
        >
          {totpSetupData && (
            <div className="space-y-5">
              {totpSetupError && (
                <div className="p-3 rounded-xl bg-danger-500/10 border border-danger-500/20 text-danger-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{totpSetupError}</span>
                </div>
              )}

              {/* Step 1: Scan QR */}
              <div className="space-y-3">
                <span className="text-xs font-semibold text-primary-400 uppercase tracking-wider">Step 1: Scan QR Code</span>
                <p className="text-xs text-surface-300">
                  Open Google Authenticator, 1Password, or Authy on your mobile device and scan this QR code:
                </p>
                {totpSetupData.qrCodeDataUri && (
                  <div className="flex justify-center p-3 bg-white rounded-xl max-w-xs mx-auto">
                    <img src={totpSetupData.qrCodeDataUri} alt="TOTP QR Code" className="w-44 h-44" />
                  </div>
                )}
                <div className="space-y-1">
                  <span className="text-[11px] text-surface-400">Can't scan QR code? Enter this secret key manually:</span>
                  <div className="flex items-center gap-2 bg-surface-900/80 p-2.5 rounded-lg border border-surface-700/50">
                    <code className="text-xs font-mono text-white flex-1 select-all break-all">{totpSetupData.secret}</code>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(totpSetupData.secret);
                        setCopiedSecret(true);
                        setTimeout(() => setCopiedSecret(false), 2000);
                      }}
                      className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1 font-medium shrink-0"
                    >
                      {copiedSecret ? <Check className="w-3.5 h-3.5 text-accent-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedSecret ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 2: Save Emergency Backup Codes */}
              <div className="space-y-2 pt-2 border-t border-surface-700/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                    <KeyRound className="w-3.5 h-3.5" />
                    Step 2: Emergency Recovery Codes
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyCodes(totpSetupData.backupCodes)}
                      className="text-[11px] text-surface-300 hover:text-white flex items-center gap-1"
                    >
                      {copiedCodes ? <Check className="w-3 h-3 text-accent-400" /> : <Copy className="w-3 h-3" />}
                      {copiedCodes ? 'Copied' : 'Copy All'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadCodes(totpSetupData.backupCodes)}
                      className="text-[11px] text-primary-400 hover:text-primary-300 flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      Download
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-surface-400">
                  Save these single-use codes in a password manager. They allow login if you ever lose your phone.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-2.5 rounded-xl bg-surface-900/60 border border-surface-700/50 font-mono text-xs text-center text-surface-200">
                  {totpSetupData.backupCodes.map((code, idx) => (
                    <div key={idx} className="bg-surface-800/40 py-1.5 px-2 rounded border border-surface-700/20 tracking-wider">
                      {code}
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 3: Enter 6-digit Code to verify */}
              <form onSubmit={handleConfirmTotp} className="space-y-4 pt-2 border-t border-surface-700/50">
                <span className="text-xs font-semibold text-primary-400 uppercase tracking-wider block">Step 3: Confirm Setup</span>
                <div>
                  <label htmlFor="setup-totp-code" className="input-label">Enter 6-Digit Authenticator Code</label>
                  <input
                    id="setup-totp-code"
                    type="text"
                    value={totpSetupCode}
                    onChange={(e) => setTotpSetupCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    required
                    maxLength={6}
                    className="input-field text-center text-2xl font-mono tracking-widest py-2.5"
                    autoFocus
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" onClick={() => setShowTotpSetupModal(false)} variant="ghost" size="sm">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={totpSetupSubmitting || totpSetupCode.length !== 6} variant="primary" size="sm">
                    {totpSetupSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <ShieldCheck className="w-4 h-4 mr-1" />}
                    Activate 2FA
                  </Button>
                </div>
              </form>
            </div>
          )}
        </Modal>

        {/* DISABLE TOTP MODAL */}
        <Modal
          isOpen={showDisableModal}
          onClose={() => setShowDisableModal(false)}
          title="Disable Two-Factor Authentication"
        >
          <form onSubmit={handleDisableTotp} className="space-y-4">
            {disableError && (
              <div className="p-3 rounded-xl bg-danger-500/10 border border-danger-500/20 text-danger-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{disableError}</span>
              </div>
            )}
            <p className="text-xs text-surface-300">
              Disabling Two-Factor Authentication lowers your account security. Please enter your account password to confirm.
            </p>
            <div>
              <label htmlFor="disable-password" className="input-label">Account Password</label>
              <input
                id="disable-password"
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                placeholder="••••••••"
                required
                className="input-field"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" onClick={() => setShowDisableModal(false)} variant="ghost" size="sm">
                Cancel
              </Button>
              <Button type="submit" disabled={disableLoading || !disablePassword} variant="primary" size="sm" className="bg-rose-600 hover:bg-rose-500">
                {disableLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Confirm Disable 2FA
              </Button>
            </div>
          </form>
        </Modal>

        {/* REGENERATE BACKUP CODES MODAL */}
        <Modal
          isOpen={showRegenerateModal}
          onClose={() => setShowRegenerateModal(false)}
          title="Emergency Recovery Backup Codes"
        >
          {regeneratedCodes ? (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-accent-500/10 border border-accent-500/20 text-accent-400 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>8 new single-use backup codes generated. Previous codes have been invalidated.</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">Your New Recovery Codes</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyCodes(regeneratedCodes)}
                    className="text-xs text-surface-300 hover:text-white flex items-center gap-1"
                  >
                    {copiedCodes ? <Check className="w-3.5 h-3.5 text-accent-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedCodes ? 'Copied' : 'Copy All'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadCodes(regeneratedCodes)}
                    className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-xl bg-surface-900/60 border border-surface-700/50 font-mono text-xs text-center text-surface-200">
                {regeneratedCodes.map((code, idx) => (
                  <div key={idx} className="bg-surface-800/40 py-2 px-2 rounded border border-surface-700/20 tracking-wider font-semibold">
                    {code}
                  </div>
                ))}
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={() => setShowRegenerateModal(false)} variant="primary" size="sm">
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleRegenerateCodes} className="space-y-4">
              {regenerateError && (
                <div className="p-3 rounded-xl bg-danger-500/10 border border-danger-500/20 text-danger-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{regenerateError}</span>
                </div>
              )}
              <p className="text-xs text-surface-300">
                Generating new emergency recovery codes will immediately invalidate any remaining unused backup codes.
              </p>
              <div>
                <label htmlFor="regen-code" className="input-label">Current 6-Digit Authenticator Code (Optional)</label>
                <input
                  id="regen-code"
                  type="text"
                  value={regenerateCode}
                  onChange={(e) => setRegenerateCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="input-field text-center text-xl font-mono tracking-widest py-2"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" onClick={() => setShowRegenerateModal(false)} variant="ghost" size="sm">
                  Cancel
                </Button>
                <Button type="submit" disabled={regenerateLoading} variant="primary" size="sm">
                  {regenerateLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                  Generate New Codes
                </Button>
              </div>
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
            <p className="text-sm text-surface-200">{alertConfig?.message}</p>
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
