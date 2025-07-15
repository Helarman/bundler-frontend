import React, { useState, useEffect } from 'react';
import { ExternalLink, DollarSign, Activity, } from 'lucide-react';
import { saveWalletsToCookies, formatAddress, formatTokenBalance, copyToClipboard, toggleWallet, fetchSolBalance } from '@/lib/utils/Utils';
import { Wallet as WalletType } from '@/lib/types/wallet';
import { Connection } from '@solana/web3.js';
import { WalletOperationsButtons } from './OperationsWallets';
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "../../ui/table"
import { Button } from "../../ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip"
import { Badge } from "../../ui/badge"
import { Checkbox } from "../../ui/checkbox"
import { Card } from "../../ui/card"

export const Tooltip123 = ({ 
  children, 
  content,
  position = 'top'
}: { 
  children: React.ReactNode;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>
      {isVisible && (
        <div className={`absolute z-50 ${positionClasses[position]}`}>
          <div className="bg-[#051014] cyberpunk-border text-[#02b36d] text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap">
            {content}
          </div>
        </div>
      )}
    </div>
  );
};

// Max wallets configuration
export const maxWalletsConfig = {
  'raybuy': 120,
  'raysell': 120,
  'pumpbuy': 140,
  'pumpsell': 180,
  'jupbuy': 120,
  'swapbuy': 120,
  'swapsell': 120,
  'jupsell': 120,
  'moonbuy': 160,
  'launchsell': 160,
  'launchbuy': 160,
  'moonsell': 160
} as const;

// Updated toggle function for wallets based on token and SOL conditions
export const toggleWalletsByBalance = (
  wallets: WalletType[], 
  showWithTokens: boolean,
  solBalances: Map<string, number>,
  tokenBalances: Map<string, number>
): WalletType[] => {
  return wallets.map(wallet => ({
    ...wallet,
    isActive: showWithTokens 
      ? (tokenBalances.get(wallet.address) || 0) > 0  // Select wallets with tokens
      : (solBalances.get(wallet.address) || 0) > 0 && (tokenBalances.get(wallet.address) || 0) === 0  // Select wallets with only SOL
  }));
};

export type ScriptType = keyof typeof maxWalletsConfig;

/**
 * Counts the number of active wallets in the provided wallet array
 * @param wallets Array of wallet objects
 * @returns Number of active wallets
 */
export const countActiveWallets = (wallets: WalletType[]): number => {
  return wallets.filter(wallet => wallet.isActive).length;
};

/**
 * Returns an array of only the active wallets
 * @param wallets Array of wallet objects
 * @returns Array of active wallets
 */
export const getActiveWallets = (wallets: WalletType[]): WalletType[] => {
  return wallets.filter(wallet => wallet.isActive);
};

/**
 * Checks if the number of active wallets exceeds the maximum allowed for a specific script
 * @param wallets Array of wallet objects
 * @param scriptName Name of the script to check against
 * @returns Object containing validation result and relevant information
 */
export const validateActiveWallets = (wallets: WalletType[], scriptName: ScriptType) => {
  const activeCount = countActiveWallets(wallets);
  const maxAllowed = maxWalletsConfig[scriptName];
  const isValid = activeCount <= maxAllowed;

  return {
    isValid,
    activeCount,
    maxAllowed,
    scriptName,
    message: isValid 
      ? `Valid: ${activeCount} active wallets (max ${maxAllowed})`
      : `Error: Too many active wallets (${activeCount}). Maximum allowed for ${scriptName} is ${maxAllowed}`
  };
};

// New function to toggle all wallets regardless of balance
export const toggleAllWallets = (wallets: WalletType[]): WalletType[] => {
  const allActive = wallets.every(wallet => wallet.isActive);
  return wallets.map(wallet => ({
    ...wallet,
    isActive: !allActive
  }));
};

// Updated to use separate SOL balance tracking
export const toggleAllWalletsWithBalance = (
  wallets: WalletType[],
  solBalances: Map<string, number>
): WalletType[] => {
  // Check if all wallets with balance are already active
  const walletsWithBalance = wallets.filter(wallet => 
    (solBalances.get(wallet.address) || 0) > 0
  );
  const allWithBalanceActive = walletsWithBalance.every(wallet => wallet.isActive);
  
  // Toggle based on current state
  return wallets.map(wallet => ({
    ...wallet,
    isActive: (solBalances.get(wallet.address) || 0) > 0 
      ? !allWithBalanceActive 
      : wallet.isActive
  }));
};

/**
 * Gets the appropriate script name based on selected DEX and mode
 * @param selectedDex Selected DEX name
 * @param isBuyMode Whether in buy mode
 * @returns The corresponding script name
 */
export const getScriptName = (selectedDex: string, isBuyMode: boolean): ScriptType => {
  switch(selectedDex) {
    case 'raydium':
      return isBuyMode ? 'raybuy' : 'raysell';
    case 'jupiter':
      return isBuyMode ? 'jupbuy' : 'jupsell';
    case 'pumpfun':
      return isBuyMode ? 'pumpbuy' : 'pumpsell';
    case 'pumpswap':
      return isBuyMode ? 'swapbuy' : 'swapsell';
    case 'moonshot':
      return isBuyMode ? 'moonbuy' : 'moonsell';
    case 'launchpad':
      return isBuyMode ? 'launchbuy' : 'launchsell';
    default:
      return isBuyMode ? 'pumpbuy' : 'pumpsell';
  }
};

interface WalletsPageProps {
  wallets: WalletType[];
  setWallets: React.Dispatch<React.SetStateAction<WalletType[]>>;
  handleRefresh: () => void;
  isRefreshing: boolean;
  setIsModalOpen: (open: boolean) => void;
  tokenAddress: string;
  sortDirection: string;
  handleSortWallets: () => void;
  connection: Connection | null;
  
  // Balance props
  solBalances?: Map<string, number>;
  setSolBalances?: (balances: Map<string, number>) => void;
  tokenBalances?: Map<string, number>;
  setTokenBalances?: (balances: Map<string, number>) => void;
  totalSol?: number;
  setTotalSol?: (total: number) => void;
  activeSol?: number;
  setActiveSol?: (active: number) => void;
  totalTokens?: number;
  setTotalTokens?: (total: number) => void;
  activeTokens?: number;
  setActiveTokens?: (active: number) => void;
}
export const WalletsPage: React.FC<WalletsPageProps> = ({
  wallets,
  setWallets,
  handleRefresh,
  isRefreshing,
  setIsModalOpen,
  tokenAddress,
  sortDirection,
  handleSortWallets,
  connection,
  
  // Balance props with defaults
  solBalances: externalSolBalances,
  setSolBalances: setExternalSolBalances,
  tokenBalances: externalTokenBalances,
  setTokenBalances: setExternalTokenBalances,
  totalSol: externalTotalSol,
  setTotalSol: setExternalTotalSol,
  activeSol: externalActiveSol,
  setActiveSol: setExternalActiveSol,
  totalTokens: externalTotalTokens,
  setTotalTokens: setExternalTotalTokens,
  activeTokens: externalActiveTokens,
  setActiveTokens: setExternalActiveTokens
}) => {
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [showingTokenWallets, setShowingTokenWallets] = useState(true);
  const [hoverRow, setHoverRow] = useState<number | null>(null);
  
  // Use internal state if external state is not provided
  const [internalSolBalances, setInternalSolBalances] = useState<Map<string, number>>(new Map());
  const [internalTokenBalances, setInternalTokenBalances] = useState<Map<string, number>>(new Map());
  
  const solBalances = externalSolBalances || internalSolBalances;
  const setSolBalances = setExternalSolBalances || setInternalSolBalances;
  const tokenBalances = externalTokenBalances || internalTokenBalances;
  const setTokenBalances = setExternalTokenBalances || setInternalTokenBalances;
  
 

  // Fetch SOL balances for all wallets
  const fetchSolBalances = async () => {
    const newBalances = new Map<string, number>();
    
    const promises = wallets.map(async (wallet) => {
      try {
        const balance = await fetchSolBalance(connection as Connection, wallet.address);
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

  // Fetch SOL balances initially and when wallets change
  useEffect(() => {
    fetchSolBalances();
  }, [wallets.length, connection]);

  // Calculate balances and update external state
  useEffect(() => {
    // Calculate total SOL and token balances
    const calculatedTotalSol = Array.from(solBalances.values()).reduce((sum, balance) => sum + balance, 0);
    const calculatedTotalTokens = Array.from(tokenBalances.values()).reduce((sum, balance) => sum + balance, 0);

    // Calculate SOL and token balances for active wallets only
    const activeWallets = wallets.filter(wallet => wallet.isActive);
    const calculatedActiveSol = activeWallets.reduce((sum, wallet) => sum + (solBalances.get(wallet.address) || 0), 0);
    const calculatedActiveTokens = activeWallets.reduce((sum, wallet) => sum + (tokenBalances.get(wallet.address) || 0), 0);

    // Update external state if provided
    if (setExternalTotalSol) setExternalTotalSol(calculatedTotalSol);
    if (setExternalActiveSol) setExternalActiveSol(calculatedActiveSol);
    if (setExternalTotalTokens) setExternalTotalTokens(calculatedTotalTokens);
    if (setExternalActiveTokens) setExternalActiveTokens(calculatedActiveTokens);
  }, [wallets, solBalances, tokenBalances]);

  // Use either external state or calculated values
  const totalSol = externalTotalSol !== undefined ? externalTotalSol : 
    Array.from(solBalances.values()).reduce((sum, balance) => sum + balance, 0);
  
  const totalTokens = externalTotalTokens !== undefined ? externalTotalTokens :
    Array.from(tokenBalances.values()).reduce((sum, balance) => sum + balance, 0);
  
  const activeWallets = wallets.filter(wallet => wallet.isActive);
  
  const activeSol = externalActiveSol !== undefined ? externalActiveSol :
    activeWallets.reduce((sum, wallet) => sum + (solBalances.get(wallet.address) || 0), 0);
  
  const activeTokens = externalActiveTokens !== undefined ? externalActiveTokens :
    activeWallets.reduce((sum, wallet) => sum + (tokenBalances.get(wallet.address) || 0), 0);

  const handleBalanceToggle = () => {
    setShowingTokenWallets(!showingTokenWallets);
    setWallets(prev => {
      const newWallets = toggleWalletsByBalance(prev, !showingTokenWallets, solBalances, tokenBalances);
      saveWalletsToCookies(newWallets);
      return newWallets;
    });
  };

  // Animation for digital counter
  const [tickEffect, setTickEffect] = useState(false);
  
  useEffect(() => {
    // Trigger tick animation when active wallet count changes
    setTickEffect(true);
    const timer = setTimeout(() => setTickEffect(false), 500);
    return () => clearTimeout(timer);
  }, [activeWallets.length]);

  return (
   <Card className="mx-auto">
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b">
        <div className="p-2 border-b">
          <WalletOperationsButtons
            wallets={wallets}
            solBalances={solBalances}
            connection={connection as Connection}
            tokenBalances={tokenBalances}
            handleRefresh={() => {
              handleRefresh();
              fetchSolBalances();
            }}
            isRefreshing={isRefreshing}
            showingTokenWallets={showingTokenWallets}
            handleBalanceToggle={handleBalanceToggle}
            setWallets={setWallets}
            sortDirection={sortDirection}
            handleSortWallets={handleSortWallets}
            setIsModalOpen={setIsModalOpen}
          />
        </div>
        
        {/* Second row - Balance information */}
        <div className="p-4 bg-white/80 backdrop-blur-sm">
          <div className="flex justify-between items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span className="font-mono">
                      {totalSol.toFixed(2)} SOL
                      <span className="text-green-600 ml-1">({activeSol.toFixed(2)})</span>
                    </span>
                  </Badge>
                </div>
              </TooltipTrigger>
              <TooltipContent>Total SOL balance (active wallets)</TooltipContent>
            </Tooltip>

            {tokenAddress && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="gap-2">
                    <span className="font-mono">
                      {formatTokenBalance(totalTokens)}
                      <span className="text-green-600 ml-1">({formatTokenBalance(activeTokens)})</span>
                    </span>
                    <Activity className="h-4 w-4 text-green-600" />
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>Total token balance (active wallets)</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </div>
      
      {/* Wallets table */}
      <div className="p-2">
        <Table>
          <TableBody>
            {wallets.map((wallet) => (
              <TableRow 
                key={wallet.id}
                className={`cursor-pointer ${
                  hoverRow === wallet.id ? 'bg-gray-50' : ''
                } ${
                  wallet.isActive ? 'bg-green-50' : ''
                }`}
                onMouseEnter={() => setHoverRow(wallet.id)}
                onMouseLeave={() => setHoverRow(null)}
                onClick={() => {
                  setWallets(prev => {
                    const newWallets = toggleWallet(prev, wallet.id);
                    saveWalletsToCookies(newWallets);
                    return newWallets;
                  });
                }}
              >
                <TableCell className="w-10">
                  <Checkbox 
                    checked={wallet.isActive}
                    onCheckedChange={() => {
                      setWallets(prev => {
                        const newWallets = toggleWallet(prev, wallet.id);
                        saveWalletsToCookies(newWallets);
                        return newWallets;
                      });
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Button 
                    variant="link" 
                    className="h-auto p-0 font-mono text-sm"
                    onClick={async (e) => {
                      e.stopPropagation();
                      const success = await copyToClipboard(wallet.address);
                      if (success) {
                        setCopiedAddress(wallet.address);
                        setTimeout(() => setCopiedAddress(null), 2000);
                      }
                    }}
                  >
                    {formatAddress(wallet.address)}
                    {copiedAddress === wallet.address && (
                      <span className="ml-2 text-xs text-green-600 animate-in fade-in">
                        Copied
                      </span>
                    )}
                  </Button>
                </TableCell>
                <TableCell className="text-right font-mono">
                  <span className={`
                    ${(solBalances.get(wallet.address) || 0) > 0 ? 'text-green-600' : 'text-gray-400'}
                  `}>
                    {(solBalances.get(wallet.address) || 0).toFixed(4)}
                  </span>
                </TableCell>
                {tokenAddress && (
                  <TableCell className="text-right font-mono">
                    <span className={`
                      ${(tokenBalances.get(wallet.address) || 0) > 0 ? 'text-green-600' : 'text-gray-400'}
                    `}>
                      {formatTokenBalance(tokenBalances.get(wallet.address) || 0)}
                    </span>
                  </TableCell>
                )}
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(`https://solscan.io/account/${wallet.address}`, '_blank');
                    }}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};