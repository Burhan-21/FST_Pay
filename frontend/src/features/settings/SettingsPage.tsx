import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Lock, Shield, Bell, Palette, Loader2, Check, AlertCircle } from 'lucide-react';
import { userApi, parentalApi } from '../../api/endpoints';
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

  // Profile Form States
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');

  // Parental Controls Link & Invitation States
  const [activeInvite, setActiveInvite] = useState<any>(null);
  const [approvalsHistory, setApprovalsHistory] = useState<any[]>([]);
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
      setParentalLoading(true);
      const [inviteRes, historyRes] = await Promise.all([
        parentalApi.getInvitationStatus().catch(() => ({ data: { data: null } })),
        parentalApi.getTeenApprovalHistory().catch(() => ({ data: { data: [] } }))
      ]);
      setActiveInvite(inviteRes.data?.data || null);
      setApprovalsHistory(historyRes.data?.data || []);
    } catch (err: any) {
      console.error('Failed to load parent invitation data:', err);
    } finally {
      setParentalLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'parental') {
      fetchParentalData();
    }
  }, [activeTab]);

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
    } catch (err: any) {
      setParentalError(err.response?.data?.message || 'Failed to dispatch parental invitation.');
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
        } catch (err: any) {
          setParentalError(err.response?.data?.message || 'Failed to cancel invitation.');
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
    } catch (err: any) {
      setParentalError(err.response?.data?.message || 'Failed to submit approval request.');
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
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to update profile.');
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
    } catch (err: any) {
      console.error('Failed to change password:', err);
      setPasswordError(err.response?.data?.message || 'Failed to change password. Make sure current password is correct.');
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
              <div className="space-y-5">
                <h3 className="text-lg font-display font-semibold text-white">Security Settings</h3>
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-surface-800/30 border border-surface-700/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">Change Password</p>
                        <p className="text-xs text-surface-400 mt-1">Update your password regularly for security</p>
                      </div>
                      <Button onClick={() => setShowPasswordModal(true)} variant="secondary" size="sm">Change</Button>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-surface-800/30 border border-surface-700/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">Two-Factor Authentication</p>
                        <p className="text-xs text-surface-400 mt-1">Email OTP is enabled by default</p>
                      </div>
                      <span className="badge-accent">Enabled</span>
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
