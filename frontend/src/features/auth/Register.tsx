import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
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
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const passwordChecks = [
    { label: 'At least 8 characters', valid: password.length >= 8 },
    { label: 'Contains a number', valid: /\d/.test(password) },
    { label: 'Contains uppercase', valid: /[A-Z]/.test(password) },
    { label: 'Passwords match', valid: password === confirmPassword && confirmPassword.length > 0 },
  ];

  const isFormValid = passwordChecks.every((c) => c.valid) && fullName && email && dateOfBirth;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    if (!recaptchaToken) { setError('Please complete the reCAPTCHA verification'); return; }
    setError('');
    setIsLoading(true);
    try {
      const result = await register(fullName, email, password, dateOfBirth, recaptchaToken);
      if (result.requiresOtp) setStep('otp');
      else navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally { setIsLoading(false); }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await verifyOtp(email, otp);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid OTP. Please try again.');
    } finally { setIsLoading(false); }
  };

  if (step === 'otp') {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 ${theme === 'amoled' ? 'bg-black' : 'bg-surface-950'}`}>
        <div className="max-w-md w-full space-y-6 animate-scale-in">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl gradient-card flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-primary-500/30">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-primary font-bold text-white">Verify your email</h1>
            <p className="mt-2 text-surface-400">
              We sent a 6-digit code to <span className="text-white font-medium">{email}</span>
            </p>
          </div>

          {error && (
            <div className="p-4 rounded-2xl bg-danger-500/10 border border-danger-500/20 text-danger-400 text-sm animate-slide-down">
              {error}
            </div>
          )}

          <form onSubmit={handleOtpVerify} className="space-y-5">
            <div>
              <label htmlFor="otp-input" className="input-label">Verification Code</label>
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
                  Verify & Create Account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => { setStep('details'); setOtp(''); setError(''); }}
              className="btn-ghost w-full text-sm"
            >
              ← Back to registration
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex ${theme === 'amoled' ? 'bg-black' : 'bg-surface-950'}`}>
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
            <h1 className="text-3xl font-primary font-bold text-white">Create your account</h1>
            <p className="mt-2 text-surface-400">Free forever. No hidden fees.</p>
          </div>

          {error && (
            <div className="p-4 rounded-2xl bg-danger-500/10 border border-danger-500/20 text-danger-400 text-sm animate-slide-down">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="page-section">
              <label htmlFor="reg-name" className="input-label">Full Name</label>
              <div className="flex items-center gap-0 input-field px-0 py-0">
                <div className="flex items-center justify-center w-11 shrink-0">
                  <User className="w-4 h-4 text-surface-400" />
                </div>
                <input
                  id="reg-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  required
                  className="bg-transparent flex-1 py-3 pr-4 text-white placeholder-surface-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="page-section">
              <label htmlFor="reg-email" className="input-label">Email Address</label>
              <div className="flex items-center gap-0 input-field px-0 py-0">
                <div className="flex items-center justify-center w-11 shrink-0">
                  <Mail className="w-4 h-4 text-surface-400" />
                </div>
                <input
                  id="reg-email"
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
              <label htmlFor="reg-dob" className="input-label">Date of Birth</label>
              <div className="flex items-center gap-0 input-field px-0 py-0">
                <div className="flex items-center justify-center w-11 shrink-0">
                  <Calendar className="w-4 h-4 text-surface-400" />
                </div>
                <input
                  id="reg-dob"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  required
                  max={new Date().toISOString().split('T')[0]}
                  className="bg-transparent flex-1 py-3 pr-4 text-white focus:outline-none [color-scheme:dark]"
                />
              </div>
            </div>

            <div className="page-section">
              <label htmlFor="reg-password" className="input-label">Password</label>
              <div className="flex items-center gap-0 input-field px-0 py-0">
                <div className="flex items-center justify-center w-11 shrink-0">
                  <Lock className="w-4 h-4 text-surface-400" />
                </div>
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
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

            <div className="page-section">
              <label htmlFor="reg-confirm" className="input-label">Confirm Password</label>
              <div className="flex items-center gap-0 input-field px-0 py-0">
                <div className="flex items-center justify-center w-11 shrink-0">
                  <Lock className="w-4 h-4 text-surface-400" />
                </div>
                <input
                  id="reg-confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                  className="bg-transparent flex-1 py-3 pr-4 text-white placeholder-surface-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Password strength */}
            <div className="grid grid-cols-2 gap-2 page-section">
              {passwordChecks.map((check) => (
                <div key={check.label} className="flex items-center gap-2 text-xs">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-all duration-300 ${check.valid ? 'bg-accent-500 shadow-lg shadow-accent-500/30' : 'bg-surface-700'}`}>
                    {check.valid && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <span className={check.valid ? 'text-accent-400' : 'text-surface-500'}>{check.label}</span>
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
              className="btn-gradient w-full flex items-center justify-center gap-2 py-3 mt-2 page-section"
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

          <p className="text-center text-sm text-surface-400">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
