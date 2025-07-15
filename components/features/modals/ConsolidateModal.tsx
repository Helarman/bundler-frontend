import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDown, X, CheckCircle, DollarSign, Info, Search, ChevronRight } from 'lucide-react';
import { Connection } from '@solana/web3.js';
import { Wallet as WalletType } from '@/lib/types/wallet'
import { consolidateSOL, validateConsolidationInputs } from '@/lib/utils/consolidate';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Error {
  message: string
}

interface ConsolidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallets: WalletType[];
  solBalances: Map<string, number>;
  connection: Connection;
}

export const ConsolidateModal: React.FC<ConsolidateModalProps> = ({
  isOpen,
  onClose,
  wallets,
  solBalances
}) => {
  // States for the modal
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  // States for consolidate operation
  const [selectedSourceWallets, setSelectedSourceWallets] = useState<string[]>([]);
  const [selectedRecipientWallet, setSelectedRecipientWallet] = useState('');
  const [amount, setAmount] = useState('');
  const [sourceSearchTerm, setSourceSearchTerm] = useState('');
  const [recipientSearchTerm, setRecipientSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState('address');
  const [sortDirection, setSortDirection] = useState('asc');
  const [balanceFilter, setBalanceFilter] = useState('all');

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  // Format SOL balance for display
  const formatSolBalance = (balance: number) => {
    return balance.toFixed(4);
  };

  // Format wallet address for display
  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Get wallet SOL balance by address
  const getWalletBalance = (address: string): number => {
    return solBalances.has(address) ? (solBalances.get(address) ?? 0) : 0;
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

  // Reset form state
  const resetForm = () => {
    setCurrentStep(0);
    setIsConfirmed(false);
    setSelectedRecipientWallet('');
    setSelectedSourceWallets([]);
    setAmount('');
    setSourceSearchTerm('');
    setRecipientSearchTerm('');
    setSortOption('address');
    setSortDirection('asc');
    setBalanceFilter('all');
  };

  // Calculate total amount to be consolidated
  const getTotalConsolidationAmount = () => {
    return selectedSourceWallets.reduce((total, address) => {
      const balance = getWalletBalance(address) || 0;
      return total + (balance * parseFloat(amount) / 100);
    }, 0);
  };

  const handleConsolidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmed) return;
    setIsSubmitting(true);
    
    try {
      // Get the receiver private key
      const receiverPrivateKey = getPrivateKeyByAddress(selectedRecipientWallet);
      if (!receiverPrivateKey) {
        toast("Receiver wallet private key not found");
        setIsSubmitting(false);
        return;
      }
      
      // Prepare receiver wallet data
      const receiverWallet = {
        address: selectedRecipientWallet,
        privateKey: receiverPrivateKey
      };
      
      // Prepare source wallets with their private keys
      const sourceWallets = selectedSourceWallets
        .map(address => ({
          address,
          privateKey: getPrivateKeyByAddress(address)
        }))
        .filter(wallet => wallet.privateKey);
      
      // Validate all inputs
      const validation = validateConsolidationInputs(
        sourceWallets,
        receiverWallet,
        parseFloat(amount),
        solBalances
      );
      
      if (!validation.valid) {
        toast(validation.error || "Invalid consolidation data");
        setIsSubmitting(false);
        return;
      }
      
      // Execute the consolidation
      const result = await consolidateSOL(
        sourceWallets,
        receiverWallet,
        parseFloat(amount)
      );
      
      if (result.success) {
        toast("SOL consolidated successfully");
        resetForm();
        onClose();
      } else {
        toast(result.error || "Consolidation failed");
      }
    } catch (error) {
      console.error('Consolidation error:', error);
      const err = error as Error
      toast("Consolidation failed: " + (err.message || "Unknown error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to handle source wallet selection toggles for consolidate
  const toggleSourceWalletSelection = (address: string) => {
    setSelectedSourceWallets(prev => {
      if (prev.includes(address)) {
        return prev.filter(a => a !== address);
      } else {
        return [...prev, address];
      }
    });
  };

  // Get available wallets for consolidate source selection (exclude recipient)
  const getAvailableSourceWallets = () => {
    return wallets.filter(wallet => 
      wallet.address !== selectedRecipientWallet && 
      (getWalletBalance(wallet.address) || 0) > 0
    );
  };

  // Get available wallets for recipient selection in consolidate (exclude sources)
  const getAvailableRecipientWalletsForConsolidate = () => {
    return wallets.filter(wallet => 
      !selectedSourceWallets.includes(wallet.address) && 
      (getWalletBalance(wallet.address) || 0) > 0
    );
  };
  
  // Handle select/deselect all for source wallets
  const handleSelectAllSources = () => {
    if (selectedSourceWallets.length === getAvailableSourceWallets().length) {
      // If all are selected, deselect all
      setSelectedSourceWallets([]);
    } else {
      // Otherwise, select all
      setSelectedSourceWallets(getAvailableSourceWallets().map(wallet => wallet.address));
    }
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
      if (balanceFilter === 'highBalance') {
        filtered = filtered.filter(wallet => (getWalletBalance(wallet.address) || 0) >= 0.1);
      } else if (balanceFilter === 'lowBalance') {
        filtered = filtered.filter(wallet => (getWalletBalance(wallet.address) || 0) < 0.1);
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

  return createPortal(
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowDown className="w-5 h-5 text-primary" />
            Consolidate SOL
          </DialogTitle>
          <DialogDescription>
            Transfer SOL from multiple wallets to a single recipient
          </DialogDescription>
        </DialogHeader>

        <Progress value={currentStep === 0 ? 50 : 100} className="h-1" />

        {currentStep === 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Recipient Wallet Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Recipient Wallet</Label>
                  {selectedRecipientWallet && (
                    <div className="flex items-center gap-1 text-sm">
                      <DollarSign className="w-4 h-4" />
                      <span className="font-medium">
                        {formatSolBalance(getWalletBalance(selectedRecipientWallet))} SOL
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={recipientSearchTerm}
                      onChange={(e) => setRecipientSearchTerm(e.target.value)}
                      className="pl-9"
                      placeholder="Search recipient..."
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
                    size="icon"
                    onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                  >
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </Button>
                </div>

                <ScrollArea className="h-64 rounded-md border">
                  {filterWallets(getAvailableRecipientWalletsForConsolidate(), recipientSearchTerm).length > 0 ? (
                    filterWallets(getAvailableRecipientWalletsForConsolidate(), recipientSearchTerm).map((wallet) => (
                      <div 
                        key={wallet.id}
                        className={`flex items-center p-3 hover:bg-muted cursor-pointer border-b ${
                          selectedRecipientWallet === wallet.address ? 'bg-accent' : ''
                        }`}
                        onClick={() => setSelectedRecipientWallet(wallet.address)}
                      >
                        <div className={`w-5 h-5 mr-3 rounded flex items-center justify-center ${
                          selectedRecipientWallet === wallet.address
                            ? 'bg-primary text-primary-foreground' 
                            : 'border'
                        }`}>
                          {selectedRecipientWallet === wallet.address && (
                            <CheckCircle className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{formatAddress(wallet.address)}</p>
                          <div className="flex items-center mt-1 text-xs text-muted-foreground">
                            <DollarSign className="w-3 h-3 mr-1" />
                            {formatSolBalance(getWalletBalance(wallet.address) || 0)} SOL
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      {recipientSearchTerm ? "No wallets found" : "No wallets available"}
                    </div>
                  )}
                </ScrollArea>
              </div>
              
              {/* Source Wallets */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Source Wallets</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectAllSources}
                  >
                    {selectedSourceWallets.length === getAvailableSourceWallets().length ? 'Deselect all' : 'Select all'}
                  </Button>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={sourceSearchTerm}
                      onChange={(e) => setSourceSearchTerm(e.target.value)}
                      className="pl-9"
                      placeholder="Search sources..."
                    />
                  </div>
                  
                  <Select value={balanceFilter} onValueChange={setBalanceFilter}>
                    <SelectTrigger className="w-[100px]">
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="highBalance">High</SelectItem>
                      <SelectItem value="lowBalance">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <ScrollArea className="h-64 rounded-md border">
                  {filterWallets(getAvailableSourceWallets(), sourceSearchTerm).length > 0 ? (
                    filterWallets(getAvailableSourceWallets(), sourceSearchTerm).map((wallet) => {
                      const balance = getWalletBalance(wallet.address) || 0;
                      const transferAmount = balance * parseFloat(amount || '0') / 100;
                      
                      return (
                        <div 
                          key={wallet.id}
                          className={`flex items-center p-3 hover:bg-muted cursor-pointer border-b ${
                            selectedSourceWallets.includes(wallet.address) ? 'bg-accent' : ''
                          }`}
                          onClick={() => toggleSourceWalletSelection(wallet.address)}
                        >
                          <div className={`w-5 h-5 mr-3 rounded flex items-center justify-center ${
                            selectedSourceWallets.includes(wallet.address)
                              ? 'bg-primary text-primary-foreground' 
                              : 'border'
                          }`}>
                            {selectedSourceWallets.includes(wallet.address) && (
                              <CheckCircle className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div className="flex-1 flex justify-between items-center">
                            <p className="text-sm font-medium">{formatAddress(wallet.address)}</p>
                            <div className="flex flex-col items-end">
                              <span className="text-xs text-muted-foreground">
                                {formatSolBalance(balance)} SOL
                              </span>
                              {selectedSourceWallets.includes(wallet.address) && amount && (
                                <span className="text-xs text-primary">
                                  -{transferAmount.toFixed(4)} SOL
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      {sourceSearchTerm ? "No wallets found" : "No wallets available"}
                    </div>
                  )}
                </ScrollArea>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Selected: <span className="font-medium">{selectedSourceWallets.length}</span> wallets
                  </span>
                  {selectedSourceWallets.length > 0 && amount && (
                    <span className="text-muted-foreground">
                      Total: <span className="font-medium text-primary">
                        {getTotalConsolidationAmount().toFixed(4)} SOL
                      </span>
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Percentage to Consolidate</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    value={amount}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || /^\d*\.?\d*$/.test(value) && parseFloat(value) <= 100) {
                        setAmount(value);
                      }
                    }}
                    placeholder="Enter percentage (e.g. 90)"
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Info className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Percentage of SOL to consolidate from each source wallet
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
              
              <div className="md:col-span-2">
                <Card>
                  <CardHeader className="p-4">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span>Live Preview</span>
                      {amount && (
                        <Badge variant="secondary">
                          {amount}% Consolidation
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    {selectedRecipientWallet && selectedSourceWallets.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Source Wallets:</span>
                            <span>{selectedSourceWallets.length} selected</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Recipient:</span>
                            <span>{formatAddress(selectedRecipientWallet)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Recipient Balance:</span>
                            <span>{formatSolBalance(getWalletBalance(selectedRecipientWallet))} SOL</span>
                          </div>
                        </div>
                        
                        {amount && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Amount to Move:</span>
                              <span className="font-medium text-primary">
                                {getTotalConsolidationAmount().toFixed(4)} SOL
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">New Balance:</span>
                              <span>
                                {(getWalletBalance(selectedRecipientWallet) + getTotalConsolidationAmount()).toFixed(4)} SOL
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Change:</span>
                              <span className="font-medium text-primary">
                                +{getTotalConsolidationAmount().toFixed(4)} SOL
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center text-sm text-muted-foreground py-4">
                        Select recipient and source wallets to see live preview
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={() => setCurrentStep(1)}
                disabled={!selectedRecipientWallet || !amount || selectedSourceWallets.length === 0}
              >
                Review <ChevronRight className="ml-1 w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
        
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Consolidation Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">To Wallet:</span>
                      <div className="px-2 py-1 rounded bg-muted">
                        <span className="text-sm font-medium">{formatAddress(selectedRecipientWallet)}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Current Balance:</span>
                      <span className="text-sm">{formatSolBalance(getWalletBalance(selectedRecipientWallet) || 0)} SOL</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Source Wallets:</span>
                      <span className="text-sm">{selectedSourceWallets.length} wallets</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Percentage per Source:</span>
                      <span className="text-sm font-medium text-primary">{amount}%</span>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total to Consolidate:</span>
                      <span className="text-sm font-medium text-primary">
                        {getTotalConsolidationAmount().toFixed(4)} SOL
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">New Balance (Estimated):</span>
                      <span className="text-sm">
                        {(getWalletBalance(selectedRecipientWallet) + getTotalConsolidationAmount()).toFixed(4)} SOL
                      </span>
                    </div>
                  </CardContent>
                </Card>
                
                <div className="flex items-center space-x-2 p-4 border rounded-lg">
                  <Checkbox
                    id="confirmConsolidate"
                    checked={isConfirmed}
                    onCheckedChange={(checked) => setIsConfirmed(checked as boolean)}
                  />
                  <label
                    htmlFor="confirmConsolidate"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    I confirm this consolidation operation
                  </label>
                </div>
              </div>
              
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>Selected Source Wallets</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-64 rounded-md">
                      {selectedSourceWallets.length > 0 ? (
                        selectedSourceWallets.map((address, index) => {
                          const wallet = getWalletByAddress(address);
                          const balance = getWalletBalance(address) || 0;
                          const transferAmount = balance * parseFloat(amount) / 100;
                          
                          return wallet ? (
                            <div key={wallet.id} className="flex items-center justify-between py-3 border-b">
                              <div className="flex items-center">
                                <span className="text-muted-foreground text-sm mr-2 w-6">{index + 1}.</span>
                                <span className="text-sm font-medium">{formatAddress(wallet.address)}</span>
                              </div>
                              <div className="flex items-center">
                                <span className="text-xs text-muted-foreground mr-2">Current: {formatSolBalance(balance)} SOL</span>
                                <span className="text-xs text-primary">-{transferAmount.toFixed(4)} SOL</span>
                              </div>
                            </div>
                          ) : null;
                        })
                      ) : (
                        <div className="text-center text-sm text-muted-foreground py-4">
                          No source wallets selected
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCurrentStep(0)}>
                Back
              </Button>
              <Button
                onClick={handleConsolidate}
                disabled={!isConfirmed || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-background border-t-transparent animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  "Consolidate SOL"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>,
    document.body
  );
};