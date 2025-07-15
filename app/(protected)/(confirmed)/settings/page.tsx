'use client'

import { SubmitHandler, useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { userApi } from '@/lib/api/user';
import { toast } from 'sonner';
import { useEffect } from 'react';
import Cookies from 'js-cookie';

type FormValues = {
  rpc: string
  wss: string
  wallet: string
  apiKey: string
  transactionFee: string
}

const CONFIG_COOKIE_KEY = 'config';

 const saveConfigToCookies = (config: FormValues) => {
  Cookies.set(CONFIG_COOKIE_KEY, JSON.stringify(config), { expires: 30 });
};

 const loadConfigFromCookies = (): FormValues | null => {
  const config = Cookies.get(CONFIG_COOKIE_KEY);
  return config ? JSON.parse(config) : null;
};

export default function SettingsPage() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>()

  const loadUserSettings = async () => {
    try {
      const userData = await userApi.getCurrentUser();
      const settings = {
        rpc: userData.rpcUrl || '',
        wss: userData.wssRpcUrl || '',
        wallet: userData.devWallet || '',
        apiKey: userData.apiKey || '',
        transactionFee: userData.transactionFee?.toString() || '0.0',
      };
      reset(settings);
      saveConfigToCookies(settings);
      return settings;
    } catch (error) {
      toast.error('Failed to load settings');
      console.error('Error loading settings:', error);
      return null;
    }
  };

  useEffect(() => {
    const cookieConfig = loadConfigFromCookies();
    if (cookieConfig) {
      reset(cookieConfig);
    }
    
    loadUserSettings();
  }, [reset]);

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    try {
      const promise = userApi.updateUserSettings({
        rpcUrl: data.rpc,
        wssRpcUrl: data.wss,
        devWallet: data.wallet,
        apiKey: data.apiKey,
        transactionFee: parseFloat(data.transactionFee) || 0.0,
      });
      
      toast.promise(promise, {
        loading: 'Saving settings...',
        success: (response) => {
          const settings = {
            rpc: data.rpc,
            wss: data.wss,
            wallet: data.wallet,
            apiKey: data.apiKey,
            transactionFee: data.transactionFee,
          };
          saveConfigToCookies(settings);
          return 'Settings saved successfully';
        },
        error: (error) => error instanceof Error ? error.message : 'Failed to save settings',
      });

      await promise;
    } catch (error) {
      console.log(error)
    }
  };

  const handleReloadSettings = async () => {
    const settings = await loadUserSettings();
    if (settings) {
      toast.success('Settings reloaded from database');
    }
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <Button 
          type="button" 
          variant="outline" 
          onClick={handleReloadSettings}
          disabled={isSubmitting}
        >
          Reload Settings
        </Button>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 w-full">
        <div className="space-y-2 w-full">
          <Label htmlFor="rpc">RPC URL</Label>
          <Input
            id="rpc"
            placeholder="https://..."
            {...register('rpc', { required: 'RPC URL is required' })}
            className="w-full"
          />
          {errors.rpc && <p className="text-sm text-red-500">{errors.rpc.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="wss">WSS RPC URL</Label>
          <Input
            id="wss"
            placeholder="wss://..."
            {...register('wss', { required: 'WSS URL is required' })}
          />
          {errors.wss && <p className="text-sm text-red-500">{errors.wss.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="wallet">Wallet Private Key</Label>
          <Input
            id="wallet"
            placeholder="Enter private key"
            type="password"
            {...register('wallet', { required: 'Private key is required' })}
          />
          {errors.wallet && <p className="text-sm text-red-500">{errors.wallet.message}</p>}
        </div>

        <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
          <Input
            id="apiKey"
            placeholder="API Key"
            {...register('apiKey')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="transactionFee">Transaction Fee (%)</Label>
          <Input
            id="transactionFee"
            type="number"  
            placeholder="0.0"
            step="any"    
            {...register('transactionFee', { 
              required: 'Transaction fee is required',
              min: { value: 0, message: 'Fee cannot be negative' },
              max: { value: 100, message: 'Fee cannot exceed 100%' },
              valueAsNumber: true,
              validate: (value) => !isNaN(value as any) || 'Must be a valid number' 
            })}
          />
          {errors.transactionFee && (
            <p className="text-sm text-red-500">{errors.transactionFee.message}</p>
          )}
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </form>
    </div>
  )
}