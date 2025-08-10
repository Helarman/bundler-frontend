import { apiClient } from './client';
import {
  SolanaTokenDataEntity,
  TransactionsResponseEntity,
  CreatePumpFunTokenDto,
  TransferAllDto,
  BuyAllSPLDto,
  SellAllSPLDto,
  TokenBuyerDto
} from '../types/solana-token';

export class SolanaTokenClient {
  static async getData(): Promise<SolanaTokenDataEntity> {
    const response = await apiClient.get('/spl');
    return response.data;
  }

  static async createToken(
    payload: Omit<CreatePumpFunTokenDto, 'buyers'> & { buyers: TokenBuyerDto[] },
    file: File
  ): Promise<TransactionsResponseEntity> {
    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      if (key === 'buyers') {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, value as string);
      }
    });
    
    formData.append('file', file);

    const response = await apiClient.post('/spl', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }

  static async buyAll(payload: BuyAllSPLDto): Promise<TransactionsResponseEntity> {
    const response = await apiClient.post('/spl/buy-all', payload);
    return response.data;
  }

  static async transferAll(payload: TransferAllDto): Promise<TransactionsResponseEntity> {
    const response = await apiClient.put('/spl/transfer-all', payload);
    return response.data;
  }

  static async sellAll(payload: SellAllSPLDto): Promise<TransactionsResponseEntity> {
    const response = await apiClient.delete('/spl/sell-all', { data: payload });
    return response.data;
  }

  static parseBuyersString(buyersString: string): TokenBuyerDto[] {
    return buyersString.split(',')
      .map(buyer => {
        const [address, solAmount] = buyer.split(':');
        return {
          address: address.trim(),
          solAmount: parseFloat(solAmount.trim())
        };
      })
      .filter(buyer => buyer.address && !isNaN(buyer.solAmount));
  }

  static formatBuyersString(buyers: TokenBuyerDto[]): string {
    return buyers.map(buyer => `${buyer.address}:${buyer.solAmount}`).join(',');
  }
}