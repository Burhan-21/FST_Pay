import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Lock, Shield, Bell, Palette, Loader2, Check, AlertCircle } from 'lucide-react';
import { userApi } from '../../api/endpoints';
import api from '../../api/axios';

export default function SettingsPage() {
  const { user, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Profile Form States
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');

  // Parental Controls States
  const [parentalEnabled, setParentalEnabled] = useState(user?.parentalControlEnabled || false);
  const [parentalMaxTxn, setParentalMaxTxn] = useState(String(user?.parentalMaxTxnAmount || '0'));
  const [restrictedCategories, setRestrictedCategories] = useState<string[]>(
    user?.parentalRestrictedCategories ? user.parentalRestrictedCategories.split(',').map((c: string) => c.trim()).filter(Boolean) : []
  );
  const [parentalPin, setParentalPin] = useState(user?.parentalPin || '');
  const [parentName, setParentName] = useState(user?.parentName || '');
  const [parentEmail, setParentEmail] = useState(user?.parentEmail || '');
  const [parentPhone, setParentPhone] = useState(user?.parentPhone || '');
  const [parentDob, setParentDob] = useState(user?.parentDob || '');
  const [parentGender, setParentGender] = useState(user?.parentGender || '');
  const [parentAge, setParentAge] = useState(String(user?.parentAge || ''));
  const [isParentalLoading, setIsParentalLoading] = useState(false);
  const [parentalError, setParentalError] = useState('');
  const [parentalSaved, setParentalSaved] = useState(false);

  const handleSaveParental = async () => {
    try {
      setIsParentalLoading(true);
      setParentalError('');
      
      if (parentalEnabled && !parentalPin) {
        setParentalError('A Parental PIN is required to enable parental controls.');
        setIsParentalLoading(false);
        return;
      }

      await api.put('/users/me/parental', {
        parentalControlEnabled: parentalEnabled,
        parentalMaxTxnAmount: parseFloat(parentalMaxTxn) || 0,
        parentalRestrictedCategories: restrictedCategories.join(','),
        parentalPin: parentalPin,
        parentName,
        parentEmail,
        parentPhone,
        parentDob: parentDob || null,
        parentGender,
        parentAge: parseInt(parentAge) || null
      });

      await refreshProfile();
      setParentalSaved(true);
      setTimeout(() => setParentalSaved(false), 2000);
    } catch (err: any) {
      console.error('Failed to update parental controls:', err);
      setParentalError(err.response?.data?.message || 'Failed to update parental controls.');
    } finally {
      setIsParentalLoading(false);
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
      alert('Password updated successfully! 🎉');
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Settings</h1>
        <p className="text-surface-400 mt-1">Manage your account preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 page-section">
        {/* Tabs */}
        <div className="glass-card p-2 lg:w-56 flex lg:flex-col gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-primary-500/15 text-primary-400' : 'text-surface-400 hover:bg-surface-800'}`}>
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 glass-card p-6">
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
                  <label className="input-label">Full Name</label>
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="input-label">Phone</label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" className="input-field" />
                </div>
                <div>
                  <label className="input-label">Email</label>
                  <input type="email" value={user?.email || ''} disabled className="input-field opacity-50 cursor-not-allowed" />
                </div>
                <div>
                  <label className="input-label">Date of Birth</label>
                  <input type="date" value={user?.dateOfBirth || ''} disabled className="input-field opacity-50 cursor-not-allowed" />
                </div>
              </div>
              <button onClick={handleSave} disabled={isLoading} className="btn-primary flex items-center gap-2">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <><Check className="w-4 h-4" /> Saved</> : 'Save Changes'}
              </button>
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
                    <button onClick={() => setShowPasswordModal(true)} className="btn-secondary text-sm px-4 py-2">Change</button>
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
            <div className="space-y-5">
              <h3 className="text-lg font-display font-semibold text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary-400" />
                Parental Control Settings
              </h3>
              <p className="text-xs text-surface-400">
                Enforce spending limits and restrict specific payment categories. A PIN is required to save these settings.
              </p>

              {parentalError && (
                <div className="p-3 rounded-xl bg-danger-500/10 border border-danger-500/20 text-danger-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{parentalError}</span>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-surface-800/30 border border-surface-700/30">
                  <div>
                    <p className="text-sm font-medium text-white">Enable Parental Lock</p>
                    <p className="text-xs text-surface-400 mt-1">Restrict card spending and category usage</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={parentalEnabled}
                      onChange={(e) => setParentalEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-surface-750 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-400 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600 peer-checked:after:bg-white"></div>
                  </label>
                </div>

                {parentalEnabled && (
                  <div className="space-y-4">
                    <div>
                      <label className="input-label">Maximum Single Transaction Limit (₹)</label>
                      <input
                        type="number"
                        value={parentalMaxTxn}
                        onChange={(e) => setParentalMaxTxn(e.target.value)}
                        className="input-field"
                        placeholder="e.g. 2000"
                        min="0"
                      />
                    </div>

                    <div>
                      <label className="input-label mb-2 block">Restricted Merchant Categories</label>
                      <div className="grid grid-cols-2 gap-3">
                        {['GAMING', 'ENTERTAINMENT', 'SHOPPING', 'FOOD'].map((cat) => {
                          const isRestricted = restrictedCategories.includes(cat);
                          return (
                            <label
                              key={cat}
                              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                isRestricted
                                  ? 'bg-danger-500/10 border-danger-500/30 text-danger-400'
                                  : 'bg-surface-800/20 border-surface-700/50 text-surface-300 hover:bg-surface-800/40'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isRestricted}
                                onChange={() => {
                                  if (isRestricted) {
                                    setRestrictedCategories(restrictedCategories.filter((c) => c !== cat));
                                  } else {
                                    setRestrictedCategories([...restrictedCategories, cat]);
                                  }
                                }}
                                className="rounded bg-surface-800 border-surface-700 text-danger-600 focus:ring-danger-500"
                              />
                              <span className="text-xs font-semibold">{cat}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-4 rounded-xl bg-surface-800/30 border border-surface-700/30 space-y-4">
                  <p className="text-sm font-medium text-white">Linked Parent Profile</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="input-label">Parent's Full Name</label>
                      <input
                        type="text"
                        value={parentName}
                        onChange={(e) => setParentName(e.target.value)}
                        placeholder="e.g. Jasmeen Fatima"
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="input-label">Email Address</label>
                      <input
                        type="email"
                        value={parentEmail}
                        onChange={(e) => setParentEmail(e.target.value)}
                        placeholder="e.g. mr.farru21@gmail.com"
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="input-label">Mobile Number</label>
                      <input
                        type="tel"
                        value={parentPhone}
                        onChange={(e) => setParentPhone(e.target.value)}
                        placeholder="e.g. 91418116002"
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="input-label">Date of Birth</label>
                      <input
                        type="date"
                        value={parentDob}
                        onChange={(e) => setParentDob(e.target.value)}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="input-label">Gender</label>
                      <select
                        value={parentGender}
                        onChange={(e) => setParentGender(e.target.value)}
                        className="input-field"
                      >
                        <option value="">Select Gender</option>
                        <option value="female">Female</option>
                        <option value="male">Male</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="input-label">Age</label>
                      <input
                        type="number"
                        value={parentAge}
                        onChange={(e) => setParentAge(e.target.value)}
                        placeholder="e.g. 40"
                        className="input-field"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-surface-800/30 border border-surface-700/30 space-y-3">
                  <p className="text-sm font-medium text-white">Parental PIN Code</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="input-label">Set 4-Digit PIN</label>
                      <input
                        type="password"
                        maxLength={4}
                        value={parentalPin}
                        onChange={(e) => setParentalPin(e.target.value.replace(/\D/g, ''))}
                        className="input-field font-mono text-center tracking-widest text-sm"
                        placeholder="••••"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSaveParental}
                disabled={isParentalLoading}
                className="btn-primary flex items-center gap-2"
              >
                {isParentalLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : parentalSaved ? (
                  <>
                    <Check className="w-4 h-4" /> Locked
                  </>
                ) : (
                  'Apply Parental Settings'
                )}
              </button>
            </div>
          )}

          {(activeTab === 'notifications' || activeTab === 'privacy') && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Palette className="w-12 h-12 text-surface-600 mb-3" />
              <p className="text-surface-400">Coming soon in the next update</p>
            </div>
          )}
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form onSubmit={handlePasswordChangeSubmit} className="glass-card p-6 w-full max-w-md space-y-4 animate-slide-up">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-display font-semibold text-white">Change Password</h3>
              <button type="button" onClick={() => setShowPasswordModal(false)} className="text-surface-400 hover:text-white text-xl">✕</button>
            </div>

            {passwordError && (
              <div className="p-3 rounded-xl bg-danger-500/10 border border-danger-500/20 text-danger-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <div>
              <label className="input-label">Current Password</label>
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" className="input-field" required />
            </div>

            <div>
              <label className="input-label">New Password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" className="input-field" required />
            </div>

            <div>
              <label className="input-label">Confirm New Password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className="input-field" required />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowPasswordModal(false)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={isPasswordLoading} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {isPasswordLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
