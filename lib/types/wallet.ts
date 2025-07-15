export interface Wallet{
    id: number;
    address: string;
    privateKey: string;
    isActive: boolean;
    tokenBalance?: number;
}