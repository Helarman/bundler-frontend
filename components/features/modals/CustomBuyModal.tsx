import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, ChevronRight, DollarSign, X, Info, Search } from 'lucide-react';
import { getWallets } from '@/lib/utils/Utils';
import { loadConfigFromCookies } from '@/lib/utils/Utils';
import * as web3 from '@solana/web3.js';
import bs58 from 'bs58';
import { toast } from 'sonner';

// Shadcn components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Toggle } from "@/components/ui/toggle";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";

const STEPS_CUSTOMBUY = ['Select Wallets', 'Configure Buy', 'Review'];

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CustomBuyModalProps extends BaseModalProps { 
  onCustomBuy: (data: any) => void;
  handleRefresh: () => void;
  tokenAddress: string;
  solBalances: Map<string, number>;
  tokenBalances: Map<string, number>;
}

interface TransactionBundle {
  transactions: string[];
}

export const CustomBuyModal: React.FC<CustomBuyModalProps> = ({
  isOpen,
  onClose,
  onCustomBuy,
  handleRefresh,
  tokenAddress,
  solBalances,
  tokenBalances
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedWallets, setSelectedWallets] = useState<string[]>([]);
  const [walletAmounts, setWalletAmounts] = useState<Record<string, string>>({});
  const [useRpc, setUseRpc] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<{ symbol: string } | null>(null);
  const [isLoadingTokenInfo, setIsLoadingTokenInfo] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState('address');
  const [sortDirection, setSortDirection] = useState('asc');
  const [balanceFilter, setBalanceFilter] = useState('all');
  const [bulkAmount, setBulkAmount] = useState('0.1');

  const wallets = getWallets();

  const formatSolBalance = (balance: number) => {
    return balance.toFixed(4);
  };

  const formatTokenBalance = (balance: number | undefined) => {
    if (balance === undefined) return '0';
    if (balance < 0.001 && balance > 0) {
      return balance.toExponential(4);
    }
    return balance.toLocaleString(undefined, { maximumFractionDigits: 4 });
  };
  
  const filteredWallets = useMemo(() => {
    if (!wallets) return [];
    
    let filtered = wallets;
    if (searchTerm) {
      filtered = filtered.filter(wallet => 
        wallet.address.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    filtered = filtered.filter(wallet => (solBalances.get(wallet.address) || 0) > 0);
    
    if (balanceFilter !== 'all') {
      if (balanceFilter === 'highBalance') {
        filtered = filtered.filter(wallet => (solBalances.get(wallet.address) || 0) >= 0.1);
      } else if (balanceFilter === 'lowBalance') {
        filtered = filtered.filter(wallet => {
          const balance = solBalances.get(wallet.address) || 0;
          return balance < 0.1;
        });
      } else if (balanceFilter === 'hasToken') {
        filtered = filtered.filter(wallet => (tokenBalances.get(wallet.address) || 0) > 0);
      } else if (balanceFilter === 'noToken') {
        filtered = filtered.filter(wallet => (tokenBalances.get(wallet.address) || 0) === 0);
      }
    }
    
    return filtered.sort((a, b) => {
      if (sortOption === 'address') {
        return sortDirection === 'asc' 
          ? a.address.localeCompare(b.address)
          : b.address.localeCompare(a.address);
      } else if (sortOption === 'balance') {
        const balanceA = solBalances.get(a.address) || 0;
        const balanceB = solBalances.get(b.address) || 0;
        return sortDirection === 'asc' ? balanceA - balanceB : balanceB - balanceA;
      } else if (sortOption === 'tokenBalance') {
        const balanceA = tokenBalances.get(a.address) || 0;
        const balanceB = tokenBalances.get(b.address) || 0;
        return sortDirection === 'asc' ? balanceA - balanceB : balanceB - balanceA;
      }
      return 0;
    });
  }, [wallets, searchTerm, balanceFilter, sortOption, sortDirection, solBalances, tokenBalances]);

  useEffect(() => {
    if (isOpen) {
      resetForm();
      handleRefresh();
    }
  }, [isOpen, tokenAddress]);

  useEffect(() => {
    const newWalletAmounts = { ...walletAmounts };
    
    selectedWallets.forEach(wallet => {
      if (!newWalletAmounts[wallet]) {
        newWalletAmounts[wallet] = '0.1';
      }
    });
    
    Object.keys(newWalletAmounts).forEach(wallet => {
      if (!selectedWallets.includes(wallet)) {
        delete newWalletAmounts[wallet];
      }
    });
    
    setWalletAmounts(newWalletAmounts);
  }, [selectedWallets]);

  const resetForm = () => {
    setSelectedWallets([]);
    setWalletAmounts({});
    setUseRpc(false);
    setIsConfirmed(false);
    setCurrentStep(0);
    setSearchTerm('');
    setBulkAmount('0.1');
    setSortOption('address');
    setSortDirection('asc');
    setBalanceFilter('all');
  };

  const getWalletAddressFromKey = (privateKey: string): string => {
    const wallet = wallets.find(w => w.privateKey === privateKey);
    return wallet ? wallet.address : '';
  };

  const getUnsignedTransactions = async (
    walletAddresses: string[],
    amounts: number[],
    useRpcSetting: boolean
  ): Promise<TransactionBundle[]> => {
    try {
      const baseUrl = (window as any).tradingServerUrl.replace(/\/+$/, '');
      
      const response = await fetch(`${baseUrl}/api/tokens/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddresses,
          tokenAddress,
          solAmount: 0.1,
          protocol: "jupiter",
          amounts,
          useRpc: useRpcSetting
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to get unsigned transactions');
      }
      
      if (data.bundles && Array.isArray(data.bundles)) {
        return data.bundles.map((bundle: any) =>
          Array.isArray(bundle) ? { transactions: bundle } : bundle
        );
      } else if (data.transactions && Array.isArray(data.transactions)) {
        return [{ transactions: data.transactions }];
      } else if (Array.isArray(data)) {
        return [{ transactions: data }];
      } else {
        throw new Error('No transactions returned from backend');
      }
    } catch (error) {
      console.error('Error getting unsigned transactions:', error);
      throw error;
    }
  };

  const signTransactions = (
    bundle: TransactionBundle,
    privateKeys: string[]
  ): TransactionBundle => {
    if (!bundle.transactions || !Array.isArray(bundle.transactions)) {
      console.error("Invalid bundle format:", bundle);
      return { transactions: [] };
    }

    const walletKeypairs = privateKeys.map(privateKey => 
      web3.Keypair.fromSecretKey(bs58.decode(privateKey))
    );

    const signedTransactions = bundle.transactions.map(txBase58 => {
      const txBuffer = bs58.decode(txBase58);
      const transaction = web3.VersionedTransaction.deserialize(txBuffer);
      
      const signers: web3.Keypair[] = [];
      for (const accountKey of transaction.message.staticAccountKeys) {
        const pubkeyStr = accountKey.toBase58();
        const matchingKeypair = walletKeypairs.find(
          kp => kp.publicKey.toBase58() === pubkeyStr
        );
        if (matchingKeypair && !signers.includes(matchingKeypair)) {
          signers.push(matchingKeypair);
        }
      }
      
      transaction.sign(signers);
      return bs58.encode(transaction.serialize());
    });
    
    return { transactions: signedTransactions };
  };

  const sendSignedTransactions = async (
    signedBundles: TransactionBundle[],
    useRpcSetting: boolean
  ): Promise<any> => {
    try {
      const baseUrl = (window as any).tradingServerUrl.replace(/\/+$/, '');
      const endpoint = '/api/transactions/send';
      
      const sendPromises = signedBundles.map(async (bundle) => {
        const response = await fetch(`${baseUrl}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transactions: bundle.transactions,
            useRpc: useRpcSetting
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        return response.json();
      });
      
      return Promise.all(sendPromises);
    } catch (error) {
      console.error('Error sending signed transactions:', error);
      throw error;
    }
  };

  const handleNext = () => {
    if (currentStep === 0 && selectedWallets.length === 0) {
      toast('Please select at least one wallet');
      return;
    }
    if (currentStep === 1) {
      const hasInvalidAmount = Object.values(walletAmounts).some(
        amount => !amount || parseFloat(amount) <= 0
      );
      
      if (hasInvalidAmount) {
        toast('Please enter valid amounts for all wallets');
        return;
      }
    }
    
    setCurrentStep((prev) => Math.min(prev + 1, STEPS_CUSTOMBUY.length - 1));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleCustomBuy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmed) return;
    setIsSubmitting(true);
    
    try {
      const walletAddresses = selectedWallets.map(privateKey => 
        getWalletAddressFromKey(privateKey)
      );
      
      const amounts = selectedWallets.map(wallet => parseFloat(walletAmounts[wallet]));
      
      const unsignedBundles = await getUnsignedTransactions(
        walletAddresses,
        amounts,
        useRpc
      );
      
      console.log(`Received ${unsignedBundles.length} unsigned transaction bundles`);
      
      const signedBundles = unsignedBundles.map(bundle => 
        signTransactions(bundle, selectedWallets)
      );
      
      console.log(`Signed ${signedBundles.length} transaction bundles`);
      
      const results = await sendSignedTransactions(signedBundles, useRpc);
      
      console.log('Transaction results:', results);
      
      toast('Custom buy operation completed successfully');
      resetForm();
      onClose();
      handleRefresh();
    } catch (error) {
      console.error('Custom buy execution error:', error);
      toast(`Custom buy operation failed`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleWalletSelection = (privateKey: string) => {
    setSelectedWallets(prev => {
      if (prev.includes(privateKey)) {
        return prev.filter(key => key !== privateKey);
      } else {
        return [...prev, privateKey];
      }
    });
  };

  const handleSelectAllWallets = () => {
    if (selectedWallets.length === filteredWallets.length) {
      setSelectedWallets([]);
    } else {
      setSelectedWallets(filteredWallets.map(w => w.privateKey));
    }
  };

  const handleWalletAmountChange = (wallet: string, value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setWalletAmounts(prev => ({
        ...prev,
        [wallet]: value
      }));
    }
  };

  const setAmountForAllWallets = () => {
    if (bulkAmount === '' || parseFloat(bulkAmount) <= 0) return;
    
    const newAmounts = { ...walletAmounts };
    
    selectedWallets.forEach(wallet => {
      newAmounts[wallet] = bulkAmount;
    });
    
    setWalletAmounts(newAmounts);
  };

  const calculateTotalBuyAmount = () => {
    return selectedWallets.reduce((total, wallet) => {
      return total + parseFloat(walletAmounts[wallet] || '0');
    }, 0).toFixed(4);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };
  
  const getWalletDisplayFromKey = (privateKey: string) => {
    const wallet = wallets.find(w => w.privateKey === privateKey);
    return wallet 
      ? formatAddress(wallet.address)
      : privateKey.slice(0, 8);
  };

  const getWalletBalance = (address: string): number => {
    return solBalances.has(address) ? (solBalances.get(address) ?? 0) : 0;
  };

  const getWalletTokenBalance = (address: string): number => {
    return tokenBalances.has(address) ? (tokenBalances.get(address) ?? 0) : 0;
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-5">
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary/10 mr-3">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-base font-semibold">
                Select Wallets
              </h3>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Token Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  <span className="text-muted-foreground">Address: </span>
                  {tokenAddress}
                </div>
              </CardContent>
            </Card>
              
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Available Wallets</CardTitle>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllWallets}
                  >
                    {selectedWallets.length === filteredWallets.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-3 flex space-x-2">
                  <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={14} />
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search wallets..."
                      className="pl-9"
                    />
                  </div>
                  
                  <Select value={sortOption} onValueChange={setSortOption}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="address">Address</SelectItem>
                      <SelectItem value="balance">SOL Balance</SelectItem>
                      <SelectItem value="tokenBalance">Token Balance</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                  >
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </Button>
                  
                  <Select value={balanceFilter} onValueChange={setBalanceFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Balances</SelectItem>
                      <SelectItem value="highBalance">High SOL</SelectItem>
                      <SelectItem value="lowBalance">Low SOL</SelectItem>
                      <SelectItem value="hasToken">Has Token</SelectItem>
                      <SelectItem value="noToken">No Token</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <ScrollArea className="h-64 rounded-md border">
                  {filteredWallets.length > 0 ? (
                    filteredWallets.map((wallet) => (
                      <div
                        key={wallet.id}
                        onClick={() => toggleWalletSelection(wallet.privateKey)}
                        className={`flex items-center p-2.5 hover:bg-muted/50 cursor-pointer transition-all border-b last:border-b-0
                                  ${selectedWallets.includes(wallet.privateKey) ? 'bg-primary/10' : ''}`}
                      >
                        <Checkbox 
                          checked={selectedWallets.includes(wallet.privateKey)}
                          className="mr-3"
                        />
                        <div className="flex-1 flex flex-col">
                          <span className="text-sm">{formatAddress(wallet.address)}</span>
                          <div className="flex items-center gap-3 mt-0.5">
                            <div className="flex items-center">
                              <DollarSign size={12} className="text-muted-foreground mr-1" />
                              <span className="text-xs text-muted-foreground">
                                {formatSolBalance(getWalletBalance(wallet.address) || 0)} SOL
                              </span>
                            </div>
                            <div className="flex items-center">
                              <Badge variant="secondary" className="text-xs">
                                {formatTokenBalance(tokenBalances.get(wallet.address))} TOKEN
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-sm text-muted-foreground text-center">
                      No wallets found matching filters
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
              <CardFooter className="text-xs">
                <span className="text-muted-foreground">
                  Selected: <span className="font-medium">{selectedWallets.length}</span> wallets
                </span>
              </CardFooter>
            </Card>
          </div>
        );
        
      case 1:
        return (
          <div className="space-y-5">
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary/10 mr-3">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-base font-semibold">
                Configure Buy
              </h3>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Set Amount For All Wallets (SOL)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Label>Amount per wallet</Label>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info size={14} className="text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        Amount in SOL to use for each wallet
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex items-center">
                    <div className="relative">
                      <DollarSign size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="text"
                        value={bulkAmount}
                        placeholder="0.1"
                        className="w-32 pl-8"
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || /^\d*\.?\d*$/.test(value)) {
                            setBulkAmount(value);
                          }
                        }}
                      />
                    </div>
                    <Button
                      type="button"
                      className="ml-2"
                      onClick={setAmountForAllWallets}
                    >
                      Apply to All
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Individual Wallet Amounts</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64 pr-1">
                  {selectedWallets.map((privateKey, index) => {
                    const address = getWalletAddressFromKey(privateKey);
                    const solBalance = getWalletBalance(address);
                    const tokenBalance = getWalletTokenBalance(address);
                    
                    return (
                      <div key={privateKey} className="flex items-center justify-between py-2 border-b last:border-b-0">
                        <div className="flex items-center">
                          <span className="text-muted-foreground text-xs mr-2 w-6">{index + 1}.</span>
                          <span className="text-sm">{getWalletDisplayFromKey(privateKey)}</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="flex flex-col items-end">
                            <span className="text-xs text-muted-foreground">SOL: {formatSolBalance(solBalance)}</span>
                            <span className="text-xs text-primary">TOKEN: {formatTokenBalance(tokenBalance)}</span>
                          </div>
                          <div className="flex items-center">
                            <div className="relative">
                              <DollarSign size={12} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                              <Input
                                type="text"
                                value={walletAmounts[privateKey] || '0.1'}
                                onChange={(e) => handleWalletAmountChange(privateKey, e.target.value)}
                                className="w-24 pl-7"
                                placeholder="0.1"
                              />
                            </div>
                            <span className="text-xs text-muted-foreground ml-2">SOL</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </ScrollArea>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Transaction Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Label>Use RPC</Label>
                  <Switch 
                    checked={useRpc}
                    onCheckedChange={setUseRpc}
                  />
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Toggle to use RPC for this transaction
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-primary/10 border-primary">
              <CardHeader>
                <CardTitle className="text-sm">Total Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Total Buy Amount:</span>
                  <span className="text-sm font-medium">
                    {calculateTotalBuyAmount()} SOL
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        );
        
      case 2:
        return (
          <div className="space-y-5">
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary/10 mr-3">
                <CheckCircle className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-base font-semibold">
                Review Operation
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Token Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm text-muted-foreground">
                          Address:
                        </span>
                        <span className="text-sm ml-2">
                          {`${tokenAddress.slice(0, 8)}...${tokenAddress.slice(-8)}`}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">
                          Symbol:
                        </span>
                        <span className="text-sm ml-2">
                          {tokenInfo?.symbol || 'UNKNOWN'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Operation Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between py-1.5 border-b">
                        <span className="text-sm text-muted-foreground">Use RPC: </span>
                        <span className="text-sm font-medium">{useRpc ? 'Yes' : 'No'}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b">
                        <span className="text-sm text-muted-foreground">Total Wallets: </span>
                        <span className="text-sm font-medium">{selectedWallets.length}</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-sm text-muted-foreground">Total Buy Amount: </span>
                        <span className="text-sm font-medium text-primary">
                          {calculateTotalBuyAmount()} SOL
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Confirmation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="confirm"
                        checked={isConfirmed}
                        onCheckedChange={() => setIsConfirmed}
                      />
                      <Label htmlFor="confirm" className="text-sm leading-relaxed">
                        I confirm that I want to buy {tokenInfo?.symbol || 'TOKEN'} using the specified amounts
                        across {selectedWallets.length} wallets with RPC set to {useRpc ? 'enabled' : 'disabled'}. 
                        This action cannot be undone.
                      </Label>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Selected Wallets</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-64 pr-1">
                      {selectedWallets.map((privateKey, index) => {
                        const address = getWalletAddressFromKey(privateKey);
                        const solBalance = getWalletBalance(address);
                        const tokenBalance = getWalletTokenBalance(address);
                        
                        return (
                          <div key={privateKey} className="flex justify-between py-1.5 border-b last:border-b-0">
                            <div className="flex items-center">
                              <span className="text-muted-foreground text-xs mr-2 w-6">{index + 1}.</span>
                              <div className="flex flex-col">
                                <span className="text-sm">{getWalletDisplayFromKey(privateKey)}</span>
                                <div className="flex space-x-2 text-xs">
                                  <span className="text-muted-foreground">SOL: {formatSolBalance(solBalance)}</span>
                                  <span className="text-primary">TOKEN: {formatTokenBalance(tokenBalance)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-end justify-center">
                              <span className="text-primary font-medium">{walletAmounts[privateKey]} SOL</span>
                            </div>
                          </div>
                        );
                      })}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return(
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <DollarSign className="w-5 h-5 mr-2 text-primary" />
            Custom Buy
          </DialogTitle>
          <DialogDescription>
            Configure a custom buy operation for multiple wallets
          </DialogDescription>
        </DialogHeader>
        
        <Progress 
          value={(currentStep + 1) / STEPS_CUSTOMBUY.length * 100} 
          className="h-1"
        />
        
        <form onSubmit={
          currentStep === STEPS_CUSTOMBUY.length - 1
            ? handleCustomBuy
            : (e) => e.preventDefault()
        }>
          {renderStepContent()}
          
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={currentStep === 0 ? onClose : handleBack}
              disabled={isSubmitting}
            >
              {currentStep === 0 ? 'Cancel' : 'Back'}
            </Button>
            <Button
              type={currentStep === STEPS_CUSTOMBUY.length - 1 ? 'submit' : 'button'}
              onClick={currentStep === STEPS_CUSTOMBUY.length - 1 ? undefined : handleNext}
              disabled={
                isSubmitting ||
                (currentStep === STEPS_CUSTOMBUY.length - 1 && !isConfirmed)
              }
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-background border-t-transparent animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  {currentStep === STEPS_CUSTOMBUY.length - 1 ? 'Confirm Operation' : (
                    <span className="flex items-center">
                      Next
                      <ChevronRight className="ml-1" size={16} />
                    </span>
                  )}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};