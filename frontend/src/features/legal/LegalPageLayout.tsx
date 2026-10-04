import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Zap, ArrowLeft, ArrowUp, ShieldCheck, FileText, Cookie, RotateCcw } from 'lucide-react';
import ThemeToggle from '../../components/ui/ThemeToggle';

interface LegalPageLayoutProps {
  title: string;
  subtitle: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export default function LegalPageLayout({
  title,
  subtitle,
  lastUpdated,
  children,
}: LegalPageLayoutProps) {
  const navigate = useNavigate();
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navLinks = [
    { to: '/privacy', label: 'Privacy Policy', icon: ShieldCheck },
    { to: '/terms', label: 'Terms of Service', icon: FileText },
    { to: '/cookies', label: 'Cookie Policy', icon: Cookie },
    { to: '/refund', label: 'Refund Policy', icon: RotateCcw },
  ];

  return (
    <div className="min-h-screen bg-[#F7FAFF] dark:bg-surface-950 text-slate-900 dark:text-white flex flex-col font-sans transition-colors duration-200">
      {/* Header */}
      <header className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-surface-900/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-surface-800">
        <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-surface-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-surface-800 transition-colors"
              aria-label="Go back to previous page"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Link to="/" className="flex items-center gap-2.5 group" aria-label="FST Pay Home">
              <div className="w-9 h-9 rounded-xl bg-primary-500 text-white flex items-center justify-center shadow-md shadow-primary-500/20 group-hover:scale-105 transition-transform">
                <Zap className="w-5 h-5 fill-current" />
              </div>
              <div>
                <span className="font-bold text-base text-slate-900 dark:text-white tracking-tight">FST Pay</span>
                <span className="block text-[10px] text-slate-500 dark:text-surface-400 font-semibold tracking-wider uppercase">Legal</span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              to="/login"
              className="hidden sm:inline-flex px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-500/20 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="bg-gradient-to-b from-primary-500/5 via-slate-500/5 to-transparent border-b border-slate-200/60 dark:border-surface-800/60 py-10 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center space-y-3">
          <span className="inline-block px-3 py-1 text-xs font-semibold tracking-wider uppercase text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-500/10 rounded-full border border-primary-200/50 dark:border-primary-500/20">
            Compliance & Transparency
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white font-display">
            {title}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-surface-300 max-w-2xl mx-auto">
            {subtitle}
          </p>
          <p className="text-xs text-slate-400 dark:text-surface-400">
            Last Updated: <time dateTime="2026-10-04">{lastUpdated}</time>
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-3xl mx-auto mt-8 flex flex-wrap justify-center gap-2">
          {navLinks.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl transition-all ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-md shadow-primary-500/25 ring-2 ring-primary-500/20'
                    : 'bg-white dark:bg-surface-800 text-slate-600 dark:text-surface-300 hover:bg-slate-100 dark:hover:bg-surface-700 border border-slate-200/80 dark:border-surface-700/60'
                }`
              }
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </NavLink>
          ))}
        </div>
      </section>

      {/* Main Content */}
      <main id="main-content" className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8 text-slate-700 dark:text-surface-300 text-sm leading-relaxed">
          {children}
        </div>
      </main>

      {/* Back to top button */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          aria-label="Scroll back to top"
          className="fixed bottom-6 right-6 p-3 rounded-full bg-primary-600 text-white shadow-lg shadow-primary-600/30 hover:bg-primary-700 active:scale-95 transition-all z-40 focus:outline-hidden focus:ring-2 focus:ring-primary-400"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-surface-800 bg-white dark:bg-surface-900 py-8 px-4 text-center text-xs text-slate-500 dark:text-surface-400 space-y-3">
        <div className="flex flex-wrap justify-center gap-4 text-xs font-medium">
          <Link to="/privacy" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Privacy Policy</Link>
          <span>·</span>
          <Link to="/terms" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Terms of Service</Link>
          <span>·</span>
          <Link to="/cookies" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Cookie Policy</Link>
          <span>·</span>
          <Link to="/refund" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Refund Policy</Link>
        </div>
        <p>
          &copy; {new Date().getFullYear()} [LEGAL ENTITY NAME]. All rights reserved. Registered Address: [REGISTERED ADDRESS].
        </p>
      </footer>
    </div>
  );
}
