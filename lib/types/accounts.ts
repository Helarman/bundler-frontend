export interface AccountEntity {
  id: string;
  type: 'SOLANA' | 'TON';
  name: string;
  color: string;
  tokenAccountId?: string;
  tokenBalance: number;
  isTokenBalanceSynced: boolean;
  isTokenAccountInitialized: boolean;
  balance: number;
  isBalanceSynced: boolean;
  publicKey: string;
  secretKey: string;
  isActive: boolean;
  isImported: boolean;
  isRemoved: boolean;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  exportedAt?: Date;
  lastBuyAt?: Date;
  lastSellAt?: Date;
  syncedAt?: Date;
  syncProblemInspectedAt?: Date;
  removedAt?: Date;
}

export interface CreateAccountDto {
  name?: string;
  color?: string;
}

export interface ImportAccountDto {
  secretKey: string | Uint8Array;
  name?: string;
  color?: string;
}

export interface ExportAccountDto {
  password: string;
}

export interface UpdateAccountDto {
  name?: string;
  color?: string;
  isActive?: boolean;
  exportedAt?: Date;
  lastBuyAt?: Date;
  lastSellAt?: Date;
  syncedAt?: Date;
  syncProblemInspectedAt?: Date;
}

export interface TransferSolDto {
  recipient: string;
  amount?: number;
  percent?: number;
  priorityMicroLamptorsFee?: number;
  ignoreRecipientNotFound?: boolean;
}

export interface SolanaTransactionEntity {
  txHash: string;
}

export interface BuyTokenDto {
  solAmount: number;
  slippagePercent?: number;
  priorityMicroLamptorsFee?: number;
  
}

export interface SellTokenDto {
  tokenAmount?: number;
  slippagePercent?: number;
  skipLimit?: boolean;
  priorityMicroLamptorsFee?: number;
}

export interface TransferSplTokenDto {
  recipient: string;
  percent: number;
  priorityMicroLamptorsFee?: number;
}