export interface User {
  id: number;
  email: string;
  rpcUrl?: string;
  wssRpcUrl?: string;
  devWallet?: string;
  createdAt: string;
  updatedAt: string;
  isConfirmed?: boolean;
  isSettingConfirmed?: boolean;
}
