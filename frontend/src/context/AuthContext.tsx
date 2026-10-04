import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { userApi, authApi } from '../api/endpoints';
import type { User, TokenResponse } from '../types';
import { AuthContext } from './AuthContext';

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
    if (data.data.requiresTotp) {
      return { requiresTotp: true, requiresOtp: false, email: data.data.email || email };
    }
    if (data.data.requiresOtp) {
      return { requiresOtp: true, requiresTotp: false, email: data.data.email || email };
    }
    setTokens(data.data);
    return { requiresOtp: false, requiresTotp: false, user: data.data?.user };
  };

  const verifyOtp = async (email: string, otp: string) => {
    const { data } = await authApi.verifyOtp({ email, otp });
    setTokens(data.data);
    return data.data?.user;
  };

  const verifyTotp = async (email: string, code: string) => {
    const { data } = await authApi.verifyTotp({ email, code });
    setTokens(data.data);
    return data.data?.user;
  };

  const verifyBackupCode = async (email: string, backupCode: string) => {
    const { data } = await authApi.verifyBackupCode({ email, backupCode });
    setTokens(data.data);
    return data.data?.user;
  };

  const loginWithPasskey = async (passkeyData: {
    credentialId: string;
    clientDataJSON: string;
    authenticatorData: string;
    signature: string;
    userHandle?: string;
  }) => {
    const { data } = await authApi.verifyWebAuthnLogin(passkeyData);
    setTokens(data.data);
    return data.data?.user;
  };

  const register = async (fullName: string, email: string, password: string, dateOfBirth?: string, recaptchaToken?: string, role?: string) => {
    const { data } = await authApi.register({ fullName, email, password, dateOfBirth, recaptchaToken, role });
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
        verifyTotp,
        verifyBackupCode,
        loginWithPasskey,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
