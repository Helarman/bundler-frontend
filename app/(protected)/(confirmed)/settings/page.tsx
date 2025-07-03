'use client'

import { SubmitHandler, useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { userApi } from '@/lib/api/user';
import { toast } from 'sonner';
import { useEffect } from 'react';

type FormValues = {
  rpc: string
  wss: string
  wallet: string
}

export default function SettingsPage() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>()

  useEffect(() => {
    const loadUserSettings = async () => {
      try {
        const userData = await userApi.getCurrentUser();
        reset({
          rpc: userData.rpcUrl || '',
          wss: userData.wssRpcUrl || '',
          wallet: userData.devWallet || '',
        });
      } catch (error) {
        toast.error('Failed to load settings');
        console.error('Error loading settings:', error);
      }
    };

    loadUserSettings();
  }, [reset]);

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    try {
      const promise = userApi.updateUserSettings({
        rpcUrl: data.rpc,
        wssRpcUrl: data.wss,
        devWallet: data.wallet,
      });

      toast.promise(promise, {
        loading: 'Saving settings...',
        success: 'Settings saved successfully',
        error: (error) => error instanceof Error ? error.message : 'Failed to save settings',
      });

      await promise;
    } catch (error) {
      console.log(error)
    }
  };
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
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

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </form>
    </div>
  )
}