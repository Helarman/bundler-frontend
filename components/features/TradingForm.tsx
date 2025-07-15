import React from 'react';
import { ChevronDown, Users, ArrowDownCircle, ArrowUpCircle, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { Wallet } from '@/lib/types/wallet';


interface TradingCardProps {
  tokenAddress: string | null;
  wallets: Wallet[];
  selectedDex: string | null;
  setSelectedDex: (value: string) => void;
  buyAmount: string;
  setBuyAmount: (value: string) => void;
  sellAmount: string;
  setSellAmount: (value: string) => void;
  handleTradeSubmit: (wallets: Wallet[], isBuy: boolean) => void; 
  isLoading: boolean;
  dexOptions: Array<{ value: string; label: string }>;
  validateActiveWallets: any;
  getScriptName: any;
  countActiveWallets: (wallets: Wallet[]) => number; 
  maxWalletsConfig: Record<string, number>;
}
const TradingCard: React.FC<TradingCardProps> = ({ 
  tokenAddress, 
  wallets,
  selectedDex,
  setSelectedDex,
  buyAmount,
  setBuyAmount,
  sellAmount,
  setSellAmount,
  handleTradeSubmit,
  isLoading,
  dexOptions,
  validateActiveWallets,
  getScriptName,
  countActiveWallets,
  maxWalletsConfig
}) => {
  // Валидация суммы
  const validateAmount = (value: string, isBuy: boolean): boolean => {
    if (!value) return false;
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return false;
    
    if (isBuy) {
      // Валидация для покупки (SOL)
      return numValue > 0 && numValue <= 100; // Пример: от 0 до 100 SOL
    } else {
      // Валидация для продажи (%)
      return numValue > 0 && numValue <= 100; // Пример: от 0 до 100%
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'buy' | 'sell') => {
    const value = e.target.value.replace(/[^0-9.]/g, '');
    
    // Проверка на пустую строку или только точку
    if (value === '' || value === '.') {
      type === 'buy' ? setBuyAmount(value) : setSellAmount(value);
      return;
    }
    
    // Проверка на валидное число
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      type === 'buy' ? setBuyAmount(value) : setSellAmount(value);
    }
  };

  // Проверка валидности формы
  const isFormValid = (isBuy: boolean, amount: string): boolean => {
    if (!selectedDex || !tokenAddress || !amount || isLoading) return false;
    
    const scriptName = getScriptName(selectedDex, isBuy);
    const { isValid } = validateActiveWallets(wallets, scriptName);
    const isAmountValid = validateAmount(amount, isBuy);
    
    return isValid && isAmountValid;
  };

  const WalletCounter = () => {
    const isBuyValid = validateActiveWallets(wallets, getScriptName(selectedDex, true)).isValid;
    const isSellValid = validateActiveWallets(wallets, getScriptName(selectedDex, false)).isValid;
    const buyLimit = maxWalletsConfig[getScriptName(selectedDex, true)] || 0;
    const sellLimit = maxWalletsConfig[getScriptName(selectedDex, false)] || 0;
    const activeWallets = countActiveWallets(wallets);

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={cn(
              "flex items-center gap-2 px-3 py-2",
              isBuyValid && isSellValid ? 'border-primary/30' : 'border-destructive/30'
            )}
          >
            <Users size={14} className={isBuyValid && isSellValid ? 'text-primary' : 'text-destructive'} />
            <div className="text-sm font-mono">
              <span className={cn("font-medium", isBuyValid && isSellValid ? 'text-primary' : 'text-destructive')}>
                {activeWallets}
              </span>
              <span className="text-muted-foreground">/{Math.max(buyLimit, sellLimit)}</span>
            </div>
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="font-mono">
          <p>WALLETS ACTIVE</p>
          {!isBuyValid && <p className="text-destructive">Not enough wallets for buy</p>}
          {!isSellValid && <p className="text-destructive">Not enough wallets for sell</p>}
        </TooltipContent>
      </Tooltip>
    );
  };

  const TradeButton = ({ isBuy, amount }: { isBuy: boolean; amount: string }) => {
    const isValid = isFormValid(isBuy, amount);
    const scriptName = getScriptName(selectedDex || '', isBuy);
    const { isValid: isWalletsValid } = validateActiveWallets(wallets, scriptName);
    const isAmountValid = validateAmount(amount, isBuy);

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={() => handleTradeSubmit(wallets, isBuy)}
            disabled={!isValid}
            variant="outline"
            size="icon"
            className={cn(
              "p-3",
              isBuy 
                ? 'border-primary text-primary hover:bg-primary/10' 
                : 'border-destructive text-destructive hover:bg-destructive/10',
              !isValid && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : isBuy ? (
              <ArrowUpCircle size={20} />
            ) : (
              <ArrowDownCircle size={20} />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent className="font-mono max-w-xs">
          {!selectedDex && <p className="text-destructive">Select DEX first</p>}
          {!tokenAddress && <p className="text-destructive">Token address required</p>}
          {!isWalletsValid && <p className="text-destructive">Not enough active wallets</p>}
          {!amount && <p className="text-destructive">Enter amount</p>}
          {amount && !isAmountValid && (
            <p className="text-destructive">
              {isBuy ? 'Invalid SOL amount (0-100)' : 'Invalid % amount (0-100)'}
            </p>
          )}
          {isValid && <p>{isBuy ? "Execute BUY order" : "Execute SELL order"}</p>}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="relative z-20">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <Select value={selectedDex || ''} onValueChange={setSelectedDex}>
            <SelectTrigger className="w-full sm:max-w-xs font-mono">
              <SelectValue placeholder="Select DEX" />
            </SelectTrigger>
            <SelectContent className="font-mono">
              {dexOptions.map((dex) => (
                <SelectItem key={dex.value} value={dex.value}>
                  {dex.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <WalletCounter />
        </div>
      </CardHeader>
      
      <CardContent className="relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3 p-4 rounded-lg border border-primary/20 bg-primary/5">
            <div className="flex items-center gap-2">
              <span className="block text-sm font-medium font-mono uppercase tracking-wider text-primary">Buy</span>
              <div className="text-xs text-muted-foreground font-mono">[SOL]</div>
            </div>
            <div className="flex items-center gap-3">
              <Input
                type="text"
                value={buyAmount}
                onChange={(e) => handleAmountChange(e, 'buy')}
                placeholder="0.5"
                disabled={!tokenAddress}
                className="font-mono"
              />
              <TradeButton isBuy={true} amount={buyAmount} />
            </div>
          </div>
          <div className="space-y-3 p-4 rounded-lg border border-destructive/20 bg-destructive/5">
            <div className="flex items-center gap-2">
              <span className="block text-sm font-medium font-mono uppercase tracking-wider text-destructive">Sell</span>
              <div className="text-xs text-destructive/60 font-mono">[%]</div>
            </div>
            <div className="flex items-center gap-3">
              <Input
                type="text"
                value={sellAmount}
                onChange={(e) => handleAmountChange(e, 'sell')}
                placeholder="20"
                disabled={!tokenAddress}
                className="font-mono border-destructive/40 focus:border-destructive focus:ring-destructive/40"
              />
              <TradeButton isBuy={false} amount={sellAmount} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TradingCard;