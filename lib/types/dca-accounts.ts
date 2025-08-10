
export interface DcaAccountEntity {
    
  accountId: string;
  maxTokenPrice: number;
  minTokenPrice: number;
  isActive: boolean;
  canBuy: boolean;
  canSell: boolean;
  reserveSolAmount: number;
  reserveTokenAmount: number;
  balanceUsagePercent: number;
  minTokenAmountPerSale: number;
  maxTokenAmount: number;
  minDelayBetweenTxsInSeconds: number;
  maxDelayBetweenTxsInSeconds: number;
  lastTxType?: DcaTxType | null;
  allowNextAt?: Date | null;
  bumpOperateSolAmount: number;
  account?: {
    publicKey: string;
    balance: number;
    tokenBalance: number;
    lastBuyAt?: Date | null;
    lastSellAt?: Date | null;
  };
}

export enum DcaTxType {
  BUY = 'BUY',
  SELL = 'SELL',
  FULL_SELL = 'FULL_SELL'
}

export interface UpdateDcaAccountDto {
  maxTokenPrice?: number;
  minTokenPrice?: number;
  isActive?: boolean;
  canBuy?: boolean;
  canSell?: boolean;
  reserveSolAmount?: number;
  reserveTokenAmount?: number;
  balanceUsagePercent?: number;
  minTokenAmountPerSale?: number;
  maxTokenAmount?: number;
  minDelayBetweenTxsInSeconds?: number;
  maxDelayBetweenTxsInSeconds?: number;
  bumpOperateSolAmount?: number;
}