import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, ChevronLeft, ChevronRight, Info, Search, X, ArrowDown } from 'lucide-react';
import { getWallets } from '@/lib/utils/Utils';
import { loadConfigFromCookies } from '@/lib/utils/Utils';
import * as web3 from '@solana/web3.js';
import bs58 from 'bs58';
import { sendToJitoBundleService } from '@/lib/utils/jitoService';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const STEPS_BURN = ['Select Source', 'Burn Details', 'Review'];

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BurnModalProps extends BaseModalProps {
  onBurn: (amount: string) => void;
  handleRefresh: () => void;
  tokenAddress: string;
  solBalances: Map<string, number>;
  tokenBalances: Map<string, number>;
}

export const BurnModal: React.FC<BurnModalProps> = ({
  isOpen,
  onClose,
  onBurn,
  handleRefresh,
  tokenAddress,
  solBalances,
  tokenBalances
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [sourceWallet, setSourceWallet] = useState<string>('');
  const [tokenAccounts, setTokenAccounts] = useState<Array<{
    mint: string;
    balance: number;
    symbol: string;
  }>>([]);
  const [amount, setAmount] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState('address');
  const [sortDirection, setSortDirection] = useState('asc');
  const [balanceFilter, setBalanceFilter] = useState('all');

  const wallets = getWallets();

  useEffect(() => {
    if (isOpen) {
      handleRefresh();
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setCurrentStep(0);
    setSourceWallet('');
    setAmount('');
    setIsConfirmed(false);
    setSearchTerm('');
    setSortOption('address');
    setSortDirection('asc');
    setBalanceFilter('all');
  };

  useEffect(() => {
    const fetchTokenAccounts = async () => {
      if (!sourceWallet) return;
      
      setIsLoadingTokens(true);
      try {
        const savedConfig = loadConfigFromCookies();
        const rpcurl = (savedConfig as any).rpcEndpoint;
        const connection = new web3.Connection(rpcurl);

        const keypair = web3.Keypair.fromSecretKey(
          bs58.decode(sourceWallet)
        );
        const publicKey = keypair.publicKey;
              
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
          publicKey,
          {
            programId: new web3.PublicKey('B4dn3WWS95M4qNXaR5NTdkNzhzvTZVqC13E3eLrWhXLa'),
          }
        );

        const transformedAccounts = await Promise.all(tokenAccounts.value.map(async (account) => {
          const parsedInfo = account.account.data.parsed.info;
          const mintAddress = parsedInfo.mint;
          const balance = parsedInfo.tokenAmount.uiAmount;

          return {
            mint: mintAddress,
            balance: balance,
            symbol: mintAddress.slice(0, 4)
          };
        }));

        setTokenAccounts(transformedAccounts.filter(account => account.balance > 0));
      } catch (error) {
        console.error('Error fetching token accounts:', error);
        toast("Failed to fetch token accounts");
      } finally {
        setIsLoadingTokens(false);
      }
    };

    fetchTokenAccounts();
  }, [sourceWallet]);

  const handleNext = () => {
    if (currentStep === 0 && !sourceWallet) {
      toast("Please select source wallet");
      return;
    }
    
    if (currentStep === 1) {
      if (!amount || parseFloat(amount) <= 0) {
        toast("Please enter a valid amount");
        return;
      }
    }
    
    setCurrentStep(prev => Math.min(prev + 1, STEPS_BURN.length - 1));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleBurn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmed) return;

    setIsSubmitting(true);
    try {
      const walletKeypair = web3.Keypair.fromSecretKey(
        bs58.decode(sourceWallet)
      );
      
      const baseUrl = (window as any).tradingServerUrl.replace(/\/+$/, '');
      
      const prepareResponse = await fetch(`${baseUrl}/api/tokens/burn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletPublicKey: walletKeypair.publicKey.toString(),
          tokenAddress: tokenAddress,
          amount: amount
        }),
      });

      if (!prepareResponse.ok) {
        const errorData = await prepareResponse.json();
        throw new Error(errorData.error || `Failed to prepare transaction: HTTP ${prepareResponse.status}`);
      }

      const prepareResult = await prepareResponse.json();
      
      if (!prepareResult.success) {
        throw new Error(prepareResult.error || 'Failed to prepare transaction');
      }

      const transactionData = prepareResult.data;
      const transactionBuffer = bs58.decode(transactionData.transaction);
      
      const transaction = web3.VersionedTransaction.deserialize(transactionBuffer);
      transaction.sign([walletKeypair]);
      
      const signedTransactionBuffer = transaction.serialize();
      const signedTransactionBs58 = bs58.encode(signedTransactionBuffer);

      try {
        const submitResult = await sendToJitoBundleService(signedTransactionBs58);
        console.log('Transaction successfully submitted to Jito:', submitResult);
      } catch (error) {
        console.error('Error submitting transaction:', error);
        throw new Error(`Failed to submit transaction`);
      }

      toast("Token burn completed successfully");
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error:', error);
      toast(`Token burn failed`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const getWalletByAddress = (address: string) => {
    return wallets.find(wallet => wallet.address === address);
  };

  const getSelectedTokenBalance = () => {
    return tokenAccounts.find(t => t.mint === tokenAddress)?.balance || 0;
  };

  const getSelectedTokenSymbol = () => {
    return tokenAccounts.find(t => t.mint === tokenAddress)?.symbol || 'TKN';
  };

  const filterWallets = (walletList: any[], search: string) => {
    let filtered = walletList.filter(wallet => 
      (tokenBalances.get(wallet.address) || 0) > 0
    );
    
    if (search) {
      filtered = filtered.filter(wallet => 
        wallet.address.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    if (balanceFilter !== 'all') {
      if (balanceFilter === 'nonZero') {
        filtered = filtered.filter(wallet => 
          (solBalances.get(wallet.address) || 0) > 0 || 
          (tokenBalances.get(wallet.address) || 0) > 0
        );
      } else if (balanceFilter === 'highBalance') {
        filtered = filtered.filter(wallet => 
          (solBalances.get(wallet.address) || 0) >= 0.1 || 
          (tokenBalances.get(wallet.address) || 0) >= 10
        );
      } else if (balanceFilter === 'lowBalance') {
        filtered = filtered.filter(wallet => 
          ((solBalances.get(wallet.address) || 0) < 0.1 && (solBalances.get(wallet.address) || 0) > 0) ||
          ((tokenBalances.get(wallet.address) || 0) < 10 && (tokenBalances.get(wallet.address) || 0) > 0)
        );
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
        const tokenBalanceA = tokenBalances.get(a.address) || 0;
        const tokenBalanceB = tokenBalances.get(b.address) || 0;
        return sortDirection === 'asc' ? tokenBalanceA - tokenBalanceB : tokenBalanceB - tokenBalanceA;
      }
      return 0;
    });
  };

  if (!isOpen) return null;

  return createPortal(
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <ArrowDown className="w-5 h-5 mr-2 text-primary" />
            <span className="font-mono">BURN PROTOCOL</span>
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Permanently destroy tokens from a wallet
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Progress 
            value={((currentStep + 1) / STEPS_BURN.length) * 100} 
            className="h-1"
          />

          {/* Step Indicator */}
          <div className="flex w-full mb-6 relative">
            {STEPS_BURN.map((step, index) => (
              <React.Fragment key={step}>
                <div className="flex-1 flex flex-col items-center relative z-10">
                  <div className={cn(
                    "w-8 h-8 rounded-full font-mono flex items-center justify-center border-2 transition-all duration-300",
                    index < currentStep 
                      ? 'border-primary bg-primary text-primary-foreground' 
                      : index === currentStep 
                        ? 'border-primary text-primary bg-background' 
                        : 'border-muted text-muted-foreground bg-background'
                  )}>
                    {index < currentStep ? (
                      <CheckCircle size={16} />
                    ) : (
                      <span className="text-sm">{index + 1}</span>
                    )}
                  </div>
                  
                  <span className={cn(
                    "mt-2 text-xs transition-all duration-300 font-mono tracking-wide",
                    index <= currentStep ? 'text-foreground' : 'text-muted-foreground'
                  )}>
                    {step}
                  </span>
                </div>
                
                {index < STEPS_BURN.length - 1 && (
                  <div className="flex-1 flex items-center justify-center relative -mx-1 pb-8 z-0">
                    <div className="h-px w-full bg-muted relative">
                      <div 
                        className="absolute top-0 left-0 h-full bg-primary transition-all duration-500"
                        style={{ width: index < currentStep ? '100%' : '0%' }}
                      ></div>
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>

          <form onSubmit={currentStep === STEPS_BURN.length - 1 ? handleBurn : (e) => e.preventDefault()}>
            {/* Step 1: Select Source Wallet */}
            {currentStep === 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-1 rounded-full bg-primary/10">
                      <Search className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="font-medium font-mono">SELECT SOURCE</h3>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search wallets..."
                      className="pl-9"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
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
                </div>

                <Select 
                  value={balanceFilter} 
                  onValueChange={setBalanceFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by balance" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All wallets</SelectItem>
                    <SelectItem value="nonZero">Non-zero balance</SelectItem>
                    <SelectItem value="highBalance">High balance</SelectItem>
                    <SelectItem value="lowBalance">Low balance</SelectItem>
                  </SelectContent>
                </Select>

                <Card>
                  <ScrollArea className="h-64 rounded-md border">
                    {filterWallets(wallets, searchTerm).length > 0 ? (
                      filterWallets(wallets, searchTerm).map((wallet) => (
                        <div 
                          key={wallet.id}
                          className={cn(
                            "flex items-center p-3 cursor-pointer border-b transition-all duration-150 hover:bg-accent",
                            sourceWallet === wallet.privateKey 
                              ? 'bg-primary/10 border-l-2 border-l-primary' 
                              : 'border-l-2 border-l-transparent hover:border-l-primary/50'
                          )}
                          onClick={() => setSourceWallet(wallet.privateKey)}
                        >
                          <div className={cn(
                            "w-4 h-4 mr-3 rounded-full flex items-center justify-center transition-all duration-200",
                            sourceWallet === wallet.privateKey
                              ? 'bg-primary' 
                              : 'border border-primary/50'
                          )}>
                            {sourceWallet === wallet.privateKey && (
                              <CheckCircle size={10} className="text-primary-foreground" />
                            )}
                          </div>
                          <div className="flex-1 flex justify-between items-center">
                            <span className="font-mono text-sm">{formatAddress(wallet.address)}</span>
                            <div className="flex flex-col items-end">
                              <span className="text-xs text-muted-foreground font-mono">
                                {(solBalances.get(wallet.address) || 0).toFixed(4)} SOL
                              </span>
                              {(tokenBalances.get(wallet.address) || 0) > 0 && (
                                <span className="text-xs text-primary font-mono">
                                  {(tokenBalances.get(wallet.address) || 0).toFixed(4)} {tokenAddress.slice(0, 4)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-sm text-muted-foreground text-center font-mono">
                        {searchTerm 
                          ? "No matching wallets found" 
                          : "No wallets available"}
                      </div>
                    )}
                  </ScrollArea>
                </Card>

                {sourceWallet && (
                  <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="p-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-primary font-mono tracking-wide">Selected Wallet</span>
                        <Badge variant="secondary" className="font-mono">
                          {formatAddress(wallets.find(w => w.privateKey === sourceWallet)?.address || '')}
                        </Badge>
                      </div>
                      
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-sm text-muted-foreground font-mono">Balances</span>
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-mono">
                            {(solBalances.get(wallets.find(w => w.privateKey === sourceWallet)?.address || '') || 0).toFixed(4)} SOL
                          </span>
                          <span className="text-sm text-primary font-mono">
                            {(tokenBalances.get(wallets.find(w => w.privateKey === sourceWallet)?.address || '') || 0).toFixed(4)} {tokenAddress.slice(0, 4)}
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                )}
              </div>
            )}

            {/* Step 2: Enter Burn Amount */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="flex items-center space-x-2">
                  <div className="p-1 rounded-full bg-primary/10">
                    <ChevronRight className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="font-medium font-mono">BURN AMOUNT</h3>
                </div>

                {isLoadingTokens ? (
                  <div className="flex justify-center items-center h-32">
                    <div className="relative h-12 w-12">
                      <div className="absolute inset-0 rounded-full border-2 border-t-primary border-r-primary/30 border-b-primary/10 border-l-primary/30 animate-spin"></div>
                      <div className="absolute inset-2 rounded-full border-2 border-t-transparent border-r-primary/70 border-b-primary/50 border-l-transparent animate-spin-slow"></div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Card>
                      <CardHeader className="p-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-mono">Selected Token</span>
                          {tokenAccounts.find(t => t.mint === tokenAddress) ? (
                            <div className="flex items-center">
                              <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mr-2">
                                <span className="text-xs text-primary font-mono">
                                  {getSelectedTokenSymbol()[0] || 'T'}
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-mono">
                                  {getSelectedTokenSymbol()}
                                </span>
                                <span className="text-xs text-muted-foreground font-mono">
                                  BAL: {getSelectedTokenBalance()}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground font-mono">
                              {tokenAddress.slice(0, 6)}...{tokenAddress.slice(-4)}
                            </span>
                          )}
                        </div>
                      </CardHeader>
                    </Card>

                    <Card>
                      <CardHeader className="p-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-mono">Source Wallet</span>
                          <div className="flex items-center">
                            <div className="w-6 h-6 rounded-full bg-background border border-primary/20 flex items-center justify-center mr-2">
                              <Search className="w-3 h-3 text-primary" />
                            </div>
                            <span className="text-sm font-mono">
                              {formatAddress(wallets.find(w => w.privateKey === sourceWallet)?.address || '')}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-sm text-muted-foreground font-mono">Balances</span>
                          <div className="flex flex-col items-end">
                            <span className="text-sm font-mono">
                              {(solBalances.get(wallets.find(w => w.privateKey === sourceWallet)?.address || '') || 0).toFixed(4)} SOL
                            </span>
                            <span className="text-sm text-primary font-mono">
                              {(tokenBalances.get(wallets.find(w => w.privateKey === sourceWallet)?.address || '') || 0).toFixed(4)} {tokenAddress.slice(0, 4)}
                            </span>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Label className="text-sm font-medium font-mono">
                            Burn Amount
                          </Label>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info size={14} className="text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="font-mono">
                              This amount will be permanently destroyed
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        {tokenAccounts.find(t => t.mint === tokenAddress) && (
                          <Button
                            type="button"
                            onClick={() => setAmount(getSelectedTokenBalance().toString())}
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                          >
                            MAX
                          </Button>
                        )}
                      </div>
                      <div className="relative">
                        <Input
                          type="text"
                          value={amount}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || /^\d*\.?\d*$/.test(value)) {
                              setAmount(value);
                            }
                          }}
                          placeholder="Enter amount to burn"
                          className="w-full pr-16"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-primary font-mono">
                          {getSelectedTokenSymbol()}
                        </div>
                      </div>
                    </div>

                    {amount && parseFloat(amount) > 0 && (
                      <Card className="relative">
                        <CardHeader className="p-4">
                          <div className="absolute top-0 right-0 p-1 bg-background border-l border-b border-primary/20 text-primary text-xs font-mono">
                            Burn Preview
                          </div>
                          
                          <div className="flex justify-between items-center mt-4">
                            <span className="text-sm text-muted-foreground font-mono">Burn Amount</span>
                            <span className="text-sm font-semibold text-primary font-mono">
                              {amount} {getSelectedTokenSymbol()}
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-sm text-muted-foreground font-mono">Current Balance</span>
                            <span className="text-sm font-mono">{getSelectedTokenBalance()} {getSelectedTokenSymbol()}</span>
                          </div>
                          
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-sm text-muted-foreground font-mono">Balance After Burn</span>
                            <span className="text-sm font-mono">
                              {Math.max(0, getSelectedTokenBalance() - parseFloat(amount)).toFixed(4)} {getSelectedTokenSymbol()}
                            </span>
                          </div>
                          
                          <div className="mt-4 h-2 bg-secondary rounded-lg overflow-hidden">
                            <div 
                              className="h-full bg-primary transition-all duration-500"
                              style={{ 
                                width: `${Math.min(100, (parseFloat(amount) / getSelectedTokenBalance()) * 100)}%` 
                              }}
                            ></div>
                          </div>
                          <div className="mt-1 flex justify-between text-xs text-muted-foreground font-mono">
                            <span>0</span>
                            <span>{getSelectedTokenBalance()}</span>
                          </div>
                        </CardHeader>
                      </Card>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Review and Confirm */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="flex items-center space-x-2">
                  <div className="p-1 rounded-full bg-primary/10">
                    <CheckCircle className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="font-medium font-mono">REVIEW BURN</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm font-mono">Burn Summary</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground font-mono">Token</span>
                          <div className="flex items-center">
                            <div className="w-5 h-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mr-2">
                              <span className="text-xs text-primary font-mono">
                                {getSelectedTokenSymbol()[0] || 'T'}
                              </span>
                            </div>
                            <span className="text-sm font-mono">{getSelectedTokenSymbol()}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground font-mono">Token Address</span>
                          <span className="text-sm font-mono">
                            {tokenAddress.slice(0, 6)}...{tokenAddress.slice(-4)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground font-mono">Source</span>
                          <span className="text-sm font-mono">
                            {formatAddress(wallets.find(w => w.privateKey === sourceWallet)?.address || '')}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground font-mono">Balance</span>
                          <span className="text-sm font-mono">{getSelectedTokenBalance()} {getSelectedTokenSymbol()}</span>
                        </div>
                        
                        <div className="pt-2 border-t border-primary/20 flex items-center justify-between">
                          <span className="text-sm font-medium font-mono">Burn Amount</span>
                          <span className="text-sm font-semibold text-primary font-mono">
                            {amount} {getSelectedTokenSymbol()}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground font-mono">New Balance</span>
                          <span className="text-sm font-mono">
                            {Math.max(0, getSelectedTokenBalance() - parseFloat(amount)).toFixed(4)} {getSelectedTokenSymbol()}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-destructive/5 border-destructive/20">
                      <CardHeader className="p-4">
                        <div className="flex items-start text-destructive text-sm">
                          <Info className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                          <span className="font-mono leading-relaxed">
                            <span className="font-bold">WARNING:</span> This burn operation is permanent and irreversible. The tokens will be destroyed from the blockchain.
                          </span>
                        </div>
                      </CardHeader>
                    </Card>
                  </div>
                  
                  <Card className="relative">
                    <div className="absolute top-0 right-0 w-16 h-16 border-t border-r border-primary/20"></div>
                    <div className="absolute bottom-0 left-0 w-16 h-16 border-b border-l border-primary/20"></div>
                    
                    <CardHeader>
                      <CardTitle className="text-sm font-mono">Burn Effect</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center h-44 space-y-6">
                      <div className="flex items-center justify-center w-full">
                        <div className="flex flex-col items-center">
                          <span className="text-sm text-muted-foreground mb-1 font-mono">Current</span>
                          <div className="text-lg font-semibold font-mono">
                            {getSelectedTokenBalance()} {getSelectedTokenSymbol()}
                          </div>
                        </div>
                      </div>
                      
                      <div className="relative">
                        <ArrowDown size={24} className="text-primary" />
                      </div>
                      
                      <div className="flex items-center justify-center w-full">
                        <div className="flex flex-col items-center">
                          <span className="text-sm text-muted-foreground mb-1 font-mono">After Burn</span>
                          <div className="text-lg font-semibold text-primary font-mono">
                            {Math.max(0, getSelectedTokenBalance() - parseFloat(amount)).toFixed(4)} {getSelectedTokenSymbol()}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="relative mt-1">
                        <Checkbox 
                          id="confirm" 
                          checked={isConfirmed} 
                          onCheckedChange={(checked) => setIsConfirmed(checked as boolean)}
                        />
                      </div>
                      <Label htmlFor="confirm" className="text-sm leading-relaxed cursor-pointer font-mono">
                        I confirm that I want to burn {amount} {getSelectedTokenSymbol()}. I understand this action cannot be undone and the tokens will be permanently removed from circulation.
                      </Label>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="flex justify-between mt-8">
              <Button
                variant="outline"
                onClick={currentStep === 0 ? onClose : handleBack}
                disabled={isSubmitting}
              >
                {currentStep === 0 ? (
                  <span className="font-mono">Cancel</span>
                ) : (
                  <div className="flex items-center font-mono">
                    <ChevronLeft size={16} className="mr-1" />
                    Back
                  </div>
                )}
              </Button>

              <Button
                type={currentStep === STEPS_BURN.length - 1 ? 'submit' : 'button'}
                onClick={currentStep === STEPS_BURN.length - 1 ? undefined : handleNext}
                disabled={
                  isSubmitting || 
                  (currentStep === 0 && !sourceWallet) ||
                  (currentStep === 1 && (!amount || parseFloat(amount) <= 0)) ||
                  (currentStep === STEPS_BURN.length - 1 && !isConfirmed)
                }
              >
                {currentStep === STEPS_BURN.length - 1 ? (
                  isSubmitting ? (
                    <div className="flex items-center justify-center font-mono">
                      <div className="h-4 w-4 rounded-full border-2 border-muted border-t-primary animate-spin mr-2"></div>
                      <span>Processing...</span>
                    </div>
                  ) : (
                    <span>Confirm Burn</span>
                  )
                ) : (
                  <div className="flex items-center font-mono">
                    <span>Next</span>
                    <ChevronRight size={16} className="ml-1" />
                  </div>
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>,
    document.body
  );
};