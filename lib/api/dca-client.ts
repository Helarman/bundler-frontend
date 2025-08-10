
import { apiClient } from './client';
import { DcaAccountEntity, UpdateDcaAccountDto } from '../types/dca-accounts'

export class DcaClient {

  static async getAccounts(): Promise<DcaAccountEntity[]> {
    const response = await apiClient.get('/solana-dca/accounts');
    return response.data;
  }

  static async updateAllAccounts(payload: UpdateDcaAccountDto): Promise<DcaAccountEntity[]> {
    const response = await apiClient.patch('/solana-dca/accounts/all', payload);
    return response.data;
  }

  static async updateAccount(id: string, payload: UpdateDcaAccountDto): Promise<DcaAccountEntity> {
    const response = await apiClient.patch(`/solana-dca/accounts/${id}`, payload);
    return response.data;
  }

  static async activateAllAccounts(): Promise<DcaAccountEntity[]> {
    const response = await apiClient.post('/solana-dca/on');
    return response.data;
  }

  static async deactivateAllAccounts(): Promise<DcaAccountEntity[]> {
    const response = await apiClient.delete('/solana-dca/off');
    return response.data;
  }

  static async toggleAccountActivation(id: string, isActive: boolean): Promise<DcaAccountEntity> {
    return this.updateAccount(id, { isActive });
  }

  static async setBuyConfig(
    id: string,
    canBuy: boolean,
    maxTokenPrice: number,
    minTokenPrice: number
  ): Promise<DcaAccountEntity> {
    return this.updateAccount(id, {
      canBuy,
      maxTokenPrice,
      minTokenPrice
    });
  }

  static async setSellConfig(
    id: string,
    canSell: boolean,
    minTokenAmountPerSale: number,
    balanceUsagePercent: number
  ): Promise<DcaAccountEntity> {
    return this.updateAccount(id, {
      canSell,
      minTokenAmountPerSale,
      balanceUsagePercent
    });
  }


  static async setReserves(
    id: string,
    reserveSolAmount: number,
    reserveTokenAmount: number
  ): Promise<DcaAccountEntity> {
    return this.updateAccount(id, {
      reserveSolAmount,
      reserveTokenAmount
    });
  }

  static async setDelayConfig(
    id: string,
    minDelay: number,
    maxDelay: number
  ): Promise<DcaAccountEntity> {
    return this.updateAccount(id, {
      minDelayBetweenTxsInSeconds: minDelay,
      maxDelayBetweenTxsInSeconds: maxDelay
    });
  }

  static async setBumpOperateAmount(id: string, amount: number): Promise<DcaAccountEntity> {
    return this.updateAccount(id, {
      bumpOperateSolAmount: amount
    });
  }
}