// types/solana-token.ts

export interface SolanaTokenDataEntity {
  // Define properties based on your ITokenData interface from backend
  virtual_sol_reserves: number;
  virtual_token_reserves: number;
  token_price: number;
  market_cap: number;
  total_supply: number;
  circulating_supply: number;
  holders: number;
}

export interface TransactionsResponseEntity {
  txHashes: string[];
}

export interface CreatePumpFunTokenDto {
  owner: string;
  name: string;
  symbol: string;
  description?: string;
  website?: string;
  twitter?: string;
  telegram?: string;
  discord?: string;
  buyers: string; 
}

export interface TokenBuyerDto {
  address: string;
  solAmount: number;
}

export interface TransferAllDto {
  address: string;
  priorityMicroLamptorsFee?: number;
}

export interface BuyAllSPLDto {
  keepSolanaAmount?: number;
  percent: number;
  slippagePercent?: number;
  priorityMicroLamptorsFee?: number;
}

export interface SellAllSPLDto {
  keepAmount?: number;
  percent: number;
  slippagePercent?: number;
  priorityMicroLamptorsFee?: number;
}