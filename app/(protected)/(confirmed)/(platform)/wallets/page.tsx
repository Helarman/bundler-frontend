'use client'

import React, { useState, useEffect, useRef, lazy } from 'react';
import { Connection } from '@solana/web3.js';
import { WalletsPage } from '@/components/features/wallet/Wallets';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, Upload, FileUp, Download, Trash2, X, Copy } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Wallet as WalletType } from '@/lib/types/wallet';

import { 
  createNewWallet,
  importWallet,
  saveWalletsToCookies,
  loadWalletsFromCookies,
  loadConfigFromCookies,
  downloadPrivateKey,
  downloadAllWallets, 
  deleteWallet, 
  formatAddress,
  copyToClipboard,
  ConfigType,
  fetchSolBalance,
  fetchTokenBalance,
  loadTokenAddressFromCookies,
  saveConfigToCookies,
} from '@/lib/utils/Utils'
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const WalletManager: React.FC = () => {
    const router = useRouter()
    
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [tokenAddress, setTokenAddress] = useState(() => loadTokenAddressFromCookies());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importKey, setImportKey] = useState('');
  const [config, setConfig] = useState<ConfigType>({
    rpcEndpoint: 'https://smart-special-thunder.solana-mainnet.quiknode.pro/1366b058465380d24920f9d348f85325455d398d/',
    transactionFee: '0.000005',
    apiKey: ''
  });
  const [currentPage, setCurrentPage] = useState<'wallets' | 'chart' | 'actions'>('wallets');
  const [wallets, setWallets] = useState<WalletType[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [solBalances, setSolBalances] = useState<Map<string, number>>(new Map());
  const [tokenBalances, setTokenBalances] = useState<Map<string, number>>(new Map());
  const [importError, setImportError] = useState<string | null>(null);
  const [ammKey, setAmmKey] = useState<string | null>(null);
  const [isLoadingChart, setIsLoadingChart] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');




  // Function to fetch SOL balances for all wallets
  const fetchSolBalances = async () => {
    if (!connection) return new Map<string, number>();
    
    const newBalances = new Map<string, number>();
    
    const promises = wallets.map(async (wallet) => {
      try {
        const balance = await fetchSolBalance(connection, wallet.address);
        newBalances.set(wallet.address, balance);
      } catch (error) {
        console.error(`Error fetching SOL balance for ${wallet.address}:`, error);
        newBalances.set(wallet.address, 0);
      }
    });
    
    await Promise.all(promises);
    setSolBalances(newBalances);
    return newBalances;
  };

  // Function to fetch token balances for all wallets
  const fetchTokenBalances = async () => {
    if (!connection || !tokenAddress) return new Map<string, number>();
    
    const newBalances = new Map<string, number>();
    
    const promises = wallets.map(async (wallet) => {
      try {
        const balance = await fetchTokenBalance(connection, wallet.address, tokenAddress);
        newBalances.set(wallet.address, balance);
      } catch (error) {
        console.error(`Error fetching token balance for ${wallet.address}:`, error);
        newBalances.set(wallet.address, 0);
      }
    });
    
    await Promise.all(promises);
    setTokenBalances(newBalances);
    return newBalances;
  };

  const fetchAmmKey = async (tokenAddress: string) => {
    if (!tokenAddress) return null;
    setIsLoadingChart(true);
    try {
      const response = await fetch(
        `https://quote-api.jup.ag/v6/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=${tokenAddress}&amount=100000000&slippageBps=1`
      );
      const data = await response.json();
      if (data.routePlan?.[0]?.swapInfo?.ammKey) {
        setAmmKey(data.routePlan[0].swapInfo.ammKey);
      }
    } catch (error) {
      console.error('Error fetching AMM key:', error);
    }
    setIsLoadingChart(false);
  };

  useEffect(() => {
    // Function to extract API key from URL and clean the URL
    const handleApiKeyFromUrl = () => {
      const url = new URL(window.location.href);
      const apiKey = url.searchParams.get('apikey');
      
      if (apiKey) {
        console.log('API key found in URL, saving to config');
        
        setConfig(prev => {
          const newConfig = { ...prev, apiKey };
          saveConfigToCookies(newConfig);
          return newConfig;
        });
        
        url.searchParams.delete('apikey');
        window.history.replaceState({}, document.title, url.toString());
        
       
      }
    };
    
    handleApiKeyFromUrl();
  }, []);

  useEffect(() => {
    if (tokenAddress) {
      fetchAmmKey(tokenAddress);
    }
  }, [tokenAddress]);
  
  useEffect(() => {
    const initializeApp = () => {
      const savedConfig = loadConfigFromCookies();
      if (savedConfig) {
        setConfig(savedConfig);
        
        try {
          const conn = new Connection(savedConfig.rpcEndpoint);
          setConnection(conn);
        } catch (error) {
          console.error('Error creating connection:', error);
        }
      }
      
      const savedWallets = loadWalletsFromCookies();
      if (savedWallets && savedWallets.length > 0) {
        setWallets(savedWallets);
      }
    };

    initializeApp();
  }, []);

  useEffect(() => {
    if (wallets.length > 0) {
      saveWalletsToCookies(wallets);
    }
  }, [wallets]);

  useEffect(() => {
    if (connection && wallets.length > 0) {
      fetchSolBalances();
    }
  }, [connection, wallets.length]);

  useEffect(() => {
    if (connection && wallets.length > 0 && tokenAddress) {
      fetchTokenBalances();
    }
  }, [connection, wallets.length, tokenAddress]);

  const handleSortWallets = () => {
    setWallets(prev => {
      const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      setSortDirection(newDirection);
      
      return [...prev].sort((a, b) => {
        const balanceA = solBalances.get(a.address) || 0;
        const balanceB = solBalances.get(b.address) || 0;
        
        if (newDirection === 'asc') {
          return balanceA - balanceB;
        } else {
          return balanceB - balanceA;
        }
      });
    });
  };
  
  const handleCleanupWallets = () => {
    setWallets(prev => {
      const seenAddresses = new Set<string>();
      let emptyCount = 0;
      let duplicateCount = 0;
      
      const cleanedWallets = prev.filter(wallet => {
        const solBalance = solBalances.get(wallet.address) || 0;
        const tokenBalance = tokenBalances.get(wallet.address) || 0;
        
        if (solBalance <= 0 && tokenBalance <= 0) {
          emptyCount++;
          return false;
        }
        
        if (seenAddresses.has(wallet.address)) {
          duplicateCount++;
          return false;
        }
        
        seenAddresses.add(wallet.address);
        return true;
      });

      if (emptyCount > 0 || duplicateCount > 0) {
        const messages: string[] = [];
        if (emptyCount > 0) {
          messages.push(`${emptyCount} empty wallet${emptyCount === 1 ? '' : 's'}`);
        }
        if (duplicateCount > 0) {
          messages.push(`${duplicateCount} duplicate${duplicateCount === 1 ? '' : 's'}`);
        }
        toast(`Removed ${messages.join(' and ')}`);
      } else {
        toast("No empty wallets or duplicates found");
      }
      
      return cleanedWallets;
    });
  };

  useEffect(() => {
    try {
      const conn = new Connection(config.rpcEndpoint);
      setConnection(conn);
    } catch (error) {
      console.error('Error creating connection:', error);
    }
  }, [config.rpcEndpoint]);

  useEffect(() => {
    if (connection && wallets.length > 0) {
      handleRefresh();
    }
  }, [connection]);

  useEffect(() => {
    if (connection && wallets.length > 0 && tokenAddress) {
      handleRefresh();
    }
  }, [tokenAddress]);

  const handleRefresh = async () => {
    if (!connection) return;
    
    setIsRefreshing(true);
    
    try {
      await fetchSolBalances();
      
      if (tokenAddress) {
        await fetchTokenBalances();
      }
    } catch (error) {
      console.error('Error refreshing balances:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCreateWallet = async () => {
    if (!connection) return;
    
    try {
      const newWallet = await createNewWallet();
      setWallets(prev => {
        const newWallets = [...prev, newWallet];
        saveWalletsToCookies(newWallets);
        return newWallets;
      });
      
      const solBalance = await fetchSolBalance(connection, newWallet.address);
      setSolBalances(prev => {
        const newBalances = new Map(prev);
        newBalances.set(newWallet.address, solBalance);
        return newBalances;
      });
      
      setTokenBalances(prev => {
        const newBalances = new Map(prev);
        newBalances.set(newWallet.address, 0);
        return newBalances;
      });
      
      toast("Wallet created successfully");
    } catch (error) {
      console.error('Error creating wallet:', error);
    }
  };

  const handleImportWallet = async () => {
    if (!connection || !importKey.trim()) {
      setImportError('Please enter a private key');
      return;
    }
    
    try {
      const { wallet, error } = await importWallet(importKey.trim());
      
      if (error) {
        setImportError(error);
        return;
      }
      
      if (wallet) {
        const exists = wallets.some(w => w.address === wallet.address);
        if (exists) {
          setImportError('Wallet already exists');
          return;
        }
        
        setWallets(prev => [...prev, wallet]);
        
        const solBalance = await fetchSolBalance(connection, wallet.address);
        setSolBalances(prev => {
          const newBalances = new Map(prev);
          newBalances.set(wallet.address, solBalance);
          return newBalances;
        });
        
        if (tokenAddress) {
          const tokenBalance = await fetchTokenBalance(connection, wallet.address, tokenAddress);
          setTokenBalances(prev => {
            const newBalances = new Map(prev);
            newBalances.set(wallet.address, tokenBalance);
            return newBalances;
          });
        } else {
          setTokenBalances(prev => {
            const newBalances = new Map(prev);
            newBalances.set(wallet.address, 0);
            return newBalances;
          });
        }
        
        setImportKey('');
        setImportError(null);
        setIsImporting(false);
      } else {
        setImportError('Failed to import wallet');
      }
    } catch (error) {
      console.error('Error in handleImportWallet:', error);
      setImportError('Failed to import wallet');
    }
  };



  const handleDeleteWallet = (id: number) => {
    const walletToDelete = wallets.find(w => w.id === id);
    if (walletToDelete) {
      setSolBalances(prev => {
        const newBalances = new Map(prev);
        newBalances.delete(walletToDelete.address);
        return newBalances;
      });
      
      setTokenBalances(prev => {
        const newBalances = new Map(prev);
        newBalances.delete(walletToDelete.address);
        return newBalances;
      });
    }
    
    setWallets(prev => deleteWallet(prev, id));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !connection) return;

    setIsProcessingFile(true);
    setImportError(null);

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/);
      
      const base58Pattern = /^[1-9A-HJ-NP-Za-km-z]{64,88}$/;
      const foundKeys = lines
        .map(line => line.trim())
        .filter(line => base58Pattern.test(line));
      
      if (foundKeys.length === 0) {
        setImportError('No valid private keys found in file');
        setIsProcessingFile(false);
        return;
      }

      const importWalletsSequentially = async () => {
        const importedWallets: WalletType[] = [];
        const newSolBalances = new Map(solBalances);
        const newTokenBalances = new Map(tokenBalances);
        
        for (const key of foundKeys) {
          try {
            const { wallet, error } = await importWallet(key);
            
            if (error || !wallet) continue;
            
            const exists = wallets.some(w => w.address === wallet.address);
            if (exists) continue;
            
            importedWallets.push(wallet);
            
            const solBalance = await fetchSolBalance(connection, wallet.address);
            newSolBalances.set(wallet.address, solBalance);
            
            if (tokenAddress) {
              const tokenBalance = await fetchTokenBalance(connection, wallet.address, tokenAddress);
              newTokenBalances.set(wallet.address, tokenBalance);
            } else {
              newTokenBalances.set(wallet.address, 0);
            }
            
            await new Promise(resolve => setTimeout(resolve, 10));
          } catch (error) {
            console.error('Error importing wallet:', error);
          }
        }
        
        setSolBalances(newSolBalances);
        setTokenBalances(newTokenBalances);
        
        return importedWallets;
      };

      const importedWallets = await importWalletsSequentially();
      
      if (importedWallets.length === 0) {
        setImportError('No new wallets could be imported');
      } else {
        setWallets(prev => {
          const newWallets = [...prev, ...importedWallets];
          return newWallets;
        });
        toast(`Successfully imported ${importedWallets.length} wallets`);
      }
    } catch (error) {
      console.error('Error processing file:', error);
      setImportError('Error processing file');
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  const [tickEffect, setTickEffect] = useState(false);
  
  useEffect(() => {
    setTickEffect(true);
    const timer = setTimeout(() => setTickEffect(false), 500);
    return () => clearTimeout(timer);
  }, [wallets.length]);

 return (
    <div className="flex-col items-center justify-between mb-6 bg-pink-100">
      {connection ? (
          <WalletsPage
            wallets={wallets}
            setWallets={setWallets}
            handleRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            setIsModalOpen={setIsModalOpen}
            tokenAddress={tokenAddress}
            sortDirection={sortDirection}
            handleSortWallets={handleSortWallets}
            connection={connection}
            solBalances={solBalances}
            tokenBalances={tokenBalances}
          />
        ) : (
          <div className="p-4 text-center text-muted-foreground">
            <div className="loading-anim inline-block">
              <div className="h-4 w-4 rounded-full bg-primary mx-auto"></div>
            </div>
            <p className="mt-2 font-mono">CONNECTING TO NETWORK...</p>
          </div>
        )
      }
      

      {isModalOpen && (
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent >
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <span>Wallet Manager</span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={handleCreateWallet}
                    >
                      <Plus className="h-4 w-4" />
                      Create
                    </Button>

                    <Button 
                      variant="outline" 
                      onClick={() => setIsImporting(true)}
                    >
                      <Upload className="h-4 w-4 " />
                      Import
                    </Button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={isProcessingFile}
                    />

                    <Button 
                      variant="outline" 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessingFile}
                    >
                      <FileUp className={`h-4 w-4 ${isProcessingFile ? 'text-[#02b36d50]' : ''}`} />
                      Upload
                    </Button>

                    <Button 
                      variant="outline" 
                      onClick={() => downloadAllWallets(wallets)}
                    >
                      <Download className="h-4 w-4 " />
                      Downdload
                    </Button>

                    <Button 
                      variant="destructive" 
                      onClick={handleCleanupWallets}
                    >
                      <Trash2 className="h-4 w-4 " />
                      Remove Empty
                    </Button>
              </div>
            {isImporting && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <Label>Import private key</Label>
                  <Input
                    placeholder="Enter private key (base58)"
                    value={importKey}
                    onChange={(e) => {
                      setImportKey(e.target.value);
                      setImportError(null);
                    }}
                    className={`${importError ? 'border-[#ff2244]' : ''}`}
                  />
                  {importError && (
                    <Badge variant="destructive" className="flex items-center">
                      <span className="mr-1">!</span> {importError}
                    </Badge>
                  )}
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setIsImporting(false);
                        setImportKey('');
                        setImportError(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleImportWallet}
                    >
                      Import
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

          <ScrollArea className="h-[50vh]">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Address</TableHead>
                    <TableHead className="text-right">SOL Balance</TableHead>
                    {tokenAddress && <TableHead className="text-right">Token Balance</TableHead>}
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wallets.map((wallet) => (
                    <TableRow key={wallet.id}>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span 
                              className="text-sm font-mono cursor-pointer hover:underline transition-colors duration-300"
                              onClick={async () => {
                                const success = await copyToClipboard(wallet.address);
                                if (success) {
                                  setCopiedAddress(wallet.address);
                                  setTimeout(() => setCopiedAddress(null), 2000);
                                }
                              }}
                            >
                              {formatAddress(wallet.address)}
                              {copiedAddress === wallet.address && (
                                <span className="ml-2 text-xs opacity-0 animate-[fadeIn_0.3s_forwards]">
                                  Copied
                                </span>
                              )}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>Click to copy address</TooltipContent>
                        </Tooltip>
                      </TableCell>
                      
                      <TableCell className="text-right">
                        <span className="text-sm font-mono">
                          <span className="text-[#7ddfbd]">{(solBalances.get(wallet.address) || 0).toFixed(4)}</span> SOL
                        </span>
                      </TableCell>
                      
                      {tokenAddress && (
                        <TableCell className="text-right">
                          <span className="text-sm font-mono">
                            {(tokenBalances.get(wallet.address) || 0).toLocaleString()} Tokens
                          </span>
                        </TableCell>
                      )}
                      
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="hover:bg-[#ff224420] h-8 w-8"
                                onClick={() => handleDeleteWallet(wallet.id)}
                              >
                                <Trash2 className="h-4 w-4 text-[#ff2244]" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Remove Wallet</TooltipContent>
                          </Tooltip>
                          
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="hover:bg-[#02b36d20] h-8 w-8"
                                onClick={() => downloadPrivateKey(wallet)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Download PrivateKey</TooltipContent>
                          </Tooltip>
                          
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost" 
                                size="icon" 
                                className="hover:bg-[#02b36d20] h-8 w-8"
                                onClick={async () => {
                                  await copyToClipboard(wallet.privateKey);
                                }}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copy PrivateKey</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
      )}
    </div>
);
};

export default WalletManager;