'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { faker } from '@faker-js/faker';
import { AccountsClient } from '@/lib/api/accouts';
import {
  AccountEntity,
  BuyTokenDto,
  CreateAccountDto,
  ExportAccountDto,
  ImportAccountDto,
  SellTokenDto,
  SolanaTransactionEntity,
  TransferSolDto,
  TransferSplTokenDto,
  UpdateAccountDto,
} from '@/lib/types/accounts';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Copy, Plus, Trash2, Upload, Download, Check, ChevronDown } from 'lucide-react';
import { ColorPicker } from '@/components/ui/color-picker';


const STANDARD_COLORS = [
  '#3b82f6', // blue-500
  '#ef4444', // red-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#14b8a6', // teal-500
  '#f97316', // orange-500
  '#64748b', // slate-500
  '#84cc16', // lime-500
];

export default function WalletManagementPage() {
  const [accounts, setAccounts] = useState<AccountEntity[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<AccountEntity | null>(null);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showBulkCreateDialog, setShowBulkCreateDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showTokenDialog, setShowTokenDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [password, setPassword] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [exportedKey, setExportedKey] = useState('');
  const [newAccount, setNewAccount] = useState<CreateAccountDto>({
    name: '',
    color: '#3b82f6',
  });
  const [transferData, setTransferData] = useState<TransferSolDto>({
    recipient: '',
    amount: undefined,
    percent: undefined,
  });
  const [tokenData, setTokenData] = useState<any>({
    solAmount: 0,
    tokenAmount: 0 ,
    recipient: '',
    action: 'buy',
  });

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setIsLoading(true);
      const data = await AccountsClient.getAllAccounts();
      setAccounts(data);
      setSelectedAccounts([]);
    } catch (error) {
      toast.error('Failed to load accounts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    try {
      setIsLoading(true);
      const account = await AccountsClient.createAccount(newAccount);
      setAccounts([...accounts, account]);
      setShowCreateDialog(false);
      toast.success('Account created successfully');
    } catch (error) {
      toast.error('Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkCreateAccounts = async () => {
    try {
      setIsLoading(true);
      const newAccounts = Array(5).fill(0).map(() => ({
        name: faker.person.fullName(),
        color: faker.color.rgb(),
      }));
      
      const createdAccounts = await Promise.all(
        newAccounts.map(account => AccountsClient.createAccount(account))
      );
      
      setAccounts([...accounts, ...createdAccounts]);
      setShowBulkCreateDialog(false);
      toast.success('5 accounts created successfully');
    } catch (error) {
      toast.error('Failed to create accounts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportAccount = async () => {
    try {
      setIsLoading(true);
      const account = await AccountsClient.importAccount({
        secretKey,
        name: newAccount.name,
        color: newAccount.color,
      });
      setAccounts([...accounts, account]);
      setShowImportDialog(false);
      toast.success('Account imported successfully');
    } catch (error) {
      toast.error('Failed to import account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportAccount = async () => {
    if (!selectedAccount) return;
    try {
      setIsLoading(true);
      const key = await AccountsClient.exportAccountSecretKey(selectedAccount.id, {
        password,
      });
      setExportedKey(key);
      copyToClipboard(key)
      toast.success('Account exported successfully.');
    } catch (error) {
      toast.error('Failed to export account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    try {
      setIsLoading(true);
      await AccountsClient.removeAccount(id);
      setAccounts(accounts.filter(account => account.id !== id));
      toast.success('Account deleted successfully');
    } catch (error) {
      toast.error('Failed to delete account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkDeleteAccounts = async () => {
    if (selectedAccounts.length === 0) return;
    try {
      setIsLoading(true);
      await Promise.all(
        selectedAccounts.map(id => AccountsClient.removeAccount(id))
      );
      setAccounts(accounts.filter(account => !selectedAccounts.includes(account.id)));
      setSelectedAccounts([]);
      toast.success(`${selectedAccounts.length} accounts deleted successfully`);
    } catch (error) {
      toast.error('Failed to delete accounts');
    } finally {
      setIsLoading(false);
    }
  };

const handleTransfer = async () => {
  if (!selectedAccount) return;
  try {
    setIsLoading(true);
    const tx = await AccountsClient.transferSol(selectedAccount.id, transferData);
    toast.success(`Transaction sent: ${tx.txHash}`);
    setShowTransferDialog(false);
  } catch (error) {
    toast.error('Failed to transfer SOL');
  } finally {
    setIsLoading(false);
  }
};

  const handleTokenAction = async () => {
    if (!selectedAccount) return;
    try {
      setIsLoading(true);
      let tx: SolanaTransactionEntity;
      
      if (tokenData.action === 'buy') {
        tx = await AccountsClient.buyToken(selectedAccount.id, {
          solAmount: tokenData.solAmount,
          slippagePercent: tokenData.slippagePercent,
          priorityMicroLamptorsFee: tokenData.priorityMicroLamptorsFee,
        });
      } else if (tokenData.action === 'sell') {
        tx = await AccountsClient.sellToken(selectedAccount.id, {
          tokenAmount: tokenData.tokenAmount,
          slippagePercent: tokenData.slippagePercent,
          skipLimit: tokenData.skipLimit,
          priorityMicroLamptorsFee: tokenData.priorityMicroLamptorsFee,
        });
      } else {
        tx = await AccountsClient.transferToken(selectedAccount.id, {
          recipient: tokenData.recipient,
          percent: tokenData.percent,
          priorityMicroLamptorsFee: tokenData.priorityMicroLamptorsFee,
        });
      }

      toast.success(`Token transaction sent: ${tx.txHash}`);
      setShowTokenDialog(false);
    } catch (error) {
      toast.error('Failed to perform token action');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncAccounts = async () => {
    try {
      setIsLoading(true);
      await AccountsClient.syncAccounts();
      await loadAccounts();
      toast.success('Accounts synced successfully');
    } catch (error) {
      toast.error('Failed to sync accounts');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const toggleAccountStatus = async (account: AccountEntity) => {
    try {
      setIsLoading(true);
      const updateData: UpdateAccountDto = {
        isActive: !account.isActive
      };
      const updatedAccount = await AccountsClient.updateAccount(account.id, updateData);
      setAccounts(accounts.map(a => a.id === account.id ? updatedAccount : a));
      toast.success(`Account ${updatedAccount.isActive ? 'activated' : 'deactivated'}`);
    } catch (error) {
      toast.error('Failed to update account status');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelectAccount = (id: string) => {
    setSelectedAccounts(prev => 
      prev.includes(id) 
        ? prev.filter(accountId => accountId !== id) 
        : [...prev, id]
    );
  };

  const toggleSelectAllAccounts = () => {
    if (selectedAccounts.length === accounts.length) {
      setSelectedAccounts([]);
    } else {
      setSelectedAccounts(accounts.map(account => account.id));
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Wallet Management</h1>
        <div className="flex gap-2">
          <Button onClick={handleSyncAccounts} disabled={isLoading}>
            Sync Accounts
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Create Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Wallet</DialogTitle>
                <DialogDescription>
                  Create a new Solana or TON wallet account
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    className="col-span-3"
                    value={newAccount.name}
                    onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="color" className="text-right">
                    Color Select
                  </Label>
                  <ColorPicker
                    value={newAccount.color || '#3b82f6'}
                    onChange={(color) => setNewAccount({ ...newAccount, color })}
                  />
                </div>
                
                <div  className="grid grid-cols-4 items-center gap-4"> 
                   <Label htmlFor="color" className="text-right">
                    Color Picker
                  </Label>
                  <div className="grid grid-cols-10 gap-7 ml-2">
                    {STANDARD_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className="w-6 h-6 rounded-full border-2 border-transparent hover:border-gray-300 transition-colors"
                        style={{ backgroundColor: color }}
                        onClick={() => setNewAccount({ ...newAccount, color })}
                        title={`Color ${color}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Randomize</Label>
                  <div className="col-span-3 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setNewAccount({ ...newAccount, name: faker.person.fullName() })}
                    >
                      Random Name
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setNewAccount({ ...newAccount, color: faker.color.rgb() })}
                    >
                      Random Color
                    </Button>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreateAccount} disabled={isLoading}>
                  {isLoading ? 'Creating...' : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={showBulkCreateDialog} onOpenChange={setShowBulkCreateDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" /> Bulk Create
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create 5 Random Wallets</DialogTitle>
                <DialogDescription>
                  This will create 5 new wallets with random names and colors
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button onClick={handleBulkCreateAccounts} disabled={isLoading}>
                  {isLoading ? 'Creating...' : 'Create 5 Accounts'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" /> Import Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import Wallet</DialogTitle>
                <DialogDescription>
                  Import an existing Solana or TON wallet using its secret key
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="import-name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="import-name"
                    className="col-span-3"
                    value={newAccount.name}
                    onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                  />
                </div>
                <div className="grid items-center gap-4">
                  <Label htmlFor="import-color" className="text-right">
                    Color
                  </Label>
                  <ColorPicker
                    value={newAccount.color || '#3b82f6'}
                    onChange={(color) => setNewAccount({ ...newAccount, color })}
                  />
                </div>
                <div  className="grid grid-cols-4 items-center gap-4"> 
                  <div className="flex flex-wrap gap-1 ml-2">
                    {STANDARD_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className="w-6 h-6 rounded-full border-2 border-transparent hover:border-gray-300 transition-colors"
                        style={{ backgroundColor: color }}
                        onClick={() => setNewAccount({ ...newAccount, color })}
                        title={`Color ${color}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Randomize</Label>
                  <div className="col-span-3 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setNewAccount({ ...newAccount, name: faker.finance.accountName() })}
                    >
                      Random Name
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setNewAccount({ ...newAccount, color: faker.color.rgb() })}
                    >
                      Random Color
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="secretKey" className="text-right">
                    Secret Key
                  </Label>
                  <Textarea
                    id="secretKey"
                    className="col-span-3"
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                    placeholder="Enter secret key"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleImportAccount} disabled={isLoading}>
                  {isLoading ? 'Importing...' : 'Import'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
            <Button variant="destructive" onClick={handleBulkDeleteAccounts} disabled={selectedAccounts.length == 0 || isLoading}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete Selected ({selectedAccounts.length})
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
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Token Balance</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.filter(account => !account.isRemoved).map((account) => (
                <TableRow 
                  key={account.id} 
                  style={{ backgroundColor: account.color ? `${account.color}20` : 'transparent' }}
                >
                  <TableCell>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => toggleSelectAccount(account.id)}
                      className="h-8 w-8 p-0"
                    >
                      {selectedAccounts.includes(account.id) && (
                        <Check className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      {account.color && (
                        <span 
                          className="w-3 h-3 rounded-full mr-2" 
                          style={{ backgroundColor: account.color }}
                        />
                      )}
                      {account.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{account.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <span className="mr-2 truncate max-w-[120px]">{account.publicKey}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyToClipboard(account.publicKey)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    {account.balance} {account.type === 'SOLANA' ? 'SOL' : 'TON'}
                    {!account.isBalanceSynced && (
                      <span className="text-xs text-yellow-500 ml-1">(syncing)</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {account.tokenBalance}
                    {account.tokenAccountId && !account.isTokenBalanceSynced && (
                      <span className="text-xs text-yellow-500 ml-1">(syncing)</span>
                    )}
                    {!account.tokenAccountId && (
                      <span className="text-xs text-gray-500 ml-1">(no token)</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant={account.isActive ? 'default' : 'secondary'}
                      size="sm"
                      onClick={() => toggleAccountStatus(account)}
                      disabled={isLoading}
                    >
                      {account.isActive ? 'Active' : 'Inactive'}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedAccount(account);
                          setShowDetailsDialog(true);
                        }}
                      >
                        Details
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedAccount(account);
                          setShowTransferDialog(true);
                        }}
                        disabled={!account.isActive}
                      >
                        Transfer
                      </Button>
                      {account.type === 'SOLANA' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedAccount(account);
                            setShowTokenDialog(true);
                          }}
                          disabled={!account.isActive || !account.tokenAccountId || true}
                        >
                          Tokens
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedAccount(account);
                          setShowExportDialog(true);
                        }}
                      >
                        <Download className="mr-2 h-4 w-4" /> Export
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteAccount(account.id)}
                        disabled={isLoading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>


      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Wallet</DialogTitle>
            <DialogDescription>
              Export the secret key for {selectedAccount?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password" className="text-right">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                className="col-span-3"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {false && exportedKey && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="exportedKey" className="text-right">
                  Secret Key
                </Label>
                <div className="col-span-3 flex items-center">
                  <Input
                    id="exportedKey"
                    value={exportedKey}
                    readOnly
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="ml-2"
                    onClick={() => copyToClipboard(exportedKey)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleExportAccount} disabled={isLoading}>
              {isLoading ? 'Exporting...' : 'Export'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer {selectedAccount?.type === 'SOLANA' ? 'SOL' : 'TON'}</DialogTitle>
            <DialogDescription>
              Transfer {selectedAccount?.type === 'SOLANA' ? 'SOL' : 'TON'} from {selectedAccount?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="recipient" className="text-right">
                Recipient
              </Label>
              <Input
                id="recipient"
                className="col-span-3"
                value={transferData.recipient}
                onChange={(e) =>
                  setTransferData({ ...transferData, recipient: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                Amount
              </Label>
             <Input
            id="amount"
            type="number"
            step="any"
            className="col-span-3"
            value={transferData.amount ?? ""}
            onChange={(e) => {
              const value = e.target.value;
              
              if (value === "") {
                setTransferData({
                  ...transferData,
                  amount: undefined,
                  percent: undefined
                });
              } else {
                // Проверяем, является ли значение числом
                const numValue = parseFloat(value);
                if (!isNaN(numValue)) {
                  setTransferData({
                    ...transferData,
                    amount: numValue,
                    percent: undefined
                  });
                }
                // Если NaN, просто игнорируем ввод
              }
            }}
            placeholder="Enter exact amount"
          />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="percent" className="text-right">
                Percent
              </Label>
              <Input
                id="percent"
                type="number"
                className="col-span-3"
                value={transferData.percent || ''}
                onChange={(e) =>
                  setTransferData({ 
                    ...transferData, 
                    percent: e.target.value ? parseFloat(e.target.value) : undefined,
                    amount: undefined
                  })
                }
                placeholder="Or enter percentage"
                min="0"
                max="100"
              />
            </div>
            {selectedAccount?.type === 'SOLANA' && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="priorityFee" className="text-right">
                  Priority Fee
                </Label>
                <Input
                  id="priorityFee"
                  type="number"
                  className="col-span-3"
                  value={transferData.priorityMicroLamptorsFee || ''}
                  onChange={(e) =>
                    setTransferData({ 
                      ...transferData, 
                      priorityMicroLamptorsFee: e.target.value ? parseInt(e.target.value) : undefined
                    })
                  }
                  placeholder="Optional priority fee (micro-lamports)"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleTransfer} disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Transfer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Token Dialog (SOLANA only) */}
      {selectedAccount?.type === 'SOLANA' && (
        <Dialog open={showTokenDialog} onOpenChange={setShowTokenDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Token Operations</DialogTitle>
              <DialogDescription>
                Perform token operations with {selectedAccount?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="action" className="text-right">
                  Action
                </Label>
                <Select
                  value={tokenData.action}
                  onValueChange={(value) =>
                    setTokenData({ ...tokenData, action: value as any })
                  }
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buy">Buy Token</SelectItem>
                    <SelectItem value="sell">Sell Token</SelectItem>
                    <SelectItem value="transfer">Transfer Token</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {tokenData.action === 'buy' && (
                <>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="solAmount" className="text-right">
                      SOL Amount
                    </Label>
                    <Input
                      id="solAmount"
                      type="number"
                      className="col-span-3"
                      value={tokenData.solAmount}
                      onChange={(e) =>
                        setTokenData({ ...tokenData, solAmount: parseFloat(e.target.value) })
                      }
                    />
                  </div>
                </>
              )}

              {tokenData.action === 'sell' && (
                <>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="tokenAmount" className="text-right">
                      Token Amount
                    </Label>
                    <Input
                      id="tokenAmount"
                      type="number"
                      className="col-span-3"
                      value={tokenData.tokenAmount || ''}
                      onChange={(e) =>
                        setTokenData({ ...tokenData, tokenAmount: e.target.value ? parseFloat(e.target.value) : undefined })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="skipLimit" className="text-right">
                      Skip Limit
                    </Label>
                    <Select
                      value={tokenData.skipLimit ? 'true' : 'false'}
                      onValueChange={(value) =>
                        setTokenData({ ...tokenData, skipLimit: value === 'true' })
                      }
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Skip limit orders" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="false">No</SelectItem>
                        <SelectItem value="true">Yes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {tokenData.action === 'transfer' && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="tokenRecipient" className="text-right">
                    Recipient
                  </Label>
                  <Input
                    id="tokenRecipient"
                    className="col-span-3"
                    value={tokenData.recipient}
                    onChange={(e) =>
                      setTokenData({ ...tokenData, recipient: e.target.value })
                    }
                  />
                </div>
              )}

              {(tokenData.action === 'buy' || tokenData.action === 'sell') && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="slippage" className="text-right">
                    Slippage (%)
                  </Label>
                  <Input
                    id="slippage"
                    type="number"
                    className="col-span-3"
                    value={tokenData.slippagePercent || ''}
                    onChange={(e) =>
                      setTokenData({ ...tokenData, slippagePercent: e.target.value ? parseFloat(e.target.value) : undefined })
                    }
                    placeholder="Optional slippage percentage"
                  />
                </div>
              )}

              {tokenData.action === 'transfer' && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="transferPercent" className="text-right">
                    Percent
                  </Label>
                  <Input
                    id="transferPercent"
                    type="number"
                    className="col-span-3"
                    value={tokenData.percent}
                    onChange={(e) =>
                      setTokenData({ ...tokenData, percent: parseFloat(e.target.value) })
                    }
                    min="0"
                    max="100"
                  />
                </div>
              )}

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="tokenPriorityFee" className="text-right">
                  Priority Fee
                </Label>
                <Input
                  id="tokenPriorityFee"
                  type="number"
                  className="col-span-3"
                  value={tokenData.priorityMicroLamptorsFee || ''}
                  onChange={(e) =>
                    setTokenData({ ...tokenData, priorityMicroLamptorsFee: e.target.value ? parseInt(e.target.value) : undefined })
                  }
                  placeholder="Optional priority fee (micro-lamports)"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleTokenAction} disabled={isLoading}>
                {isLoading ? 'Processing...' : 'Execute'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Account Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>Account Details</DialogTitle>
            <DialogDescription>
              Detailed information for {selectedAccount?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedAccount && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Name</Label>
                  <div className="flex items-center mt-1">
                    {selectedAccount.color && (
                      <span 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: selectedAccount.color }}
                      />
                    )}
                    <p>{selectedAccount.name}</p>
                  </div>
                </div>
                <div>
                  <Label>Type</Label>
                  <p>
                    <Badge variant="outline">{selectedAccount.type}</Badge>
                  </p>
                </div>
              </div>
              
              <div>
                <Label>Public Key</Label>
                <div className="flex items-center mt-1">
                  <p className="mr-2 truncate">{selectedAccount.publicKey}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(selectedAccount.publicKey)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Balance</Label>
                  <p>
                    {selectedAccount.balance} {selectedAccount.type === 'SOLANA' ? 'SOL' : 'TON'}
                    {!selectedAccount.isBalanceSynced && (
                      <span className="text-xs text-yellow-500 ml-1">(syncing)</span>
                    )}
                  </p>
                </div>
                <div>
                  <Label>Token Balance</Label>
                  <p>
                    {selectedAccount.tokenBalance}
                    {selectedAccount.tokenAccountId && !selectedAccount.isTokenBalanceSynced && (
                      <span className="text-xs text-yellow-500 ml-1">(syncing)</span>
                    )}
                    {!selectedAccount.tokenAccountId && (
                      <span className="text-xs text-gray-500 ml-1">(no token)</span>
                    )}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Token Account</Label>
                  <p>
                    {selectedAccount.tokenAccountId || 'N/A'}
                    {selectedAccount.tokenAccountId && !selectedAccount.isTokenAccountInitialized && (
                      <span className="text-xs text-yellow-500 ml-1">(initializing)</span>
                    )}
                  </p>
                </div>
                <div className='opacity-0'>
                  <Label>Status</Label>
                  <p>
                    <Badge variant={selectedAccount.isActive ? 'default' : 'secondary'}>
                      {selectedAccount.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Imported</Label>
                  <p>{selectedAccount.isImported ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <Label>Created At</Label>
                  <p>{new Date(selectedAccount.createdAt).toLocaleString()}</p>
                </div>
              </div>
              
              <div>
                <Label>Last Synced</Label>
                <p>{selectedAccount.syncedAt ? new Date(selectedAccount.syncedAt).toLocaleString() : 'Never'}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant={selectedAccount?.isActive ? 'secondary' : 'default'}
              onClick={() => selectedAccount && toggleAccountStatus(selectedAccount)}
              disabled={isLoading}
            >
              {selectedAccount?.isActive ? 'Deactivate' : 'Activate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}