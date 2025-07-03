'use client';

import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api/auth';
import { setTokens, clearTokens } from '@/lib/api/tokens';
import { useUser } from './useUser';
import { AuthDto } from '../types/auth';

export const useAuthActions = () => {
  const router = useRouter();
  const { mutate } = useUser();

  const login = async (dto: AuthDto) => {
    try {
      const { data } = await authApi.signin(dto);
      setTokens(data);
      await mutate(); 
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error };
    }
  };

  const register = async (dto: AuthDto) => {
    try {
      const { data } = await authApi.signup(dto);
      setTokens(data);
      await mutate(); 
      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error };
    }
  };

 const logout = () => {
    try {
      clearTokens();
      mutate(undefined);
      router.push('/login');
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error };
    }
  };

  return { login, register, logout };
};