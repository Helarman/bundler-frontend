'use client';

import { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getAccessToken, clearTokens } from '@/lib/api/tokens';
import { useUser } from '@/lib/hooks/useUser';
import { authApi } from '../api/auth';

type AuthContextType = {
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { mutate } = useUser();

  useEffect(() => {
    const token = getAccessToken();
    setIsAuthenticated(!!token);
    setIsLoading(false);

    if (token && pathname === '/login') {
      router.push('/');
    }
  }, [pathname, router]);

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      clearTokens();
      setIsAuthenticated(false);
      mutate(undefined);
      router.push('/auth/login');
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};