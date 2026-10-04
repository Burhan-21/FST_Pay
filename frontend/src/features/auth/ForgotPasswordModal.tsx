import { useState } from 'react';
import axios from 'axios';
import { Mail, KeyRound, Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { authApi } from '../../api/endpoints';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
}

export default function ForgotPasswordModal({ isOpen, onClose, initialEmail = '' }: ForgotPasswordModalProps) {
  const [step, setStep] = useState<'request' | 'confirm' | 'success'>('request');
  const [email, setEmail] = useState(initialEmail);
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  if (!isOpen) return null;

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your registered email address.');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      await authApi.requestPasswordReset(email.trim().toLowerCase());
      setInfoMessage(`If an account exists for ${email}, a reset link and code have been sent to your email.`);
      setStep('confirm');
    } catch (err: unknown) {
      if (axios.isAxiosError<{ message?: string }>(err)) {
        setError(err.response?.data?.message || 'Failed to send reset email. Please try again.');
      } else {
        setError('Failed to send reset email. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleanToken = token.trim();
    if (!cleanToken) {
      setError('Please enter the reset token or code from your email.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    setIsLoading(true);
    try {
      await authApi.confirmPasswordReset({
        token: cleanToken,
        newPassword,
      });
      setStep('success');
    } catch (err: unknown) {
      if (axios.isAxiosError<{ message?: string }>(err)) {
        setError(err.response?.data?.message || 'Invalid or expired reset token. Please request a new one.');
      } else {
        setError('Failed to reset password. Please check your reset token.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetModal = () => {
    setStep('request');
    setError('');
    setInfoMessage('');
    setToken('');
    setNewPassword('');
    setConfirmPassword('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-surface-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-surface-800 overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-surface-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary-50 dark:bg-primary-950/50 border border-primary-100 dark:border-primary-800 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {step === 'request' ? 'Forgot Password' : step === 'confirm' ? 'Reset Password' : 'Password Reset'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-surface-400">
                {step === 'request'
                  ? 'Recover access to your account'
                  : step === 'confirm'
                  ? 'Enter reset code and choose a new password'
                  : 'Account security updated'}
              </p>
            </div>
          </div>
          <button
            onClick={handleResetModal}
            className="text-slate-400 hover:text-slate-600 dark:text-surface-400 dark:hover:text-surface-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-surface-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {infoMessage && step === 'confirm' && (
            <div className="mb-4 p-3 rounded-xl bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800/50 flex items-start gap-2.5 text-xs text-primary-700 dark:text-primary-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-primary-500" />
              <span>{infoMessage}</span>
            </div>
          )}

          {step === 'request' && (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <div>
                <label htmlFor="reset-email" className="input-label text-slate-700 dark:text-surface-300 font-medium text-xs mb-1.5 block">
                  Registered Email Address
                </label>
                <div className="relative flex items-center px-0 py-0 bg-white dark:bg-surface-800/60 border border-slate-200 dark:border-surface-600/40 rounded-xl focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20 transition-all shadow-xs">
                  <div className="flex items-center justify-center w-11 shrink-0">
                    <Mail className="w-4 h-4 text-slate-400 dark:text-surface-400" />
                  </div>
                  <input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    autoFocus
                    className="bg-transparent flex-1 py-3 pr-4 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-surface-400 text-sm font-medium focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-gradient w-full flex items-center justify-center gap-2 py-3 font-bold shadow-md shadow-primary-500/20"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span>Send Reset Instructions</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setStep('confirm')}
                  className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline"
                >
                  Already have a reset code? Click here
                </button>
              </div>
            </form>
          )}

          {step === 'confirm' && (
            <form onSubmit={handleConfirmReset} className="space-y-4">
              <div>
                <label htmlFor="reset-token" className="input-label text-slate-700 dark:text-surface-300 font-medium text-xs mb-1.5 block">
                  Reset Token / Code
                </label>
                <div className="relative flex items-center px-0 py-0 bg-white dark:bg-surface-800/60 border border-slate-200 dark:border-surface-600/40 rounded-xl focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20 transition-all shadow-xs">
                  <div className="flex items-center justify-center w-11 shrink-0">
                    <KeyRound className="w-4 h-4 text-slate-400 dark:text-surface-400" />
                  </div>
                  <input
                    id="reset-token"
                    type="text"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Paste code from email"
                    required
                    className="bg-transparent flex-1 py-3 pr-4 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-surface-400 text-sm font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="new-password" className="input-label text-slate-700 dark:text-surface-300 font-medium text-xs mb-1.5 block">
                  New Password (min 8 characters)
                </label>
                <div className="relative flex items-center px-0 py-0 bg-white dark:bg-surface-800/60 border border-slate-200 dark:border-surface-600/40 rounded-xl focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20 transition-all shadow-xs">
                  <div className="flex items-center justify-center w-11 shrink-0">
                    <Lock className="w-4 h-4 text-slate-400 dark:text-surface-400" />
                  </div>
                  <input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    required
                    minLength={8}
                    className="bg-transparent flex-1 py-3 pr-4 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-surface-400 text-sm font-medium focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="pr-4 text-slate-400 hover:text-slate-600 dark:text-surface-400 dark:hover:text-surface-200 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirm-new-password" className="input-label text-slate-700 dark:text-surface-300 font-medium text-xs mb-1.5 block">
                  Confirm New Password
                </label>
                <div className="relative flex items-center px-0 py-0 bg-white dark:bg-surface-800/60 border border-slate-200 dark:border-surface-600/40 rounded-xl focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20 transition-all shadow-xs">
                  <div className="flex items-center justify-center w-11 shrink-0">
                    <Lock className="w-4 h-4 text-slate-400 dark:text-surface-400" />
                  </div>
                  <input
                    id="confirm-new-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    required
                    minLength={8}
                    className="bg-transparent flex-1 py-3 pr-4 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-surface-400 text-sm font-medium focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="pr-4 text-slate-400 hover:text-slate-600 dark:text-surface-400 dark:hover:text-surface-200 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('request')}
                  className="px-4 py-3 rounded-xl border border-slate-200 dark:border-surface-700 text-xs font-bold text-slate-700 dark:text-surface-300 hover:bg-slate-50 dark:hover:bg-surface-800 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-gradient flex-1 flex items-center justify-center gap-2 py-3 font-bold shadow-md shadow-primary-500/20 text-sm"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Update Password</span>}
                </button>
              </div>
            </form>
          )}

          {step === 'success' && (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/20">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-slate-900 dark:text-white">Password Changed Successfully!</h4>
                <p className="text-xs text-slate-500 dark:text-surface-400 max-w-xs mx-auto">
                  Your password has been updated. You can now log into your FST Pay account with your new credentials.
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetModal}
                className="btn-gradient w-full py-3 font-bold text-sm shadow-md shadow-primary-500/20"
              >
                Return to Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
