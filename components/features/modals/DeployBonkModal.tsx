import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { PlusCircle, X, CheckCircle, Info, Search, ChevronRight, Settings, DollarSign, ArrowUp, ArrowDown, Upload, RefreshCw, Copy, Check, ExternalLink } from 'lucide-react';
import { getWallets } from '@/lib/utils/Utils';

import { executeBonkCreate, WalletForBonkCreate, TokenMetadata, BonkCreateConfig } from '@/lib/utils/bonkcreate';
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
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Wallet } from '@/lib/types/wallet';
import { ErrorType } from '@/lib/types/error';

const STEPS_DEPLOY = ["Token Details", "Select Wallets", "Review"];
const MAX_WALLETS = 5; // Maximum number of wallets that can be selected

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DeployBonkModalProps extends BaseModalProps {
  onDeploy: (data: any) => void;
  handleRefresh: () => void;
  solBalances: Map<string, number>;
}

export const DeployBonkModal: React.FC<DeployBonkModalProps> = ({
  isOpen,
  onClose,
  onDeploy,
  handleRefresh,
  solBalances,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedWallets, setSelectedWallets] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deploymentSuccessData, setDeploymentSuccessData] = useState<{
    mintAddress?: string;
    poolId?: string;
  } | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [tokenData, setTokenData] = useState<TokenMetadata>({
    name: '',
    symbol: '',
    description: '',
    decimals: 6,
    supply: '1000000000000000',
    totalSellA: '793100000000000',
    telegram: '',
    twitter: '',
    website: '',
    createdOn: 'https://bonk.fun',
    uri: '' // image URL
  });
  const [walletAmounts, setWalletAmounts] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState('address');
  const [sortDirection, setSortDirection] = useState('asc');
  const [balanceFilter, setBalanceFilter] = useState('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Function to handle image upload
  const handleImageUpload = async (e : any) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      toast("Please select a valid image file (JPEG, PNG, GIF, SVG)");
      return;
    }
    
    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast("Image file size should be less than 2MB");
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const baseUrl = 'https://bsc.predator.bot';
      const uploadUrl = `${baseUrl}/upload-image`;
      
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      });
      
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const response = JSON.parse(xhr.responseText);
          setTokenData(prev => ({ ...prev, uri: response.url }));
          toast("Image uploaded successfully");
        } else {
          toast("Failed to upload image");
        }
        setIsUploading(false);
      });
      
      xhr.addEventListener('error', () => {
        toast("Failed to upload image");
        setIsUploading(false);
      });
      
      xhr.open('POST', uploadUrl);
      xhr.send(formData);
      
    } catch (error) {
      console.error('Error uploading image:', error);
      toast("Failed to upload image");
      setIsUploading(false);
    }
  };

  const copyToClipboard = async (text: string | undefined) => {
    if (!text) {
      toast("No address to copy");
      return;
    }
    
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      toast("Mint address copied to clipboard");
      
      setTimeout(() => {
        setCopySuccess(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      toast("Failed to copy to clipboard");
    }
  };

  const openInExplorer = (mintAddress: string | undefined) => {
    if (!mintAddress) {
      toast("No address to view in explorer");
      return;
    }
    
    window.open(`https://explorer.solana.com/address/${mintAddress}?cluster=mainnet-beta`, '_blank');
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const allWallets = getWallets();
  const wallets = allWallets.filter(wallet => (solBalances.get(wallet.address) || 0) > 0);

  useEffect(() => {
    if (isOpen) {
      handleRefresh();
      setCurrentStep(0);
      setSelectedWallets([]);
      setWalletAmounts({});
      setIsConfirmed(false);
      setDeploymentSuccessData(null);
      setCopySuccess(false);
    }
  }, [isOpen]);

  const filterWallets = (walletList : Wallet[], search: string) => {
    let filtered = walletList;
    if (search) {
      filtered = filtered.filter(wallet => 
        wallet.address.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    if (balanceFilter !== 'all') {
      if (balanceFilter === 'nonZero') {
        filtered = filtered.filter(wallet => (solBalances.get(wallet.address) || 0) > 0);
      } else if (balanceFilter === 'highBalance') {
        filtered = filtered.filter(wallet => (solBalances.get(wallet.address) || 0) >= 0.1);
      } else if (balanceFilter === 'lowBalance') {
        filtered = filtered.filter(wallet => (solBalances.get(wallet.address) || 0) < 0.1 && (solBalances.get(wallet.address) || 0) > 0);
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
      }
      return 0;
    });
  };

  const handleWalletSelection = (privateKey: string) => {
    setSelectedWallets(prev => {
      if (prev.includes(privateKey)) {
        return prev.filter(key => key !== privateKey);
      }
      if (prev.length >= MAX_WALLETS) {
        toast(`Maximum ${MAX_WALLETS} wallets can be selected`);
        return prev;
      }
      return [...prev, privateKey];
    });
  };

  const handleAmountChange = (privateKey: string, amount: string) => {
    if (amount === '' || /^\d*\.?\d*$/.test(amount)) {
      setWalletAmounts(prev => ({
        ...prev,
        [privateKey]: amount
      }));
    }
  };

  const validateStep = () => {
    switch (currentStep) {
      case 0:
        if (!tokenData.name || !tokenData.symbol || !tokenData.uri || !tokenData.description) {
          toast("Name, symbol, description and logo image are required");
          return false;
        }
        break;
      case 1:
        if (selectedWallets.length === 0) {
          toast("Please select at least one wallet");
          return false;
        }
        if (selectedWallets.length > MAX_WALLETS) {
          toast(`Maximum ${MAX_WALLETS} wallets can be selected`);
          return false;
        }
        const hasAllAmounts = selectedWallets.every(wallet => 
          walletAmounts[wallet] && Number(walletAmounts[wallet]) > 0
        );
        if (!hasAllAmounts) {
          toast("Please enter valid amounts for all selected wallets");
          return false;
        }
        break;
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    setCurrentStep(prev => Math.min(prev + 1, STEPS_DEPLOY.length - 1));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmed) return;

    setIsSubmitting(true);
    
    try {
      if (selectedWallets.length === 0) {
        throw new Error("No wallets selected");
      }
      
      const ownerPrivateKey = selectedWallets[0];
      const ownerWallet = wallets.find(w => w.privateKey === ownerPrivateKey);
      
      if (!ownerWallet) {
        throw new Error("Owner wallet not found");
      }
      
      const buyerWallets: WalletForBonkCreate[] = selectedWallets.slice(1).map(privateKey => {
        const wallet = wallets.find(w => w.privateKey === privateKey);
        if (!wallet) {
          throw new Error(`Wallet not found`);
        }
        return {
          publicKey: wallet.address,
          privateKey: privateKey,
          amount: parseFloat(walletAmounts[privateKey]) * 1e9
        };
      });
      
      const config: BonkCreateConfig = {
        tokenMetadata: tokenData,
        ownerPublicKey: ownerWallet.address,
        initialBuyAmount: parseFloat(walletAmounts[ownerPrivateKey]) || 0.1
      };
      
      const result = await executeBonkCreate(
        config,
        {
          publicKey: ownerWallet.address, 
          privateKey: ownerPrivateKey
        },
        buyerWallets
      );
      
      if (result.success && result.mintAddress && result.poolId) {
        toast(`Token deployment successful!`);
        setDeploymentSuccessData({
          mintAddress: result.mintAddress,
          poolId: result.poolId
        });
        setCurrentStep(3);
        onDeploy({
          mintAddress: result.mintAddress,
          poolId: result.poolId
        });
      } else {
        throw new Error(result.error || "Token deployment failed");
      }
    } catch (error) {
      console.error('Error during token deployment:', error);
      const err = error as ErrorType
      toast(`Token deployment failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewDeployment = () => {
    setSelectedWallets([]);
    setWalletAmounts({});
    setTokenData({
      name: '',
      symbol: '',
      description: '',
      decimals: 6,
      supply: '1000000000000000',
      totalSellA: '793100000000000',
      telegram: '',
      twitter: '',
      website: '',
      createdOn: 'https://bonk.fun',
      uri: ''
    });
    setIsConfirmed(false);
    setCurrentStep(0);
    setDeploymentSuccessData(null);
  };

  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const formatSolBalance = (balance: number) => {
    return balance.toFixed(4);
  };

  const calculateTotalAmount = () => {
    return selectedWallets.reduce((total, wallet) => {
      return total + (parseFloat(walletAmounts[wallet]) || 0);
    }, 0);
  };

  const getWalletByPrivateKey = (privateKey: string) => {
    return wallets.find(wallet => wallet.privateKey === privateKey);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-1 rounded-full bg-primary/10">
                <PlusCircle className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">
                Token Details
              </h3>
            </div>
            
            <Card>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="token-name">Name *</Label>
                    <Input
                      id="token-name"
                      value={tokenData.name}
                      onChange={(e) => setTokenData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter token name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="token-symbol">Symbol *</Label>
                    <Input
                      id="token-symbol"
                      value={tokenData.symbol}
                      onChange={(e) => setTokenData(prev => ({ ...prev, symbol: e.target.value }))}
                      placeholder="Enter token symbol"
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <Label>Token Logo *</Label>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      accept="image/jpeg, image/png, image/gif, image/svg+xml"
                      className="hidden"
                    />
                    
                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        onClick={triggerFileInput}
                        disabled={isUploading}
                        variant="outline"
                      >
                        {isUploading ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Uploading... {uploadProgress}%
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            Upload
                          </>
                        )}
                      </Button>
                      
                      {tokenData.uri && (
                        <div className="flex items-center gap-3 flex-grow">
                          <div className="h-12 w-12 rounded overflow-hidden border flex items-center justify-center">
                            <img 
                              src={tokenData.uri}
                              alt="Logo Preview"
                              className="max-h-full max-w-full object-contain"
                              onError={(e) => {
                                e.currentTarget.src = '/api/placeholder/48/48';
                                e.currentTarget.alt = 'Failed to load';
                              }}
                            />
                          </div>
                          <Button
                            type="button"
                            onClick={() => setTokenData(prev => ({ ...prev, uri: '' }))}
                            variant="ghost"
                            size="icon"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    {isUploading && (
                      <Progress value={uploadProgress} className="h-2" />
                    )}
                  </div>
                </div>
  
                <div className="space-y-2">
                  <Label htmlFor="token-description">Description *</Label>
                  <Textarea
                    id="token-description"
                    value={tokenData.description}
                    onChange={(e) => setTokenData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe your token"
                    rows={3}
                  />
                </div>
  
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="token-telegram">Telegram</Label>
                    <div className="relative">
                      <Input
                        id="token-telegram"
                        type="text"
                        value={tokenData.telegram}
                        onChange={(e) => setTokenData(prev => ({ ...prev, telegram: e.target.value }))}
                        placeholder="t.me/yourgroup"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="token-twitter">Twitter</Label>
                    <Input
                      id="token-twitter"
                      type="text"
                      value={tokenData.twitter}
                      onChange={(e) => setTokenData(prev => ({ ...prev, twitter: e.target.value }))}
                      placeholder="@yourhandle"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="token-website">Website</Label>
                    <Input
                      id="token-website"
                      type="text"
                      value={tokenData.website}
                      onChange={(e) => setTokenData(prev => ({ ...prev, website: e.target.value }))}
                      placeholder="https://yoursite.com"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
        
      case 1:
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <div className="p-1 rounded-full bg-primary/10 mr-3">
                  <Settings className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">
                  Select Wallets & Order
                </h3>
              </div>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  if (selectedWallets.length === wallets.length || selectedWallets.length > 0) {
                    setSelectedWallets([]);
                  } else {
                    const walletsToSelect = wallets.slice(0, MAX_WALLETS);
                    setSelectedWallets(walletsToSelect.map(w => w.privateKey));
                    if (wallets.length > MAX_WALLETS) {
                      toast(`Maximum ${MAX_WALLETS} wallets can be selected`);
                    }
                  }
                }}
              >
                {selectedWallets.length > 0 ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
  
            <div className="flex items-center space-x-3 mb-3">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
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
                  <SelectItem value="balance">Balance</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
              >
                {sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
              </Button>

              <Select value={balanceFilter} onValueChange={setBalanceFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Balances</SelectItem>
                  <SelectItem value="nonZero">Non-Zero</SelectItem>
                  <SelectItem value="highBalance">High Balance</SelectItem>
                  <SelectItem value="lowBalance">Low Balance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary" />
                  <span className="text-sm">
                    You can select a maximum of {MAX_WALLETS} wallets (including developer wallet)
                  </span>
                </div>
              </CardHeader>
              
              {selectedWallets.length > 0 && (
                <CardContent>
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Selected:</span>
                      <Badge>
                        {selectedWallets.length} / {MAX_WALLETS} wallet{selectedWallets.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Total SOL:</span>
                      <Badge variant="secondary">
                        {calculateTotalAmount().toFixed(4)} SOL
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              )}
              
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {selectedWallets.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium mb-2">Selected Wallets</h4>
                        {selectedWallets.map((privateKey, index) => {
                          const wallet = getWalletByPrivateKey(privateKey);
                          const solBalance = wallet ? solBalances.get(wallet.address) || 0 : 0;
                          
                          return (
                            <Card key={wallet?.id} className="mb-2">
                              <CardContent className="p-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                          if (index > 0) {
                                            const newOrder = [...selectedWallets];
                                            [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
                                            setSelectedWallets(newOrder);
                                          }
                                        }}
                                        disabled={index === 0}
                                      >
                                        <ArrowUp className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                          if (index < selectedWallets.length - 1) {
                                            const newOrder = [...selectedWallets];
                                            [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
                                            setSelectedWallets(newOrder);
                                          }
                                        }}
                                        disabled={index === selectedWallets.length - 1}
                                      >
                                        <ArrowDown className="h-4 w-4" />
                                      </Button>
                                    </div>
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline">
                                          {index === 0 ? 'Developer' : `#${index + 1}`}
                                        </Badge>
                                        <span className="font-medium">
                                          {wallet ? formatAddress(wallet.address) : 'Unknown'}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <span>Balance:</span>
                                        <span>{formatSolBalance(solBalance)} SOL</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <div className="relative">
                                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                      <Input
                                        type="text"
                                        value={walletAmounts[privateKey] || ''}
                                        onChange={(e) => handleAmountChange(privateKey, e.target.value)}
                                        placeholder="Amount"
                                        className="w-32 pl-9"
                                      />
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleWalletSelection(privateKey)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                    
                    {selectedWallets.length < MAX_WALLETS && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Available Wallets</h4>
                        {filterWallets(wallets.filter(w => !selectedWallets.includes(w.privateKey)), searchTerm).map((wallet) => {
                          const solBalance = solBalances.get(wallet.address) || 0;
                          
                          return (
                            <Card
                              key={wallet.id}
                              className="mb-2 cursor-pointer hover:bg-muted/50"
                              onClick={() => handleWalletSelection(wallet.privateKey)}
                            >
                              <CardContent className="p-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                    <div className="p-1 rounded-full border flex items-center justify-center">
                                      <PlusCircle className="h-4 w-4" />
                                    </div>
                                    <div className="space-y-1">
                                      <span className="font-medium">
                                        {formatAddress(wallet.address)}
                                      </span>
                                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <span>Balance:</span>
                                        <span>{formatSolBalance(solBalance)} SOL</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                        {filterWallets(wallets.filter(w => !selectedWallets.includes(w.privateKey)), searchTerm).length === 0 && (
                          <div className="text-center py-4 text-muted-foreground">
                            {searchTerm ? "No wallets found matching your search" : "No wallets available"}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {selectedWallets.length >= MAX_WALLETS && (
                      <div className="text-center py-4 bg-muted rounded-lg">
                        <div className="text-primary">
                          Maximum number of wallets ({MAX_WALLETS}) reached
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Remove a wallet to add a different one
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        );
  
      case 2:
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-1 rounded-full bg-primary/10">
                <CheckCircle className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">
                Review Deployment
              </h3>
            </div>
  
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Token Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Name:</span>
                      <span className="text-sm font-medium">{tokenData.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Symbol:</span>
                      <span className="text-sm font-medium">{tokenData.symbol}</span>
                    </div>
                    {tokenData.description && (
                      <div className="flex items-start justify-between">
                        <span className="text-sm text-muted-foreground">Description:</span>
                        <span className="text-sm text-right max-w-[70%]">
                          {tokenData.description.substring(0, 100)}{tokenData.description.length > 100 ? '...' : ''}
                        </span>
                      </div>
                    )}
                    {tokenData.uri && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Logo:</span>
                        <div className="bg-muted border rounded-lg p-1 w-12 h-12 flex items-center justify-center">
                          <img 
                            src={tokenData.uri}
                            alt="Token Logo"
                            className="max-w-full max-h-full rounded object-contain"
                            onError={(e) => {
                              e.currentTarget.src = '/api/placeholder/48/48';
                              e.currentTarget.alt = 'Failed to load';
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {(tokenData.telegram || tokenData.twitter || tokenData.website) && (
                    <>
                      <Separator />
                      <h4 className="text-sm font-medium">Social Links</h4>
                      <div className="space-y-2">
                        {tokenData.telegram && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Telegram:</span>
                            <span className="text-sm text-primary">{tokenData.telegram}</span>
                          </div>
                        )}
                        {tokenData.twitter && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Twitter:</span>
                            <span className="text-sm text-primary">{tokenData.twitter}</span>
                          </div>
                        )}
                        {tokenData.website && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Website:</span>
                            <span className="text-sm text-primary">{tokenData.website}</span>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                  
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total SOL:</span>
                      <span className="text-sm font-medium text-primary">{calculateTotalAmount().toFixed(4)} SOL</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Selected Wallets</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    {selectedWallets.map((key, index) => {
                      const wallet = getWalletByPrivateKey(key);
                      const solBalance = wallet ? solBalances.get(wallet.address) || 0 : 0;
                      
                      return (
                        <div key={index} className="flex justify-between items-center p-3 bg-muted rounded-lg mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="w-8 justify-center">
                              {index === 0 ? 'DEV' : `#${index + 1}`}
                            </Badge>
                            <span className="font-medium">
                              {wallet ? formatAddress(wallet.address) : 'Unknown'}
                            </span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-xs text-muted-foreground">Current: {formatSolBalance(solBalance)} SOL</span>
                            <span className="text-sm font-medium text-primary">{walletAmounts[key]} SOL</span>
                          </div>
                        </div>
                      );
                    })}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
  
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Checkbox
                    id="confirm-deploy"
                    checked={isConfirmed}
                    onCheckedChange={() => setIsConfirmed(!isConfirmed)}
                  />
                  <label
                    htmlFor="confirm-deploy"
                    className="text-sm leading-relaxed cursor-pointer select-none"
                  >
                    I confirm that I want to deploy this token using {selectedWallets.length} wallet{selectedWallets.length !== 1 ? 's' : ''}.
                    This action cannot be undone.
                  </label>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      
      case 3:
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-1 rounded-full bg-primary/10">
                <CheckCircle className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">
                Deployment Successful
              </h3>
            </div>
            
            <Card>
              <CardContent className="p-6 space-y-6">
                <div className="flex justify-center">
                  <div className="p-4 rounded-full bg-primary/10">
                    <CheckCircle className="w-12 h-12 text-primary" />
                  </div>
                </div>
                
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">Token Successfully Deployed!</h3>
                  <p className="text-muted-foreground">Your token has been created and is now live on the blockchain.</p>
                </div>
                
                <div className="bg-muted border rounded-lg p-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Mint Address:</Label>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deploymentSuccessData && copyToClipboard(deploymentSuccessData.mintAddress)}
                          >
                            {copySuccess ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deploymentSuccessData && openInExplorer(deploymentSuccessData.mintAddress)}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <Input
                        value={deploymentSuccessData?.mintAddress}
                        readOnly
                        onClick={(e) => e.currentTarget.select()}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Pool ID:</Label>
                      <Input
                        value={deploymentSuccessData?.poolId}
                        readOnly
                        onClick={(e) => e.currentTarget.select()}
                      />
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Token Name:</Label>
                        <span>{tokenData.name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Token Symbol:</Label>
                        <span>{tokenData.symbol}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-muted border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-medium">Next Steps:</h4>
                  </div>
                  <ul className="space-y-2 text-sm pl-6 list-disc">
                    <li>Your token is now tradable on Bonk.fun</li>
                    <li>Add liquidity or use the mint address to trade on DEXs</li>
                    <li>Share your token with the community through your social channels</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5" />
            Deploy Bonk Token
          </DialogTitle>
          <DialogDescription>
            {currentStep < 3 && (
              <Progress 
                value={(currentStep + 1) / STEPS_DEPLOY.length * 100} 
                className="h-1 mt-2"
              />
            )}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={currentStep === 2 ? handleDeploy : (e) => e.preventDefault()}>
          <div className="min-h-[300px]">
            {renderStepContent()}
          </div>

          <DialogFooter className="mt-6">
            {currentStep === 3 ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleNewDeployment}
                >
                  New Deployment
                </Button>
                <Button
                  type="button"
                  onClick={onClose}
                >
                  Close
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={currentStep === 0 ? onClose : handleBack}
                  disabled={isSubmitting}
                >
                  {currentStep === 0 ? 'Cancel' : 'Back'}
                </Button>

                <Button
                  type={currentStep === 2 ? 'submit' : 'button'}
                  onClick={currentStep === 2 ? undefined : handleNext}
                  disabled={currentStep === 2 ? (isSubmitting || !isConfirmed) : isSubmitting}
                >
                  {currentStep === 2 ? (
                    isSubmitting ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Deploying...
                      </>
                    ) : 'Confirm Deploy'
                  ) : (
                    <>
                      Next
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </>
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};