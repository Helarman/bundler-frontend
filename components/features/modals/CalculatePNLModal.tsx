import React, { useState, useEffect } from 'react';
import { BarChart2, CheckCircle, ChevronLeft, ChevronRight, Info, Search, X } from 'lucide-react';
import { getWallets } from '@/lib/utils/Utils';
import PnlCard from '../PnlCard';
import { createPortal } from 'react-dom';
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
import { Progress } from "@/components/ui/progress";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { cn } from "@/lib/utils";

const STEPS_PNL = ['Select Wallets', 'View Results', 'Share Card'];

interface BasePnlModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PnlModalProps extends BasePnlModalProps {
  handleRefresh: () => void;
  tokenAddress: string;
}

interface PnlData {
  profit: number;
  timestamp: string;
}

export const PnlModal: React.FC<PnlModalProps> = ({
  isOpen,
  onClose,
  handleRefresh,
  tokenAddress
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedWallets, setSelectedWallets] = useState<string[]>([]);
  const [pnlData, setPnlData] = useState<Record<string, PnlData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState('address');
  const [sortDirection, setSortDirection] = useState('asc');

  const wallets = getWallets();

  useEffect(() => {
    if (isOpen) {
      handleRefresh();
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setCurrentStep(0);
    setSelectedWallets([]);
    setPnlData({});
    setSearchTerm('');
    setSortOption('address');
    setSortDirection('asc');
  };

  const handleNext = () => {
    if (currentStep === 0 && selectedWallets.length === 0) {
      toast("Please select at least one wallet");
      return;
    }
    
    if (currentStep === 0) {
      fetchPnlData();
    }
    
    setCurrentStep(prev => Math.min(prev + 1, STEPS_PNL.length - 1));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const fetchPnlData = async () => {
    if (selectedWallets.length === 0) return;
    
    setIsLoading(true);
    try {
      const addresses = selectedWallets.map(privateKey => 
        wallets.find(wallet => wallet.privateKey === privateKey)?.address || ''
      ).filter(address => address !== '').join(',');
      
      const baseUrl = (window as any).tradingServerUrl.replace(/\/+$/, '');
      const response = await fetch(`${baseUrl}/api/analytics/pnl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addresses,
          tokenAddress,
          options: {
            includeTimestamp: true
          }
        }),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const result = await response.json();
      if (result.success) {
        setPnlData(result.data);
      } else {
        throw new Error('Failed to calculate PNL');
      }
    } catch (error) {
      console.error('Error:', error);
      toast("Failed to fetch PNL data")
    } finally {
      setIsLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const toggleWalletSelection = (privateKey: string) => {
    setSelectedWallets(prev => 
      prev.includes(privateKey) 
        ? prev.filter(key => key !== privateKey) 
        : [...prev, privateKey]
    );
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatProfit = (profit: number) => {
    return {
      text: profit > 0 ? `+${profit.toFixed(4)}` : profit.toFixed(4),
      class: profit > 0 ? 'text-green-500' : profit < 0 ? 'text-red-500' : 'text-muted-foreground'
    };
  };

  const filterWallets = (walletList: any[], search: string) => {
    let filtered = walletList;
    
    if (search) {
      filtered = filtered.filter(wallet => 
        wallet.address.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    return filtered.sort((a, b) => {
      if (sortOption === 'address') {
        return sortDirection === 'asc' 
          ? a.address.localeCompare(b.address)
          : b.address.localeCompare(a.address);
      }
      return 0;
    });
  };

  const getAddressFromPrivateKey = (privateKey: string) => {
    return wallets.find(wallet => wallet.privateKey === privateKey)?.address || '';
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <BarChart2 className="w-5 h-5 mr-2 text-primary" />
            <span className="font-mono">TOKEN PNL CALCULATOR</span>
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Calculate profit and loss across multiple wallets
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Progress 
            value={((currentStep + 1) / STEPS_PNL.length) * 100} 
            className="h-1"
          />

          {/* Step 1: Select Wallets */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-1 rounded-full bg-primary/10">
                    <Search className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="font-medium font-mono">SELECT WALLETS</h3>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-sm font-mono">TOKEN ADDRESS</CardTitle>
                    <Badge variant="secondary" className="font-mono">
                      {formatAddress(tokenAddress)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
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
                    {filterWallets(wallets, searchTerm).length > 0 ? (
                      filterWallets(wallets, searchTerm).map((wallet) => (
                        <div 
                          key={wallet.id}
                          onClick={() => toggleWalletSelection(wallet.privateKey)}
                          className={cn(
                            "flex items-center p-2 hover:bg-accent cursor-pointer transition-all",
                            selectedWallets.includes(wallet.privateKey) && "bg-primary/10"
                          )}
                        >
                          <div className={cn(
                            "w-5 h-5 mr-3 rounded flex items-center justify-center transition-all",
                            selectedWallets.includes(wallet.privateKey)
                              ? "bg-primary text-primary-foreground"
                              : "border border-muted"
                          )}>
                            {selectedWallets.includes(wallet.privateKey) && (
                              <CheckCircle className="w-4 h-4" />
                            )}
                          </div>
                          <span className="font-mono text-sm">
                            {formatAddress(wallet.address)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        {searchTerm ? "No wallets found" : "No wallets available"}
                      </div>
                    )}
                  </ScrollArea>

                  {selectedWallets.length > 0 && (
                    <Card>
                      <CardHeader className="p-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-mono">Selected Wallets: {selectedWallets.length}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedWallets([])}
                            className="h-6 text-xs"
                          >
                            Clear All
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="p-3 pt-0">
                        <div className="flex flex-wrap gap-2">
                          {selectedWallets.slice(0, 5).map((privateKey) => {
                            const address = getAddressFromPrivateKey(privateKey);
                            return (
                              <Badge 
                                key={privateKey} 
                                variant="secondary"
                                className="font-mono flex items-center"
                              >
                                {formatAddress(address)}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleWalletSelection(privateKey);
                                  }}
                                  className="ml-1"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </Badge>
                            );
                          })}
                          {selectedWallets.length > 5 && (
                            <Badge variant="outline" className="font-mono">
                              +{selectedWallets.length - 5} more
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 2: View Results */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-1 rounded-full bg-primary/10">
                    <Info className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="font-medium font-mono">PNL RESULTS</h3>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(2)}
                  className="font-mono text-sm"
                >
                  Create Share Card
                </Button>
              </div>

              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-sm font-mono">TOKEN ADDRESS</CardTitle>
                    <Badge variant="secondary" className="font-mono">
                      {formatAddress(tokenAddress)}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-sm font-mono">WALLETS ANALYZED</CardTitle>
                    <Badge variant="outline" className="font-mono">
                      {selectedWallets.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="h-12 w-12 border-4 border-muted border-t-primary rounded-full animate-spin mb-4" />
                      <p className="font-mono">Calculating PNL across wallets...</p>
                    </div>
                  ) : (
                    <>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="font-mono">Wallet</TableHead>
                            <TableHead className="text-right font-mono">PNL</TableHead>
                            <TableHead className="text-right font-mono">Balance</TableHead>
                            <TableHead className="text-right font-mono">Last Update</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedWallets.map(privateKey => {
                            const address = getAddressFromPrivateKey(privateKey);
                            const data = pnlData[address];
                            const profit = data ? formatProfit(data.profit) : { text: '0.0000', class: 'text-muted-foreground' };
                            return (
                              <TableRow key={privateKey}>
                                <TableCell className="font-mono">
                                  {formatAddress(address)}
                                </TableCell>
                                <TableCell className={`text-right font-mono ${profit.class}`}>
                                  {data ? profit.text : '-'}
                                </TableCell>
                                <TableCell className="text-right font-mono">-</TableCell>
                                <TableCell className="text-right font-mono text-muted-foreground">
                                  {data ? formatTimestamp(data.timestamp) : '-'}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm font-mono">PNL SUMMARY</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {(() => {
                              let totalProfit = 0;
                              let bestAddress = '';
                              let bestProfit = -Infinity;
                              let worstAddress = '';
                              let worstProfit = Infinity;
                              
                              selectedWallets.forEach(privateKey => {
                                const address = getAddressFromPrivateKey(privateKey);
                                const data = pnlData[address];
                                if (data) {
                                  totalProfit += data.profit;
                                  
                                  if (data.profit > bestProfit) {
                                    bestProfit = data.profit;
                                    bestAddress = address;
                                  }
                                  
                                  if (data.profit < worstProfit) {
                                    worstProfit = data.profit;
                                    worstAddress = address;
                                  }
                                }
                              });
                              
                              const hasData = Object.keys(pnlData).length > 0;
                              
                              return (
                                <>
                                  <div className="flex justify-between">
                                    <span className="text-sm font-mono">Total PNL:</span>
                                    <span className={cn(
                                      "text-sm font-mono",
                                      totalProfit > 0 ? 'text-green-500' : totalProfit < 0 ? 'text-red-500' : 'text-muted-foreground'
                                    )}>
                                      {hasData ? (totalProfit > 0 ? '+' : '') + totalProfit.toFixed(4) : '-'}
                                    </span>
                                  </div>
                                  
                                  <div className="flex justify-between">
                                    <span className="text-sm font-mono">Best Performer:</span>
                                    <div className="flex items-center">
                                      {hasData && bestProfit !== -Infinity ? (
                                        <>
                                          <span className="text-sm font-mono mr-2">
                                            {formatAddress(bestAddress)}
                                          </span>
                                          <span className="text-sm font-mono text-green-500">
                                            {bestProfit > 0 ? '+' : ''}{bestProfit.toFixed(4)}
                                          </span>
                                        </>
                                      ) : (
                                        <span className="text-sm font-mono text-muted-foreground">-</span>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="flex justify-between">
                                    <span className="text-sm font-mono">Worst Performer:</span>
                                    <div className="flex items-center">
                                      {hasData && worstProfit !== Infinity ? (
                                        <>
                                          <span className="text-sm font-mono mr-2">
                                            {formatAddress(worstAddress)}
                                          </span>
                                          <span className={cn(
                                            "text-sm font-mono",
                                            worstProfit < 0 ? 'text-red-500' : 'text-green-500'
                                          )}>
                                            {worstProfit > 0 ? '+' : ''}{worstProfit.toFixed(4)}
                                          </span>
                                        </>
                                      ) : (
                                        <span className="text-sm font-mono text-muted-foreground">-</span>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="flex justify-between">
                                    <span className="text-sm font-mono">Profitable Wallets:</span>
                                    <span className="text-sm font-mono text-green-500">
                                      {hasData ? Object.values(pnlData).filter(data => data.profit > 0).length : '-'}
                                    </span>
                                  </div>
                                  
                                  <div className="flex justify-between">
                                    <span className="text-sm font-mono">Unprofitable Wallets:</span>
                                    <span className="text-sm font-mono text-red-500">
                                      {hasData ? Object.values(pnlData).filter(data => data.profit < 0).length : '-'}
                                    </span>
                                  </div>
                                </>
                              );
                            })()}
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm font-mono">DATA INFO</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-sm font-mono">Data Updated:</span>
                              <span className="text-sm font-mono">
                                {Object.values(pnlData).length > 0 
                                  ? new Date(Math.max(...Object.values(pnlData).map(d => new Date(d.timestamp).getTime()))).toLocaleString() 
                                  : '-'}
                              </span>
                            </div>
                            
                            <div className="flex justify-between">
                              <span className="text-sm font-mono">Wallets With Data:</span>
                              <span className="text-sm font-mono">
                                {Object.keys(pnlData).length} / {selectedWallets.length}
                              </span>
                            </div>
                            
                            <div className="text-xs font-mono text-muted-foreground">
                              PNL data shows the calculated profit or loss for each wallet based on buys and sells.
                            </div>
                            
                            {Object.keys(pnlData).length < selectedWallets.length && (
                              <div className="flex items-start p-2 bg-secondary rounded text-xs font-mono">
                                <Info className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0 text-primary" />
                                <span>
                                  Some selected wallets don't have PNL data available. This may be because they have no history with this token.
                                </span>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 3: Share Card */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="p-1 rounded-full bg-primary/10">
                  <BarChart2 className="w-4 h-4 text-primary" />
                </div>
                <h3 className="font-medium font-mono">PNL SHARE CARD</h3>
              </div>
              
              <Card>
                <CardContent className="p-4">
                  <PnlCard 
                    pnlData={pnlData} 
                    tokenAddress={tokenAddress} 
                    backgroundImageUrl="https://i.ibb.co/tpzsPFdS/imgPnl.jpg"
                  />
                </CardContent>
              </Card>
              
              <div className="p-3 bg-secondary rounded-lg text-sm font-mono">
                Download this card to share your PNL results with others. All sensitive wallet information is hidden.
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={currentStep === 0 ? onClose : handleBack}
              disabled={isSubmitting}
            >
              {currentStep === 0 ? 'Cancel' : (
                <>
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </>
              )}
            </Button>

            {currentStep === 0 && (
              <Button
                onClick={handleNext}
                disabled={isSubmitting || selectedWallets.length === 0}
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-muted border-t-primary animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    Calculate PNL
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            )}
            
            {currentStep === 1 && (
              <Button onClick={() => setCurrentStep(2)}>
                Create Share Card
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
            
            {currentStep === 2 && (
              <Button onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};