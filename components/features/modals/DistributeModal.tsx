import React, { useState, useEffect } from 'react';
import { ArrowsUpFromLine, DollarSign, X, CheckCircle, Info, Search, ChevronRight, Settings } from 'lucide-react';
import { Connection } from '@solana/web3.js';

import { Wallet as WalletType } from '@/lib/types/wallet';
import { batchDistributeSOL, validateDistributionInputs } from '@/lib/utils/distribute';
import { toast } from 'sonner';
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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Toggle } from "@/components/ui/toggle";
import { Badge } from "@/components/ui/badge";

interface DistributeModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallets: WalletType[];
  solBalances: Map<string, number>;
  connection: Connection;
}

interface WalletAmount {
  address: string;
  amount: string;
}

export const DistributeModal: React.FC<DistributeModalProps> = ({
  isOpen,
  onClose,
  wallets,
  solBalances
}) => {
  // States for the modal
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  // States for distribute operation
  const [selectedRecipientWallets, setSelectedRecipientWallets] = useState<string[]>([]);
  const [selectedSenderWallet, setSelectedSenderWallet] = useState('');
  const [commonAmount, setCommonAmount] = useState('');
  const [useCustomAmounts, setUseCustomAmounts] = useState(false);
  const [walletAmounts, setWalletAmounts] = useState<WalletAmount[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [senderSearchTerm, setSenderSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState('address');
  const [sortDirection, setSortDirection] = useState('asc');
  const [balanceFilter, setBalanceFilter] = useState('all');
  
  // Get wallet SOL balance by address
  const getWalletBalance = (address: string) => {
    return solBalances.has(address) ? solBalances.get(address) : 0;
  };

  // Calculate total amount for all recipients
  const calculateTotalAmount = () => {
    if (useCustomAmounts) {
      return walletAmounts.reduce((total, item) => {
        return total + (parseFloat(item.amount) || 0);
      }, 0);
    } else {
      return parseFloat(commonAmount || '0') * selectedRecipientWallets.length;
    }
  };
  
  // Function to highlight recipients with missing amounts
  const hasEmptyAmounts = () => {
    if (!useCustomAmounts) return false;
    
    return walletAmounts.some(wallet => 
      selectedRecipientWallets.includes(wallet.address) && 
      (!wallet.amount || parseFloat(wallet.amount) === 0)
    );
  };

  // Calculate total amount
  const totalAmount = calculateTotalAmount();
  const senderBalance = getWalletBalance(selectedSenderWallet) || 0;
  const hasEnoughBalance = totalAmount <= senderBalance;

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  // Update walletAmounts when selectedRecipientWallets change
  useEffect(() => {
    updateWalletAmounts();
  }, [selectedRecipientWallets]);

  // Update wallet amounts when toggling between common/custom amounts
  useEffect(() => {
    updateWalletAmounts();
  }, [useCustomAmounts, commonAmount]);

  // Format SOL balance for display
  const formatSolBalance = (balance: number) => {
    return balance.toFixed(4);
  };

  // Get wallet by address
  const getWalletByAddress = (address: string) => {
    return wallets.find(wallet => wallet.address === address);
  };

  // Get wallet private key by address
  const getPrivateKeyByAddress = (address: string) => {
    const wallet = getWalletByAddress(address);
    return wallet ? wallet.privateKey : '';
  };

  // Update wallet amounts based on selected wallets
  const updateWalletAmounts = () => {
    if (useCustomAmounts) {
      // Maintain existing amounts for wallets that remain selected
      const existingAmounts = new Map(walletAmounts.map(w => [w.address, w.amount]));
      
      // Create a new walletAmounts array with currently selected wallets
      const newWalletAmounts = selectedRecipientWallets.map(address => ({
        address,
        amount: existingAmounts.get(address) || commonAmount || ''
      }));
      
      setWalletAmounts(newWalletAmounts);
    } else {
      // When using common amount, just create entries with the common amount
      const newWalletAmounts = selectedRecipientWallets.map(address => ({
        address,
        amount: commonAmount
      }));
      
      setWalletAmounts(newWalletAmounts);
    }
  };

  // Reset form state
  const resetForm = () => {
    setCurrentStep(0);
    setIsConfirmed(false);
    setSelectedRecipientWallets([]);
    setSelectedSenderWallet('');
    setCommonAmount('');
    setUseCustomAmounts(false);
    setWalletAmounts([]);
    setSearchTerm('');
    setSenderSearchTerm('');
    setSortOption('address');
    setSortDirection('asc');
    setBalanceFilter('all');
  };

  // Handle wallet amount change
  const handleWalletAmountChange = (address: string, value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setWalletAmounts(prev => 
        prev.map(wallet => 
          wallet.address === address 
            ? { ...wallet, amount: value } 
            : wallet
        )
      );
    }
  };

  // Handle distribute operation
  const handleDistribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmed) return;

    setIsSubmitting(true);
    
    try {
      // Get sender private key
      const senderPrivateKey = getPrivateKeyByAddress(selectedSenderWallet);
      if (!senderPrivateKey) {
        toast("Sender wallet private key not found");
        setIsSubmitting(false);
        return;
      }

      // Prepare sender and recipient wallet data
      const senderWallet = {
        address: selectedSenderWallet,
        privateKey: senderPrivateKey,
        amount: '0' // Not used for sender
      };

      // Prepare recipient wallets with their private keys and amounts
      const recipientWallets = walletAmounts
        .filter(wallet => selectedRecipientWallets.includes(wallet.address))
        .map(wallet => ({
          address: wallet.address,
          privateKey: getPrivateKeyByAddress(wallet.address),
          amount: wallet.amount
        }))
        .filter(wallet => wallet.privateKey && wallet.amount);

      // Validate all inputs
      const validation = validateDistributionInputs(
        senderWallet,
        recipientWallets,
        senderBalance
      );

      if (!validation.valid) {
        toast(validation.error || "Invalid distribution data");
        setIsSubmitting(false);
        return;
      }

      // Execute the distribution
      const result = await batchDistributeSOL(senderWallet, recipientWallets);
      
      if (result.success) {
        toast("SOL distributed successfully");
        resetForm();
        onClose();
      } else {
        toast(result.error || "Distribution failed");
      }
    } catch (error) {
      console.error('Distribution error:', error);
      toast("Distribution failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to handle recipient wallet selection toggles for distribute
  const toggleRecipientWalletSelection = (address: string) => {
    setSelectedRecipientWallets(prev => {
      if (prev.includes(address)) {
        return prev.filter(a => a !== address);
      } else {
        return [...prev, address];
      }
    });
  };

  // Get available wallets for distribute recipient selection (exclude sender)
  const getAvailableRecipientWallets = () => {
    return wallets.filter(wallet => wallet.address !== selectedSenderWallet);
  };

  // Get available wallets for sender selection in distribute (exclude recipients and zero balance wallets)
  const getAvailableSenderWallets = () => {
    return wallets.filter(wallet => 
      !selectedRecipientWallets.includes(wallet.address) && 
      (getWalletBalance(wallet.address) || 0) > 0
    );
  };
  
  // Handle select/deselect all for recipient wallets
  const handleSelectAllRecipients = () => {
    if (selectedRecipientWallets.length === getAvailableRecipientWallets().length) {
      setSelectedRecipientWallets([]);
    } else {
      setSelectedRecipientWallets(getAvailableRecipientWallets().map(wallet => wallet.address));
    }
  };

  // Apply common amount to all selected wallets
  const applyCommonAmountToAll = () => {
    setWalletAmounts(prev => 
      prev.map(wallet => ({ ...wallet, amount: commonAmount }))
    );
  };

  // Filter and sort wallets based on search term and other criteria
  const filterWallets = (walletList: WalletType[], search: string) => {
    // First apply search filter
    let filtered = walletList;
    if (search) {
      filtered = filtered.filter(wallet => 
        wallet.address.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // Then apply balance filter
    if (balanceFilter !== 'all') {
      if (balanceFilter === 'nonZero') {
        filtered = filtered.filter(wallet => (getWalletBalance(wallet.address) || 0) > 0);
      } else if (balanceFilter === 'highBalance') {
        filtered = filtered.filter(wallet => (getWalletBalance(wallet.address) || 0) >= 0.1);
      } else if (balanceFilter === 'lowBalance') {
        filtered = filtered.filter(wallet => (getWalletBalance(wallet.address) || 0) < 0.1 && (getWalletBalance(wallet.address) || 0) > 0);
      }
    }
    
    // Finally, sort the wallets
    return filtered.sort((a, b) => {
      if (sortOption === 'address') {
        return sortDirection === 'asc' 
          ? a.address.localeCompare(b.address)
          : b.address.localeCompare(a.address);
      } else if (sortOption === 'balance') {
        const balanceA = getWalletBalance(a.address) || 0;
        const balanceB = getWalletBalance(b.address) || 0;
        return sortDirection === 'asc' ? balanceA - balanceB : balanceB - balanceA;
      }
      return 0;
    });
  };

  // Format wallet address for display
  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Get wallet amount by address
  const getWalletAmount = (address: string) => {
    const wallet = walletAmounts.find(w => w.address === address);
    return wallet ? wallet.amount : '';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
  <DialogContent className="max-w-6xl">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-4">
        <ArrowsUpFromLine className="w-5 h-5" />
        <span>DISTRIBUTE SOL</span>
      </DialogTitle>
      <DialogDescription>
        Distribute SOL from one wallet to multiple recipients
      </DialogDescription>
    </DialogHeader>

    <Progress value={currentStep === 0 ? 50 : 100} />

    {currentStep === 0 && (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Sender Wallet Selection */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-medium">
                FROM WALLET
              </CardTitle>
              {selectedSenderWallet && (
                <div className="flex items-center gap-1 text-xs">
                  <DollarSign className="w-3 h-3" />
                  <span className="font-mono">
                    {formatSolBalance(senderBalance)} SOL
                  </span>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" />
                  <Input
                    value={senderSearchTerm}
                    onChange={(e) => setSenderSearchTerm(e.target.value)}
                    className="pl-9"
                    placeholder="Search sender wallets..."
                  />
                </div>
                <Select value={sortOption} onValueChange={setSortOption}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="address">Address</SelectItem>
                    <SelectItem value="balance">Balance</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                >
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </Button>
              </div>

              <ScrollArea className="h-48 rounded-md border">
                {filterWallets(getAvailableSenderWallets(), senderSearchTerm).length > 0 ? (
                  filterWallets(getAvailableSenderWallets(), senderSearchTerm).map((wallet) => (
                    <div 
                      key={wallet.id}
                      className={`flex items-center p-3 hover:bg-accent cursor-pointer transition-colors border-b last:border-b-0
                                ${selectedSenderWallet === wallet.address ? 'bg-secondary' : ''}`}
                      onClick={() => setSelectedSenderWallet(wallet.address)}
                    >
                      <div className={`w-5 h-5 mr-3 rounded flex items-center justify-center transition-colors
                                      ${selectedSenderWallet === wallet.address
                                        ? 'bg-primary' 
                                        : 'border'}`}>
                        {selectedSenderWallet === wallet.address && (
                          <CheckCircle className="w-3 h-3 text-primary-foreground" />
                        )}
                      </div>
                      <div className="flex-1 flex justify-between items-center">
                        <span className="font-mono text-sm">{formatAddress(wallet.address)}</span>
                        <span className="text-xs font-mono">
                          {formatSolBalance(getWalletBalance(wallet.address) || 0)} SOL
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-sm text-center text-muted-foreground">
                    {senderSearchTerm ? "No wallets found" : "No wallets available"}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Recipient Wallets Selection */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-medium">
                TO WALLETS
              </CardTitle>
              <Button 
                variant="outline"
                size="sm"
                onClick={handleSelectAllRecipients}
              >
                {selectedRecipientWallets.length === getAvailableRecipientWallets().length ? 'Deselect all' : 'Select all'}
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                    placeholder="Search recipient wallets..."
                  />
                </div>
                <Select value={balanceFilter} onValueChange={setBalanceFilter}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="nonZero">Non-zero</SelectItem>
                    <SelectItem value="highBalance">High balance</SelectItem>
                    <SelectItem value="lowBalance">Low balance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <ScrollArea className="h-48 rounded-md border">
                {filterWallets(getAvailableRecipientWallets(), searchTerm).length > 0 ? (
                  filterWallets(getAvailableRecipientWallets(), searchTerm).map((wallet) => (
                    <div 
                      key={wallet.id}
                      className={`flex items-center p-3 hover:bg-accent transition-colors border-b last:border-b-0
                                ${selectedRecipientWallets.includes(wallet.address) ? 'bg-secondary' : ''}`}
                    >
                      <div 
                        className={`w-5 h-5 mr-3 rounded flex items-center justify-center transition-colors cursor-pointer
                                    ${selectedRecipientWallets.includes(wallet.address) 
                                      ? 'bg-primary' 
                                      : 'border'}`}
                        onClick={() => toggleRecipientWalletSelection(wallet.address)}
                      >
                        {selectedRecipientWallets.includes(wallet.address) && (
                          <CheckCircle className="w-3 h-3 text-primary-foreground" />
                        )}
                      </div>
                      <div className="flex-1 flex justify-between items-center">
                        <span 
                          className="font-mono text-sm cursor-pointer"
                          onClick={() => toggleRecipientWalletSelection(wallet.address)}
                        >
                          {formatAddress(wallet.address)}
                        </span>
                        
                        {useCustomAmounts && selectedRecipientWallets.includes(wallet.address) ? (
                          <div className="relative w-24 ml-2">
                            <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3" />
                            <Input
                              type="text"
                              value={getWalletAmount(wallet.address)}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                e.stopPropagation();
                                const value = e.target.value;
                                if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                  handleWalletAmountChange(wallet.address, value);
                                }
                              }}
                              className="pl-6 h-8 text-xs"
                              placeholder="0.00"
                            />
                          </div>
                        ) : (
                          <span className="text-xs font-mono">
                            {formatSolBalance(getWalletBalance(wallet.address) || 0)} SOL
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-sm text-center text-muted-foreground">
                    {searchTerm ? "No wallets found" : "No wallets available"}
                  </div>
                )}
              </ScrollArea>
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono">
                  Selected: <span>{selectedRecipientWallets.length}</span> wallets
                </span>
                {selectedRecipientWallets.length > 0 && commonAmount && !useCustomAmounts && (
                  <span className="font-mono">
                    Each receives: <span>{commonAmount} SOL</span>
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Amount Settings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-medium">
              AMOUNT SETTINGS
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs">Custom amounts</span>
              <Toggle
                pressed={useCustomAmounts}
                onPressedChange={setUseCustomAmounts}
              >
                <Settings className="w-4 h-4" />
              </Toggle>
            </div>
          </CardHeader>
          <CardContent>
            {!useCustomAmounts ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center gap-1 mb-2">
                    Amount per wallet
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-4 h-4" />
                      </TooltipTrigger>
                      <TooltipContent>
                        This amount will be sent to each selected recipient wallet
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" />
                    <Input
                      type="text"
                      value={commonAmount}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          setCommonAmount(value);
                        }
                      }}
                      className={`pl-9 ${hasEnoughBalance ? '' : 'border-destructive'}`}
                      placeholder="0.001"
                    />
                  </div>
                </div>
                
                {selectedSenderWallet && commonAmount && selectedRecipientWallets.length > 0 && (
                  <Card>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Total to send:</span>
                        <span className={`text-sm font-semibold ${hasEnoughBalance ? '' : 'text-destructive'}`}>
                          {totalAmount.toFixed(4)} SOL
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Remaining balance:</span>
                        <span className="text-sm">{(senderBalance - totalAmount).toFixed(4)} SOL</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Each wallet receives:</span>
                        <span className="text-sm">{commonAmount} SOL</span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" />
                    <Input
                      type="text"
                      value={commonAmount}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          setCommonAmount(value);
                        }
                      }}
                      className="pl-9"
                      placeholder="Set common amount"
                    />
                  </div>
                  <Button
                    variant="outline"
                    disabled={!commonAmount}
                    onClick={applyCommonAmountToAll}
                  >
                    Apply to all
                  </Button>
                </div>
                
                {selectedSenderWallet && totalAmount > 0 && (
                  <Card>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Total to send:</span>
                        <span className={`text-sm font-semibold ${hasEnoughBalance ? '' : 'text-destructive'}`}>
                          {totalAmount.toFixed(4)} SOL
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Remaining balance:</span>
                        <span className="text-sm">{(senderBalance - totalAmount).toFixed(4)} SOL</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Recipients:</span>
                        <span className="text-sm">{selectedRecipientWallets.length} wallets</span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => setCurrentStep(1)}
            disabled={
              !selectedSenderWallet || 
              selectedRecipientWallets.length === 0 || 
              !hasEnoughBalance ||
              (useCustomAmounts && (totalAmount === 0 || hasEmptyAmounts())) ||
              (!useCustomAmounts && !commonAmount)
            }
          >
            {hasEmptyAmounts() && (
              <Badge variant="destructive" className="mr-2">
                Missing amounts
              </Badge>
            )}
            Review
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </DialogFooter>
      </div>
    )}

    {currentStep === 1 && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              DISTRIBUTION SUMMARY
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">From wallet:</span>
              <div className="flex items-center bg-accent px-2 py-1 rounded border">
                <span className="text-sm font-mono">{formatAddress(selectedSenderWallet)}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Wallet balance:</span>
              <span className="text-sm">{formatSolBalance(senderBalance)} SOL</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Recipients:</span>
              <span className="text-sm">{selectedRecipientWallets.length} wallets</span>
            </div>
            
            {!useCustomAmounts && (
              <div className="flex items-center justify-between">
                <span className="text-sm">Amount per wallet:</span>
                <span className="text-sm">{commonAmount} SOL</span>
              </div>
            )}
            
            {useCustomAmounts && (
              <div className="flex items-center justify-between">
                <span className="text-sm">Custom amounts:</span>
                <span className="text-sm">Yes</span>
              </div>
            )}
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total to send:</span>
              <span className="text-sm font-semibold">
                {totalAmount.toFixed(4)} SOL
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Remaining balance:</span>
              <span className="text-sm">{(senderBalance - totalAmount).toFixed(4)} SOL</span>
            </div>

            <div className="flex items-start space-x-2 pt-4">
              <Checkbox
                id="confirmDistribute"
                checked={isConfirmed}
                onCheckedChange={(checked) => setIsConfirmed(checked as boolean)}
              />
              <Label htmlFor="confirmDistribute" className="text-sm leading-snug">
                I confirm this distribution operation
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Recipients List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              SELECTED RECIPIENTS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64 rounded-md">
              {selectedRecipientWallets.length > 0 ? (
                selectedRecipientWallets.map((address, index) => {
                  const wallet = getWalletByAddress(address);
                  const amount = useCustomAmounts ? getWalletAmount(address) : commonAmount;
                  
                  return wallet ? (
                    <div key={wallet.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                      <div className="flex items-center">
                        <span className="text-muted-foreground text-xs mr-2 w-6 font-mono">{index + 1}.</span>
                        <span className="font-mono text-sm">{formatAddress(wallet.address)}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-xs text-muted-foreground mr-2 font-mono">
                          {formatSolBalance(getWalletBalance(wallet.address) || 0)} SOL
                        </span>
                        <span className="text-xs font-mono">+{amount} SOL</span>
                      </div>
                    </div>
                  ) : null;
                })
              ) : (
                <div className="p-4 text-sm text-center text-muted-foreground">
                  No recipients selected
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <DialogFooter className="col-span-2">
          <Button variant="outline" onClick={() => setCurrentStep(0)}>
            Back
          </Button>
          <Button
            onClick={handleDistribute}
            disabled={!isConfirmed || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-background/20 border-t-transparent rounded-full animate-spin mr-2" />
                Processing...
              </>
            ) : (
              "Distribute SOL"
            )}
          </Button>
        </DialogFooter>
      </div>
    )}
  </DialogContent>
</Dialog>
  );
};