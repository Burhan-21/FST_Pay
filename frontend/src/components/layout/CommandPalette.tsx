import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
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
    { id: 'simulate', title: 'Simulate Spend Transaction', category: 'Actions', icon: Terminal, action: () => { navigate('/transactions'); alert('Use the Simulate Form on the Transactions page!'); } },
    { id: 'parental-mode', title: 'Configure Parental Lock', category: 'Actions', icon: Sparkles, action: () => navigate('/settings') },
    { id: 'logout', title: 'Sign Out Account', category: 'Actions', icon: LogOut, action: () => { logout(); navigate('/login'); } }
  ];

  // Filter commands by search
  const filtered = commands.filter(cmd => 
    cmd.title.toLowerCase().includes(search.toLowerCase()) || 
    cmd.category.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/70 backdrop-blur-md" onClick={onClose}>
      <div 
        className="w-full max-w-xl rounded-2xl bg-surface-900/90 border border-surface-700/60 shadow-2xl overflow-hidden animate-slide-down"
        onClick={e => e.stopPropagation()}
      >
        {/* Search header */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-surface-700/50 bg-surface-950/40">
          <Search className="w-5 h-5 text-surface-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search page..."
            value={search}
            onChange={e => { setSearch(e.target.value); setActiveIndex(0); }}
            className="flex-1 bg-transparent border-none outline-none text-white text-base placeholder-surface-500 focus:ring-0 focus:outline-none"
          />
          <span className="text-[10px] text-surface-500 bg-surface-800 border border-surface-750 px-2 py-0.5 rounded uppercase font-semibold">
            esc
          </span>
        </div>

        {/* Results */}
        <div className="max-h-[360px] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-surface-500 py-8">No results found for "{search}"</p>
          ) : (
            filtered.reduce((acc: any[], cmd, idx) => {
              const prev = filtered[idx - 1];
              const showHeader = !prev || prev.category !== cmd.category;

              if (showHeader) {
                acc.push(
                  <div key={`cat-${cmd.category}`} className="px-3 py-1.5 text-[10px] font-bold tracking-wider text-surface-500 uppercase">
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
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-left ${
                    isActive 
                      ? 'bg-primary-600/20 border border-primary-500/30 text-white' 
                      : 'border border-transparent text-surface-300 hover:bg-surface-800/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isActive ? 'bg-primary-500/25 text-primary-400' : 'bg-surface-800 text-surface-400'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium">{cmd.title}</span>
                  </div>
                  {isActive && (
                    <span className="text-[10px] text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded font-mono">
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
        <div className="flex items-center justify-between px-4 py-3 border-t border-surface-700/30 bg-surface-950/20 text-xs text-surface-500 font-medium">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-surface-800 rounded border border-surface-700 text-[10px]">↑↓</kbd> navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-surface-800 rounded border border-surface-700 text-[10px]">↵</kbd> select
            </span>
          </div>
          <span>FST Pay Assistant</span>
        </div>
      </div>
    </div>
  );
}
