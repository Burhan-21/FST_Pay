import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { 
  Search, 
  Terminal, 
  LayoutDashboard, 
  Wallet, 
  CreditCard, 
  ArrowLeftRight, 
  TrendingUp, 
  Bot, 
  Trophy, 
  Settings, 
  ShieldAlert, 
  LogOut,
  Sparkles
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Group commands
  const commands = [
    { id: 'dashboard', title: 'Dashboard', category: 'Navigation', icon: LayoutDashboard, action: () => navigate('/dashboard') },
    { id: 'wallet', title: 'Wallet Page', category: 'Navigation', icon: Wallet, action: () => navigate('/wallet') },
    { id: 'cards', title: 'Virtual Cards', category: 'Navigation', icon: CreditCard, action: () => navigate('/cards') },
    { id: 'transactions', title: 'Transactions List', category: 'Navigation', icon: ArrowLeftRight, action: () => navigate('/transactions') },
    { id: 'analytics', title: 'Analytics & Trends', category: 'Navigation', icon: TrendingUp, action: () => navigate('/analytics') },
    { id: 'ai-coach', title: 'AI Money Coach', category: 'Navigation', icon: Bot, action: () => navigate('/ai-coach') },
    { id: 'rewards', title: 'Rewards & Streak', category: 'Navigation', icon: Trophy, action: () => navigate('/rewards') },
    { id: 'settings', title: 'Account Settings', category: 'Navigation', icon: Settings, action: () => navigate('/settings') },
    ...(user?.role === 'ADMIN' ? [
      { id: 'admin', title: 'Admin Control Center', category: 'Navigation', icon: ShieldAlert, action: () => navigate('/admin') }
    ] : []),
    { id: 'simulate', title: 'Simulate Spend Transaction', category: 'Actions', icon: Terminal, action: () => navigate('/transactions') },
    { id: 'parental-mode', title: 'Configure Parental Lock', category: 'Actions', icon: Sparkles, action: () => navigate('/settings') },
    { id: 'logout', title: 'Sign Out Account', category: 'Actions', icon: LogOut, action: () => { logout(); navigate('/login'); } }
  ];

  // Filter commands by search
  const filtered = commands.filter(cmd => 
    cmd.title.toLowerCase().includes(search.toLowerCase()) || 
    cmd.category.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(prev => (prev + 1) % filtered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(prev => (prev - 1 + filtered.length) % filtered.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[activeIndex]) {
          filtered[activeIndex].action();
          onClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeIndex, filtered, navigate, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="w-full max-w-xl rounded-3xl bg-white dark:bg-surface-900 border border-slate-200/80 dark:border-surface-700/60 shadow-2xl overflow-hidden animate-slide-down"
        onClick={e => e.stopPropagation()}
      >
        {/* Search header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-surface-700/50 bg-slate-50/70 dark:bg-surface-950/40">
          <Search className="w-5 h-5 text-slate-400 dark:text-surface-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search page..."
            value={search}
            onChange={e => { setSearch(e.target.value); setActiveIndex(0); }}
            className="flex-1 bg-transparent border-none outline-none text-slate-900 dark:text-white text-base placeholder-slate-400 dark:placeholder-surface-500 focus:ring-0 focus:outline-none font-medium"
          />
          <span className="text-[10px] text-slate-500 dark:text-surface-400 bg-white dark:bg-surface-800 border border-slate-200 dark:border-surface-700 px-2 py-0.5 rounded-lg uppercase font-semibold shadow-sm">
            esc
          </span>
        </div>

        {/* Results */}
        <div className="max-h-[360px] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-slate-500 dark:text-surface-500 py-8">No results found for "{search}"</p>
          ) : (
            filtered.reduce((acc: React.ReactNode[], cmd, idx) => {
              const prev = filtered[idx - 1];
              const showHeader = !prev || prev.category !== cmd.category;

              if (showHeader) {
                acc.push(
                  <div key={`cat-${cmd.category}`} className="px-3 py-1.5 text-[10px] font-bold tracking-wider text-slate-500 dark:text-surface-500 uppercase">
                    {cmd.category}
                  </div>
                );
              }

              const Icon = cmd.icon;
              const isActive = idx === activeIndex;

              acc.push(
                <button
                  key={cmd.id}
                  onClick={() => { cmd.action(); onClose(); }}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl transition-all text-left ${
                    isActive 
                      ? 'bg-primary-50 text-primary-700 border border-primary-200/80 font-semibold shadow-sm dark:bg-primary-600/20 dark:border-primary-500/30 dark:text-white' 
                      : 'border border-transparent text-slate-700 dark:text-surface-300 hover:bg-slate-100 dark:hover:bg-surface-800/40 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                      isActive 
                        ? 'bg-primary-500 text-white shadow-sm shadow-primary-500/20 dark:bg-primary-500/25 dark:text-primary-400' 
                        : 'bg-slate-100 text-slate-500 dark:bg-surface-800 dark:text-surface-400'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium">{cmd.title}</span>
                  </div>
                  {isActive && (
                    <span className="text-[10px] text-primary-600 dark:text-primary-400 bg-primary-100 dark:bg-primary-500/10 px-2 py-0.5 rounded-md font-mono font-medium">
                      Enter ↵
                    </span>
                  )}
                </button>
              );

              return acc;
            }, [])
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-surface-700/30 bg-slate-50/70 dark:bg-surface-950/20 text-xs text-slate-500 dark:text-surface-500 font-medium">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-surface-800 rounded-md border border-slate-200 dark:border-surface-700 text-[10px] shadow-sm text-slate-700 dark:text-surface-300 font-mono">↑↓</kbd> navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-surface-800 rounded-md border border-slate-200 dark:border-surface-700 text-[10px] shadow-sm text-slate-700 dark:text-surface-300 font-mono">↵</kbd> select
            </span>
          </div>
          <span>FST Pay Assistant</span>
        </div>
      </div>
    </div>
  );
}
