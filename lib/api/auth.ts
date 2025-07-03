import apiClient from './client';
import type { AuthDto, TokensResponseDto } from '@/lib/types/auth';

export const authApi = {
  signup: (dto: AuthDto) => apiClient.post<TokensResponseDto>('/auth/signup', dto),
  signin: (dto: AuthDto) => apiClient.post<TokensResponseDto>('/auth/signin', dto),
  logout: () => apiClient.post<boolean>('/auth/logout'),
  refreshTokens: (dto: { refreshToken: string }) => 
    apiClient.post<TokensResponseDto>('/auth/refresh', dto),
};