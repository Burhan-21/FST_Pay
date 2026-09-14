import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { Eye, EyeOff, ArrowRight, Mail, Lock, Loader2, Sparkles, Shield, TrendingUp, KeyRound, ShieldCheck, Fingerprint } from 'lucide-react';
import { authApi } from '../../api/endpoints';
import ReCAPTCHA from 'react-google-recaptcha';

export default function Login() {
  const navigate = useNavigate();
  const { login, verifyOtp, verifyTotp, verifyBackupCode, loginWithPasskey, user } = useAuth();
  const { theme } = useTheme();

  useEffect(() => {
    if (user) {
      if (user.role === 'PARENT') {
        navigate('/parent/dashboard');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, navigate]);

  const [step, setStep] = useState<'credentials' | 'otp' | 'totp' | 'backup'>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [fallbackSent, setFallbackSent] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPasskeyLoading, setIsPasskeyLoading] = useState(false);

  const bufferFromBase64 = (base64: string): ArrayBuffer => {
    const clean = base64.replace(/-/g, '+').replace(/_/g, '/');
    const padded = clean.padEnd(clean.length + (4 - (clean.length % 4)) % 4, '=');
    const binary = window.atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  };

  const base64UrlFromBuffer = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };

  const handlePasskeyLogin = async () => {
    setError('');
    if (!window.PublicKeyCredential) {
      setError('WebAuthn Passkeys are not supported on this browser or platform.');
      return;
    }

    setIsPasskeyLoading(true);
    try {
      const optionsRes = await authApi.getWebAuthnLoginOptions(email ? email.trim() : undefined);
      const options = optionsRes.data.data;

      const challengeBuffer = bufferFromBase64(options.challenge);
      const allowCredentials = options.allowCredentials && options.allowCredentials.length > 0
        ? options.allowCredentials.map((cred: { id: string; type: string }) => ({
            id: bufferFromBase64(cred.id),
            type: cred.type as PublicKeyCredentialType,
          }))
        : undefined;

      const credential = (await navigator.credentials.get({
        publicKey: {
          challenge: challengeBuffer,
          rpId: options.rpId || window.location.hostname,
          userVerification: 'preferred',
          allowCredentials,
          timeout: 60000,
        },
      })) as PublicKeyCredential | null;

      if (!credential) {
        throw new Error('Biometric passkey prompt was cancelled or failed.');
      }

      const response = credential.response as AuthenticatorAssertionResponse;
      const clientDataJSON = base64UrlFromBuffer(response.clientDataJSON);
      const authenticatorData = base64UrlFromBuffer(response.authenticatorData);
      const signature = base64UrlFromBuffer(response.signature);
      const userHandle = response.userHandle ? base64UrlFromBuffer(response.userHandle) : undefined;

      await loginWithPasskey({
        credentialId: credential.id,
        clientDataJSON,
        authenticatorData,
        signature,
        userHandle,
      });
    } catch (err: unknown) {
      if (axios.isAxiosError<{ message?: string }>(err)) {
        setError(err.response?.data?.message || 'Passkey authentication failed.');
      } else if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Biometric authentication was cancelled or timed out.');
        } else {
          setError(err.message || 'Passkey authentication failed.');
        }
      } else {
        setError('Passkey authentication failed.');
      }
    } finally {
      setIsPasskeyLoading(false);
    }
  };

  const [stats, setStats] = useState<{ totalUsers: number; totalBalances: number }>({
    totalUsers: 0, totalBalances: 0
  });

  useEffect(() => {
    authApi.getStats()
      .then(res => {
        if (res.data?.data) {
          setStats({
            totalUsers: res.data.data.totalUsers || 0,
            totalBalances: res.data.data.totalBalances || 0
          });
        }
      })
      .catch(() => {});
  }, []);

  const formatUsers = (num: number) => {
    if (num <= 0) return '0';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K+';
    return num.toString();
  };

  const formatBalance = (amount: number) => {
    if (amount <= 0) return '₹0';
    if (amount >= 10000000) return '₹' + (amount / 10000000).toFixed(1) + 'Cr+';
    if (amount >= 100000) return '₹' + (amount / 100000).toFixed(1) + 'L+';
    if (amount >= 1000) return '₹' + (amount / 1000).toFixed(1) + 'K+';
    return '₹' + amount.toFixed(0);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recaptchaToken) { setError('Please complete the reCAPTCHA verification'); return; }
    setError('');
    setIsLoading(true);
    try {
      const result = await login(email, password, recaptchaToken);
      if (result.requiresTotp) {
        setStep('totp');
      } else if (result.requiresOtp) {
        setStep('otp');
      }
    } catch (err: unknown) {
      if (axios.isAxiosError<{ message?: string }>(err)) {
        setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
      } else {
        setError('Invalid credentials. Please try again.');
      }
    } finally { setIsLoading(false); }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await verifyOtp(email, otp);
    } catch (err: unknown) {
      if (axios.isAxiosError<{ message?: string }>(err)) {
        setError(err.response?.data?.message || 'Invalid OTP. Please try again.');
      } else {
        setError('Invalid OTP. Please try again.');
      }
    } finally { setIsLoading(false); }
  };

  const handleTotpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await verifyTotp(email, totpCode);
    } catch (err: unknown) {
      if (axios.isAxiosError<{ message?: string }>(err)) {
        setError(err.response?.data?.message || 'Invalid verification code. Please check your authenticator app.');
      } else {
        setError('Invalid verification code. Please check your authenticator app.');
      }
    } finally { setIsLoading(false); }
  };

  const handleBackupVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await verifyBackupCode(email, backupCode);
    } catch (err: unknown) {
      if (axios.isAxiosError<{ message?: string }>(err)) {
        setError(err.response?.data?.message || 'Invalid or already used backup code.');
      } else {
        setError('Invalid or already used backup code.');
      }
    } finally { setIsLoading(false); }
  };

  const handleRequestEmailFallback = async () => {
    setError('');
    setIsLoading(true);
    try {
      await authApi.sendTotpFallbackEmailOtp(email);
      setFallbackSent(true);
      setStep('otp');
    } catch (err: unknown) {
      if (axios.isAxiosError<{ message?: string }>(err)) {
        setError(err.response?.data?.message || 'Failed to send fallback verification code.');
      } else {
        setError('Failed to send fallback verification code.');
      }
    } finally { setIsLoading(false); }
  };

  return (
    <div className={`min-h-screen flex ${theme === 'amoled' ? 'bg-black' : 'bg-surface-950'}`}>
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-700 to-surface-900" />
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-accent-500/20 rounded-full blur-[120px] float-slow" />
          <div className="absolute bottom-32 right-16 w-96 h-96 bg-primary-400/20 rounded-full blur-[150px] float-medium" />
          <div className="absolute top-1/3 left-1/3 w-64 h-64 bg-purple-400/10 rounded-full blur-[100px] float-slow" style={{ animationDelay: '-4s' }} />
        </div>

        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-14 h-14 rounded-2xl gradient-card flex items-center justify-center shadow-2xl shadow-primary-500/30">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-accent tracking-[0.15em] uppercase">FST Pay</h1>
                <p className="text-xs text-primary-300 font-medium tracking-wider uppercase">Premium Wallet</p>
              </div>
            </div>
          </div>

          <h2 className="text-5xl font-primary font-bold leading-tight mb-4">
            Your money,<br />
            <span className="text-gradient-cool">your rules.</span>
          </h2>
          <p className="text-lg text-primary-200 max-w-md leading-relaxed">
            AI-powered smart wallet that helps you budget, save, and grow — built for students and young professionals ages 12+.
          </p>

          <div className="mt-16 grid grid-cols-3 gap-6">
            {[
              { value: formatUsers(stats.totalUsers), label: 'Active Users', icon: UsersIcon },
              { value: formatBalance(stats.totalBalances), label: 'Managed', icon: TrendingUp },
              { value: '4.8★', label: 'Rating', icon: Shield },
            ].map((stat) => (
              <div key={stat.label} className="text-center glass-border p-4">
                <stat.icon className="w-5 h-5 text-accent-400 mx-auto mb-2" />
                <p className="text-2xl font-bold font-primary text-white">{stat.value}</p>
                <p className="text-xs text-primary-300 font-medium uppercase tracking-wider">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 justify-center mb-4">
            <div className="w-12 h-12 rounded-xl gradient-card flex items-center justify-center shadow-lg shadow-primary-500/30">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-accent tracking-wider text-white uppercase">FST Pay</span>
          </div>

          <div className="text-center lg:text-left">
            <h1 className="text-3xl font-primary font-bold text-white">
              {step === 'credentials' ? 'Welcome back' : 'Verify your email'}
            </h1>
            <p className="mt-2 text-surface-400">
              {step === 'credentials'
                ? 'Sign in to manage your smart wallet'
                : `We sent a 6-digit code to ${email}`}
            </p>
          </div>

          {error && (
            <div className="p-4 rounded-2xl bg-danger-500/10 border border-danger-500/20 text-danger-400 text-sm animate-slide-down">
              {error}
            </div>
          )}

          {step === 'credentials' ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="page-section">
                <label htmlFor="login-email" className="input-label">Email Address</label>
                <div className="relative input-field flex items-center px-0 py-0">
                  <div className="flex items-center justify-center w-11 shrink-0">
                    <Mail className="w-4 h-4 text-surface-400" />
                  </div>
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    className="bg-transparent flex-1 py-3 pr-4 text-white placeholder-surface-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="page-section">
                <label htmlFor="login-password" className="input-label">Password</label>
                <div className="relative input-field flex items-center px-0 py-0">
                  <div className="flex items-center justify-center w-11 shrink-0">
                    <Lock className="w-4 h-4 text-surface-400" />
                  </div>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={8}
                    autoComplete="current-password"
                    className="bg-transparent flex-1 py-3 pr-4 text-white placeholder-surface-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="pr-4 text-surface-500 hover:text-surface-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-center page-section">
                <ReCAPTCHA
                  sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'}
                  onChange={(token) => setRecaptchaToken(token)}
                  theme={theme === 'light' ? 'light' : 'dark'}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-gradient w-full flex items-center justify-center gap-2 py-3 page-section"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="relative flex items-center justify-center my-1 page-section">
                <div className="border-t border-surface-700/60 w-full"></div>
                <span className="bg-surface-900 px-3 text-xs text-surface-400 uppercase tracking-wider font-semibold">
                  or
                </span>
              </div>

              <button
                type="button"
                onClick={handlePasskeyLogin}
                disabled={isPasskeyLoading || isLoading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-primary-500/30 bg-primary-600/10 hover:bg-primary-600/20 text-white font-medium text-sm transition-all shadow-sm group page-section"
              >
                {isPasskeyLoading ? (
                  <Loader2 className="w-5 h-5 text-primary-400 animate-spin" />
                ) : (
                  <>
                    <Fingerprint className="w-5 h-5 text-primary-400 group-hover:scale-110 transition-transform" />
                    <span>Sign in with Passkey (Face ID / Touch ID)</span>
                  </>
                )}
              </button>

              <p className="text-center text-sm text-surface-500">
                Made with <span className="text-primary-400">❤</span> for smart spenders
              </p>
            </form>
          ) : step === 'totp' ? (
            <form onSubmit={handleTotpVerify} className="space-y-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-primary-500/10 border border-primary-500/20 text-primary-400 flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-display font-semibold text-white">Authenticator App 2FA</h3>
                <p className="text-xs text-surface-400">
                  Enter the 6-digit code from Google Authenticator, 1Password, or Authy.
                </p>
              </div>

              <div>
                <label htmlFor="totp-input" className="input-label">Authenticator Code</label>
                <input
                  id="totp-input"
                  type="text"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  required
                  maxLength={6}
                  className="input-field text-center text-3xl font-mono tracking-[0.5em] py-4"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || totpCode.length !== 6}
                className="btn-gradient w-full flex items-center justify-center gap-2 py-3"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Verify & Sign In
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="space-y-2 pt-2 text-center border-t border-surface-800">
                <button
                  type="button"
                  onClick={() => { setStep('backup'); setError(''); }}
                  className="text-xs text-primary-400 hover:text-primary-300 font-medium block w-full py-1"
                >
                  Lost your phone? Use an emergency recovery code
                </button>
                <button
                  type="button"
                  onClick={handleRequestEmailFallback}
                  disabled={isLoading}
                  className="text-xs text-surface-400 hover:text-surface-300 block w-full py-1"
                >
                  Send code to registered email instead
                </button>
                <button
                  type="button"
                  onClick={() => { setStep('credentials'); setTotpCode(''); setError(''); }}
                  className="btn-ghost w-full text-xs"
                >
                  ← Back to login
                </button>
              </div>
            </form>
          ) : step === 'backup' ? (
            <form onSubmit={handleBackupVerify} className="space-y-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-display font-semibold text-white">Emergency Recovery Code</h3>
                <p className="text-xs text-surface-400">
                  Enter one of your single-use 8-character backup codes saved during 2FA enrollment.
                </p>
              </div>

              <div>
                <label htmlFor="backup-input" className="input-label">Recovery Code (XXXX-XXXX)</label>
                <input
                  id="backup-input"
                  type="text"
                  value={backupCode}
                  onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                  placeholder="8F4A-9K2C"
                  required
                  maxLength={10}
                  className="input-field text-center text-xl font-mono tracking-widest py-3 uppercase"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || backupCode.trim().length < 8}
                className="btn-gradient w-full flex items-center justify-center gap-2 py-3"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Verify Recovery Code
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="space-y-2 pt-2 text-center border-t border-surface-800">
                <button
                  type="button"
                  onClick={() => { setStep('totp'); setError(''); }}
                  className="text-xs text-primary-400 hover:text-primary-300 font-medium block w-full py-1"
                >
                  Use Authenticator App 6-digit code
                </button>
                <button
                  type="button"
                  onClick={handleRequestEmailFallback}
                  disabled={isLoading}
                  className="text-xs text-surface-400 hover:text-surface-300 block w-full py-1"
                >
                  Send code to registered email instead
                </button>
                <button
                  type="button"
                  onClick={() => { setStep('credentials'); setBackupCode(''); setError(''); }}
                  className="btn-ghost w-full text-xs"
                >
                  ← Back to login
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleOtpVerify} className="space-y-6">
              {fallbackSent && (
                <div className="p-3 rounded-xl bg-accent-500/10 border border-accent-500/20 text-accent-400 text-xs text-center">
                  Verification OTP dispatched to {email}.
                </div>
              )}
              <div>
                <label htmlFor="otp-input" className="input-label">Email Verification Code</label>
                <input
                  id="otp-input"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  required
                  maxLength={6}
                  className="input-field text-center text-3xl font-mono tracking-[0.5em] py-4"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || otp.length !== 6}
                className="btn-gradient w-full flex items-center justify-center gap-2 py-3"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Verify & Sign In
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => { setStep('credentials'); setOtp(''); setError(''); setFallbackSent(false); }}
                className="btn-ghost w-full text-sm"
              >
                ← Back to login
              </button>
            </form>
          )}

          <p className="text-center text-sm text-surface-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}
