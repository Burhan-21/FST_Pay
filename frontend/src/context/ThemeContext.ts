import { createContext } from 'react';
import type { ThemeMode } from '../types';

export interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  cycleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export { ThemeProvider } from './ThemeContext.tsx';
