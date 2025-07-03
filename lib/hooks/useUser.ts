'use client';

import useSWR from 'swr';
import { apiClient } from '@/lib/api/client';
import { User } from '../types/user';

const fetcher = (url: string) => apiClient.get(url).then(res => res.data);

export const useUser = () => {
  const { data, error, mutate } = useSWR<User>('/user/me', fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  return {
    user: data,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
};