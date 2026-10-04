import { Link, useNavigate } from 'react-router-dom';
import { Zap, ArrowLeft, Home, Compass } from 'lucide-react';
import ThemeToggle from '../../components/ui/ThemeToggle';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F7FAFF] dark:bg-surface-950 text-slate-900 dark:text-white flex flex-col font-sans transition-colors duration-200">
      {/* Header */}
      <header className="h-16 border-b border-slate-200/80 dark:border-surface-800 bg-white/80 dark:bg-surface-900/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5" aria-label="FST Pay Home">
            <div className="w-9 h-9 rounded-xl bg-primary-500 text-white flex items-center justify-center shadow-md shadow-primary-500/20">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <span className="font-bold text-base text-slate-900 dark:text-white">FST Pay</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content" className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full text-center space-y-6">
          {/* Badge & Graphic */}
          <div className="relative inline-flex items-center justify-center">
            <div className="w-24 h-24 rounded-3xl bg-primary-500/10 dark:bg-primary-500/20 border border-primary-500/20 flex items-center justify-center text-primary-600 dark:text-primary-400">
              <Compass className="w-12 h-12 stroke-[1.5] animate-spin" style={{ animationDuration: '20s' }} />
            </div>
            <span className="absolute -top-2 -right-2 px-2.5 py-0.5 text-xs font-bold font-mono rounded-full bg-primary-600 text-white shadow-md">
              404
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white font-display">
              Page Not Found
            </h1>
            <p className="text-sm text-slate-600 dark:text-surface-300">
              The page you are looking for doesn't exist, has been removed, or has had its address changed.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => navigate(-1)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-slate-700 dark:text-surface-200 hover:bg-slate-50 dark:hover:bg-surface-700/80 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </button>
            <Link
              to="/dashboard"
              className="w-full sm:w-auto btn-gradient inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold shadow-md shadow-primary-500/20"
            >
              <Home className="w-4 h-4" />
              Go to Dashboard
            </Link>
          </div>

          {/* Helpful Links */}
          <div className="pt-6 border-t border-slate-200 dark:border-surface-800 text-xs text-slate-500 dark:text-surface-400 space-y-2">
            <p>Looking for something else?</p>
            <div className="flex justify-center gap-4 font-medium text-primary-600 dark:text-primary-400">
              <Link to="/wallet" className="hover:underline">Wallet</Link>
              <span>·</span>
              <Link to="/cards" className="hover:underline">Virtual Cards</Link>
              <span>·</span>
              <Link to="/transactions" className="hover:underline">Transactions</Link>
              <span>·</span>
              <Link to="/privacy" className="hover:underline">Legal</Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-400 dark:text-surface-500">
        &copy; {new Date().getFullYear()} FST Pay. All rights reserved.
      </footer>
    </div>
  );
}
