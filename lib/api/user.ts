import { apiClient } from './client';
import { User } from '../types/user';

export const userApi = {
  getCurrentUser: async (): Promise<User> => {
    try {
      const response = await apiClient.get('/user/me');
      return response.data;
    } catch (error) {
      console.log(error)
      throw new Error('Failed to fetch user data');
    }
  },

  updateUserSettings: async (data: {
    rpcUrl?: string;
    wssRpcUrl?: string;
    devWallet?: string;
    apiKey?: string;
    transactionFee?: number;
  }): Promise<User> => {
    console.log(data)
    try {
      const response = await apiClient.put('/user/update', data);
      return response.data;
    } catch (error) {
      console.log(error)
      throw new Error('Failed to update user settings');
    }
  },

  updateRpcUrl: async (rpcUrl: string): Promise<User> => {
    return userApi.updateUserSettings({ rpcUrl });
  },

  updateWssRpcUrl: async (wssRpcUrl: string): Promise<User> => {
    return userApi.updateUserSettings({ wssRpcUrl });
  },

  updateDevWallet: async (devWallet: string): Promise<User> => {
    return userApi.updateUserSettings({ devWallet });
  },
};

export default userApi;