import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { DollarSign, X, CheckCircle, ChevronRight, Search, Info } from 'lucide-react';
import { Connection, PublicKey, LAMPORTS_PER_SOL, SystemProgram, Transaction } from '@solana/web3.js';
import bs58 from 'bs58';

import { Wallet as WalletType } from '@/lib/types/wallet';
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
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallets: WalletType[];
  solBalances: Map<string, number>;
  connection: Connection;
}

export const DepositModal: React.FC<DepositModalProps> = ({
  isOpen,
  onClose,
  wallets,
  solBalances,
  connection
}) => {
  // States for deposit operation
  const [publicKey, setPublicKey] = useState('');
  const [selectedWallet, setSelectedWallet] = useState('');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
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

  // Reset form state
  const resetForm = () => {
    setCurrentStep(0);
    setSelectedWallet('');
    setAmount('');
    setIsConfirmed(false);
    setSearchTerm('');
    setSortOption('address');
    setSortDirection('asc');
    setBalanceFilter('all');
  };

  // Function to get recent blockhash (for deposit operation)
  const getRecentBlockhash = async () => {
    const { blockhash } = await connection.getLatestBlockhash('finalized');
    return blockhash;
  };

  // Connect to Phantom wallet
  const connectPhantomWallet = async () => {
    try {
      const { solana } = window as any;
      if (!solana?.isPhantom) {
        throw new Error("Phantom wallet not found");
      }
      
      const response = await solana.connect();
      setPublicKey(response.publicKey.toString());
      return true;
    } catch (error) {
      console.error('Error connecting to Phantom wallet:', error);
      toast("Failed to connect to Phantom wallet");
      return false;
    }
  };

  // Handle deposit operation
  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWallet || !amount || !publicKey || !isConfirmed) return;
 
    setIsSubmitting(true);
    try {
      const { solana } = window as any;
      if (!solana?.isPhantom) {
        throw new Error("Phantom wallet not found");
      }
 
      // Convert string public keys to PublicKey objects
      const fromPubkey = new PublicKey(publicKey);
      const toPubkey = new PublicKey(selectedWallet);
     
      // Create transfer instruction
      const transferInstruction = SystemProgram.transfer({
        fromPubkey,
        toPubkey,
        lamports: Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL)
      });
 
      // Get recent blockhash
      const recentBlockhash = await getRecentBlockhash();
 
      // Create new transaction
      const transaction = new Transaction({
        recentBlockhash,
        feePayer: fromPubkey
      });
 
      // Add transfer instruction to transaction
      transaction.add(transferInstruction);
 
      // Get transaction buffer
      const serializedTransaction = transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false
      });
 
      // Convert to base58
      const encodedTransaction = bs58.encode(serializedTransaction);
 
      // Send transaction request to Phantom
      const signature = await solana.request({
        method: 'signAndSendTransaction',
        params: {
          message: encodedTransaction
        }
      });
 
      // Show success message
      toast("Transaction sent successfully!");
     
      // Reset form and close modal
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error:', error);
      toast("Deposit failed");
    } finally {
      setIsSubmitting(false);
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            Deposit SOL
          </DialogTitle>
          <DialogDescription>
            Transfer SOL from your Phantom wallet to one of your wallets
          </DialogDescription>
        </DialogHeader>

        <Progress value={currentStep === 0 ? 50 : 100} className="h-1" />

        {currentStep === 0 && (
          <div className="space-y-4">
            {/* Phantom Wallet Connection */}
            <div>
              <Button
                onClick={connectPhantomWallet}
                className="w-full gap-2"
                variant={publicKey ? "outline" : "default"}
              >
                {publicKey ? (
                  <>
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <CheckCircle className="w-3 h-3 text-primary-foreground" />
                    </div>
                    <span>Connected to Phantom</span>
                  </>
                ) : (
                  <>
                    <svg width="22" height="22" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect width="128" height="128" rx="64" fill="#050a0e"/>
                      <path d="M110.584 64.9142H99.142C99.142 41.8335 80.2231 23 57.142 23C36.3226 23 18.7929 38.8944 15.6294 59.0563C15.2463 61.2766 15.0547 63.5605 15.0547 65.8019C15.0547 67.693 17.0548 69.142 18.9496 69.142H41.0038C42.2774 69.142 43.3791 68.2511 43.6484 67.002C43.8341 66.1368 44.0274 65.2393 44.3292 64.3971C46.5275 57.427 52.3790 52.4294 59.2648 52.4294C67.7598 52.4294 74.6521 59.3214 74.6521 67.8164C74.6521 76.3113 67.7598 83.2037 59.2648 83.2037C55.9574 83.2037 52.8709 82.0949 50.3999 80.1855C49.431 79.4954 48.1363 79.5393 47.2752 80.3996L32.0447 95.6302C30.8197 96.8548 31.5636 99 33.2599 99C34.9026 99 36.5454 98.8781 38.142 98.6553C44.9556 97.6553 51.2356 94.8281 56.3762 90.642C58.6555 88.7861 61.0457 86.7567 63.7865 85.0392C63.9501 84.9312 64.114 84.8231 64.3322 84.7151C76.4899 79.4954 85.7462 68.6714 87.4429 55.4348C87.6739 53.7519 87.7891 52.0158 87.7891 50.2259C87.7891 48.9332 88.5024 47.7629 89.6275 47.2292L106.396 39.3163C108.364 38.4161 110.584 39.8481 110.584 41.9863V64.9142Z" fill="#02b36d"/>
                    </svg>
                    <span>Connect Phantom</span>
                  </>
                )}
              </Button>
              {publicKey && (
                <Card className="mt-3">
                  <CardContent className="p-3 text-sm break-all">
                    <div className="text-xs text-muted-foreground mb-1">Connected:</div>
                    {publicKey}
                  </CardContent>
                </Card>
              )}
            </div>
            
            {/* Recipient Wallet Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Select Recipient</Label>
                {selectedWallet && (
                  <div className="flex items-center gap-1 text-sm">
                    <DollarSign className="w-4 h-4" />
                    <span className="font-medium text-primary">
                      {formatSolBalance(getWalletBalance(selectedWallet))} SOL
                    </span>
                  </div>
                )}
              </div>

              {/* Search, Sort, and Filter Options */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
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
                {filterWallets(wallets, searchTerm).length > 0 ? (
                  filterWallets(wallets, searchTerm).map((wallet) => (
                    <div 
                      key={wallet.id}
                      className={`flex items-center p-3 hover:bg-muted cursor-pointer border-b ${
                        selectedWallet === wallet.address ? 'bg-accent' : ''
                      }`}
                      onClick={() => setSelectedWallet(wallet.address)}
                    >
                      <div className={`w-5 h-5 mr-3 rounded flex items-center justify-center ${
                        selectedWallet === wallet.address
                          ? 'bg-primary text-primary-foreground' 
                          : 'border'
                      }`}>
                        {selectedWallet === wallet.address && (
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
                    {searchTerm ? "No wallets found" : "No wallets available"}
                  </div>
                )}
              </ScrollArea>
              {selectedWallet && (
                <div className="flex items-center gap-1.5 text-sm pl-1">
                  <span className="text-muted-foreground">Current balance:</span>
                  <span className="font-medium text-primary">
                    {formatSolBalance(getWalletBalance(selectedWallet) || 0)} SOL
                  </span>
                </div>
              )}
            </div>
            
            {/* Amount Input */}
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Label>Amount (SOL)</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-4 w-4">
                      <Info className="w-3 h-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Enter the amount of SOL to deposit
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                value={amount}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || /^\d*\.?\d*$/.test(value)) {
                    setAmount(value);
                  }
                }}
                placeholder="Enter amount to deposit"
              />
              {selectedWallet && amount && (
                <div className="flex items-center gap-1.5 text-sm pl-1">
                  <span className="text-muted-foreground">New balance after deposit:</span>
                  <span className="font-medium text-primary">
                    {(parseFloat(formatSolBalance(getWalletBalance(selectedWallet) || 0)) + parseFloat(amount || '0')).toFixed(4)} SOL
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={() => setCurrentStep(1)}
                disabled={!publicKey || !selectedWallet || !amount}
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
                  <Label className="text-muted-foreground">From:</Label>
                  <div className="p-3 bg-muted rounded-md mt-1">
                    <p className="break-all">{formatAddress(publicKey)}</p>
                  </div>
                </div>
                
                <div>
                  <Label className="text-muted-foreground">To Wallet:</Label>
                  <div className="p-3 bg-muted rounded-md mt-1">
                    <p className="break-all">{formatAddress(selectedWallet)}</p>
                    <div className="flex items-center mt-1 text-sm text-muted-foreground">
                      <DollarSign className="w-3 h-3 mr-1" />
                      Balance: {formatSolBalance(getWalletBalance(selectedWallet) || 0)} SOL
                    </div>
                  </div>
                </div>
                
                <div>
                  <Label className="text-muted-foreground">Amount to Deposit:</Label>
                  <div className="p-3 bg-muted rounded-md mt-1">
                    <p className="font-medium text-primary">
                      {parseFloat(amount).toFixed(4)} SOL
                    </p>
                  </div>
                </div>
                
                <div>
                  <Label className="text-muted-foreground">New Balance:</Label>
                  <div className="p-3 bg-muted rounded-md mt-1">
                    <p>
                      {(getWalletBalance(selectedWallet) + parseFloat(amount)).toFixed(4)} SOL
                    </p>
                  </div>
                </div>

                {/* Local signing notice */}
                <div className="mt-3 p-3 bg-secondary rounded-md border">
                  <p className="text-sm font-medium text-primary mb-2">Local Transaction Signing</p>
                  <p className="text-xs text-muted-foreground">
                    Your private key will remain secure on your device. The transaction will be signed locally and submitted directly to the Solana network via RPC.
                  </p>
                </div>
              </CardContent>
            </Card>
            
            {/* Confirmation Checkbox */}
            <div className="flex items-center space-x-2 p-4 border rounded-lg">
              <Checkbox
                id="confirmDeposit"
                checked={isConfirmed}
                onCheckedChange={(checked) => setIsConfirmed(checked as boolean)}
              />
              <label
                htmlFor="confirmDeposit"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I confirm this deposit transaction
              </label>
            </div>
            
            {/* Buttons */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCurrentStep(0)}>
                Back
              </Button>
              <Button
                onClick={handleDeposit}
                disabled={!isConfirmed || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-background border-t-transparent animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  "Deposit SOL"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};