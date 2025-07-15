import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { PlusCircle, X, CheckCircle, Info, Search, ChevronRight, Settings, DollarSign, ArrowUp, ArrowDown, Upload, RefreshCw, Copy, Check, ExternalLink } from 'lucide-react';
import { getWallets } from '@/lib/utils/Utils';
import { executeBoopCreate, WalletForBoopCreate } from '@/lib/utils/boopcreate';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Wallet } from '@/lib/types/wallet';
import { ErrorType }  from '@/lib/types/error';

const STEPS_DEPLOY = ["Token Details", "Select Wallets", "Review"];
const MAX_WALLETS = 15;

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DeployBoopModalProps extends BaseModalProps {
  onDeploy: (data: any) => void;
  handleRefresh: () => void;
  solBalances: Map<string, number>;
}

interface TokenMetadata {
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
  totalSupply: string;
  links: Array<{url: string, label: string}>;
}

export const DeployBoopModal: React.FC<DeployBoopModalProps> = ({
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
  } | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [tokenData, setTokenData] = useState<TokenMetadata>({
    name: '',
    symbol: '',
    description: '',
    imageUrl: '',
    totalSupply: '42000000000',
    links: []
  });
  const [walletAmounts, setWalletAmounts] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState('address');
  const [sortDirection, setSortDirection] = useState('asc');
  const [balanceFilter, setBalanceFilter] = useState('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          setTokenData(prev => ({ ...prev, imageUrl: response.url }));
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

  const updateSocialLinks = (type: 'telegram' | 'twitter' | 'website', value: string) => {
    setTokenData(prev => {
      const filteredLinks = prev.links.filter(link => 
        (type === 'website' && !link.url.startsWith('http'))
      );
      
      let newLinks = [...filteredLinks];
      if (value) {
        let url = value;
        let label = '';
        
        if (type === 'telegram') {
          url = url.startsWith('https://t.me/') ? url : `https://t.me/${url.replace('@', '').replace('t.me/', '')}`;
          label = 'telegram';
        } else if (type === 'twitter') {
          url = url.startsWith('https://') ? url : `https://x.com/${url.replace('@', '').replace('twitter.com/', '').replace('x.com/', '')}`;
          label = 'twitter';
        } else if (type === 'website') {
          url = url.startsWith('http') ? url : `https://${url}`;
          label = 'website';
        }
        
        newLinks.push({ url, label });
      }
      
      return {
        ...prev,
        links: newLinks
      };
    });
  };

  const getTelegram = () => {
    const telegramLink = tokenData.links.find(link => link.label === 'telegram');
    return telegramLink ? telegramLink.url.replace('https://t.me/', '') : '';
  };
  
  const getTwitter = () => {
    const twitterLink = tokenData.links.find(link => link.label === 'twitter');
    return twitterLink ? twitterLink.url.replace('https://x.com/', '') : '';
  };
  
  const getWebsite = () => {
    const websiteLink = tokenData.links.find(link => link.label === 'website');
    return websiteLink ? websiteLink.url : '';
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
  const wallets = allWallets.filter(wallet => (solBalances.get(wallet.address) || 0 > 0));

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
      filtered = filtered.filter((wallet : Wallet) => 
        wallet.address.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    if (balanceFilter !== 'all') {
      if (balanceFilter === 'nonZero') {
        filtered = filtered.filter((wallet : Wallet) => (solBalances.get(wallet.address) || 0 > 0));
      } else if (balanceFilter === 'highBalance') {
        filtered = filtered.filter((wallet : Wallet) => (solBalances.get(wallet.address) || 0 >= 0.1));
      } else if (balanceFilter === 'lowBalance') {
        filtered = filtered.filter((wallet : Wallet) => (solBalances.get(wallet.address) || 0 < 0.1 && (solBalances.get(wallet.address) || 0 > 0)));
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
        if (!tokenData.name || !tokenData.symbol || !tokenData.imageUrl || !tokenData.description) {
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
      const walletObjs: WalletForBoopCreate[] = selectedWallets.map(privateKey => {
        const wallet = wallets.find(w => w.privateKey === privateKey);
        if (!wallet) {
          throw new Error(`Wallet not found for private key`);
        }
        return {
          address: wallet.address,
          privateKey
        };
      });
      
      const amountsArray = selectedWallets.map(key => parseFloat(walletAmounts[key] || "0.1"));
      
      const config = {
        config: {
          tokenCreation: {
            metadata: {
              name: tokenData.name,
              symbol: tokenData.symbol,
              description: tokenData.description,
              imageUrl: tokenData.imageUrl,
              totalSupply: tokenData.totalSupply,
              links: tokenData.links
            },
            defaultSolAmount: 0.1
          },
          jito: {
            tipAmount: 0.0005
          }
        }
      };
      
      console.log(`Starting token creation with ${walletObjs.length} wallets`);
      
      const result = await executeBoopCreate(
        walletObjs,
        config,
        amountsArray
      );
      
      if (result.success && result.mintAddress) {
        toast(`Token deployment successful!`);
        
        setDeploymentSuccessData({
          mintAddress: result.mintAddress
        });
        
        setCurrentStep(3);
        onDeploy({
          mintAddress: result.mintAddress
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
      imageUrl: '',
      totalSupply: '42000000000',
      links: []
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PlusCircle className="text-primary" />
                  <span>Token Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={tokenData.name}
                      onChange={(e) => setTokenData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Token name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="symbol">Symbol *</Label>
                    <Input
                      id="symbol"
                      value={tokenData.symbol}
                      onChange={(e) => setTokenData(prev => ({ ...prev, symbol: e.target.value }))}
                      placeholder="Token symbol"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Token Logo *</Label>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      accept="image/jpeg, image/png, image/gif, image/svg+xml"
                      className="hidden"
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        onClick={triggerFileInput}
                        disabled={isUploading}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        {isUploading ? (
                          <>
                            <RefreshCw className="animate-spin" />
                            <span>Uploading... {uploadProgress}%</span>
                          </>
                        ) : (
                          <>
                            <Upload />
                            <span>Upload</span>
                          </>
                        )}
                      </Button>
                      {tokenData.imageUrl && (
                        <div className="flex items-center gap-2">
                          <div className="h-12 w-12 rounded overflow-hidden border flex items-center justify-center">
                            <img 
                              src={tokenData.imageUrl}
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
                            onClick={() => setTokenData(prev => ({ ...prev, imageUrl: '' }))}
                            variant="ghost"
                            size="icon"
                          >
                            <X size={14} />
                          </Button>
                        </div>
                      )}
                    </div>
                    {isUploading && (
                      <Progress value={uploadProgress} className="w-full" />
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={tokenData.description}
                    onChange={(e) => setTokenData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Token description"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="totalSupply">Total Supply</Label>
                  <Input
                    id="totalSupply"
                    value={tokenData.totalSupply}
                    onChange={(e) => {
                      if (/^\d*$/.test(e.target.value)) {
                        setTokenData(prev => ({ ...prev, totalSupply: e.target.value }))
                      }
                    }}
                    placeholder="Total supply (default: 42 billion)"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="telegram">Telegram</Label>
                    <div className="relative">
                      <Input
                        id="telegram"
                        value={getTelegram()}
                        onChange={(e) => updateSocialLinks('telegram', e.target.value)}
                        placeholder="t.me/yourgroup"
                        className="pl-8"
                      />
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21.8,5.1c-0.2-0.8-0.9-1.4-1.7-1.6C18.4,3,12,3,12,3S5.6,3,3.9,3.5C3.1,3.7,2.4,4.3,2.2,5.1C1.7,6.8,1.7,10,1.7,10s0,3.2,0.5,4.9c0.2,0.8,0.9,1.4,1.7,1.6C5.6,17,12,17,12,17s6.4,0,8.1-0.5c0.8-0.2,1.5-0.8,1.7-1.6c0.5-1.7,0.5-4.9,0.5-4.9S22.3,6.8,21.8,5.1z M9.9,13.1V6.9l5.4,3.1L9.9,13.1z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="twitter">Twitter</Label>
                    <div className="relative">
                      <Input
                        id="twitter"
                        value={getTwitter()}
                        onChange={(e) => updateSocialLinks('twitter', e.target.value)}
                        placeholder="@yourhandle"
                        className="pl-8"
                      />
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M22 4.01c-1 .49-1.98.689-3 .99-1.121-1.265-2.783-1.335-4.38-.737S11.977 6.323 12 8v1c-3.245.083-6.135-1.395-8-4 0 0-4.182 7.433 4 11-1.872 1.247-3.739 2.088-6 2 3.308 1.803 6.913 2.423 10.034 1.517 3.58-1.04 6.522-3.723 7.651-7.742a13.84 13.84 0 0 0 .497-3.753C20.18 7.773 21.692 5.25 22 4.009z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <div className="relative">
                      <Input
                        id="website"
                        value={getWebsite()}
                        onChange={(e) => updateSocialLinks('website', e.target.value)}
                        placeholder="https://yoursite.com"
                        className="pl-8"
                      />
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0zm14-6a9 9 0 0 0-4-2m-6 2a9 9 0 0 0-2 4m2 6a9 9 0 0 0 4 2m6-2a9 9 0 0 0 2-4" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
        
      case 1:
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="text-primary" />
                    <span>Select Wallets & Order</span>
                  </CardTitle>
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
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <Input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search wallets..."
                      className="pl-9"
                    />
                  </div>
                  
                  <Select value={sortOption} onValueChange={setSortOption}>
                    <SelectTrigger className="w-[180px]">
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
                    {sortDirection === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                  </Button>

                  <Select value={balanceFilter} onValueChange={setBalanceFilter}>
                    <SelectTrigger className="w-[180px]">
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

                <div className="flex items-center gap-2 p-3 bg-secondary rounded-lg">
                  <Info size={14} />
                  <span className="text-sm">
                    You can select a maximum of {MAX_WALLETS} wallets
                  </span>
                </div>

                {selectedWallets.length > 0 && (
                  <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Selected:</span>
                      <Badge>
                        {selectedWallets.length} / {MAX_WALLETS} wallet{selectedWallets.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Total SOL:</span>
                      <Badge variant="outline">
                        {calculateTotalAmount().toFixed(4)} SOL
                      </Badge>
                    </div>
                  </div>
                )}

                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {selectedWallets.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium mb-2">Selected Wallets</h4>
                        {selectedWallets.map((privateKey, index) => {
                          const wallet = getWalletByPrivateKey(privateKey);
                          const solBalance = wallet ? solBalances.get(wallet.address) || 0 : 0;
                          
                          return (
                            <Card key={wallet?.id} className="mb-2">
                              <CardContent className="p-4">
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
                                        <ArrowUp size={16} />
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
                                        <ArrowDown size={16} />
                                      </Button>
                                    </div>
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <Badge variant="secondary">
                                          {index === 0 ? 'Creator' : `#${index + 1}`}
                                        </Badge>
                                        <span className="font-mono">
                                          {wallet ? formatAddress(wallet.address) : 'Unknown'}
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
                                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                                      <Input
                                        type="text"
                                        value={walletAmounts[privateKey] || ''}
                                        onChange={(e) => handleAmountChange(privateKey, e.target.value)}
                                        placeholder="Amount"
                                        className="w-32 pl-8"
                                      />
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleWalletSelection(privateKey)}
                                    >
                                      <X size={18} />
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
                              className="mb-2 hover:bg-secondary cursor-pointer"
                              onClick={() => handleWalletSelection(wallet.privateKey)}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8"
                                    >
                                      <PlusCircle size={14} />
                                    </Button>
                                    <div className="space-y-1">
                                      <span className="font-mono">
                                        {formatAddress(wallet.address)}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm text-muted-foreground">Balance:</span>
                                        <span className="text-sm">{formatSolBalance(solBalance)} SOL</span>
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
                      <div className="text-center py-4 bg-secondary rounded-lg">
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="text-primary" />
                  <span>Review Deployment</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Token Details */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Token Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Name:</span>
                        <span className="text-sm">{tokenData.name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Symbol:</span>
                        <span className="text-sm">{tokenData.symbol}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Supply:</span>
                        <span className="text-sm">{parseInt(tokenData.totalSupply).toLocaleString()}</span>
                      </div>
                      {tokenData.description && (
                        <div className="flex items-start justify-between">
                          <span className="text-sm text-muted-foreground">Description:</span>
                          <span className="text-sm text-right max-w-[70%]">
                            {tokenData.description.substring(0, 100)}{tokenData.description.length > 100 ? '...' : ''}
                          </span>
                        </div>
                      )}
                      {tokenData.imageUrl && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Logo:</span>
                          <div className="border rounded-lg p-1 w-12 h-12 flex items-center justify-center">
                            <img 
                              src={tokenData.imageUrl}
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
                      
                      {tokenData.links.length > 0 && (
                        <>
                          <Separator />
                          <h4 className="text-sm font-medium">Social Links</h4>
                          <div className="space-y-2">
                            {getTelegram() && (
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Telegram:</span>
                                <span className="text-sm text-primary">{getTelegram()}</span>
                              </div>
                            )}
                            {getTwitter() && (
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Twitter:</span>
                                <span className="text-sm text-primary">{getTwitter()}</span>
                              </div>
                            )}
                            {getWebsite() && (
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Website:</span>
                                <span className="text-sm text-primary">{getWebsite()}</span>
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
                  
                  {/* Selected Wallets */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Selected Wallets</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[300px]">
                        {selectedWallets.map((key, index) => {
                          const wallet = getWalletByPrivateKey(key);
                          const solBalance = wallet ? solBalances.get(wallet.address) || 0 : 0;
                          
                          return (
                            <div key={index} className="flex justify-between items-center p-3 bg-secondary rounded-lg mb-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="w-6 text-center">
                                  {index === 0 ? 'Cret' : index + 1}
                                </Badge>
                                <span className="font-mono text-sm">
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
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Checkbox
                    id="confirm"
                    checked={isConfirmed}
                    onCheckedChange={() => setIsConfirmed(!isConfirmed)}
                  />
                  <label
                    htmlFor="confirm"
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="text-primary" />
                  <span>Deployment Successful</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Success Icon */}
                <div className="flex justify-center">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <CheckCircle size={48} className="text-primary" />
                  </div>
                </div>
                
                {/* Success Message */}
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">Token Successfully Deployed!</h3>
                  <p className="text-muted-foreground">Your token has been created and is now live on the Solana blockchain.</p>
                </div>
                
                {/* Token Info */}
                <Card>
                  <CardContent className="p-4 grid gap-4">
                    {/* Mint Address */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Mint Address:</Label>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => deploymentSuccessData && copyToClipboard(deploymentSuccessData.mintAddress)}
                            title="Copy to clipboard"
                          >
                            {copySuccess ? <Check size={16} /> : <Copy size={16} />}
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => deploymentSuccessData && openInExplorer(deploymentSuccessData.mintAddress)}
                            title="View in Explorer"
                          >
                            <ExternalLink size={16} />
                          </Button>
                        </div>
                      </div>
                      <div className="flex">
                        <Input
                          type="text"
                          value={deploymentSuccessData?.mintAddress}
                          readOnly
                          onClick={(e) => e.currentTarget.select()}
                        />
                      </div>
                    </div>
                    
                    {/* Token Details Summary */}
                    <div className="space-y-2 pt-2 border-t">
                      <div className="flex items-center justify-between">
                        <Label>Token Name:</Label>
                        <span className="text-sm">{tokenData.name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Token Symbol:</Label>
                        <span className="text-sm">{tokenData.symbol}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Instructions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Info size={16} />
                      <span>Next Steps</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm pl-6 list-disc">
                      <li>Your token has been successfully deployed on Solana</li>
                      <li>Copy the mint address to add liquidity or trade on DEXs</li>
                      <li>Share your token with the community through your social channels</li>
                    </ul>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  if (!isOpen) return null;

  return(
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusCircle className="text-primary" />
            <span>Deploy Boop Token</span>
          </DialogTitle>
        </DialogHeader>

        {/* Progress Indicator - Only show for steps 0-2 */}
        {currentStep < 3 && (
          <Progress 
            value={(currentStep + 1) / STEPS_DEPLOY.length * 100} 
            className="w-full"
          />
        )}

        <form onSubmit={currentStep === 2 ? handleDeploy : (e) => e.preventDefault()}>
          <div className="min-h-[300px]">
            {renderStepContent()}
          </div>

          <div className="flex justify-between mt-8 pt-4 border-t">
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
                        <div className="h-4 w-4 rounded-full border-2 border-background border-t-transparent animate-spin mr-2"></div>
                        <span>Deploying...</span>
                      </>
                    ) : 'Confirm Deploy'
                  ) : (
                    <span className="flex items-center">
                      Next
                      <ChevronRight size={16} className="ml-1" />
                    </span>
                  )}
                </Button>
              </>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};