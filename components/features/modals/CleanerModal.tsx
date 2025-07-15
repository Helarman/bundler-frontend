import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, ChevronRight, X, DollarSign, Info, Search, Settings, ArrowDown, Trash2, Plus, PlusCircle } from 'lucide-react';
import { getWallets } from '@/lib/utils/Utils';
import { executeCleanerOperation, validateCleanerInputs, WalletInfo } from '@/lib/utils/cleaner';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const STEPS_BUYSELL = ['Configure Sellers', 'Configure Buyers', 'Review'];

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CleanerTokensModalProps extends BaseModalProps {
  onCleanerTokens: (data: any) => void;
  handleRefresh: () => void;
  tokenAddress: string;
  solBalances: Map<string, number>;
  tokenBalances: Map<string, number>;
}

interface SellerConfig {
  privateKey: string;
  sellPercentage: string;
  buyers: BuyerConfig[];
}

interface BuyerConfig {
  privateKey: string;
  buyPercentage: string;
}

export const CleanerTokensModal: React.FC<CleanerTokensModalProps> = ({
  isOpen,
  onClose,
  onCleanerTokens,
  handleRefresh,
  tokenAddress,
  solBalances,
  tokenBalances
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [sellers, setSellers] = useState<SellerConfig[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [sellerSearchTerm, setSellerSearchTerm] = useState('');
  const [buyerSearchTerm, setBuyerSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState('address');
  const [sortDirection, setSortDirection] = useState('asc');
  const [balanceFilter, setBalanceFilter] = useState('all');
  const [currentSellerIndex, setCurrentSellerIndex] = useState(0);

  const wallets = getWallets();

  useEffect(() => {
    if (isOpen) {
      handleRefresh();
      resetForm();
    }
  }, [isOpen]);

  // Utility functions (keep the same logic as before)
  const formatAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;
  const formatSolBalance = (balance: number) => balance.toFixed(4);
  const formatTokenBalance = (balance: number) => balance.toFixed(6);
  const getWalletBalance = (address: string) => solBalances.has(address) ? solBalances.get(address) : 0;
  const getWalletTokenBalance = (address: string) => tokenBalances.has(address) ? tokenBalances.get(address) : 0;
  const hasInsufficientSOL = (address: string) => (getWalletBalance(address) || 0) < 0.01;
  const getAvailableSellerWallets = () => wallets.filter(wallet => 
    !sellers.map(seller => seller.privateKey).includes(wallet.privateKey) && 
    (getWalletTokenBalance(wallet.address) || 0) > 0
  );
  const getAvailableBuyerWallets = (sellerPrivateKey: string) => wallets.filter(wallet => wallet.privateKey !== sellerPrivateKey);
  const getWalletByPrivateKey = (privateKey: string) => wallets.find(wallet => wallet.privateKey === privateKey);

  const filterWallets = (walletList: any[], search: string) => {
    let filtered = walletList;
    if (search) {
      filtered = filtered.filter(wallet => 
        wallet.address.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    if (balanceFilter !== 'all') {
      if (balanceFilter === 'nonZero') {
        filtered = filtered.filter(wallet => (getWalletBalance(wallet.address) || 0) > 0);
      } else if (balanceFilter === 'highBalance') {
        filtered = filtered.filter(wallet => (getWalletBalance(wallet.address) || 0) >= 0.1);
      } else if (balanceFilter === 'lowBalance') {
        filtered = filtered.filter(wallet => (getWalletBalance(wallet.address) || 0) < 0.1 && (getWalletBalance(wallet.address) || 0) > 0);
      } else if (balanceFilter === 'hasTokens') {
        filtered = filtered.filter(wallet => (getWalletTokenBalance(wallet.address) || 0) > 0);
      }
    }
    
    return filtered.sort((a, b) => {
      if (sortOption === 'address') {
        return sortDirection === 'asc' 
          ? a.address.localeCompare(b.address)
          : b.address.localeCompare(a.address);
      } else if (sortOption === 'balance') {
        const balanceA = getWalletBalance(a.address) || 0;
        const balanceB = getWalletBalance(b.address) || 0;
        return sortDirection === 'asc' ? balanceA - balanceB : balanceB - balanceA;
      } else if (sortOption === 'tokenBalance') {
        const tokenBalanceA = getWalletTokenBalance(a.address) || 0;
        const tokenBalanceB = getWalletTokenBalance(b.address) || 0;
        return sortDirection === 'asc' ? tokenBalanceA - tokenBalanceB : tokenBalanceB - tokenBalanceA;
      }
      return 0;
    });
  };

  // State management functions (keep the same logic as before)
  const addSeller = (privateKey: string) => {
    setSellers([...sellers, {
      privateKey,
      sellPercentage: '100',
      buyers: []
    }]);
  };

  const updateSellerPercentage = (index: number, percentage: string) => {
    const updatedSellers = [...sellers];
    updatedSellers[index].sellPercentage = percentage;
    setSellers(updatedSellers);
  };

  const removeSeller = (index: number) => {
    const updatedSellers = [...sellers];
    updatedSellers.splice(index, 1);
    setSellers(updatedSellers);
  };

  const addBuyer = (sellerIndex: number, buyerPrivateKey: string) => {
    const updatedSellers = [...sellers];
    updatedSellers[sellerIndex].buyers.push({
      privateKey: buyerPrivateKey,
      buyPercentage: '100'
    });
    setSellers(updatedSellers);
  };

  const updateBuyerPercentage = (sellerIndex: number, buyerIndex: number, percentage: string) => {
    const updatedSellers = [...sellers];
    updatedSellers[sellerIndex].buyers[buyerIndex].buyPercentage = percentage;
    setSellers(updatedSellers);
  };

  const removeBuyer = (sellerIndex: number, buyerIndex: number) => {
    const updatedSellers = [...sellers];
    updatedSellers[sellerIndex].buyers.splice(buyerIndex, 1);
    setSellers(updatedSellers);
  };

  const handleNext = () => {
    if (currentStep === 0) {
      if (sellers.length === 0) {
        toast('Please add at least one seller');
        return;
      }
      
      const invalidSeller = sellers.find(
        seller => !seller.sellPercentage || 
                  parseFloat(seller.sellPercentage) <= 0 || 
                  parseFloat(seller.sellPercentage) > 100
      );
      
      if (invalidSeller) {
        toast('Please enter valid sell percentages (1-100) for all sellers');
        return;
      }
      
      const lowSOLSeller = sellers.find(
        seller => hasInsufficientSOL(getWalletByPrivateKey(seller.privateKey)?.address || '')
      );

      if (lowSOLSeller) {
        toast('One or more sellers have insufficient SOL balance');
        return;
      }
    }
    
    if (currentStep === 1) {
      const sellerWithoutBuyers = sellers.findIndex(seller => seller.buyers.length === 0);
      if (sellerWithoutBuyers !== -1) {
        toast(`Please add at least one buyer for seller ${sellerWithoutBuyers + 1}`);
        return;
      }
      
      for (let i = 0; i < sellers.length; i++) {
        const invalidBuyer = sellers[i].buyers.find(
          buyer => !buyer.buyPercentage || 
                   parseFloat(buyer.buyPercentage) <= 0 || 
                   parseFloat(buyer.buyPercentage) > 100
        );
        
        if (invalidBuyer) {
          toast(`Please enter valid buy percentages (1-100) for all buyers of seller ${i + 1}`);
          return;
        }
      }
    }
    
    setCurrentStep((prev) => Math.min(prev + 1, STEPS_BUYSELL.length - 1));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleBuySell = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmed) return;
    
    const lowSOLSeller = sellers.find(
      seller => hasInsufficientSOL(getWalletByPrivateKey(seller.privateKey)?.address || '')
    );

    if (lowSOLSeller) {
      toast('Cannot proceed: One or more sellers have insufficient SOL balance');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      let successCount = 0;
      let failCount = 0;
      
      for (const seller of sellers) {
        const buyerCount = seller.buyers.length;
        const sellerPercentage = parseFloat(seller.sellPercentage);
        
        const sellerWallet = getWalletByPrivateKey(seller.privateKey);
        if (!sellerWallet) {
          console.error('Seller wallet not found');
          failCount++;
          continue;
        }
        
        for (let buyerIndex = 0; buyerIndex < buyerCount; buyerIndex++) {
          const buyer = seller.buyers[buyerIndex];
          
          const buyerWallet = getWalletByPrivateKey(buyer.privateKey);
          if (!buyerWallet) {
            console.error('Buyer wallet not found');
            failCount++;
            continue;
          }
          
          const adjustedSellPercentage = sellerPercentage / buyerCount;
          
          const sellerWalletInfo: WalletInfo = {
            address: sellerWallet.address,
            privateKey: seller.privateKey
          };
          
          const buyerWalletInfo: WalletInfo = {
            address: buyerWallet.address,
            privateKey: buyer.privateKey
          };
          
          const tokenBalance = getWalletTokenBalance(sellerWallet.address) || 0;
          const validation = validateCleanerInputs(
            sellerWalletInfo,
            buyerWalletInfo,
            tokenAddress,
            adjustedSellPercentage,
            parseFloat(buyer.buyPercentage),
            tokenBalance
          );
          
          if (!validation.valid) {
            console.error(`Validation error: ${validation.error}`);
            failCount++;
            continue;
          }
          
          try {
            if (successCount > 0 || failCount > 0) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            const result = await executeCleanerOperation(
              sellerWalletInfo,
              buyerWalletInfo,
              tokenAddress,
              adjustedSellPercentage,
              parseFloat(buyer.buyPercentage)
            );
            
            if (result.success) {
              successCount++;
            } else {
              console.error('Operation failed:', result.error);
              failCount++;
            }
          } catch (error) {
            console.error('Operation execution error:', error);
            failCount++;
          }
        }
      }
      
      if (failCount === 0) {
        toast(`All ${successCount} operations completed successfully`);
      } else if (successCount === 0) {
        toast(`All ${failCount} operations failed`);
      } else {
        toast(`${successCount} operations succeeded, ${failCount} failed`);
      }
      
      resetForm();
      onClose();
    } catch (error) {
      console.error('Operation error:', error);
      toast('Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSellers([]);
    setIsConfirmed(false);
    setCurrentStep(0);
    setSellerSearchTerm('');
    setBuyerSearchTerm('');
    setSortOption('address');
    setSortDirection('asc');
    setBalanceFilter('all');
    setCurrentSellerIndex(0);
  };

  const getTotalOperationsCount = () => {
    return sellers.reduce((count, seller) => count + seller.buyers.length, 0);
  };

  if (!isOpen) return null;

  return  (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-6xl bg-background border-primary/20">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <ArrowDown className="w-5 h-5 mr-2 text-primary" />
            <span className="font-mono">MULTI-WALLET TOKEN OPERATIONS</span>
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Configure sellers and buyers for token operations
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Progress 
            value={((currentStep + 1) / STEPS_BUYSELL.length) * 100} 
            className="h-1"
          />

          <form onSubmit={currentStep === STEPS_BUYSELL.length - 1 ? handleBuySell : (e) => e.preventDefault()}>
            {/* Step 0: Configure Sellers */}
            {currentStep === 0 && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <div className="p-1 rounded-full bg-primary/10">
                    <Settings className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="font-medium font-mono">CONFIGURE SELLERS</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Seller Selection */}
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-sm font-mono">AVAILABLE SELLERS</CardTitle>
                        <div className="flex items-center space-x-2">
                          <Select value={sortOption} onValueChange={setSortOption}>
                            <SelectTrigger className="w-[120px] h-8 text-xs">
                              <SelectValue placeholder="Sort by" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="address">Address</SelectItem>
                              <SelectItem value="balance">SOL</SelectItem>
                              <SelectItem value="tokenBalance">Tokens</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                          >
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search wallets..."
                          className="pl-9"
                          value={sellerSearchTerm}
                          onChange={(e) => setSellerSearchTerm(e.target.value)}
                        />
                      </div>
                      
                      <Select value={balanceFilter} onValueChange={setBalanceFilter}>
                        <SelectTrigger className="w-full mb-3">
                          <SelectValue placeholder="Filter by balance" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All wallets</SelectItem>
                          <SelectItem value="nonZero">Non-zero SOL</SelectItem>
                          <SelectItem value="highBalance">High SOL (≥0.1)</SelectItem>
                          <SelectItem value="lowBalance">Low SOL (&lt;0.1)</SelectItem>
                          <SelectItem value="hasTokens">Has tokens</SelectItem>
                        </SelectContent>
                      </Select>

                      <ScrollArea className="h-60 rounded-md border">
                        {filterWallets(getAvailableSellerWallets(), sellerSearchTerm).length > 0 ? (
                          filterWallets(getAvailableSellerWallets(), sellerSearchTerm).map((wallet) => (
                            <div
                              key={wallet.id}
                              onClick={() => addSeller(wallet.privateKey)}
                              className="p-2 hover:bg-accent cursor-pointer border-b"
                            >
                              <div className="flex justify-between items-center">
                                <div className="flex items-center">
                                  <Plus className="w-4 h-4 mr-2 text-primary" />
                                  <span className="font-mono text-sm">
                                    {formatAddress(wallet.address)}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className={`text-xs ${
                                    hasInsufficientSOL(wallet.address) ? 'text-destructive' : 'text-muted-foreground'
                                  } font-mono`}>
                                    {formatSolBalance(getWalletBalance(wallet.address) || 0)} SOL
                                  </span>
                                  <span className="text-xs text-primary font-mono">
                                    {formatTokenBalance(getWalletTokenBalance(wallet.address) || 0)} TOKENS
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            {sellerSearchTerm ? "No wallets found" : "No wallets available with token balance"}
                          </div>
                        )}
                      </ScrollArea>
                    </CardContent>
                  </Card>
                  
                  {/* Selected Sellers */}
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-sm font-mono">SELECTED SELLERS</CardTitle>
                        <span className="text-xs text-muted-foreground font-mono">
                          {sellers.length} SELLER(S)
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-60 rounded-md border">
                        {sellers.length > 0 ? (
                          sellers.map((seller, index) => {
                            const sellerAddress = getWalletByPrivateKey(seller.privateKey)?.address || '';
                            const lowSOL = hasInsufficientSOL(sellerAddress);
                            
                            return (
                              <div key={index} className="p-3 border-b">
                                <div className="flex justify-between items-center mb-2">
                                  <div className="flex items-center">
                                    {lowSOL ? (
                                      <Info className="w-4 h-4 mr-2 text-destructive" />
                                    ) : (
                                      <CheckCircle className="w-4 h-4 mr-2 text-primary" />
                                    )}
                                    <span className="font-mono text-sm">
                                      {formatAddress(sellerAddress)}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <span className={`text-xs ${
                                      lowSOL ? 'text-destructive' : 'text-muted-foreground'
                                    } font-mono`}>
                                      {formatSolBalance(getWalletBalance(sellerAddress) || 0)} SOL
                                    </span>
                                    <span className="text-xs text-primary font-mono">
                                      {formatTokenBalance(getWalletTokenBalance(sellerAddress) || 0)} TOKENS
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => removeSeller(index)}
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </div>
                                </div>
                                
                                <div className="flex items-center mt-2">
                                  <Label className="text-xs w-24 font-mono">Sell Percentage:</Label>
                                  <div className="relative flex-1">
                                    <Input
                                      value={seller.sellPercentage}
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        if (value === '' || /^\d*\.?\d*$/.test(value) && parseFloat(value) <= 100) {
                                          updateSellerPercentage(index, value);
                                        }
                                      }}
                                      className="pr-8"
                                    />
                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                                  </div>
                                </div>
                                
                                {lowSOL && (
                                  <div className="mt-2 p-2 bg-destructive/10 rounded text-xs text-destructive">
                                    <div className="flex items-center">
                                      <Info className="w-3 h-3 mr-1" />
                                      <span>INSUFFICIENT SOL BALANCE</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            No sellers selected. Click on a wallet to add it as a seller.
                          </div>
                        )}
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Step 1: Configure Buyers */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <div className="p-1 rounded-full bg-primary/10">
                    <DollarSign className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="font-medium font-mono">CONFIGURE BUYERS</h3>
                </div>

                {sellers.length > 0 && (
                  <Tabs value={currentSellerIndex.toString()} onValueChange={(val) => setCurrentSellerIndex(parseInt(val))}>
                    <TabsList className="w-full overflow-x-auto">
                      {sellers.map((seller, index) => {
                        const sellerAddress = getWalletByPrivateKey(seller.privateKey)?.address || '';
                        const lowSOL = hasInsufficientSOL(sellerAddress);
                        
                        return (
                          <TabsTrigger 
                            key={index} 
                            value={index.toString()}
                            className={cn(
                              "font-mono text-xs",
                              lowSOL && "text-destructive"
                            )}
                          >
                            Seller {index + 1}
                            {lowSOL && (
                              <span className="ml-1">⚠️</span>
                            )}
                          </TabsTrigger>
                        );
                      })}
                    </TabsList>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      {/* Buyer Selection */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm font-mono">
                            AVAILABLE BUYERS FOR SELLER {currentSellerIndex + 1}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="relative mb-3">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Search buyer wallets..."
                              className="pl-9"
                              value={buyerSearchTerm}
                              onChange={(e) => setBuyerSearchTerm(e.target.value)}
                            />
                          </div>

                          <ScrollArea className="h-60 rounded-md border">
                            {filterWallets(
                              getAvailableBuyerWallets(sellers[currentSellerIndex].privateKey), 
                              buyerSearchTerm
                            ).length > 0 ? (
                              filterWallets(
                                getAvailableBuyerWallets(sellers[currentSellerIndex].privateKey), 
                                buyerSearchTerm
                              ).map((wallet) => (
                                <div
                                  key={wallet.id}
                                  onClick={() => addBuyer(currentSellerIndex, wallet.privateKey)}
                                  className="p-2 hover:bg-accent cursor-pointer border-b"
                                >
                                  <div className="flex justify-between items-center">
                                    <div className="flex items-center">
                                      <Plus className="w-4 h-4 mr-2 text-primary" />
                                      <span className="font-mono text-sm">
                                        {formatAddress(wallet.address)}
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <span className="text-xs text-muted-foreground font-mono">
                                        {formatSolBalance(getWalletBalance(wallet.address) || 0)} SOL
                                      </span>
                                      {(getWalletTokenBalance(wallet.address) || 0) > 0 && (
                                        <span className="text-xs text-primary font-mono">
                                          {formatTokenBalance(getWalletTokenBalance(wallet.address) || 0)} TOKENS
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="p-4 text-center text-sm text-muted-foreground">
                                {buyerSearchTerm ? "No wallets found" : "No wallets available"}
                              </div>
                            )}
                          </ScrollArea>
                        </CardContent>
                      </Card>
                      
                      {/* Selected Buyers */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm font-mono">SELECTED BUYERS</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {/* Current seller info */}
                          <div className="mb-4 p-3 bg-accent rounded-md">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-mono">Seller:</span>
                              <span className="text-xs font-mono">
                                {formatAddress(getWalletByPrivateKey(sellers[currentSellerIndex].privateKey)?.address || '')}
                              </span>
                            </div>
                            <div className="flex justify-between items-center mt-1">
                              <span className="text-xs font-mono">Sell Percentage:</span>
                              <span className="text-xs text-primary font-mono">
                                {sellers[currentSellerIndex].sellPercentage}%
                              </span>
                            </div>
                            <div className="flex justify-between items-center mt-1">
                              <span className="text-xs font-mono">Balances:</span>
                              <div className="flex items-center space-x-2">
                                <span className={`text-xs ${
                                  hasInsufficientSOL(getWalletByPrivateKey(sellers[currentSellerIndex].privateKey)?.address || '') 
                                    ? 'text-destructive' 
                                    : 'text-muted-foreground'
                                } font-mono`}>
                                  {formatSolBalance(getWalletBalance(getWalletByPrivateKey(sellers[currentSellerIndex].privateKey)?.address || '') || 0)} SOL
                                </span>
                                <span className="text-xs text-primary font-mono">
                                  {formatTokenBalance(getWalletTokenBalance(getWalletByPrivateKey(sellers[currentSellerIndex].privateKey)?.address || '') || 0)} TOKENS
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {/* List of selected buyers */}
                          <ScrollArea className="h-48 rounded-md border">
                            {sellers[currentSellerIndex].buyers.length > 0 ? (
                              sellers[currentSellerIndex].buyers.map((buyer, buyerIndex) => (
                                <div key={buyerIndex} className="p-3 border-b">
                                  <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center">
                                      <CheckCircle className="w-4 h-4 mr-2 text-primary" />
                                      <span className="font-mono text-sm">
                                        {formatAddress(getWalletByPrivateKey(buyer.privateKey)?.address || '')}
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <span className="text-xs text-muted-foreground font-mono">
                                        {formatSolBalance(getWalletBalance(getWalletByPrivateKey(buyer.privateKey)?.address || '') || 0)} SOL
                                      </span>
                                      <span className="text-xs text-primary font-mono">
                                        {formatTokenBalance(getWalletTokenBalance(getWalletByPrivateKey(buyer.privateKey)?.address || '') || 0)} TOKENS
                                      </span>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => removeBuyer(currentSellerIndex, buyerIndex)}
                                      >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center mt-2">
                                    <Label className="text-xs w-28 font-mono">Buy Percentage:</Label>
                                    <div className="relative flex-1">
                                      <Input
                                        value={buyer.buyPercentage}
                                        onChange={(e) => {
                                          const value = e.target.value;
                                          if (value === '' || /^\d*\.?\d*$/.test(value) && parseFloat(value) <= 100) {
                                            updateBuyerPercentage(currentSellerIndex, buyerIndex, value);
                                          }
                                        }}
                                        className="pr-8"
                                      />
                                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="p-4 text-center text-sm text-muted-foreground">
                                No buyers selected. Click on a wallet to add it as a buyer.
                              </div>
                            )}
                          </ScrollArea>
                          
                          {/* Distribution info */}
                          {sellers[currentSellerIndex].buyers.length > 0 && (
                            <div className="mt-3 p-3 bg-accent rounded-md">
                              <div className="text-xs font-mono mb-1">
                                Each buyer will receive an equal portion of the tokens being sold
                              </div>
                              <div className="flex justify-between items-center text-sm">
                                <span className="font-mono">Each buyer receives:</span>
                                <span className="text-primary font-mono">
                                  {(parseFloat(sellers[currentSellerIndex].sellPercentage) / sellers[currentSellerIndex].buyers.length).toFixed(2)}%
                                </span>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </Tabs>
                )}
              </div>
            )}

            {/* Step 2: Review Operation */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <div className="p-1 rounded-full bg-primary/10">
                    <Info className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="font-medium font-mono">REVIEW OPERATIONS</h3>
                </div>

                {/* Warning banner */}
                {sellers.some(seller => 
                  hasInsufficientSOL(getWalletByPrivateKey(seller.privateKey)?.address || '')
                ) && (
                  <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                    <div className="flex items-center">
                      <Info className="w-4 h-4 mr-2 text-destructive" />
                      <span className="text-sm text-destructive">
                        WARNING: ONE OR MORE SELLERS HAVE INSUFFICIENT SOL BALANCE
                      </span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4">
                  {/* Operations summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-mono">OPERATION SUMMARY</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-mono">Total Sellers:</span>
                        <span className="text-sm font-mono">{sellers.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-mono">Total Buyers:</span>
                        <span className="text-sm font-mono">
                          {sellers.reduce((total, seller) => total + seller.buyers.length, 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-mono">Total Operations:</span>
                        <span className="text-sm font-mono">{getTotalOperationsCount()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-mono">Token Address:</span>
                        <span className="text-sm font-mono">{formatAddress(tokenAddress)}</span>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Detailed breakdown */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-mono">OPERATION DETAILS</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-60 rounded-md border">
                        {sellers.map((seller, sellerIndex) => {
                          const sellerAddress = getWalletByPrivateKey(seller.privateKey)?.address || '';
                          const lowSOL = hasInsufficientSOL(sellerAddress);
                          
                          return (
                            <div key={sellerIndex} className="border-t pt-3 first:border-t-0 first:pt-0">
                              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 gap-2">
                                <div className="flex items-center">
                                  <span className="text-sm font-mono">Seller {sellerIndex + 1}:</span>
                                  <span className="text-sm font-mono ml-2">
                                    {formatAddress(sellerAddress)}
                                  </span>
                                  {lowSOL && (
                                    <Badge variant="destructive" className="ml-2">
                                      LOW SOL
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex flex-col items-start sm:items-end">
                                  <span className="text-xs text-primary font-mono">
                                    Selling {seller.sellPercentage}%
                                  </span>
                                  <span className="text-xs font-mono">
                                    {formatTokenBalance(getWalletTokenBalance(sellerAddress) || 0)} Tokens
                                  </span>
                                </div>
                              </div>
                              
                              <div className="ml-0 sm:ml-4 space-y-2">
                                {seller.buyers.length > 0 ? (
                                  seller.buyers.map((buyer, buyerIndex) => (
                                    <div key={buyerIndex} className="p-2 rounded bg-accent">
                                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                                        <div className="flex items-center">
                                          <span className="text-xs font-mono">Buyer:</span>
                                          <span className="text-xs font-mono ml-2">
                                            {formatAddress(getWalletByPrivateKey(buyer.privateKey)?.address || '')}
                                          </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 mt-1 sm:mt-0">
                                          <div className="flex items-center space-x-2">
                                            <span className="text-xs font-mono">
                                              {formatSolBalance(getWalletBalance(getWalletByPrivateKey(buyer.privateKey)?.address || '') || 0)} SOL
                                            </span>
                                            <span className="text-xs text-primary font-mono">
                                              {formatTokenBalance(getWalletTokenBalance(getWalletByPrivateKey(buyer.privateKey)?.address || '') || 0)} TOKENS
                                            </span>
                                          </div>
                                          <div className="flex items-center space-x-2">
                                            <Badge variant="outline" className="font-mono">
                                              {(parseFloat(seller.sellPercentage) / seller.buyers.length).toFixed(2)}%
                                            </Badge>
                                            <Badge variant="secondary" className="font-mono">
                                              Buy: {buyer.buyPercentage}%
                                            </Badge>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-xs italic font-mono">No buyers configured</div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </ScrollArea>
                    </CardContent>
                  </Card>
                  
                  {/* Confirmation checkbox */}
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="confirmOperation" 
                          checked={isConfirmed} 
                          onCheckedChange={(checked) => setIsConfirmed(checked as boolean)}
                        />
                        <Label htmlFor="confirmOperation" className="text-sm font-mono">
                          I confirm that I want to execute {getTotalOperationsCount()} operations as detailed above
                        </Label>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            <div className="flex justify-between mt-6">
              <Button
                variant="outline"
                onClick={currentStep === 0 ? onClose : handleBack}
              >
                {currentStep === 0 ? 'Cancel' : 'Back'}
              </Button>
              <Button
                type={currentStep === STEPS_BUYSELL.length - 1 ? 'submit' : 'button'}
                onClick={currentStep === STEPS_BUYSELL.length - 1 ? undefined : handleNext}
                disabled={
                  isSubmitting ||
                  (currentStep === 0 && sellers.length === 0) ||
                  (currentStep === 1 && sellers.some(seller => seller.buyers.length === 0)) ||
                  (currentStep === STEPS_BUYSELL.length - 1 && !isConfirmed) ||
                  sellers.some(seller => hasInsufficientSOL(getWalletByPrivateKey(seller.privateKey)?.address || ''))
                }
              >
                {currentStep === STEPS_BUYSELL.length - 1 ? (
                  isSubmitting ? (
                    <>
                      <div className="h-4 w-4 rounded-full border-2 border-muted-foreground border-t-transparent animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    `Confirm ${getTotalOperationsCount()} Operations`
                  )
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};