import React, { useEffect, useState, useMemo } from 'react';
import { 
  Waypoints,
  Blocks,
  Trash2,
  ChartSpline,
  Workflow
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";
import { Skeleton } from "../../../components/ui/skeleton";

import { countActiveWallets, validateActiveWallets, getScriptName, maxWalletsConfig } from '../../../components/features/wallet/Wallets';
import TradingCard from '../TradingForm';

import { executePumpSell, validatePumpSellInputs } from '@/lib/utils/pumpsell';
import { executePumpBuy, validatePumpBuyInputs } from '@/lib/utils/pumpbuy';
import { executeBoopSell, validateBoopSellInputs } from '@/lib/utils/boopsell';
import { executeBoopBuy, validateBoopBuyInputs } from '@/lib/utils/boopbuy';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Wallet as WalletType } from '@/lib/types/wallet';

interface ActionsPageProps {
  tokenAddress: string;
  transactionFee: string;
  ammKey: string | null;
  handleRefresh: () => void;
  wallets: WalletType[];
  solBalances: Map<string, number>;
  tokenBalances: Map<string, number>;
  setBurnModalOpen: (open: boolean) => void;
  setCalculatePNLModalOpen: (open: boolean) => void;
  setDeployModalOpen: (open: boolean) => void;
  setCleanerTokensModalOpen: (open: boolean) => void;
  setCustomBuyModalOpen: (open: boolean) => void;
}

interface Error {
  message: string
}
export const ActionsPage: React.FC<ActionsPageProps> = ({
  tokenAddress,
  transactionFee,
  handleRefresh,
  wallets,
  ammKey,
  solBalances,
  tokenBalances,
  setBurnModalOpen,
  setCalculatePNLModalOpen,
  setDeployModalOpen,
  setCleanerTokensModalOpen,
  setCustomBuyModalOpen
}) => {
  const [buyAmount, setBuyAmount] = useState('');
  const [sellAmount, setSellAmount] = useState('');
  const [selectedDex, setSelectedDex] = useState('jupiter');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tokenPrice, setTokenPrice] = useState<string | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  useEffect(() => {
    const fetchTokenPrice = async () => {
      if (!tokenAddress) {
        setTokenPrice(null);
        return;
      }
      
      try {
        setPriceLoading(true);
        const response = await fetch(`https://api.jup.ag/price/v2?ids=${tokenAddress}`);
        const data = await response.json();
        setTokenPrice(data.data[tokenAddress]?.price || null);
      } catch ( error ) {
        console.error('Error fetching token price:', error);
        toast('Failed to fetch token price');
        setTokenPrice("0");
      } finally {
        setPriceLoading(false);
      }
    };
  
    fetchTokenPrice();
  }, [tokenAddress, toast]);

  const dexOptions = [
    { value: 'pumpfun', label: 'PumpFun' },
    { value: 'moonshot', label: 'Moonshot' },
    { value: 'pumpswap', label: 'PumpSwap' },
    { value: 'raydium', label: 'Raydium' },
    { value: 'jupiter', label: 'Jupiter' },
    { value: 'launchpad', label: 'Launchpad' },
    { value: 'boopfun', label: 'BoopFun' },
  ];
  
  const handleTradeSubmit = async (wallets: WalletType[], isBuyMode: boolean) => {
    setIsLoading(true);
    
    if (!tokenAddress) {
      toast("Please select a token first");
      setIsLoading(false);
      return;
    }

    if (selectedDex === 'moonshot') {
      try {
        const activeWallets = wallets.filter(wallet => wallet.isActive);
        
        if (activeWallets.length === 0) {
          toast("Please activate at least one wallet");
          setIsLoading(false);
          return;
        }
        
        const formattedWallets = activeWallets.map(wallet => ({
          address: wallet.address,
          privateKey: wallet.privateKey
        }));
        
        if (isBuyMode) {
          const tokenConfig = {
            tokenAddress: tokenAddress,
            solAmount: parseFloat(buyAmount)
          };
          
          const walletBalances = new Map<string, number>();
          activeWallets.forEach(wallet => {
            const balance = solBalances.get(wallet.address) || 0;
            walletBalances.set(wallet.address, balance);
          });
          
          const { validateMoonBuyInputs, executeMoonBuy } = await import('@/lib/utils/moonbuy');
          
          const validation = validateMoonBuyInputs(formattedWallets, tokenConfig, walletBalances);
          if (!validation.valid) {
            toast(`Validation failed: ${validation.error}`);
            setIsLoading(false);
            return;
          }
          
          const result = await executeMoonBuy(formattedWallets, tokenConfig);
          
          if (result.success) {
            toast("MoonBuy transactions submitted successfully");
            handleRefresh();
          } else {
            toast(`MoonBuy failed: ${result.error}`);
          }
        } else {
          const tokenConfig = {
            tokenAddress: tokenAddress,
            sellPercent: parseFloat(sellAmount)
          };
          
          const tokenBalanceMap = new Map<string, number>();
          activeWallets.forEach(wallet => {
            const balance = tokenBalances.get(wallet.address) || 0;
            tokenBalanceMap.set(wallet.address, balance);
          });
          
          const { validateMoonSellInputs, executeMoonSell } = await import('@/lib/utils/moonsell');
          
          const validation = validateMoonSellInputs(formattedWallets, tokenConfig, tokenBalanceMap);
          if (!validation.valid) {
            toast(`Validation failed: ${validation.error}`);
            setIsLoading(false);
            return;
          }
          
          const result = await executeMoonSell(formattedWallets, tokenConfig);
          
          if (result.success) {
            toast("MoonSell transactions submitted successfully");
            handleRefresh();
          } else {
            toast(`MoonSell failed: ${result.error}`);
          }
        }
      } catch ( error) {
        console.error(`Moonshot ${isBuyMode ? 'Buy' : 'Sell'} error:`, error);
         const err = error as Error;
        toast(`Error: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
      return;
    }
    
    if (selectedDex === 'boopfun') {
      try {
        const activeWallets = wallets.filter(wallet => wallet.isActive);
        
        if (activeWallets.length === 0) {
          toast("Please activate at least one wallet");
          setIsLoading(false);
          return;
        }
        
        const formattedWallets = activeWallets.map(wallet => ({
          address: wallet.address,
          privateKey: wallet.privateKey
        }));
        
        if (isBuyMode) {
          const tokenConfig = {
            tokenAddress: tokenAddress,
            solAmount: parseFloat(buyAmount)
          };
          
          const walletBalances = new Map<string, number>();
          activeWallets.forEach(wallet => {
            const balance = solBalances.get(wallet.address) || 0;
            walletBalances.set(wallet.address, balance);
          });
          
          const validation = validateBoopBuyInputs(formattedWallets, tokenConfig, walletBalances);
          if (!validation.valid) {
            toast(`Validation failed: ${validation.error}`);
            setIsLoading(false);
            return;
          }
          
          const result = await executeBoopBuy(formattedWallets, tokenConfig);
          
          if (result.success) {
            toast("BoopBuy transactions submitted successfully");
            handleRefresh();
          } else {
            toast(`BoopBuy failed: ${result.error}`);
          }
        } else {
          const tokenConfig = {
            tokenAddress: tokenAddress,
            sellPercent: parseFloat(sellAmount)
          };
          
          const tokenBalanceMap = new Map<string, number>();
          activeWallets.forEach(wallet => {
            const balance = tokenBalances.get(wallet.address) || 0;
            tokenBalanceMap.set(wallet.address, balance);
          });
          
          const validation = validateBoopSellInputs(formattedWallets, tokenConfig, tokenBalanceMap);
          if (!validation.valid) {
            toast(`Validation failed: ${validation.error}`);
            setIsLoading(false);
            return;
          }
          
          const result = await executeBoopSell(formattedWallets, tokenConfig);
          
          if (result.success) {
            toast("BoopSell transactions submitted successfully");
            handleRefresh();
          } else {
            toast(`BoopSell failed: ${result.error}`);
          }
        }
      } catch ( error) {
        console.error(`Boop${isBuyMode ? 'Buy' : 'Sell'} error:`, error);
         const err = error as Error;
        toast(`Error: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
      return;
    }
    
    if (selectedDex === 'pumpfun') {
      try {
        const activeWallets = wallets.filter(wallet => wallet.isActive);
        
        if (activeWallets.length === 0) {
          toast("Please activate at least one wallet");
          setIsLoading(false);
          return;
        }
        
        const formattedWallets = activeWallets.map(wallet => ({
          address: wallet.address,
          privateKey: wallet.privateKey
        }));
        
        if (isBuyMode) {
          const tokenConfig = {
            tokenAddress: tokenAddress,
            solAmount: parseFloat(buyAmount)
          };
          
          const walletBalances = new Map<string, number>();
          activeWallets.forEach(wallet => {
            const balance = solBalances.get(wallet.address) || 0;
            walletBalances.set(wallet.address, balance);
          });
          
          const validation = validatePumpBuyInputs(formattedWallets, tokenConfig, walletBalances);
          if (!validation.valid) {
            toast(`Validation failed: ${validation.error}`);
            setIsLoading(false);
            return;
          }
          
          const result = await executePumpBuy(formattedWallets, tokenConfig);
          
          if (result.success) {
            toast("PumpBuy transactions submitted successfully");
            handleRefresh();
          } else {
            toast(`PumpBuy failed: ${result.error}`);
          }
        } else {
          const tokenConfig = {
            tokenAddress: tokenAddress,
            sellPercent: parseFloat(sellAmount)
          };
          
          const tokenBalanceMap = new Map<string, number>();
          activeWallets.forEach(wallet => {
            const balance = tokenBalances.get(wallet.address) || 0;
            tokenBalanceMap.set(wallet.address, balance);
          });
          
          const validation = validatePumpSellInputs(formattedWallets, tokenConfig, tokenBalanceMap);
          if (!validation.valid) {
            toast(`Validation failed: ${validation.error}`);
            setIsLoading(false);
            return;
          }
          
          const result = await executePumpSell(formattedWallets, tokenConfig);
          
          if (result.success) {
            toast("PumpSell transactions submitted successfully");
            handleRefresh();
          } else {
            toast(`PumpSell failed: ${result.error}`);
          }
        }
      } catch ( error ) {
        console.error(`Pump${isBuyMode ? 'Buy' : 'Sell'} error:`, error);
         const err = error as Error;
        toast(`Error: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
      return;
    }
    
    if (selectedDex === 'jupiter') {
      try {
        const activeWallets = wallets.filter(wallet => wallet.isActive);
        
        if (activeWallets.length === 0) {
          toast("Please activate at least one wallet");
          setIsLoading(false);
          return;
        }
        
        const formattedWallets = activeWallets.map(wallet => ({
          address: wallet.address,
          privateKey: wallet.privateKey
        }));
        
        if (isBuyMode) {
          const swapConfig = {
            inputMint: "So11111111111111111111111111111111111111112",
            outputMint: tokenAddress,
            solAmount: parseFloat(buyAmount),
            slippageBps: 9900
          };
          
          const walletBalances = new Map<string, number>();
          activeWallets.forEach(wallet => {
            const balance = solBalances.get(wallet.address) || 0;
            walletBalances.set(wallet.address, balance);
          });
          
          const { validateJupSwapInputs, executeJupSwap } = await import('@/lib/utils/jupbuy');
          
          const validation = validateJupSwapInputs(formattedWallets, swapConfig, walletBalances);
          if (!validation.valid) {
            toast(`Validation failed: ${validation.error}`);
            setIsLoading(false);
            return;
          }
          
          const result = await executeJupSwap(formattedWallets, swapConfig);
          
          if (result.success) {
            toast("Jupiter Buy transactions submitted successfully");
            handleRefresh();
          } else {
            toast(`Jupiter Buy failed: ${result.error}`);
          }
        } else {
          const sellConfig = {
            inputMint: tokenAddress,
            outputMint: "So11111111111111111111111111111111111111112",
            sellPercent: parseFloat(sellAmount),
            slippageBps: 9900
          };
          
          const tokenBalanceMap = new Map<string, bigint>();
          activeWallets.forEach(wallet => {
            const balance = BigInt(Math.floor((tokenBalances.get(wallet.address) || 0) * 1e9));
            tokenBalanceMap.set(wallet.address, balance);
          });
          
          const { validateJupSellInputs, executeJupSell } = await import('@/lib/utils/jupsell');
          
          const result = await executeJupSell(formattedWallets, sellConfig);
          
          if (result.success) {
            toast("Jupiter Sell transactions submitted successfully");
            handleRefresh();
          } else {
            toast(`Jupiter Sell failed: ${result.error}`);
          }
        }
      } catch ( error ) {
        console.error(`Jupiter ${isBuyMode ? 'Buy' : 'Sell'} error:`, error);
        const err = error as Error;
        toast(`Error: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
      return;
    }
  
    if (selectedDex === 'raydium') {
      try {
        const activeWallets = wallets.filter(wallet => wallet.isActive);
        
        if (activeWallets.length === 0) {
          toast("Please activate at least one wallet");
          setIsLoading(false);
          return;
        }
        
        const formattedWallets = activeWallets.map(wallet => ({
          address: wallet.address,
          privateKey: wallet.privateKey
        }));
        
        if (isBuyMode) {
          const tokenConfig = {
            tokenAddress: tokenAddress,
            solAmount: parseFloat(buyAmount)
          };
          
          const walletBalances = new Map<string, number>();
          activeWallets.forEach(wallet => {
            const balance = solBalances.get(wallet.address) || 0;
            walletBalances.set(wallet.address, balance);
          });
          
          const { validateRayBuyInputs, executeRayBuy } = await import('@/lib/utils/raybuy');
          
          const validation = validateRayBuyInputs(formattedWallets, tokenConfig, walletBalances);
          if (!validation.valid) {
            toast(`Validation failed: ${validation.error}`);
            setIsLoading(false);
            return;
          }
          
          const result = await executeRayBuy(formattedWallets, tokenConfig);
          
          if (result.success) {
            toast("RayBuy transactions submitted successfully");
            handleRefresh();
          } else {
            toast(`RayBuy failed: ${result.error}`);
          }
        } else {
          const tokenConfig = {
            tokenAddress: tokenAddress,
            sellPercent: parseFloat(sellAmount)
          };
          
          const tokenBalanceMap = new Map<string, number>();
          activeWallets.forEach(wallet => {
            const balance = tokenBalances.get(wallet.address) || 0;
            tokenBalanceMap.set(wallet.address, balance);
          });
          
          const { validateRaySellInputs, executeRaySell } = await import('@/lib/utils/raysell');
          
          const validation = validateRaySellInputs(formattedWallets, tokenConfig, tokenBalanceMap);
          if (!validation.valid) {
            toast(`Validation failed: ${validation.error}`);
            setIsLoading(false);
            return;
          }
          
          const result = await executeRaySell(formattedWallets, tokenConfig);
          
          if (result.success) {
            toast("RaySell transactions submitted successfully");
            handleRefresh();
          } else {
            toast(`RaySell failed: ${result.error}`);
          }
        }
      } catch ( error ) {
        console.error(`Moonshot ${isBuyMode ? 'Buy' : 'Sell'} error:`, error);
        const err = error as Error;
        toast(`Error: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (selectedDex === 'launchpad') {
      try {
        const activeWallets = wallets.filter(wallet => wallet.isActive);
        
        if (activeWallets.length === 0) {
          toast("Please activate at least one wallet");
          setIsLoading(false);
          return;
        }
        
        const formattedWallets = activeWallets.map(wallet => ({
          address: wallet.address,
          privateKey: wallet.privateKey
        }));
        
        if (isBuyMode) {
          const tokenConfig = {
            tokenAddress: tokenAddress,
            solAmount: parseFloat(buyAmount)
          };
          
          const walletBalances = new Map<string, number>();
          activeWallets.forEach(wallet => {
            const balance = solBalances.get(wallet.address) || 0;
            walletBalances.set(wallet.address, balance);
          });
          
          const { validateLaunchBuyInputs, executeLaunchBuy } = await import('@/lib/utils/launchbuy');
          
          const validation = validateLaunchBuyInputs(formattedWallets, tokenConfig, walletBalances);
          if (!validation.valid) {
            toast(`Validation failed: ${validation.error}`);
            setIsLoading(false);
            return;
          }
          
          const result = await executeLaunchBuy(formattedWallets, tokenConfig);
          
          if (result.success) {
            toast("RayBuy transactions submitted successfully");
            handleRefresh();
          } else {
            toast(`RayBuy failed: ${result.error}`);
          }
        } else {
          const tokenConfig = {
            tokenAddress: tokenAddress,
            sellPercent: parseFloat(sellAmount)
          };
          
          const tokenBalanceMap = new Map<string, number>();
          activeWallets.forEach(wallet => {
            const balance = tokenBalances.get(wallet.address) || 0;
            tokenBalanceMap.set(wallet.address, balance);
          });
          
          const { validateLaunchSellInputs, executeLaunchSell } = await import('@/lib/utils/launchsell');
          
          const validation = validateLaunchSellInputs(formattedWallets, tokenConfig, tokenBalanceMap);
          if (!validation.valid) {
            toast(`Validation failed: ${validation.error}`);
            setIsLoading(false);
            return;
          }
          
          const result = await executeLaunchSell(formattedWallets, tokenConfig);
          
          if (result.success) {
            toast("RaySell transactions submitted successfully");
            handleRefresh();
          } else {
            toast(`RaySell failed: ${result.error}`);
          }
        }
      } catch ( error ) {
        console.error(`Moonshot ${isBuyMode ? 'Buy' : 'Sell'} error:`, error);
        const err = error as Error;
        toast(`Error: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
      return;
    }
    
    if (selectedDex === 'pumpswap') {
      try {
        const activeWallets = wallets.filter(wallet => wallet.isActive);
        
        if (activeWallets.length === 0) {
          toast("Please activate at least one wallet");
          setIsLoading(false);
          return;
        }
        
        const formattedWallets = activeWallets.map(wallet => ({
          address: wallet.address,
          privateKey: wallet.privateKey
        }));
        
        if (isBuyMode) {
          const tokenConfig = {
            tokenAddress: tokenAddress,
            solAmount: parseFloat(buyAmount)
          };
          
          const walletBalances = new Map<string, number>();
          activeWallets.forEach(wallet => {
            const balance = solBalances.get(wallet.address) || 0;
            walletBalances.set(wallet.address, balance);
          });
          
          const { validateSwapBuyInputs, executeSwapBuy } = await import('@/lib/utils/swapbuy');
          
          const validation = validateSwapBuyInputs(formattedWallets, tokenConfig, walletBalances);
          if (!validation.valid) {
            toast(`Validation failed: ${validation.error}`);
            setIsLoading(false);
            return;
          }
          
          const result = await executeSwapBuy(formattedWallets, tokenConfig);
          
          if (result.success) {
            toast("Swap transactions submitted successfully");
            handleRefresh();
          } else {
            toast(`MoonBuy failed: ${result.error}`);
          }
        } else {
          const tokenConfig = {
            tokenAddress: tokenAddress,
            sellPercent: parseFloat(sellAmount)
          };
          
          const tokenBalanceMap = new Map<string, number>();
          activeWallets.forEach(wallet => {
            const balance = tokenBalances.get(wallet.address) || 0;
            tokenBalanceMap.set(wallet.address, balance);
          });
          
          const { validateSwapSellInputs, executeSwapSell } = await import('@/lib/utils/swapsell');
          
          const validation = validateSwapSellInputs(formattedWallets, tokenConfig, tokenBalanceMap);
          if (!validation.valid) {
            toast(`Validation failed: ${validation.error}`);
            setIsLoading(false);
            return;
          }
          
          const result = await executeSwapSell(formattedWallets, tokenConfig);
          
          if (result.success) {
            toast("MoonSell transactions submitted successfully");
            handleRefresh();
          } else {
            toast(`MoonSell failed: ${result.error}`);
          }
        }
      } catch (error) {
        console.error(`Moonshot ${isBuyMode ? 'Buy' : 'Sell'} error:`, error);
        const err = error as Error;
        toast(`Error: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
      return;
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 24 }
    },
    hover: { 
      scale: 1.05,
      boxShadow: "0px 10px 20px rgba(2, 179, 109, 0.2)",
      transition: { type: "spring", stiffness: 400, damping: 10 }
    }
  };

  const statsVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" }
    }
  };
  
  return (
    <div className='space-y-4 container mx-auto'>
    <TradingCard
      tokenAddress={tokenAddress}
      wallets={wallets}
      selectedDex={selectedDex}
      setSelectedDex={setSelectedDex}
      buyAmount={buyAmount}
      setBuyAmount={setBuyAmount}
      sellAmount={sellAmount}
      setSellAmount={setSellAmount}
      handleTradeSubmit={handleTradeSubmit}
      isLoading={isLoading}
      dexOptions={dexOptions}
      validateActiveWallets={validateActiveWallets}
      getScriptName={getScriptName}
      countActiveWallets={countActiveWallets}
      maxWalletsConfig={maxWalletsConfig}
    />
    
      <Card className="relative overflow-hidden">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Button
              variant="outline"
              onClick={() => {
                if (!tokenAddress) {
                  toast("Please select a token first");
                  return;
                }
                setCleanerTokensModalOpen(true);
              }}
              className="flex flex-col items-center gap-2 h-auto p-3 "
            >
              <div className="p-3 rounded-lg bg-muted">
                <Waypoints className="h-5 w-5 text-primary" />
              </div>
              <span className="text-xs font-mono tracking-wider text-muted-foreground uppercase">Cleaner</span>
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setDeployModalOpen(true)}
              className="flex flex-col items-center gap-2 h-auto p-3"
            >
              <div className="p-3 rounded-lg bg-muted">
                <Blocks className="h-5 w-5 text-primary" />
              </div>
              <span className="text-xs font-mono tracking-wider text-muted-foreground uppercase">Deploy</span>
            </Button>
            
            <Button
              variant="outline"
              onClick={() => {
                if (!tokenAddress) {
                  toast("Please select a token first");
                  return;
                }
                setBurnModalOpen(true);
              }}
              className="flex flex-col items-center gap-2 h-auto p-3"
            >
              <div className="p-3 rounded-lg bg-muted">
                <Trash2 className="h-5 w-5 text-primary" />
              </div>
              <span className="text-xs font-mono tracking-wider text-muted-foreground uppercase">Burn</span>
            </Button>
            
            <Button
              variant="outline"
              onClick={() => {
                if (!tokenAddress) {
                  toast("Please select a token first");
                  return;
                }
                setCustomBuyModalOpen(true);
              }}
              className="flex flex-col items-center gap-2 h-auto p-3 hover:border-primary"
            >
              <div className="p-3 rounded-lg bg-muted">
                <Workflow className="h-5 w-5 text-primary" />
              </div>
              <span className="text-xs font-mono tracking-wider text-muted-foreground uppercase">PumpBuy</span>
            </Button>
          </div>
        </CardContent>
      </Card>

  {tokenAddress && (
    <Card>
      <CardContent>
        <div className="mb-4 flex justify-between items-center">
          <Button
            onClick={() => {
              if (!tokenAddress) {
                toast("Please select a token first");
                return;
              }
              setCalculatePNLModalOpen(true);
            }}
            className="gap-2"
          >
            <ChartSpline size={16} />
            <span className="text-sm font-mono tracking-wider font-medium">Calculate PNL</span>
          </Button>
        </div>
        
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Holdings Card */}
            <Card className="p-5 hover:shadow-md transition-shadow">
              <CardHeader className="p-0 mb-2">
                <CardTitle className="text-sm font-mono tracking-wider text-muted-foreground uppercase">
                  Holdings
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {priceLoading ? (
                  <div className="flex items-center space-x-2">
                    <Skeleton className="h-8 w-8 bg-muted" />
                    <Skeleton className="h-8 w-16 bg-muted" />
                    <Skeleton className="h-8 w-12 bg-muted" />
                  </div>
                ) : tokenPrice ? (
                  <div className="text-3xl font-bold font-mono tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/70">
                    {wallets.reduce((total, wallet) => 
                      total + (Number(wallet.tokenBalance) || 0) * Number(tokenPrice), 0
                    ).toLocaleString('en-US', { 
                      maximumFractionDigits: 2,
                      minimumFractionDigits: 2 
                    })}
                  </div>
                ) : (
                  <div className="text-3xl font-bold font-mono tracking-wider">N/A</div>
                )}
              </CardContent>
            </Card>

            {/* Market Cap Card */}
            <Card className="p-5 hover:shadow-md transition-shadow">
              <CardHeader className="p-0 mb-2">
                <CardTitle className="text-sm font-mono tracking-wider text-muted-foreground uppercase">
                  Market Cap
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {priceLoading ? (
                  <div className="flex items-center space-x-2">
                    <Skeleton className="h-8 w-12 bg-muted" />
                    <Skeleton className="h-8 w-8 bg-muted" />
                  </div>
                ) : tokenPrice ? (
                  <div className="text-3xl font-bold font-mono tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/70">
                    {(() => {
                      const marketCap = Number(tokenPrice) * 1_000_000_000;
                      if (marketCap >= 1_000_000) {
                        return `${(marketCap / 1_000_000).toFixed(2)}M`;
                      } else if (marketCap >= 1_000) {
                        return `${(marketCap / 1_000).toFixed(2)}K`;
                      } else {
                        return `${marketCap.toFixed(2)}`;
                      }
                    })()}
                  </div>
                ) : (
                  <div className="text-3xl font-bold font-mono tracking-wider">N/A</div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </CardContent>
    </Card>
  )}
</div>
  );
};