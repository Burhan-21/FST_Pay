import { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { Eye, EyeOff, ArrowRight, Mail, Lock, User, Calendar, Loader2, Check, Sparkles, Zap, BarChart3, Trophy, Shield } from 'lucide-react';
import ReCAPTCHA from 'react-google-recaptcha';

const features = [
  { icon: Zap, text: 'AI-powered budget planning', color: 'from-primary-500 to-purple-500' },
  { icon: Shield, text: 'Virtual prepaid cards', color: 'from-accent-500 to-teal-500' },
  { icon: BarChart3, text: 'Real-time spending analytics', color: 'from-blue-500 to-cyan-500' },
  { icon: Trophy, text: 'Rewards for smart spending', color: 'from-amber-500 to-orange-500' },
];

export default function Register() {
  const navigate = useNavigate();
  const { register, verifyOtp } = useAuth();
  const { theme } = useTheme();

  const [step, setStep] = useState<'details' | 'otp'>('details');
  const [otp, setOtp] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const passwordChecks = [
    { label: '8+ characters', valid: password.length >= 8 },
    { label: 'One lowercase (a-z)', valid: /[a-z]/.test(password) },
    { label: 'One uppercase (A-Z)', valid: /[A-Z]/.test(password) },
    { label: 'One number (0-9)', valid: /\d/.test(password) },
    { label: 'One special symbol (!@#$...)', valid: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password) },
    { label: 'Passwords match', valid: password === confirmPassword && confirmPassword.length > 0 },
  ];

  const isFormValid = passwordChecks.every((c) => c.valid) && fullName.trim().length > 0 && email.trim().length > 0 && dateOfBirth;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    const cleanFullName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const tokenToSend = recaptchaToken || (import.meta.env.DEV ? 'dev-local-token' : '');
    if (!tokenToSend) {
      setError('Please complete the reCAPTCHA verification');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const result = await register(cleanFullName, cleanEmail, password, dateOfBirth, tokenToSend);
      if (result.requiresOtp) setStep('otp');
      else navigate('/dashboard');
    } catch (err: unknown) {
      if (axios.isAxiosError<{ message?: string; data?: Record<string, string> }>(err)) {
        if (!err.response) {
          setError('Cannot connect to backend server. Please ensure backend is running.');
        } else {
          const resData = err.response.data;
          if (resData?.data && typeof resData.data === 'object' && Object.keys(resData.data).length > 0) {
            const firstErr = Object.values(resData.data)[0];
            setError(firstErr || resData.message || 'Registration validation failed.');
          } else {
            setError(resData?.message || 'Registration failed. Please check the entered details.');
          }
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally { setIsLoading(false); }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();
    if (cleanOtp.length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      await verifyOtp(cleanEmail, cleanOtp);
      navigate('/dashboard');
    } catch (err: unknown) {
      if (axios.isAxiosError<{ message?: string }>(err)) {
        setError(err.response?.data?.message || 'Invalid OTP. Please try again.');
      } else {
        setError('Invalid OTP. Please try again.');
      }
    } finally { setIsLoading(false); }
  };

  if (step === 'otp') {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 transition-colors duration-200 ${
        theme === 'amoled'
          ? 'bg-black text-white'
          : 'bg-[#F7FAFF] dark:bg-surface-950 text-slate-900 dark:text-white'
      }`}>
        <div className="max-w-md w-full space-y-6 animate-scale-in bg-white dark:bg-surface-900 amoled:bg-surface-900/60 p-8 rounded-3xl border border-slate-200/80 dark:border-surface-800 shadow-xl">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl gradient-card flex items-center justify-center mx-auto mb-4 shadow-xl shadow-primary-500/20">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Verify your email</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-surface-400">
              We sent a 6-digit code to <span className="font-semibold text-slate-900 dark:text-white">{email}</span>
            </p>
          </div>

          {error && (
            <div className="p-4 rounded-2xl bg-danger-500/10 border border-danger-500/20 text-danger-500 dark:text-danger-400 text-sm animate-slide-down">
              {error}
            </div>
          )}

          <form onSubmit={handleOtpVerify} className="space-y-5">
            <div>
              <label htmlFor="otp-input" className="input-label text-slate-700 dark:text-surface-300 font-medium text-xs">Verification Code</label>
              <input
                id="otp-input"
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit code"
                required
                maxLength={6}
                className="input-field text-center text-3xl font-mono tracking-[0.5em] py-4 bg-white dark:bg-surface-800/60 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-surface-400 caret-primary-600 dark:caret-primary-400 border-slate-200 dark:border-surface-600/40 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || otp.length !== 6}
              className="btn-gradient w-full flex items-center justify-center gap-2 py-3.5 font-bold shadow-md shadow-primary-500/20"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Verify & Create Account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => { setStep('details'); setOtp(''); setError(''); }}
              className="w-full text-center py-2 text-xs font-semibold text-slate-500 dark:text-surface-400 hover:text-slate-800 dark:hover:text-white transition-colors"
            >
              ← Back to registration
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex transition-colors duration-200 ${
      theme === 'amoled'
        ? 'bg-black text-white'
        : 'bg-[#F7FAFF] dark:bg-surface-950 text-slate-900 dark:text-white'
    }`}>
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent-600 via-primary-700 to-surface-900" />
        <div className="absolute inset-0">
          <div className="absolute top-32 right-20 w-80 h-80 bg-primary-400/20 rounded-full blur-[120px] float-medium" />
          <div className="absolute bottom-20 left-16 w-72 h-72 bg-accent-400/20 rounded-full blur-[100px] float-slow" />
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
            Start your<br />
            <span className="text-gradient-warm">financial journey.</span>
          </h2>
          <p className="text-lg text-primary-200 max-w-md leading-relaxed">
            Join thousands of smart spenders who track, budget, and grow their money with AI-powered insights.
          </p>

          <div className="mt-12 space-y-5">
            {features.map((feature) => (
              <div key={feature.text} className="flex items-center gap-4 group page-section">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center shadow-lg transition-all duration-300 group-hover:scale-110`}>
                  <feature.icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-primary-100 font-medium">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md space-y-6 animate-fade-in">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 justify-center mb-2">
            <div className="w-12 h-12 rounded-xl gradient-card flex items-center justify-center shadow-lg shadow-primary-500/30">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-accent tracking-wider text-white uppercase">FST Pay</span>
          </div>

          <div className="text-center lg:text-left">
            <h1 className="text-3xl font-primary font-bold text-slate-900 dark:text-white">Create your account</h1>
            <p className="mt-2 text-slate-500 dark:text-surface-400">Free forever. No hidden fees.</p>
          </div>

          {error && (
            <div className="p-4 rounded-2xl bg-danger-500/10 border border-danger-500/20 text-danger-500 dark:text-danger-400 text-sm animate-slide-down">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="page-section">
              <label htmlFor="reg-name" className="input-label text-slate-700 dark:text-surface-300 font-medium text-xs">Full Name</label>
              <div className="flex items-center gap-0 px-0 py-0 bg-white dark:bg-surface-800/60 border border-slate-200 dark:border-surface-600/40 rounded-xl focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20 shadow-xs transition-all">
                <div className="flex items-center justify-center w-11 shrink-0">
                  <User className="w-4 h-4 text-slate-400 dark:text-surface-400" />
                </div>
                <input
                  id="reg-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                  autoComplete="name"
                  className="bg-transparent flex-1 py-3 pr-4 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-surface-400 caret-primary-600 dark:caret-primary-400 text-sm font-medium focus:outline-none"
                  style={{ color: theme === 'dark' || theme === 'amoled' ? '#ffffff' : '#0f172a' }}
                />
              </div>
            </div>

            <div className="page-section">
              <label htmlFor="reg-email" className="input-label text-slate-700 dark:text-surface-300 font-medium text-xs">Email Address</label>
              <div className="flex items-center gap-0 px-0 py-0 bg-white dark:bg-surface-800/60 border border-slate-200 dark:border-surface-600/40 rounded-xl focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20 shadow-xs transition-all">
                <div className="flex items-center justify-center w-11 shrink-0">
                  <Mail className="w-4 h-4 text-slate-400 dark:text-surface-400" />
                </div>
                <input
                  id="reg-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                  autoComplete="email"
                  className="bg-transparent flex-1 py-3 pr-4 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-surface-400 caret-primary-600 dark:caret-primary-400 text-sm font-medium focus:outline-none"
                  style={{ color: theme === 'dark' || theme === 'amoled' ? '#ffffff' : '#0f172a' }}
                />
              </div>
            </div>

            <div className="page-section">
              <label htmlFor="reg-dob" className="input-label text-slate-700 dark:text-surface-300 font-medium text-xs">Date of Birth</label>
              <div className="flex items-center gap-0 px-0 py-0 bg-white dark:bg-surface-800/60 border border-slate-200 dark:border-surface-600/40 rounded-xl focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20 shadow-xs transition-all">
                <div className="flex items-center justify-center w-11 shrink-0">
                  <Calendar className="w-4 h-4 text-slate-400 dark:text-surface-400" />
                </div>
                <input
                  id="reg-dob"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  required
                  max={new Date(new Date().setFullYear(new Date().getFullYear() - 12)).toISOString().split('T')[0]}
                  className="bg-transparent flex-1 py-3 pr-4 text-slate-900 dark:text-white caret-primary-600 dark:caret-primary-400 text-sm font-medium focus:outline-none [color-scheme:light] dark:[color-scheme:dark]"
                  style={{ color: theme === 'dark' || theme === 'amoled' ? '#ffffff' : '#0f172a' }}
                />
              </div>
            </div>

            <div className="page-section">
              <label htmlFor="reg-password" className="input-label text-slate-700 dark:text-surface-300 font-medium text-xs">Password</label>
              <div className="flex items-center gap-0 px-0 py-0 bg-white dark:bg-surface-800/60 border border-slate-200 dark:border-surface-600/40 rounded-xl focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20 shadow-xs transition-all">
                <div className="flex items-center justify-center w-11 shrink-0">
                  <Lock className="w-4 h-4 text-slate-400 dark:text-surface-400" />
                </div>
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="bg-transparent flex-1 py-3 pr-4 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-surface-400 caret-primary-600 dark:caret-primary-400 text-sm font-medium focus:outline-none"
                  style={{ color: theme === 'dark' || theme === 'amoled' ? '#ffffff' : '#0f172a' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="pr-4 text-slate-400 hover:text-slate-600 dark:text-surface-400 dark:hover:text-surface-200 transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="page-section">
              <label htmlFor="reg-confirm" className="input-label text-slate-700 dark:text-surface-300 font-medium text-xs">Confirm Password</label>
              <div className="flex items-center gap-0 px-0 py-0 bg-white dark:bg-surface-800/60 border border-slate-200 dark:border-surface-600/40 rounded-xl focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20 shadow-xs transition-all">
                <div className="flex items-center justify-center w-11 shrink-0">
                  <Lock className="w-4 h-4 text-slate-400 dark:text-surface-400" />
                </div>
                <input
                  id="reg-confirm"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="bg-transparent flex-1 py-3 pr-4 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-surface-400 caret-primary-600 dark:caret-primary-400 text-sm font-medium focus:outline-none"
                  style={{ color: theme === 'dark' || theme === 'amoled' ? '#ffffff' : '#0f172a' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="pr-4 text-slate-400 hover:text-slate-600 dark:text-surface-400 dark:hover:text-surface-200 transition-colors"
                  tabIndex={-1}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Password strength */}
            <div className="grid grid-cols-2 gap-2 page-section">
              {passwordChecks.map((check) => (
                <div key={check.label} className="flex items-center gap-2 text-xs">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-all duration-300 ${check.valid ? 'bg-accent-500 shadow-lg shadow-accent-500/30' : 'bg-slate-200 dark:bg-surface-700'}`}>
                    {check.valid && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <span className={check.valid ? 'text-accent-600 dark:text-accent-400 font-medium' : 'text-slate-400 dark:text-surface-500'}>{check.label}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-center mt-2 page-section">
              <ReCAPTCHA
                sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'}
                onChange={(token) => setRecaptchaToken(token)}
                theme={theme === 'light' ? 'light' : 'dark'}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !isFormValid}
              className="btn-gradient w-full flex items-center justify-center gap-2 py-3.5 mt-2 page-section font-bold shadow-md shadow-primary-500/20"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 dark:text-surface-400">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-semibold transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
