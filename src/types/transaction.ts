export type TransactionType = 'deposit' | 'withdrawal' | 'investment' | 'distribution' | 'fee';

export type TransactionStatus = 'pending' | 'approved' | 'processing' | 'completed' | 'rejected';

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  currency: 'EUR' | 'USDT' | 'USDC' | 'BTC' | 'ETH' | 'SOL' | string;
  status: TransactionStatus;
  description: string;
  reference: string;
  createdAt: string;
  paymentMethod: string;
  txHash?: string;
  balanceAfter: number;
  metadata?: {
    propertyId?: string;
    propertyTitle?: string;
    tokens?: number;
    destinationAddress?: string;
    bankIban?: string;
    rejectionReason?: string;
    notes?: string;
    adminEmail?: string;
    network?: string;
  };
}

export interface LedgerEntry {
  id: string;
  transactionId: string;
  userId: string;
  debitAccount: string;
  creditAccount: string;
  amount: number;
  currency: string;
  timestamp: string;
  verifiedHash: string;
}
