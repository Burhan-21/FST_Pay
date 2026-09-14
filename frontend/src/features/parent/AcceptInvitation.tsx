import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { parentalApi } from '../../api/endpoints';
import type { ParentInvitation } from '../../types';
import { Loader2, Sparkles, User, Lock, Phone, Calendar, Shield, CheckCircle, ArrowRight } from 'lucide-react';
import PageTransition from '../../components/ui/PageTransition';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { refreshProfile } = useAuth();

  const [invitation, setInvitation] = useState<ParentInvitation | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(!!token);
  const [error, setError] = useState(token ? '' : 'No invitation token provided. Please check the link from the email invitation.');
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const gender = 'OTHER';

  const isAmoled = theme === 'amoled';

  useEffect(() => {
    if (!token) return;

    const fetchInvitation = async () => {
      try {
        const { data } = await parentalApi.getInvitation(token);
        if (data?.data) {
          setInvitation(data.data);
        }
      } catch (err: unknown) {
        if (axios.isAxiosError<{ message?: string }>(err)) {
          setError(err.response?.data?.message || 'Failed to verify invitation token. It may have expired or been cancelled.');
        } else {
          setError('Failed to verify invitation token. It may have expired or been cancelled.');
        }
      } finally {
        setLoadingInvite(false);
      }
    };

    fetchInvitation();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const payload = {
        token,
        fullName,
        password,
        phone,
        dateOfBirth,
        gender
      };

      const { data } = await parentalApi.acceptInvitation(payload);
      if (data?.success && data?.data) {
        const tokenResponse = data.data;
        if (tokenResponse.accessToken) {
          localStorage.setItem('fst_access_token', tokenResponse.accessToken);
        }
        if (tokenResponse.refreshToken) {
          localStorage.setItem('fst_refresh_token', tokenResponse.refreshToken);
        }
        await refreshProfile();
        navigate('/parent/dashboard');
      } else {
        setError('Failed to configure parent profile. Please try again.');
      }
    } catch (err: unknown) {
      if (axios.isAxiosError<{ message?: string }>(err)) {
        setError(err.response?.data?.message || 'Registration failed. Please review your details.');
      } else {
        setError('Registration failed. Please review your details.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInvite) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center ${isAmoled ? 'bg-black' : 'bg-surface-950'}`}>
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center animate-pulse-glow shadow-glow mb-4">
          <Loader2 className="w-6 h-6 text-white animate-spin" />
        </div>
        <p className="text-surface-400 text-sm animate-pulse">Verifying invitation token...</p>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className={`min-h-screen flex items-center justify-center p-4 ${isAmoled ? 'bg-black' : 'bg-surface-950'}`}>
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary-500/10 rounded-full blur-[150px] animate-float-slow" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-accent-500/10 rounded-full blur-[120px] animate-float-medium" />
        </div>

        <GlassCard padding="lg" className="w-full max-w-xl relative z-10 space-y-6 md:p-8">
          {/* Header */}
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl gradient-card flex items-center justify-center mx-auto mb-4 shadow-xl shadow-primary-500/20">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-slate-900 dark:text-white leading-tight">
              Accept Parent Invitation
            </h1>
            <p className="text-slate-500 dark:text-surface-400 text-sm mt-2">
              Link your parent account with FST Pay
            </p>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-danger-500/10 border border-danger-500/20 text-danger-400 text-sm animate-slide-down">
              {error}
            </div>
          )}

          {invitation ? (
            <div className="space-y-6">
              {/* Child Linked Info Box */}
              <div className="p-4 rounded-xl bg-primary-500/5 border border-primary-500/15 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center text-primary-400">
                  <Shield className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-primary-400 font-semibold uppercase tracking-wider">Invitation Linked</p>
                  <p className="text-sm text-white font-medium truncate mt-0.5">
                    Teen account: <span className="text-primary-300 font-semibold">{invitation.child?.fullName}</span> ({invitation.child?.email})
                  </p>
                </div>
                <div className="flex items-center gap-1 bg-accent-500/15 text-accent-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-accent-500/25">
                  <CheckCircle className="w-3 h-3" />
                  <span>{invitation.relationship}</span>
                </div>
              </div>

              {/* Registration Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="fullName" className="input-label">Full Name</label>
                    <div className="flex items-center input-field px-0 py-0">
                      <div className="flex items-center justify-center w-11 shrink-0">
                        <User className="w-4 h-4 text-surface-400" />
                      </div>
                      <input
                        id="fullName"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Jane Doe"
                        required
                        className="bg-transparent flex-1 py-3 pr-4 text-white focus:outline-none text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="parentEmail" className="input-label">Parent Email (Auto-filled)</label>
                    <div className="flex items-center input-field bg-surface-900/50 opacity-60 px-0 py-0 cursor-not-allowed">
                      <div className="flex items-center justify-center w-11 shrink-0">
                        <User className="w-4 h-4 text-surface-400" />
                      </div>
                      <input
                        id="parentEmail"
                        type="text"
                        value={invitation.parentEmail}
                        disabled
                        className="bg-transparent flex-1 py-3 pr-4 text-surface-400 focus:outline-none text-sm cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="phone" className="input-label">Phone Number</label>
                    <div className="flex items-center input-field px-0 py-0">
                      <div className="flex items-center justify-center w-11 shrink-0">
                        <Phone className="w-4 h-4 text-surface-400" />
                      </div>
                      <input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 XXXXX XXXXX"
                        required
                        className="bg-transparent flex-1 py-3 pr-4 text-white focus:outline-none text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="dateOfBirth" className="input-label">Date of Birth</label>
                    <div className="flex items-center input-field px-0 py-0">
                      <div className="flex items-center justify-center w-11 shrink-0">
                        <Calendar className="w-4 h-4 text-surface-400" />
                      </div>
                      <input
                        id="dateOfBirth"
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        required
                        max={new Date().toISOString().split('T')[0]}
                        className="bg-transparent flex-1 py-3 pr-4 text-white focus:outline-none text-sm [color-scheme:dark]"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="password" className="input-label">Password</label>
                    <div className="flex items-center input-field px-0 py-0">
                      <div className="flex items-center justify-center w-11 shrink-0">
                        <Lock className="w-4 h-4 text-surface-400" />
                      </div>
                      <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        minLength={8}
                        className="bg-transparent flex-1 py-3 pr-4 text-white focus:outline-none text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="input-label">Confirm Password</label>
                    <div className="flex items-center input-field px-0 py-0">
                      <div className="flex items-center justify-center w-11 shrink-0">
                        <Lock className="w-4 h-4 text-surface-400" />
                      </div>
                      <input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        minLength={8}
                        className="bg-transparent flex-1 py-3 pr-4 text-white focus:outline-none text-sm"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  variant="primary"
                  className="w-full flex items-center justify-center gap-2 py-3 mt-4"
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Link accounts & Sign in
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </form>
            </div>
          ) : (
            <div className="text-center py-6 text-surface-500 text-sm">
              Please enter a valid invitation link.
            </div>
          )}
        </GlassCard>
      </div>
    </PageTransition>
  );
}
