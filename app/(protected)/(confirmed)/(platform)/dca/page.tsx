'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { DcaClient } from '@/lib/api/dca-client'
import { DcaAccountEntity, UpdateDcaAccountDto, DcaTxType } from '@/lib/types/dca-accounts';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Copy, ChevronDown, Check, Trash2, Power, RefreshCw } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

export default function DcaManagementPage() {
  const [accounts, setAccounts] = useState<DcaAccountEntity[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<DcaAccountEntity | null>(null);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showReservesDialog, setShowReservesDialog] = useState(false);
  const [showDelayDialog, setShowDelayDialog] = useState(false);
  const [showBumpDialog, setShowBumpDialog] = useState(false);
  
  const [accountConfig, setAccountConfig] = useState({
    canBuy: false,
    canSell: false,
    maxTokenPrice: 0,
    minTokenPrice: 0,
    minTokenAmountPerSale: 0,
    balanceUsagePercent: 0,
    maxTokenAmount: 0,
  });

  const [reservesConfig, setReservesConfig] = useState({
    reserveSolAmount: 0,
    reserveTokenAmount: 0,
  });

  const [delayConfig, setDelayConfig] = useState({
    minDelay: 0,
    maxDelay: 0,
  });

  const [bumpAmount, setBumpAmount] = useState(0);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setIsLoading(true);
      const data = await DcaClient.getAccounts();
      setAccounts(data);
      setSelectedAccounts([]);
    } catch (error) {
      toast.error('Failed to load DCA accounts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleAllAccounts = async (activate: boolean) => {
    try {
      setIsLoading(true);
      const data = await (activate 
        ? DcaClient.activateAllAccounts() 
        : DcaClient.deactivateAllAccounts());
      setAccounts(data);
      toast.success(`All accounts ${activate ? 'activated' : 'deactivated'}`);
    } catch (error) {
      toast.error(`Failed to ${activate ? 'activate' : 'deactivate'} accounts`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleAccount = async (accountId: string, isActive: boolean) => {
    try {
      setIsLoading(true);
      const account = await DcaClient.toggleAccountActivation(accountId, isActive);
      setAccounts(accounts.map(a => a.accountId === accountId ? account : a));
      toast.success(`Account ${isActive ? 'activated' : 'deactivated'}`);
    } catch (error) {
      toast.error('Failed to update account status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateAccount = async (accountId: string, payload: UpdateDcaAccountDto) => {
    try {
      setIsLoading(true);
      const account = await DcaClient.updateAccount(accountId, payload);
      setAccounts(accounts.map(a => a.accountId === accountId ? account : a));
      setShowConfigDialog(false);
      setShowReservesDialog(false);
      setShowDelayDialog(false);
      setShowBumpDialog(false);
      toast.success('Account updated successfully');
    } catch (error) {
      toast.error('Failed to update account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateAllAccounts = async (payload: UpdateDcaAccountDto) => {
    try {
      setIsLoading(true);
      const data = await DcaClient.updateAllAccounts(payload);
      setAccounts(data);
      toast.success('All accounts updated successfully');
    } catch (error) {
      toast.error('Failed to update accounts');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const toggleSelectAccount = (accountId: string) => {
    setSelectedAccounts(prev => 
      prev.includes(accountId) 
        ? prev.filter(id => id !== accountId) 
        : [...prev, accountId]
    );
  };

  const toggleSelectAllAccounts = () => {
    if (selectedAccounts.length === accounts.length) {
      setSelectedAccounts([]);
    } else {
      setSelectedAccounts(accounts.map(account => account.accountId));
    }
  };

  const prepareConfigDialog = (account: DcaAccountEntity) => {
    setSelectedAccount(account);
    setAccountConfig({
      canBuy: account.canBuy,
      canSell: account.canSell,
      maxTokenPrice: account.maxTokenPrice,
      minTokenPrice: account.minTokenPrice,
      minTokenAmountPerSale: account.minTokenAmountPerSale,
      balanceUsagePercent: account.balanceUsagePercent,
      maxTokenAmount: account.maxTokenAmount,
    });
    setShowConfigDialog(true);
  };

  const prepareReservesDialog = (account: DcaAccountEntity) => {
    setSelectedAccount(account);
    setReservesConfig({
      reserveSolAmount: account.reserveSolAmount,
      reserveTokenAmount: account.reserveTokenAmount,
    });
    setShowReservesDialog(true);
  };

  const prepareDelayDialog = (account: DcaAccountEntity) => {
    setSelectedAccount(account);
    setDelayConfig({
      minDelay: account.minDelayBetweenTxsInSeconds,
      maxDelay: account.maxDelayBetweenTxsInSeconds,
    });
    setShowDelayDialog(true);
  };

  const prepareBumpDialog = (account: DcaAccountEntity) => {
    setSelectedAccount(account);
    setBumpAmount(account.bumpOperateSolAmount);
    setShowBumpDialog(true);
  };

  const formatDate = (date?: Date | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString();
  };

const truncateAccountId = (accountId: string) => {
    if (accountId.length <= 8) return accountId;
    return `${accountId.slice(0, 4)}...${accountId.slice(-4)}`;
  };


  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">DCA Accounts Management</h1>
        <div className="flex gap-2">
          <Button onClick={loadAccounts} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleToggleAllAccounts(true)}
            disabled={isLoading}
          >
            <Power className="mr-2 h-4 w-4 text-green-500" />
            Activate All
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleToggleAllAccounts(false)}
            disabled={isLoading}
          >
            <Power className="mr-2 h-4 w-4 text-red-500" />
            Deactivate All
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Button
                variant="outline"
                size="icon"
                onClick={toggleSelectAllAccounts}
                className="h-8 w-8 p-0"
              >
                {selectedAccounts.length === accounts.length ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <></>
                )}
              </Button>
            </TableHead>
            <TableHead>Account</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Buy/Sell</TableHead>
            <TableHead>Price Range</TableHead>
            <TableHead>Reserves</TableHead>
            <TableHead>Delays</TableHead>
            <TableHead>Balances</TableHead>
            <TableHead>Last TX</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((account) => (
            <TableRow key={`account-${account.accountId}`}>
              <TableCell>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => toggleSelectAccount(account.accountId)}
                  className="h-8 w-8 p-0"
                >
                  {selectedAccounts.includes(account.accountId) && (
                    <Check className="h-4 w-4" />
                  )}
                </Button>
              </TableCell>
              <TableCell>
                <div className="flex items-center">
                  <span className="font-mono text-sm"> {truncateAccountId(account.accountId)}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(account.accountId)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={account.isActive}
                    onCheckedChange={(checked) => handleToggleAccount(account.accountId, checked)}
                    disabled={isLoading}
                  />
                  <Badge variant={account.isActive ? 'default' : 'secondary'}>
                    {account.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  {account.allowNextAt && new Date(account.allowNextAt) > new Date() && (
                    <Badge variant="outline">
                      Cooldown
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Badge variant={account.canBuy ? 'default' : 'secondary'}>
                    Buy
                  </Badge>
                  <Badge variant={account.canSell ? 'default' : 'secondary'}>
                    Sell
                  </Badge>
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  <div>Max: {account.maxTokenPrice}</div>
                  <div>Min: {account.minTokenPrice}</div>
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  <div>SOL: {account.reserveSolAmount}</div>
                  <div>Token: {account.reserveTokenAmount}</div>
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  <div>Min: {account.minDelayBetweenTxsInSeconds}s</div>
                  <div>Max: {account.maxDelayBetweenTxsInSeconds}s</div>
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  <div>SOL: {account.account?.balance || 0}</div>
                  <div>Token: {account.account?.tokenBalance || 0}</div>
                  <div>Usage: {account.balanceUsagePercent}%</div>
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  <div>Type: {account.lastTxType || 'None'}</div>
                  <div>Next: {formatDate(account.allowNextAt)}</div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => prepareConfigDialog(account)}
                  >
                    Config
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => prepareReservesDialog(account)}
                  >
                    Reserves
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => prepareDelayDialog(account)}
                  >
                    Delays
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => prepareBumpDialog(account)}
                  >
                    Bump
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Config Dialog */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>DCA Configuration</DialogTitle>
            <DialogDescription>
              Configure buy/sell settings for {selectedAccount?.accountId}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex items-center space-x-2">
              <Switch 
                id="canBuy" 
                checked={accountConfig.canBuy}
                onCheckedChange={(checked) => setAccountConfig({...accountConfig, canBuy: checked})}
              />
              <Label htmlFor="canBuy">Enable Buying</Label>
            </div>
            
            {accountConfig.canBuy && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="maxTokenPrice" className="text-right">
                    Max Token Price
                  </Label>
                  <Input
                    id="maxTokenPrice"
                    type="number"
                    className="col-span-3"
                    value={accountConfig.maxTokenPrice}
                    onChange={(e) => setAccountConfig({...accountConfig, maxTokenPrice: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="minTokenPrice" className="text-right">
                    Min Token Price
                  </Label>
                  <Input
                    id="minTokenPrice"
                    type="number"
                    className="col-span-3"
                    value={accountConfig.minTokenPrice}
                    onChange={(e) => setAccountConfig({...accountConfig, minTokenPrice: parseFloat(e.target.value)})}
                  />
                </div>
              </>
            )}

            <div className="flex items-center space-x-2">
              <Switch 
                id="canSell" 
                checked={accountConfig.canSell}
                onCheckedChange={(checked) => setAccountConfig({...accountConfig, canSell: checked})}
              />
              <Label htmlFor="canSell">Enable Selling</Label>
            </div>

            {accountConfig.canSell && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="minTokenAmountPerSale" className="text-right">
                    Min Token Amount
                  </Label>
                  <Input
                    id="minTokenAmountPerSale"
                    type="number"
                    className="col-span-3"
                    value={accountConfig.minTokenAmountPerSale}
                    onChange={(e) => setAccountConfig({...accountConfig, minTokenAmountPerSale: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="maxTokenAmount" className="text-right">
                    Max Token Amount
                  </Label>
                  <Input
                    id="maxTokenAmount"
                    type="number"
                    className="col-span-3"
                    value={accountConfig.maxTokenAmount}
                    onChange={(e) => setAccountConfig({...accountConfig, maxTokenAmount: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="balanceUsagePercent" className="text-right">
                    Balance Usage %
                  </Label>
                  <Input
                    id="balanceUsagePercent"
                    type="number"
                    className="col-span-3"
                    value={accountConfig.balanceUsagePercent}
                    onChange={(e) => setAccountConfig({...accountConfig, balanceUsagePercent: parseFloat(e.target.value)})}
                    min="0"
                    max="100"
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button 
              onClick={() => selectedAccount && handleUpdateAccount(
                selectedAccount.accountId, 
                {
                  canBuy: accountConfig.canBuy,
                  canSell: accountConfig.canSell,
                  maxTokenPrice: accountConfig.maxTokenPrice,
                  minTokenPrice: accountConfig.minTokenPrice,
                  minTokenAmountPerSale: accountConfig.minTokenAmountPerSale,
                  maxTokenAmount: accountConfig.maxTokenAmount,
                  balanceUsagePercent: accountConfig.balanceUsagePercent,
                }
              )}
              disabled={isLoading}
            >
              Save Changes
            </Button>
            <Button 
              variant="secondary"
              onClick={() => selectedAccounts.length > 0 && handleUpdateAllAccounts(
                {
                  canBuy: accountConfig.canBuy,
                  canSell: accountConfig.canSell,
                  maxTokenPrice: accountConfig.maxTokenPrice,
                  minTokenPrice: accountConfig.minTokenPrice,
                  minTokenAmountPerSale: accountConfig.minTokenAmountPerSale,
                  maxTokenAmount: accountConfig.maxTokenAmount,
                  balanceUsagePercent: accountConfig.balanceUsagePercent,
                }
              )}
              disabled={isLoading || selectedAccounts.length === 0}
            >
              Apply to Selected ({selectedAccounts.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reserves Dialog */}
      <Dialog open={showReservesDialog} onOpenChange={setShowReservesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reserves Configuration</DialogTitle>
            <DialogDescription>
              Set reserve amounts for {selectedAccount?.accountId}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="reserveSolAmount" className="text-right">
                SOL Reserve
              </Label>
              <Input
                id="reserveSolAmount"
                type="number"
                className="col-span-3"
                value={reservesConfig.reserveSolAmount}
                onChange={(e) => setReservesConfig({...reservesConfig, reserveSolAmount: parseFloat(e.target.value)})}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="reserveTokenAmount" className="text-right">
                Token Reserve
              </Label>
              <Input
                id="reserveTokenAmount"
                type="number"
                className="col-span-3"
                value={reservesConfig.reserveTokenAmount}
                onChange={(e) => setReservesConfig({...reservesConfig, reserveTokenAmount: parseFloat(e.target.value)})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={() => selectedAccount && handleUpdateAccount(
                selectedAccount.accountId, 
                {
                  reserveSolAmount: reservesConfig.reserveSolAmount,
                  reserveTokenAmount: reservesConfig.reserveTokenAmount,
                }
              )}
              disabled={isLoading}
            >
              Save Changes
            </Button>
            <Button 
              variant="secondary"
              onClick={() => selectedAccounts.length > 0 && handleUpdateAllAccounts(
                {
                  reserveSolAmount: reservesConfig.reserveSolAmount,
                  reserveTokenAmount: reservesConfig.reserveTokenAmount,
                }
              )}
              disabled={isLoading || selectedAccounts.length === 0}
            >
              Apply to Selected ({selectedAccounts.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delay Dialog */}
      <Dialog open={showDelayDialog} onOpenChange={setShowDelayDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transaction Delays</DialogTitle>
            <DialogDescription>
              Configure delay between transactions for {selectedAccount?.accountId}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="minDelay" className="text-right">
                Min Delay (seconds)
              </Label>
              <Input
                id="minDelay"
                type="number"
                className="col-span-3"
                value={delayConfig.minDelay}
                onChange={(e) => setDelayConfig({...delayConfig, minDelay: parseFloat(e.target.value)})}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="maxDelay" className="text-right">
                Max Delay (seconds)
              </Label>
              <Input
                id="maxDelay"
                type="number"
                className="col-span-3"
                value={delayConfig.maxDelay}
                onChange={(e) => setDelayConfig({...delayConfig, maxDelay: parseFloat(e.target.value)})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={() => selectedAccount && handleUpdateAccount(
                selectedAccount.accountId, 
                {
                  minDelayBetweenTxsInSeconds: delayConfig.minDelay,
                  maxDelayBetweenTxsInSeconds: delayConfig.maxDelay,
                }
              )}
              disabled={isLoading}
            >
              Save Changes
            </Button>
            <Button 
              variant="secondary"
              onClick={() => selectedAccounts.length > 0 && handleUpdateAllAccounts(
                {
                  minDelayBetweenTxsInSeconds: delayConfig.minDelay,
                  maxDelayBetweenTxsInSeconds: delayConfig.maxDelay,
                }
              )}
              disabled={isLoading || selectedAccounts.length === 0}
            >
              Apply to Selected ({selectedAccounts.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bump Amount Dialog */}
      <Dialog open={showBumpDialog} onOpenChange={setShowBumpDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bump Operate Amount</DialogTitle>
            <DialogDescription>
              Set SOL amount to bump operate for {selectedAccount?.accountId}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="bumpAmount" className="text-right">
                SOL Amount
              </Label>
              <Input
                id="bumpAmount"
                type="number"
                className="col-span-3"
                value={bumpAmount}
                onChange={(e) => setBumpAmount(parseFloat(e.target.value))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={() => selectedAccount && handleUpdateAccount(
                selectedAccount.accountId, 
                {
                  bumpOperateSolAmount: bumpAmount,
                }
              )}
              disabled={isLoading}
            >
              Save Changes
            </Button>
            <Button 
              variant="secondary"
              onClick={() => selectedAccounts.length > 0 && handleUpdateAllAccounts(
                {
                  bumpOperateSolAmount: bumpAmount,
                }
              )}
              disabled={isLoading || selectedAccounts.length === 0}
            >
              Apply to Selected ({selectedAccounts.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}