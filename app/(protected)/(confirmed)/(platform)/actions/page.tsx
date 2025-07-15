'use client'

import React, { useState, useEffect } from 'react';
import { Connection } from '@solana/web3.js';
import { ActionsPage } from '@/components/features/actions/Actions';
import { BurnModal } from '@/components/features/modals/BurnModal';
import { PnlModal } from '@/components/features/modals/CalculatePNLModal';
import { DeployModal } from '@/components/features/modals/DeployModal';
import { CleanerTokensModal } from '@/components/features/modals/CleanerModal';
import { CustomBuyModal } from '@/components/features/modals/CustomBuyModal';
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
} from '@/lib/utils/Utils';
import { toast } from 'sonner';

const WalletManager: React.FC = () => {
    
  const [tokenAddress, setTokenAddress] = useState(() => loadTokenAddressFromCookies());
  const [config, setConfig] = useState<ConfigType>({
    rpcEndpoint: 'https://smart-special-thunder.solana-mainnet.quiknode.pro/1366b058465380d24920f9d348f85325455d398d/',
    transactionFee: '0.000005',
    apiKey: ''
  });
  const [wallets, setWallets] = useState<WalletType[]>([]);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [solBalances, setSolBalances] = useState<Map<string, number>>(new Map());
  const [tokenBalances, setTokenBalances] = useState<Map<string, number>>(new Map());
  const [ammKey, setAmmKey] = useState<string | null>(null);

  // Add state for modals
  const [burnModalOpen, setBurnModalOpen] = useState(false);
  const [calculatePNLModalOpen, setCalculatePNLModalOpen] = useState(false);
  const [deployModalOpen, setDeployModalOpen] = useState(false);
  const [cleanerTokensModalOpen, setCleanerTokensModalOpen] = useState(false);
  const [customBuyModalOpen, setCustomBuyModalOpen] = useState(false);


  // Function to fetch SOL balances for all wallets
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

  // Function to fetch token balances for all wallets
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
        
        if (toast) {
          toast("API key has been set from URL");
        }
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
    
    
    try {
      await fetchSolBalances();
      
      if (tokenAddress) {
        await fetchTokenBalances();
      }
    } catch (error) {
      console.error('Error refreshing balances:', error);
    }
  };

  
  const [tickEffect, setTickEffect] = useState(false);
  
  useEffect(() => {
    setTickEffect(true);
    const timer = setTimeout(() => setTickEffect(false), 500);
    return () => clearTimeout(timer);
  }, [wallets.length]);

  const handleBurn = async (amount: string) => {
    try {
      console.log('burn', amount, 'SOL to');
      toast('Burn successful');
    } catch (error) {
      toast('Burn failed');
    }
  };

  const handleDeploy = async (data: any) => {
    try {
      console.log('Deploy executed:', data);
      toast('Token deployment initiated successfully');
    } catch (error) {
      console.error('Error:', error);
      toast('Token deployment failed');
    }
  };

  const handleCleaner = async (data : any ) => {
    try {
      console.log('Cleaning', data);
      toast('Cleaning successfully');
    } catch (error) {
      toast('Failed to clean');
    }
  };

  const handleCustomBuy = async (data : any) => {
    try {
      console.log('Custom buy executed:', data);
      toast('Custom buy completed successfully');
    } catch (error) {
      toast('Custom buy failed');
    }
  };

 return (
      <div className="flex-col items-center justify-between mb-6">

        <ActionsPage
          tokenAddress={tokenAddress}
          transactionFee={config.transactionFee}
          handleRefresh={handleRefresh}
          wallets={wallets}
          ammKey={ammKey}
          solBalances={solBalances}
          tokenBalances={tokenBalances}
          setBurnModalOpen={setBurnModalOpen}
          setCalculatePNLModalOpen={setCalculatePNLModalOpen}
          setDeployModalOpen={setDeployModalOpen}
          setCleanerTokensModalOpen={setCleanerTokensModalOpen}
          setCustomBuyModalOpen={setCustomBuyModalOpen}
        />


    <BurnModal
      isOpen={burnModalOpen}
      onBurn={handleBurn}
      onClose={() => setBurnModalOpen(false)}
      handleRefresh={handleRefresh}
      tokenAddress={tokenAddress}
      solBalances={solBalances} 
      tokenBalances={tokenBalances}
    />

    <PnlModal
      isOpen={calculatePNLModalOpen}
      onClose={() => setCalculatePNLModalOpen(false)}
      handleRefresh={handleRefresh}    
      tokenAddress={tokenAddress}
    />
    
    <DeployModal
      isOpen={deployModalOpen}
      onClose={() => setDeployModalOpen(false)}
      handleRefresh={handleRefresh} 
      solBalances={solBalances} 
      onDeploy={handleDeploy}    
    />
    
    <CleanerTokensModal
      isOpen={cleanerTokensModalOpen}
      onClose={() => setCleanerTokensModalOpen(false)}
      onCleanerTokens={handleCleaner}
      handleRefresh={handleRefresh}
      tokenAddress={tokenAddress}
      solBalances={solBalances} 
      tokenBalances={tokenBalances}
    />
    
    <CustomBuyModal
      isOpen={customBuyModalOpen}
      onClose={() => setCustomBuyModalOpen(false)}
      onCustomBuy={handleCustomBuy}
      handleRefresh={handleRefresh}
      tokenAddress={tokenAddress}
      solBalances={solBalances} 
      tokenBalances={tokenBalances}
    />
  </div>

);
};

export default WalletManager;