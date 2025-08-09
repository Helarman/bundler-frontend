import { AccountEntity, BuyTokenDto, CreateAccountDto, ExportAccountDto, ImportAccountDto, SellTokenDto, SolanaTransactionEntity, TransferSolDto, TransferSplTokenDto, UpdateAccountDto } from '../types/accounts';
import { apiClient } from './client';

export class AccountsClient {
  static async syncAccounts(): Promise<string> {
    const response = await apiClient.post('/accounts/sync');
    return response.data;
  }

  static async syncAllAccounts(): Promise<string> {
    const response = await apiClient.post('/accounts/sync/all');
    return response.data;
  }

  static async getAllAccounts(): Promise<AccountEntity[]> {
    const response = await apiClient.get('/accounts');
    return response.data;
  }

  static async importAccount(payload: ImportAccountDto): Promise<AccountEntity> {
    const response = await apiClient.put('/accounts/import', payload);
    return response.data;
  }

  static async getAccountById(id: string): Promise<AccountEntity> {
    const response = await apiClient.get(`/accounts/${id}`);
    return response.data;
  }

  static async exportAccountSecretKey(
    id: string,
    payload: ExportAccountDto
  ): Promise<string> {
    const response = await apiClient.post(`/accounts/${id}/export`, payload);
    return response.data;
  }

  static async createAccount(payload?: CreateAccountDto): Promise<AccountEntity> {
    const response = await apiClient.post('/accounts', payload);
    return response.data;
  }

  static async transferSol(
    id: string,
    payload: TransferSolDto
  ): Promise<SolanaTransactionEntity> {
    const response = await apiClient.put(`/accounts/${id}/sol-transfer`, payload);
    return response.data;
  }

  static async updateAccount(
    id: string,
    payload: UpdateAccountDto
  ): Promise<AccountEntity> {
    const response = await apiClient.patch(`/accounts/${id}`, payload);
    return response.data;
  }

  static async removeAccount(id: string): Promise<void> {
    await apiClient.delete(`/accounts/${id}`);
  }

  // SPL Token Controller Methods
  static async buyToken(
    accountId: string,
    payload: BuyTokenDto
  ): Promise<SolanaTransactionEntity> {
    const response = await apiClient.post(
      `/accounts/${accountId}/spl/buy`,
      payload
    );
    return response.data;
  }

  static async sellToken(
    accountId: string,
    payload: SellTokenDto
  ): Promise<SolanaTransactionEntity> {
    const response = await apiClient.delete(
      `/accounts/${accountId}/spl/sell`,
      { data: payload }
    );
    return response.data;
  }

  static async transferToken(
    accountId: string,
    payload: TransferSplTokenDto
  ): Promise<SolanaTransactionEntity> {
    const response = await apiClient.put(
      `/accounts/${accountId}/spl/transfer`,
      payload
    );
    return response.data;
  }
}