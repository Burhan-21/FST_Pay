import { createContext } from 'react';
import type { User } from '../types';

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, recaptchaToken?: string) => Promise<{ requiresOtp?: boolean; requiresTotp?: boolean; email?: string; user?: User }>;
  verifyOtp: (email: string, otp: string) => Promise<User | undefined>;
  verifyTotp: (email: string, code: string) => Promise<User | undefined>;
  verifyBackupCode: (email: string, backupCode: string) => Promise<User | undefined>;
  loginWithPasskey: (data: { credentialId: string; clientDataJSON: string; authenticatorData: string; signature: string; userHandle?: string }) => Promise<User | undefined>;
  register: (fullName: string, email: string, password: string, dateOfBirth?: string, recaptchaToken?: string, role?: string) => Promise<{ requiresOtp: boolean }>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export { AuthProvider } from './AuthContext.tsx';
