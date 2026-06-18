import { Menu, Bell, Search, Sun, Moon, Monitor } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

interface NavbarProps {
  onMenuClick: () => void;
  onSearchClick: () => void;
  title?: string;
}

export default function Navbar({ onMenuClick, onSearchClick, title }: NavbarProps) {
  const { user } = useAuth();
  const { theme, cycleTheme } = useTheme();

  const isAmoled = theme === 'amoled';

  const themeIcon = () => {
    if (theme === 'light') return <Sun className="w-4 h-5 text-warning-500" />;
    if (theme === 'amoled') return <Moon className="w-4 h-5 text-primary-400" />;
    return <Monitor className="w-4 h-5 text-primary-400" />;
  };

  const themeLabel = () => {
    if (theme === 'light') return 'Light';
    if (theme === 'amoled') return 'AMOLED';
    return 'Dark';
  };

  return (
    <header
      className={`
        sticky top-0 z-30 h-16 transition-all duration-500
        ${isAmoled
          ? 'bg-black/90 backdrop-blur-xl border-b border-white/5'
          : 'bg-slate-50/80 dark:bg-surface-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-surface-700/30'
        }
      `}
    >
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        {/* Left */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className={`lg:hidden p-2 rounded-xl transition-colors haptic-tap ${
              isAmoled
                ? 'text-surface-400 hover:bg-white/5 hover:text-white'
                : 'text-slate-400 dark:text-surface-400 hover:bg-slate-200 dark:hover:bg-surface-800 hover:text-slate-900 dark:hover:text-white'
            }`}
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          {title && (
            <h2 className="text-xl font-primary font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-primary-400 via-purple-400 to-pink-400 hidden sm:block uppercase">
              {title}
            </h2>
          )}
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <button
            onClick={onSearchClick}
            className={`hidden md:flex items-center gap-2 px-3 py-2 rounded-xl w-64 transition-all text-left haptic-tap ${
              isAmoled
                ? 'bg-white/5 border border-white/10 hover:bg-white/8'
                : 'bg-slate-100 dark:bg-surface-800/60 border border-slate-200 dark:border-surface-700/50 hover:bg-slate-200 dark:hover:bg-surface-800'
            }`}
          >
            <Search className={`w-4 h-4 ${isAmoled ? 'text-surface-500' : 'text-slate-400 dark:text-surface-500'}`} />
            <span className={`text-sm flex-1 ${isAmoled ? 'text-surface-500' : 'text-slate-400 dark:text-surface-500'}`}>
              Search command...
            </span>
            <kbd className={`hidden lg:inline text-[10px] rounded px-1.5 py-0.5 ${
              isAmoled
                ? 'text-surface-500 border border-white/10'
                : 'text-slate-400 dark:text-surface-500 border border-slate-300 dark:border-surface-600'
            }`}>
              ⌘K
            </kbd>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={cycleTheme}
            className={`group relative p-2 rounded-xl transition-colors haptic-tap ${
              isAmoled
                ? 'text-surface-400 hover:bg-white/5 hover:text-white'
                : 'text-slate-400 dark:text-surface-400 hover:bg-slate-200 dark:hover:bg-surface-800 hover:text-slate-900 dark:hover:text-white'
            }`}
            aria-label="Cycle theme"
          >
            {themeIcon()}
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 text-[10px] font-medium bg-surface-800 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              {themeLabel()}
            </span>
          </button>

          {/* Notifications */}
          <button
            className={`relative p-2 rounded-xl transition-colors haptic-tap ${
              isAmoled
                ? 'text-surface-400 hover:bg-white/5 hover:text-white'
                : 'text-slate-400 dark:text-surface-400 hover:bg-slate-200 dark:hover:bg-surface-800 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent-500 rounded-full ring-2 ring-slate-50 dark:ring-surface-950 amoled:ring-black" />
          </button>

          {/* Avatar */}
          <div className="w-8 h-8 rounded-xl gradient-card flex items-center justify-center text-white font-bold text-sm cursor-pointer shadow-lg shadow-primary-500/20 hover:shadow-primary-500/40 transition-all hover:-translate-y-0.5">
            {user?.fullName?.charAt(0).toUpperCase() || 'U'}
          </div>
        </div>
      </div>
    </header>
  );
}
