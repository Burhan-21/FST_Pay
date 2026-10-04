import { useEffect, useState, useCallback } from 'react';
import type { ThemeMode } from '../types';
import { ThemeContext } from './ThemeContext';

const THEME_CYCLE: ThemeMode[] = ['light', 'dark', 'amoled'];

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('fst-theme') as ThemeMode | null;
    if (saved && ['light', 'dark', 'amoled'].includes(saved)) return saved;
    return 'light';
  });

  const applyTheme = useCallback((mode: ThemeMode) => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark', 'amoled');
    if (mode === 'amoled') {
      root.classList.add('dark', 'amoled');
      document.documentElement.style.setProperty('--amoled-bg', '#000000');
    } else {
      root.classList.add(mode);
      document.documentElement.style.removeProperty('--amoled-bg');
    }
    localStorage.setItem('fst-theme', mode);
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
  }, []);

  const cycleTheme = useCallback(() => {
    setThemeState(prev => {
      const idx = THEME_CYCLE.indexOf(prev);
      return THEME_CYCLE[(idx + 1) % THEME_CYCLE.length];
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
