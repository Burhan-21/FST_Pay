import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { authApi, userApi } from '../api/endpoints';
import type { User, TokenResponse } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, recaptchaToken?: string) => Promise<{ requiresOtp: boolean }>;
  verifyOtp: (email: string, otp: string) => Promise<void>;
  register: (fullName: string, email: string, password: string, dateOfBirth?: string, recaptchaToken?: string) => Promise<{ requiresOtp: boolean }>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const setTokens = (tokenData: TokenResponse) => {
    if (tokenData.accessToken) {
      localStorage.setItem('fst_access_token', tokenData.accessToken);
    }
    if (tokenData.refreshToken) {
      localStorage.setItem('fst_refresh_token', tokenData.refreshToken);
    }
    if (tokenData.user) {
      setUser(tokenData.user);
    }
  };

  const clearAuth = useCallback(() => {
    localStorage.removeItem('fst_access_token');
    localStorage.removeItem('fst_refresh_token');
    setUser(null);
  }, []);

  // Load user on mount if token exists
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('fst_access_token');
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const { data } = await userApi.getProfile();
        setUser(data.data);
      } catch (error) {
        console.error('Failed to load user profile:', error);
        clearAuth();
      } finally {
        setIsLoading(false);
      }
    };
    loadUser();
  }, [clearAuth]);

  const login = async (email: string, password: string, recaptchaToken?: string) => {
    const { data } = await authApi.login({ email, password, recaptchaToken });
    if (data.data.requiresOtp) {
      return { requiresOtp: true };
    }
    setTokens(data.data);
    return { requiresOtp: false };
  };

  const verifyOtp = async (email: string, otp: string) => {
    const { data } = await authApi.verifyOtp({ email, otp });
    setTokens(data.data);
  };

  const register = async (fullName: string, email: string, password: string, dateOfBirth?: string, recaptchaToken?: string) => {
    const { data } = await authApi.register({ fullName, email, password, dateOfBirth, recaptchaToken });
    if (data.data && data.data.requiresOtp) {
      return { requiresOtp: true };
    }
    return { requiresOtp: false };
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore logout errors
    }
    clearAuth();
  };

  const refreshProfile = async () => {
    try {
      const { data } = await userApi.getProfile();
      setUser(data.data);
    } catch (error) {
      console.error('Failed to refresh profile:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        verifyOtp,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
