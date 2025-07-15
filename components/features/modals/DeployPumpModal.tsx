import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { PlusCircle, X, CheckCircle, Info, Search, ChevronRight, Settings, DollarSign, ArrowUp, ArrowDown, Upload, RefreshCw } from 'lucide-react';
import { getWallets } from '@/lib/utils/Utils';
import { executePumpCreate, WalletForPumpCreate, TokenCreationConfig } from '@/lib/utils/pumpcreate';
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { Wallet } from '@/lib/types/wallet';
import { ErrorType } from '@/lib/types/error';

const STEPS_DEPLOY = ["Token Details", "Select Wallets", "Review"];
const MAX_WALLETS = 5;

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DeployPumpModalProps extends BaseModalProps {
  onDeploy: (data: any) => void;
  handleRefresh: () => void;
  solBalances: Map<string, number>;
}

export const DeployPumpModal: React.FC<DeployPumpModalProps> = ({
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
  const [mintPubkey, setMintPubkey] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [tokenData, setTokenData] = useState({
    name: '',
    symbol: '',
    description: '',
    telegram: '',
    twitter: '',
    website: '',
    file: ''
  });
  const [walletAmounts, setWalletAmounts] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState('address');
  const [sortDirection, setSortDirection] = useState('asc');
  const [balanceFilter, setBalanceFilter] = useState('all');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allWallets = getWallets();
  const wallets = allWallets.filter(wallet => (solBalances.get(wallet.address) || 0) > 0);

  const generateMintPubkey = async () => {
    setIsGenerating(true);
    try {
      const baseUrl = (window as any).tradingServerUrl.replace(/\/+$/, '');
      const mintResponse = await fetch(`${baseUrl}/api/utilities/generate-mint`);
      const data = await mintResponse.json();
      setMintPubkey(data.pubkey);
      toast("Mint pubkey generated successfully");
    } catch (error) {
      console.error('Error generating mint pubkey:', error);
      toast("Failed to generate mint pubkey");
    }
    setIsGenerating(false);
  };

  const handleImageUpload = async (e : any) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      toast("Please select a valid image file (JPEG, PNG, GIF, SVG)");
      return;
    }
    
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
          setTokenData(prev => ({ ...prev, file: response.url }));
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

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  useEffect(() => {
    if (isOpen) {
      handleRefresh();
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
        if (!tokenData.name || !tokenData.symbol || !tokenData.file || !mintPubkey) {
          toast("Name, symbol, logo image, and mint pubkey are required");
          return false;
        }
        break;
      case 1:
        case 2:
        if (selectedWallets.length === 0) {
          toast("Please select at least one wallet");
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
    if (!isConfirmed || !mintPubkey) return;

    setIsSubmitting(true);
    
    try {
      const pumpCreateWallets: WalletForPumpCreate[] = selectedWallets.map(privateKey => {
        const wallet = wallets.find(w => w.privateKey === privateKey);
        if (!wallet) throw new Error(`Wallet not found`);
        return {
          address: wallet.address,
          privateKey: privateKey
        };
      });
      
      const customAmounts = selectedWallets.map(key => parseFloat(walletAmounts[key]));
      
      const tokenCreationConfig: TokenCreationConfig = {
        mintPubkey: mintPubkey,
        config: {
          tokenCreation: {
            metadata: {
              name: tokenData.name,
              symbol: tokenData.symbol,
              description: tokenData.description,
              telegram: tokenData.telegram,
              twitter: tokenData.twitter,
              website: tokenData.website,
              file: tokenData.file
            },
            defaultSolAmount: customAmounts[0] || 0.1
          },
        }
      };
      
      const result = await executePumpCreate(
        pumpCreateWallets,
        tokenCreationConfig,
        customAmounts
      );
      
      if (result.success) {
        toast(`Token deployment successful! Mint address: ${result.mintAddress}`);
        setSelectedWallets([]);
        setWalletAmounts({});
        setMintPubkey('');
        setTokenData({
          name: '',
          symbol: '',
          description: '',
          telegram: '',
          twitter: '',
          website: '',
          file: ''
        });
        setIsConfirmed(false);
        setCurrentStep(0);
        onClose();
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
              <PlusCircle className="w-6 h-6 text-primary" />
              <h3 className="text-lg font-semibold">Token Details</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Mint Pubkey</Label>
                <Button
                  type="button"
                  onClick={generateMintPubkey}
                  disabled={isGenerating}
                  variant="outline"
                >
                  {isGenerating ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  {isGenerating ? "Generating..." : "Generate"}
                </Button>
              </div>
              <Input
                value={mintPubkey}
                onChange={(e) => setMintPubkey(e.target.value)}
                placeholder="Enter or generate a mint pubkey"
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Token Information</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input
                    value={tokenData.name}
                    onChange={(e) => setTokenData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter token name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Symbol *</Label>
                  <Input
                    value={tokenData.symbol}
                    onChange={(e) => setTokenData(prev => ({ ...prev, symbol: e.target.value }))}
                    placeholder="Enter token symbol"
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
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
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="mr-2 h-4 w-4" />
                      )}
                      {isUploading ? `Uploading... ${uploadProgress}%` : "Upload"}
                    </Button>
                    
                    {tokenData.file && (
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded overflow-hidden border">
                          <img 
                            src={tokenData.file}
                            alt="Logo Preview"
                            className="h-full w-full object-contain"
                          />
                        </div>
                        <Button
                          type="button"
                          onClick={() => setTokenData(prev => ({ ...prev, file: '' }))}
                          variant="ghost"
                          size="icon"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  {isUploading && (
                    <Progress value={uploadProgress} className="h-1.5 mt-2" />
                  )}
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    value={tokenData.description}
                    onChange={(e) => setTokenData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe your token"
                    rows={3}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Telegram</Label>
                  <Input
                    value={tokenData.telegram}
                    onChange={(e) => setTokenData(prev => ({ ...prev, telegram: e.target.value }))}
                    placeholder="t.me/yourgroup"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Twitter</Label>
                  <Input
                    value={tokenData.twitter}
                    onChange={(e) => setTokenData(prev => ({ ...prev, twitter: e.target.value }))}
                    placeholder="@yourhandle"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Website</Label>
                  <Input
                    value={tokenData.website}
                    onChange={(e) => setTokenData(prev => ({ ...prev, website: e.target.value }))}
                    placeholder="https://yoursite.com"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        );
        
      case 1:
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Settings className="w-6 h-6 text-primary" />
                <h3 className="text-lg font-semibold">Select Wallets & Order</h3>
              </div>
              <Button
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
            
            <div className="flex items-center gap-3">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary" />
                  <span>You can select a maximum of {MAX_WALLETS} wallets (including developer wallet)</span>
                </CardTitle>
              </CardHeader>
            </Card>

            {selectedWallets.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <span>Selected: {selectedWallets.length} / {MAX_WALLETS} wallet{selectedWallets.length !== 1 ? 's' : ''}</span>
                    <span>Total SOL: {calculateTotalAmount().toFixed(4)}</span>
                  </div>
                </CardHeader>
              </Card>
            )}

            <Card>
              <CardContent className="p-0">
                <ScrollArea className="h-[400px]">
                  {/* Selected Wallets */}
                  {selectedWallets.length > 0 && (
                    <div className="p-4 space-y-2">
                      <h4 className="text-sm font-medium">Selected Wallets</h4>
                      {selectedWallets.map((privateKey, index) => {
                        const wallet = getWalletByPrivateKey(privateKey);
                        const solBalance = wallet ? solBalances.get(wallet.address) || 0 : 0;
                        
                        return (
                          <Card key={index} className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <Button
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
                                    <Badge variant="secondary">{index === 0 ? 'DEVELOPER' : `#${index + 1}`}</Badge>
                                    <span className="font-medium">
                                      {wallet ? formatAddress(wallet.address) : 'UNKNOWN'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">Balance:</span>
                                    <span className="text-sm">{formatSolBalance(solBalance)} SOL</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="relative">
                                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    value={walletAmounts[privateKey] || ''}
                                    onChange={(e) => handleAmountChange(privateKey, e.target.value)}
                                    placeholder="Amount"
                                    className="w-32 pl-9"
                                  />
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleWalletSelection(privateKey)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* Available Wallets */}
                  {selectedWallets.length < MAX_WALLETS && (
                    <div className="p-4 space-y-2">
                      <h4 className="text-sm font-medium">Available Wallets</h4>
                      {filterWallets(wallets.filter(w => !selectedWallets.includes(w.privateKey)), searchTerm).map((wallet) => {
                        const solBalance = solBalances.get(wallet.address) || 0;
                        
                        return (
                          <Card
                            key={wallet.id}
                            className="p-3 cursor-pointer hover:bg-muted/50"
                            onClick={() => handleWalletSelection(wallet.privateKey)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-5 h-5 rounded-full border flex items-center justify-center">
                                  <PlusCircle className="h-4 w-4" />
                                </div>
                                <div className="space-y-1">
                                  <span className="font-medium">
                                    {formatAddress(wallet.address)}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">Balance:</span>
                                    <span className="text-sm">{formatSolBalance(solBalance)} SOL</span>
                                  </div>
                                </div>
                              </div>
                            </div>
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
                    <div className="text-center py-4">
                      <Badge variant="secondary">
                        Maximum number of wallets ({MAX_WALLETS}) reached
                      </Badge>
                      <p className="text-sm text-muted-foreground mt-1">
                        Remove a wallet to add a different one
                      </p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        );
  
      case 2:
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-primary" />
              <h3 className="text-lg font-semibold">Review Deployment</h3>
            </div>
  
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Token Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Token Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Name:</span>
                    <span className="text-sm">{tokenData.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Symbol:</span>
                    <span className="text-sm">{tokenData.symbol}</span>
                  </div>
                  {tokenData.description && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Description:</span>
                      <span className="text-sm text-right max-w-[70%]">
                        {tokenData.description.substring(0, 100)}{tokenData.description.length > 100 ? '...' : ''}
                      </span>
                    </div>
                  )}
                  {tokenData.file && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Logo:</span>
                      <div className="border rounded-lg p-1 w-12 h-12 flex items-center justify-center">
                        <img 
                          src={tokenData.file}
                          alt="Token Logo"
                          className="max-w-full max-h-full rounded object-contain"
                        />
                      </div>
                    </div>
                  )}
                  
                  <Separator />
                  
                  {(tokenData.telegram || tokenData.twitter || tokenData.website) && (
                    <>
                      <h4 className="text-sm font-medium">Social Links</h4>
                      {tokenData.telegram && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Telegram:</span>
                          <span className="text-sm text-primary">{tokenData.telegram}</span>
                        </div>
                      )}
                      {tokenData.twitter && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Twitter:</span>
                          <span className="text-sm text-primary">{tokenData.twitter}</span>
                        </div>
                      )}
                      {tokenData.website && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Website:</span>
                          <span className="text-sm text-primary">{tokenData.website}</span>
                        </div>
                      )}
                      <Separator />
                    </>
                  )}
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total SOL:</span>
                    <span className="text-sm text-primary">{calculateTotalAmount().toFixed(4)} SOL</span>
                  </div>
                </CardContent>
              </Card>
              
              {/* Selected Wallets */}
              <Card>
                <CardHeader>
                  <CardTitle>Selected Wallets</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    {selectedWallets.map((key, index) => {
                      const wallet = getWalletByPrivateKey(key);
                      const solBalance = wallet ? solBalances.get(wallet.address) || 0 : 0;
                      
                      return (
                        <Card key={index} className="p-3 mb-2">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">{index === 0 ? 'DEV' : `#${index + 1}`}</Badge>
                              <span className="text-sm">
                                {wallet ? formatAddress(wallet.address) : 'UNKNOWN'}
                              </span>
                            </div>
                            <div className="flex flex-col items-end">
                              <span className="text-xs text-muted-foreground">Current: {formatSolBalance(solBalance)} SOL</span>
                              <span className="text-sm text-primary">{walletAmounts[key]} SOL</span>
                            </div>
                          </div>
                        </Card>
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
                    checked={isConfirmed}
                    onCheckedChange={() => setIsConfirmed}
                  />
                  <Label className="cursor-pointer">
                    I confirm that I want to deploy this token using {selectedWallets.length} wallet{selectedWallets.length !== 1 ? 's' : ''}.
                    This action cannot be undone.
                  </Label>
                </div>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <PlusCircle className="w-6 h-6 text-primary" />
            <DialogTitle>Deploy Pump.fun Token</DialogTitle>
          </div>
          <DialogDescription>
            Step {currentStep + 1} of {STEPS_DEPLOY.length}: {STEPS_DEPLOY[currentStep]}
          </DialogDescription>
        </DialogHeader>
        
        <Progress 
          value={(currentStep + 1) / STEPS_DEPLOY.length * 100} 
          className="h-1.5" 
        />

        <form onSubmit={currentStep === STEPS_DEPLOY.length - 1 ? handleDeploy : (e) => e.preventDefault()}>
          <div className="min-h-[300px]">
            {renderStepContent()}
          </div>

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
              type={currentStep === STEPS_DEPLOY.length - 1 ? 'submit' : 'button'}
              onClick={currentStep === STEPS_DEPLOY.length - 1 ? undefined : handleNext}
              disabled={
                isSubmitting ||
                (currentStep === STEPS_DEPLOY.length - 1 && !isConfirmed)
              }
            >
              {currentStep === STEPS_DEPLOY.length - 1 ? (
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
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};