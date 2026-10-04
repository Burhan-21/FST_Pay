import { Sun, Moon, Sparkles } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

interface ThemeToggleProps {
  className?: string;
}

export default function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { theme, cycleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className={`p-2 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-center border-slate-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-slate-700 dark:text-surface-200 hover:bg-slate-100 dark:hover:bg-surface-700 shadow-sm ${className}`}
      title={`Switch theme (current: ${theme})`}
      aria-label={`Current theme: ${theme}. Click to switch theme.`}
    >
      {theme === 'light' && <Moon className="w-4 h-4 text-slate-600" />}
      {theme === 'dark' && <Sparkles className="w-4 h-4 text-purple-400" />}
      {theme === 'amoled' && <Sun className="w-4 h-4 text-amber-400" />}
    </button>
  );
}

