import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpDown, X, CheckCircle, DollarSign, Info, Search, ChevronRight } from 'lucide-react';
import { 
  Connection, 
  PublicKey, 
  Keypair, 
  VersionedTransaction, 
  TransactionMessage,
  MessageV0
} from '@solana/web3.js';
import bs58 from 'bs58';

import { Wallet as WalletType } from '@/lib/types/wallet';
import { Buffer } from 'buffer';
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

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallets: WalletType[];
  solBalances: Map<string, number>;
  connection: Connection;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  onClose,
  wallets,
  solBalances,
  connection
}) => {
  // States for the modal
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  // States for transfer operation
  const [sourceWallet, setSourceWallet] = useState('');
  const [receiverAddress, setReceiverAddress] = useState('');
  const [selectedToken, setSelectedToken] = useState('');
  const [amount, setAmount] = useState('');
  
  // States for enhanced functionality
  const [sourceSearchTerm, setSourceSearchTerm] = useState('');
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

  // Get wallet by privateKey
  const getWalletByPrivateKey = (privateKey: string) => {
    return wallets.find(wallet => wallet.privateKey === privateKey);
  };

  // Reset form state
  const resetForm = () => {
    setCurrentStep(0);
    setIsConfirmed(false);
    setSourceWallet('');
    setReceiverAddress('');
    setSelectedToken('');
    setAmount('');
    setSourceSearchTerm('');
    setSortOption('address');
    setSortDirection('asc');
    setBalanceFilter('all');
  };

  // Handle transfer operation with local signing and direct RPC submission
  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmed) return;
    setIsSubmitting(true);

    try {
      const selectedWalletObj = getWalletByPrivateKey(sourceWallet);
      if (!selectedWalletObj) {
        throw new Error('Source wallet not found');
      }

      const baseUrl = (window as any).tradingServerUrl.replace(/\/+$/, '');
      
      // Step 1: Request the transaction from the backend
      const buildResponse = await fetch(`${baseUrl}/api/tokens/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderPublicKey: selectedWalletObj.address,  // Send public key only
          receiver: receiverAddress,
          tokenAddress: selectedToken,
          amount: amount,
        }),
      });

      if (!buildResponse.ok) {
        throw new Error(`HTTP error! status: ${buildResponse.status}`);
      }

      const buildResult = await buildResponse.json();
      if (!buildResult.success) {
        throw new Error(buildResult.error);
      }

      // Step 2: Deserialize the transaction message from Base58
      const transactionBuffer = Buffer.from(bs58.decode(buildResult.data.transaction));
      const messageV0 = MessageV0.deserialize(transactionBuffer);
      
      // Step 3: Create and sign the versioned transaction
      const transaction = new VersionedTransaction(messageV0);
      
      // Create keypair from private key
      const keypair = Keypair.fromSecretKey(bs58.decode(sourceWallet));
      
      // Sign the transaction
      transaction.sign([keypair]);
      
      // Step 4: Send the signed transaction directly through the RPC connection
      const signature = await connection.sendTransaction(transaction);
      
      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(signature);
      
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${confirmation.value.err}`);
      }
      
      // Success message with transfer type from the build result
      toast(`${buildResult.data.transferType} transfer completed successfully. Signature: ${signature}`);
      resetForm();
      onClose();
    } catch (error) {
      console.error('Transfer error:', error);
      
      // Extract meaningful error message to show to user
      let errorMessage = 'Transfer failed';
      
      if (error instanceof Error) {
        // Try to parse detailed error message which might be JSON
        if (error.message.includes('{') && error.message.includes('}')) {
          try {
            // Sometimes error messages contain JSON from the API
            const errorJson = JSON.parse(error.message.substring(
              error.message.indexOf('{'), 
              error.message.lastIndexOf('}') + 1
            ));
            
            if (errorJson.error) {
              errorMessage = `${errorMessage}: ${errorJson.error}`;
            } else {
              errorMessage = `${errorMessage}: ${error.message}`;
            }
          } catch (e) {
            // If we can't parse JSON, just use the original message
            errorMessage = `${errorMessage}: ${error.message}`;
          }
        } else {
          errorMessage = `${errorMessage}: ${error.message}`;
        }
      } else {
        errorMessage = `${errorMessage}: Unknown error`;
      }
      
      toast(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter and sort wallets based on search term and other criteria
  const filterWallets = (walletList: WalletType[], search: string) => {
    // First filter out wallets with zero balance
    let filtered = walletList.filter(wallet => (getWalletBalance(wallet.address) || 0) > 0);
    
    // Then apply search filter
    if (search) {
      filtered = filtered.filter(wallet => 
        wallet.address.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // Then apply additional balance filter
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

  // Get the selected wallet address
  const selectedWalletAddress = getWalletByPrivateKey(sourceWallet)?.address || '';

  return(
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpDown className="w-5 h-5 text-primary" />
            Transfer SOL
          </DialogTitle>
          <DialogDescription>
            Transfer SOL or tokens between wallets
          </DialogDescription>
        </DialogHeader>

        <Progress value={currentStep === 0 ? 50 : 100} className="h-1" />

        {currentStep === 0 && (
          <div className="space-y-4">
            {/* Source Wallet Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Source Wallet</Label>
                {sourceWallet && (
                  <div className="flex items-center gap-1 text-sm">
                    <DollarSign className="w-4 h-4" />
                    <span className="font-medium">
                      {formatSolBalance(getWalletBalance(selectedWalletAddress))} SOL
                    </span>
                  </div>
                )}
              </div>

              {/* Source Search and Filters */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={sourceSearchTerm}
                    onChange={(e) => setSourceSearchTerm(e.target.value)}
                    className="pl-9"
                    placeholder="Search wallets..."
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

              <ScrollArea className="h-40 rounded-md border">
                {filterWallets(wallets, sourceSearchTerm).length > 0 ? (
                  filterWallets(wallets, sourceSearchTerm).map((wallet) => (
                    <div 
                      key={wallet.id}
                      className={`flex items-center p-3 hover:bg-muted cursor-pointer border-b ${
                        sourceWallet === wallet.privateKey ? 'bg-accent' : ''
                      }`}
                      onClick={() => setSourceWallet(wallet.privateKey)}
                    >
                      <div className={`w-5 h-5 mr-3 rounded flex items-center justify-center ${
                        sourceWallet === wallet.privateKey
                          ? 'bg-primary text-primary-foreground' 
                          : 'border'
                      }`}>
                        {sourceWallet === wallet.privateKey && (
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
                    {sourceSearchTerm ? "No wallets found with balance > 0" : "No wallets available with balance > 0"}
                  </div>
                )}
              </ScrollArea>
              {sourceWallet && (
                <div className="flex items-center gap-1.5 text-sm pl-1">
                  <span className="text-muted-foreground">Current balance:</span>
                  <span className="font-medium text-primary">
                    {formatSolBalance(getWalletBalance(selectedWalletAddress) || 0)} SOL
                  </span>
                </div>
              )}
            </div>
            
            {/* Recipient Address */}
            <div className="space-y-2">
              <Label>Recipient Address</Label>
              <Input
                value={receiverAddress}
                onChange={(e) => setReceiverAddress(e.target.value)}
                placeholder="Enter recipient address"
              />
              {solBalances.has(receiverAddress) && (
                <div className="flex items-center text-sm pl-1">
                  <span className="text-muted-foreground mr-1">Recipient balance:</span>
                  <span className="font-medium text-primary">
                    {formatSolBalance(getWalletBalance(receiverAddress))} SOL
                  </span>
                </div>
              )}
            </div>
            
            {/* Token Address */}
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Label>Token Address</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-4 w-4">
                      <Info className="w-3 h-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Leave empty to transfer SOL instead of a token
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                value={selectedToken}
                onChange={(e) => setSelectedToken(e.target.value)}
                placeholder="Enter token address (leave empty for SOL)"
              />
            </div>
            
            {/* Amount */}
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                value={amount}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || /^\d*\.?\d*$/.test(value)) {
                    setAmount(value);
                  }
                }}
                placeholder="Enter amount to transfer"
              />
            </div>
            
            {/* Transfer Summary */}
            {sourceWallet && receiverAddress && amount && (
              <Card>
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Transfer:</span>
                    <span className="font-medium text-primary">
                      {amount} {selectedToken ? 'TOKENS' : 'SOL'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">From:</span>
                    <span>{formatAddress(selectedWalletAddress)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">To:</span>
                    <span>{formatAddress(receiverAddress)}</span>
                  </div>
                </CardContent>
              </Card>
            )}
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={() => setCurrentStep(1)}
                disabled={!sourceWallet || !receiverAddress || !amount}
              >
                Review <ChevronRight className="ml-1 w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
        
        {currentStep === 1 && (
          <div className="space-y-4">
            {/* Review Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Transaction Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Transfer Amount:</Label>
                  <div className="p-3 bg-muted rounded-md mt-1">
                    <p className="font-medium text-primary">
                      {amount} {selectedToken ? 'TOKENS' : 'SOL'}
                    </p>
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground">From Wallet:</Label>
                  <div className="p-3 bg-muted rounded-md mt-1">
                    <p className="break-all">{selectedWalletAddress}</p>
                    <div className="flex items-center mt-1 text-sm text-muted-foreground">
                      <DollarSign className="w-3 h-3 mr-1" />
                      Balance: {formatSolBalance(getWalletBalance(selectedWalletAddress) || 0)} SOL
                    </div>
                  </div>
                </div>
                
                <div>
                  <Label className="text-muted-foreground">To Recipient:</Label>
                  <div className="p-3 bg-muted rounded-md mt-1">
                    <p className="break-all">{receiverAddress}</p>
                    {solBalances.has(receiverAddress) && (
                      <div className="flex items-center mt-1 text-sm text-muted-foreground">
                        <DollarSign className="w-3 h-3 mr-1" />
                        Current: {formatSolBalance(getWalletBalance(receiverAddress) || 0)} SOL
                      </div>
                    )}
                  </div>
                </div>
                
                {selectedToken && (
                  <div>
                    <Label className="text-muted-foreground">Token:</Label>
                    <div className="p-3 bg-muted rounded-md mt-1">
                      <p className="break-all">{selectedToken}</p>
                    </div>
                  </div>
                )}
                
                {/* Local signing section */}
                <div className="mt-3 p-3 bg-secondary rounded-md border">
                  <p className="text-sm font-medium text-primary mb-2">Local Transaction Signing</p>
                  <p className="text-xs text-muted-foreground">
                    Your private key will remain secure on your device. The transaction will be signed locally and submitted directly to the Solana network via RPC.
                  </p>
                </div>

                {/* Estimated balances after transfer (only for SOL transfers) */}
                {!selectedToken && (
                  <div className="mt-3 p-3 bg-secondary rounded-md border">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Estimated Balances After Transfer:</p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Source Wallet:</span>
                      <span className="text-xs">
                        {(getWalletBalance(selectedWalletAddress) - parseFloat(amount)).toFixed(4)} SOL
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs text-muted-foreground">Recipient Wallet:</span>
                      <span className="text-xs">
                        {(getWalletBalance(receiverAddress) + parseFloat(amount)).toFixed(4)} SOL
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Confirmation Checkbox */}
            <div className="flex items-center space-x-2 p-4 border rounded-lg">
              <Checkbox
                id="confirmTransfer"
                checked={isConfirmed}
                onCheckedChange={(checked) => setIsConfirmed(checked as boolean)}
              />
              <label
                htmlFor="confirmTransfer"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I confirm this transfer transaction
              </label>
            </div>
            
            {/* Buttons */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCurrentStep(0)}>
                Back
              </Button>
              <Button
                onClick={handleTransfer}
                disabled={!isConfirmed || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-background border-t-transparent animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  "Transfer"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};