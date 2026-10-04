import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, Bell, Search, Sun, Moon, Zap, User } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';

interface NavbarProps {
  onMenuClick: () => void;
  onSearchClick: () => void;
  title?: string;
  isLiveConnected?: boolean;
}

export default function Navbar({ onMenuClick, onSearchClick, isLiveConnected }: NavbarProps) {
  const { user } = useAuth();
  const { theme, cycleTheme } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (!showNotifications) return;
    const handleClose = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.notification-container')) {
        setShowNotifications(false);
      }
    };
    window.addEventListener('click', handleClose);
    return () => window.removeEventListener('click', handleClose);
  }, [showNotifications]);

  const firstName = user?.fullName
    ? user.fullName.split(' ')[0]
    : user?.email
    ? user.email.split('@')[0]
    : '';

  return (
    <header className="sticky top-0 z-30 h-18 bg-white/80 dark:bg-surface-950/80 backdrop-blur-xl border-b border-slate-100 dark:border-surface-800/80 transition-all">
      <div className="flex items-center justify-between h-full px-4 lg:px-8 max-w-7xl mx-auto">
        
        {/* Left: Mobile Menu & Logo or Search */}
        <div className="flex items-center gap-3 flex-1 max-w-lg">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-2xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-surface-800"
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Mobile Logo Brand */}
          <Link to="/dashboard" className="flex items-center gap-2 lg:hidden" aria-label="FST Pay Dashboard">
            <div className="w-8 h-8 rounded-xl bg-primary-500 text-white flex items-center justify-center">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <span className="font-bold text-sm text-slate-900 dark:text-white">FST Pay</span>
          </Link>

          {/* Desktop Search Bar (Mockup: "Search people, businesses, bills...") */}
          <button
            onClick={onSearchClick}
            className="hidden lg:flex items-center gap-2.5 px-4 py-2.5 rounded-2xl w-full max-w-md bg-slate-50 dark:bg-surface-800/60 border border-slate-200/80 dark:border-surface-700/60 text-slate-500 dark:text-surface-400 hover:border-slate-300 transition-all text-xs font-medium"
          >
            <Search className="w-4 h-4 text-slate-500 dark:text-surface-400 shrink-0" />
            <span className="flex-1 text-left text-slate-500 dark:text-surface-400">Search people, businesses, bills...</span>
            <kbd className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-white dark:bg-surface-700 border border-slate-200 dark:border-surface-600 text-slate-500 dark:text-surface-400">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right Actions: Theme, Notifications, User Greeting Chip */}
        <div className="flex items-center gap-3">
          {/* Live notification indicator / theme */}
          <button
            onClick={cycleTheme}
            className="p-2.5 rounded-2xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-surface-800 transition-colors"
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            aria-label={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          >
            {theme === 'light' ? <Moon className="w-4 h-4 text-slate-600" /> : <Sun className="w-4 h-4 text-amber-400" />}
          </button>

          {/* Notification Bell */}
          <div className="relative notification-container">
            <button
              onClick={() => setShowNotifications((prev) => !prev)}
              className="relative p-2.5 rounded-2xl text-slate-500 dark:text-surface-400 hover:bg-slate-50 dark:hover:bg-surface-800 transition-colors"
              aria-label="View notifications"
              aria-expanded={showNotifications}
            >
              <Bell className="w-4 h-4" />
              {isLiveConnected && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary-500 ring-2 ring-white dark:ring-surface-900" />
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white dark:bg-surface-900 border border-slate-200 dark:border-surface-800 shadow-xl p-4 z-50 animate-scale-in">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-surface-800">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Notifications</h4>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {isLiveConnected ? 'Live connected' : 'Offline'}
                  </span>
                </div>
                <div className="py-6 text-center text-xs text-slate-500 dark:text-surface-400 space-y-1">
                  <Bell className="w-6 h-6 mx-auto text-slate-300 dark:text-surface-600 mb-1" />
                  <p className="font-semibold text-slate-700 dark:text-surface-300">You're all caught up!</p>
                  <p className="text-[11px] text-slate-400">Transaction alerts and approvals appear here in real time.</p>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Chip */}
          <div className="flex items-center gap-3 pl-2 border-l border-slate-100 dark:border-surface-800">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary-600 to-indigo-500 text-white font-bold text-xs flex items-center justify-center shadow-xs">
              {user?.fullName?.charAt(0).toUpperCase() || <User className="w-4 h-4" />}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                {firstName ? `Hi, ${firstName} 👋` : 'Welcome back 👋'}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-surface-400 font-medium leading-tight">
                Good to see you!
              </p>
            </div>
          </div>
        </div>

      </div>
    </header>
  );
}
