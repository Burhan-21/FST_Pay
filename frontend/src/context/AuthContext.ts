import { createContext } from 'react';
import type { User } from '../types';

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, recaptchaToken?: string) => Promise<{ requiresOtp?: boolean; requiresTotp?: boolean; email?: string }>;
  verifyOtp: (email: string, otp: string) => Promise<void>;
  verifyTotp: (email: string, code: string) => Promise<void>;
  verifyBackupCode: (email: string, backupCode: string) => Promise<void>;
  register: (fullName: string, email: string, password: string, dateOfBirth?: string, recaptchaToken?: string) => Promise<{ requiresOtp: boolean }>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export { AuthProvider } from './AuthContext.tsx';
