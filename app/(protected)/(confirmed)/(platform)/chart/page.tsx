'use client'

import React, { useState, useEffect, useRef, lazy } from 'react';
import { Connection } from '@solana/web3.js';
import ChartPage from '@/components/features/chart/Chart';
import { Wallet as WalletType } from '@/lib/types/wallet';

import { 
  saveWalletsToCookies,
  loadWalletsFromCookies,
  saveConfigToCookies,
  loadConfigFromCookies,
  ConfigType,
  fetchSolBalance,
  fetchTokenBalance,
  loadTokenAddressFromCookies,
} from '@/lib/utils/Utils'

const WalletManager: React.FC = () => {
  const [tokenAddress, setTokenAddress] = useState(() => loadTokenAddressFromCookies());
  const [config, setConfig] = useState<ConfigType>({
    rpcEndpoint: 'https://smart-special-thunder.solana-mainnet.quiknode.pro/1366b058465380d24920f9d348f85325455d398d/',
    transactionFee: '0.000005',
    apiKey: ''
  });
  const [wallets, setWallets] = useState<WalletType[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [solBalances, setSolBalances] = useState<Map<string, number>>(new Map());
  const [tokenBalances, setTokenBalances] = useState<Map<string, number>>(new Map());
  const [ammKey, setAmmKey] = useState<string | null>(null);
  const [isLoadingChart, setIsLoadingChart] = useState(false);
  const fetchSolBalances = async () => {
    if (!connection) return new Map<string, number>();
    
    const newBalances = new Map<string, number>();
    
    const promises = wallets.map(async (wallet) => {
      try {
        const balance = await fetchSolBalance(connection, wallet.address);
        newBalances.set(wallet.address, balance);
      } catch (error) {
        console.error(`Error fetching SOL balance for ${wallet.address}:`, error);
        newBalances.set(wallet.address, 0);
      }
    });
    
    await Promise.all(promises);
    setSolBalances(newBalances);
    return newBalances;
  };

  const fetchTokenBalances = async () => {
    if (!connection || !tokenAddress) return new Map<string, number>();
    
    const newBalances = new Map<string, number>();
    
    const promises = wallets.map(async (wallet) => {
      try {
        const balance = await fetchTokenBalance(connection, wallet.address, tokenAddress);
        newBalances.set(wallet.address, balance);
      } catch (error) {
        console.error(`Error fetching token balance for ${wallet.address}:`, error);
        newBalances.set(wallet.address, 0);
      }
    });
    
    await Promise.all(promises);
    setTokenBalances(newBalances);
    return newBalances;
  };

  const fetchAmmKey = async (tokenAddress: string) => {
    if (!tokenAddress) return null;
    setIsLoadingChart(true);
    try {
      const response = await fetch(
        `https://quote-api.jup.ag/v6/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=${tokenAddress}&amount=100000000&slippageBps=1`
      );
      const data = await response.json();
      if (data.routePlan?.[0]?.swapInfo?.ammKey) {
        setAmmKey(data.routePlan[0].swapInfo.ammKey);
      }
    } catch (error) {
      console.error('Error fetching AMM key:', error);
    }
    setIsLoadingChart(false);
  };

  useEffect(() => {
    // Function to extract API key from URL and clean the URL
    const handleApiKeyFromUrl = () => {
      const url = new URL(window.location.href);
      const apiKey = url.searchParams.get('apikey');
      
      if (apiKey) {
        console.log('API key found in URL, saving to config');
        
        setConfig(prev => {
          const newConfig = { ...prev, apiKey };
          saveConfigToCookies(newConfig);
          return newConfig;
        });
        
        url.searchParams.delete('apikey');
        window.history.replaceState({}, document.title, url.toString());
      }
    };
    
    handleApiKeyFromUrl();
  }, []);

  useEffect(() => {
    if (tokenAddress) {
      fetchAmmKey(tokenAddress);
    }
  }, [tokenAddress]);
  
  useEffect(() => {
    const initializeApp = () => {
      const savedConfig = loadConfigFromCookies();
      if (savedConfig) {
        setConfig(savedConfig);
        
        try {
          const conn = new Connection(savedConfig.rpcEndpoint);
          setConnection(conn);
        } catch (error) {
          console.error('Error creating connection:', error);
        }
      }
      
      const savedWallets = loadWalletsFromCookies();
      if (savedWallets && savedWallets.length > 0) {
        setWallets(savedWallets);
      }
    };

    initializeApp();
  }, []);

  useEffect(() => {
    if (wallets.length > 0) {
      saveWalletsToCookies(wallets);
    }
  }, [wallets]);

  useEffect(() => {
    if (connection && wallets.length > 0) {
      fetchSolBalances();
    }
  }, [connection, wallets.length]);

  useEffect(() => {
    if (connection && wallets.length > 0 && tokenAddress) {
      fetchTokenBalances();
    }
  }, [connection, wallets.length, tokenAddress]);

  useEffect(() => {
    try {
      const conn = new Connection(config.rpcEndpoint);
      setConnection(conn);
    } catch (error) {
      console.error('Error creating connection:', error);
    }
  }, [config.rpcEndpoint]);

  useEffect(() => {
    if (connection && wallets.length > 0) {
      handleRefresh();
    }
  }, [connection]);

  useEffect(() => {
    if (connection && wallets.length > 0 && tokenAddress) {
      handleRefresh();
    }
  }, [tokenAddress]);

  const handleRefresh = async () => {
    if (!connection) return;
    
    setIsRefreshing(true);
    
    try {
      await fetchSolBalances();
      
      if (tokenAddress) {
        await fetchTokenBalances();
      }
    } catch (error) {
      console.error('Error refreshing balances:', error);
    } finally {
      setIsRefreshing(false);
    }
  };


 return (
  <div className="h-screen flex flex-col overflow-hidden bg-background text-foreground">
    <ChartPage
        isLoadingChart={isLoadingChart}
        tokenAddress={tokenAddress}
        ammKey={ammKey}
        walletAddresses={wallets.map(w => w.address)}
    />
  </div>
);
};

export default WalletManager;