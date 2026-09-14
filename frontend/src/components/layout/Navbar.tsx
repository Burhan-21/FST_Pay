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
          <div className="flex items-center gap-2 lg:hidden">
            <div className="w-8 h-8 rounded-xl bg-primary-500 text-white flex items-center justify-center">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <span className="font-bold text-sm text-slate-900 dark:text-white">FST Pay</span>
          </div>

          {/* Desktop Search Bar (Mockup: "Search people, businesses, bills...") */}
          <button
            onClick={onSearchClick}
            className="hidden lg:flex items-center gap-2.5 px-4 py-2.5 rounded-2xl w-full max-w-md bg-slate-50 dark:bg-surface-800/60 border border-slate-200/80 dark:border-surface-700/60 text-slate-400 hover:border-slate-300 transition-all text-xs font-medium"
          >
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="flex-1 text-left text-slate-400">Search people, businesses, bills...</span>
            <kbd className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-white dark:bg-surface-700 border border-slate-200 dark:border-surface-600 text-slate-400">
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
          >
            {theme === 'light' ? <Moon className="w-4 h-4 text-slate-600" /> : <Sun className="w-4 h-4 text-amber-400" />}
          </button>

          {/* Notification Bell */}
          <button
            className="relative p-2.5 rounded-2xl text-slate-500 dark:text-surface-400 hover:bg-slate-50 dark:hover:bg-surface-800 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {isLiveConnected && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary-500 ring-2 ring-white dark:ring-surface-900" />
            )}
          </button>

          {/* User Profile Chip (Mockup: "Hi, Burhan - Good to see you!") */}
          <div className="flex items-center gap-3 pl-2 border-l border-slate-100 dark:border-surface-800">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary-600 to-indigo-500 text-white font-bold text-xs flex items-center justify-center shadow-xs">
              {user?.fullName?.charAt(0).toUpperCase() || <User className="w-4 h-4" />}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                {firstName ? `Hi, ${firstName} 👋` : 'Welcome back 👋'}
              </p>
              <p className="text-[10px] text-slate-400 font-medium leading-tight">
                Good to see you!
              </p>
            </div>
          </div>
        </div>

      </div>
    </header>
  );
}
