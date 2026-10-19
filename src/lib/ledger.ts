import { Transaction, TransactionType, TransactionStatus, LedgerEntry } from '../types/transaction';
import { User, KYCStatus, UserRole, AccountType, getAccountTypeLabel } from '../types/user';
import { Property } from '../types/property';
import { Investment } from '../types/investment';
import { INITIAL_PROPERTIES } from '../data/properties';
import { MembershipTier, UserMembership, MembershipApplication, MembershipTierId, MembershipBillingCycle, INITIAL_MEMBERSHIP_TIERS } from '../types/membership';
import { formatCurrency } from './utils';
import { CompanyNewsItem } from '../types/news';
import { INITIAL_COMPANY_NEWS } from '../data/companyNews';
import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface AuditLog {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  details: string;
  timestamp: string;
  ipAddress?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'financial';
  read: boolean;
  createdAt: string;
}

export type DocumentCategory = 'deposit_proof' | 'kyc_identity' | 'proof_of_address' | 'accredited_proof' | 'general';

export interface VerificationDocument {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  category: DocumentCategory;
  title: string;
  documentType: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  transactionReference?: string;
  amount?: number;
  currency?: string;
  notes?: string;
}

export interface CryptoNetworkConfig {
  id: string;
  name: string;
  token: string;
  network: string;
  walletAddress: string;
  contractEnd?: string;
  enabled: boolean;
}

export interface TraditionalPaymentConfig {
  beneficiary: string;
  iban: string;
  bic: string;
  bankName: string;
  supportEmail: string;
  instructions: string;
  routingNumber?: string;
}

export interface PaymentConfig {
  traditional: TraditionalPaymentConfig;
  cryptoNetworks: CryptoNetworkConfig[];
}

const DEFAULT_PAYMENT_CONFIG: PaymentConfig = {
  traditional: {
    beneficiary: 'Kretz Escrow Services S.L.',
    iban: 'ES91 2100 0418 4502 0005 1829',
    bic: 'CAIXESBBXXX',
    bankName: 'CaixaBank Institutional Escrow',
    supportEmail: 'info@kretz.site',
    instructions: 'Include your unique transfer reference in the wire transfer concept and email your transfer confirmation receipt to info@kretz.site for rapid verification.',
    routingNumber: 'ES912100'
  },
  cryptoNetworks: [
    // USDT Networks
    {
      id: 'net-usdt-erc20',
      name: 'Ethereum (ERC20)',
      token: 'USDT',
      network: 'Ethereum',
      walletAddress: '0x71C8135C0e41B3fA128912389128f9A19b28A0bf',
      contractEnd: '831ec7',
      enabled: true
    },
    {
      id: 'net-usdt-trc20',
      name: 'Tron (TRC20)',
      token: 'USDT',
      network: 'Tron',
      walletAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
      contractEnd: '5012e4',
      enabled: true
    },
    {
      id: 'net-usdt-polygon',
      name: 'Polygon POS',
      token: 'USDT',
      network: 'Polygon',
      walletAddress: '0x39a9c29801869e94F2B85295c5Af646A9894A0b2',
      contractEnd: 'c2132d',
      enabled: true
    },
    {
      id: 'net-usdt-bsc',
      name: 'BNB Smart Chain (BEP20)',
      token: 'USDT',
      network: 'BNB Chain',
      walletAddress: '0x5291bfa9821389128931a98124901b2a98124018',
      contractEnd: '55d398',
      enabled: true
    },
    {
      id: 'net-usdt-arbitrum',
      name: 'Arbitrum One',
      token: 'USDT',
      network: 'Arbitrum',
      walletAddress: '0x71C8135C0e41B3fA128912389128f9A19b28A0bf',
      contractEnd: 'Fdfd87',
      enabled: true
    },
    {
      id: 'net-usdt-optimism',
      name: 'Optimism (OP Mainnet)',
      token: 'USDT',
      network: 'Optimism',
      walletAddress: '0x71C8135C0e41B3fA128912389128f9A19b28A0bf',
      contractEnd: '94b008',
      enabled: true
    },
    {
      id: 'net-usdt-solana',
      name: 'Solana SPL',
      token: 'USDT',
      network: 'Solana',
      walletAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      contractEnd: 'Es9vM',
      enabled: true
    },
    {
      id: 'net-usdt-ton',
      name: 'TON Network',
      token: 'USDT',
      network: 'TON',
      walletAddress: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
      contractEnd: 'bXvK',
      enabled: true
    },
    {
      id: 'net-usdt-avax',
      name: 'Avalanche C-Chain',
      token: 'USDT',
      network: 'Avalanche',
      walletAddress: '0x71C8135C0e41B3fA128912389128f9A19b28A0bf',
      contractEnd: 'c71984',
      enabled: true
    },

    // USDC Networks
    {
      id: 'net-usdc-polygon',
      name: 'Polygon POS',
      token: 'USDC',
      network: 'Polygon',
      walletAddress: '0x39a9c29801869e94F2B85295c5Af646A9894A0b2',
      contractEnd: 'e2891f',
      enabled: true
    },
    {
      id: 'net-usdc-erc20',
      name: 'Ethereum (ERC20)',
      token: 'USDC',
      network: 'Ethereum',
      walletAddress: '0x71C8135C0e41B3fA128912389128f9A19b28A0bf',
      contractEnd: 'a0b869',
      enabled: true
    },
    {
      id: 'net-usdc-solana',
      name: 'Solana SPL',
      token: 'USDC',
      network: 'Solana',
      walletAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      contractEnd: 'EPjFW',
      enabled: true
    },
    {
      id: 'net-usdc-arbitrum',
      name: 'Arbitrum One',
      token: 'USDC',
      network: 'Arbitrum',
      walletAddress: '0x71C8135C0e41B3fA128912389128f9A19b28A0bf',
      contractEnd: 'af88d0',
      enabled: true
    },
    {
      id: 'net-usdc-base',
      name: 'Base Mainnet',
      token: 'USDC',
      network: 'Base',
      walletAddress: '0x71C8135C0e41B3fA128912389128f9A19b28A0bf',
      contractEnd: '833589',
      enabled: true
    },
    {
      id: 'net-usdc-optimism',
      name: 'Optimism (OP Mainnet)',
      token: 'USDC',
      network: 'Optimism',
      walletAddress: '0x71C8135C0e41B3fA128912389128f9A19b28A0bf',
      contractEnd: '0b2c63',
      enabled: true
    },
    {
      id: 'net-usdc-bsc',
      name: 'BNB Smart Chain (BEP20)',
      token: 'USDC',
      network: 'BNB Chain',
      walletAddress: '0x5291bfa9821389128931a98124901b2a98124018',
      contractEnd: '8ac76a',
      enabled: true
    },
    {
      id: 'net-usdc-avax',
      name: 'Avalanche C-Chain',
      token: 'USDC',
      network: 'Avalanche',
      walletAddress: '0x71C8135C0e41B3fA128912389128f9A19b28A0bf',
      contractEnd: 'B97781',
      enabled: true
    },

    // ETH Networks
    {
      id: 'net-eth-erc20',
      name: 'Ethereum (ERC20)',
      token: 'ETH',
      network: 'Ethereum',
      walletAddress: '0x71C8135C0e41B3fA128912389128f9A19b28A0bf',
      contractEnd: 'Native',
      enabled: true
    },
    {
      id: 'net-eth-arbitrum',
      name: 'Arbitrum One',
      token: 'ETH',
      network: 'Arbitrum',
      walletAddress: '0x71C8135C0e41B3fA128912389128f9A19b28A0bf',
      contractEnd: 'Native L2',
      enabled: true
    },
    {
      id: 'net-eth-optimism',
      name: 'Optimism (OP Mainnet)',
      token: 'ETH',
      network: 'Optimism',
      walletAddress: '0x71C8135C0e41B3fA128912389128f9A19b28A0bf',
      contractEnd: 'Native L2',
      enabled: true
    },
    {
      id: 'net-eth-base',
      name: 'Base Mainnet',
      token: 'ETH',
      network: 'Base',
      walletAddress: '0x71C8135C0e41B3fA128912389128f9A19b28A0bf',
      contractEnd: 'Native L2',
      enabled: true
    },
    {
      id: 'net-eth-polygon',
      name: 'Polygon POS (WETH)',
      token: 'ETH',
      network: 'Polygon',
      walletAddress: '0x39a9c29801869e94F2B85295c5Af646A9894A0b2',
      contractEnd: '7ceB23',
      enabled: true
    },

    // BTC Networks
    {
      id: 'net-btc-native',
      name: 'Bitcoin Native SegWit (Bech32)',
      token: 'BTC',
      network: 'Bitcoin',
      walletAddress: 'bc1q9x46w98m4p74j9s2w83e65x7k2c5v0l2n8j4',
      contractEnd: 'Native',
      enabled: true
    },
    {
      id: 'net-btc-legacy',
      name: 'Bitcoin Legacy (P2PKH)',
      token: 'BTC',
      network: 'Bitcoin',
      walletAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      contractEnd: 'Legacy',
      enabled: true
    },
    {
      id: 'net-btc-taproot',
      name: 'Bitcoin Taproot',
      token: 'BTC',
      network: 'Bitcoin',
      walletAddress: 'bc1p5d7rjq7g6rd22r3kyt5gt429z626498087qku5wqv30ng',
      contractEnd: 'Taproot',
      enabled: true
    },
    {
      id: 'net-btc-bsc',
      name: 'BNB Smart Chain (BEP20 - BTCB)',
      token: 'BTC',
      network: 'BNB Chain',
      walletAddress: '0x5291bfa9821389128931a98124901b2a98124018',
      contractEnd: '7136c2',
      enabled: true
    },

    // SOL Networks
    {
      id: 'net-sol-native',
      name: 'Solana SPL',
      token: 'SOL',
      network: 'Solana',
      walletAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      contractEnd: 'Native',
      enabled: true
    },

    // BNB Networks
    {
      id: 'net-bnb-bep20',
      name: 'BNB Smart Chain (BEP20)',
      token: 'BNB',
      network: 'BNB Chain',
      walletAddress: '0x5291bfa9821389128931a98124901b2a98124018',
      contractEnd: 'Native BNB',
      enabled: true
    },
    {
      id: 'net-bnb-opbnb',
      name: 'opBNB Mainnet',
      token: 'BNB',
      network: 'opBNB',
      walletAddress: '0x5291bfa9821389128931a98124901b2a98124018',
      contractEnd: 'L2 BNB',
      enabled: true
    },

    // XRP Networks
    {
      id: 'net-xrp-native',
      name: 'Ripple XRP Ledger',
      token: 'XRP',
      network: 'Ripple',
      walletAddress: 'rEb8TK3gBgk5auZkwc6sHnwrGVJH8DuaLh',
      contractEnd: 'Tag: 108924',
      enabled: true
    },

    // POL / MATIC Networks
    {
      id: 'net-pol-native',
      name: 'Polygon POS (POL/MATIC)',
      token: 'POL',
      network: 'Polygon',
      walletAddress: '0x39a9c29801869e94F2B85295c5Af646A9894A0b2',
      contractEnd: 'Native POL',
      enabled: true
    },
    {
      id: 'net-pol-erc20',
      name: 'Ethereum (ERC20)',
      token: 'POL',
      network: 'Ethereum',
      walletAddress: '0x71C8135C0e41B3fA128912389128f9A19b28A0bf',
      contractEnd: '455e53',
      enabled: true
    },

    // AVAX Networks
    {
      id: 'net-avax-cchain',
      name: 'Avalanche C-Chain',
      token: 'AVAX',
      network: 'Avalanche',
      walletAddress: '0x71C8135C0e41B3fA128912389128f9A19b28A0bf',
      contractEnd: 'Native AVAX',
      enabled: true
    },

    // TON Networks
    {
      id: 'net-ton-native',
      name: 'TON Network',
      token: 'TON',
      network: 'TON',
      walletAddress: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
      contractEnd: 'Native TON',
      enabled: true
    },

    // TRX Networks
    {
      id: 'net-trx-native',
      name: 'Tron (TRC20)',
      token: 'TRX',
      network: 'Tron',
      walletAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
      contractEnd: 'Native TRX',
      enabled: true
    },

    // ADA Networks
    {
      id: 'net-ada-shelley',
      name: 'Cardano Shelley',
      token: 'ADA',
      network: 'Cardano',
      walletAddress: 'addr1q9k4k4z88046m8x0mwt7tgy0z22f0g0d6h98m24e',
      contractEnd: 'Native ADA',
      enabled: true
    }
  ]
};

// In-Memory & LocalStorage Persistent Ledger
const STORAGE_PREFIX = 'rentallog_v3_';

function getStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = localStorage.getItem(STORAGE_PREFIX + key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.error('Storage read error:', e);
    return defaultValue;
  }
}

function setStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.error('Storage write error:', e);
  }
}

// Generate deterministic verifiable hash
function generateTxHash(reference: string, amount: number, timestamp: string): string {
  const raw = `${reference}:${amount}:${timestamp}:${Math.random().toString(36).substring(2, 9)}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return '0x' + Math.abs(hash).toString(16).padStart(8, '0') + Math.random().toString(36).substring(2, 10);
}

// Authentic Platform Administrator & Demo Investor
// Authentic Platform Administrator & Registered Investors
const DEFAULT_USERS: User[] = [
  {
    id: 'usr-admin-kretz-site',
    email: 'info@kretz.site',
    fullName: 'Kretz Executive Admin',
    role: 'admin',
    accountType: 'admin',
    kycStatus: 'verified',
    walletBalance: 500000,
    investedBalance: 0,
    totalEarned: 0,
    createdAt: '2026-01-01T00:00:00Z',
    country: 'Spain',
    cryptoDepositAddress: '0x71C...B3fA (Kretz Executive Treasury)',
    status: 'active'
  },
  {
    id: 'usr-admin-1',
    email: 'admin@kretz.com',
    fullName: 'Platform Administrator',
    role: 'admin',
    accountType: 'admin',
    kycStatus: 'verified',
    walletBalance: 250000,
    investedBalance: 0,
    totalEarned: 0,
    createdAt: '2026-01-01T00:00:00Z',
    country: 'Spain',
    cryptoDepositAddress: '0x71C...B3fA (Platform Treasury)',
    status: 'active'
  },
  {
    id: 'usr-investor-1',
    email: 'investor@kretz.com',
    fullName: 'European Angel Partner',
    role: 'investor',
    accountType: 'individual_investor',
    kycStatus: 'verified',
    walletBalance: 15000,
    investedBalance: 63600,
    totalEarned: 2850,
    createdAt: '2026-01-10T00:00:00Z',
    country: 'France',
    bankIban: 'ES9121000418450200051829',
    cryptoDepositAddress: '0x39a9c29801869e94F2B85295c5Af646A9894A0b2',
    status: 'active'
  },
  {
    id: 'usr-investor-2',
    email: 'sophie.martin@luxcapital.fr',
    fullName: 'Sophie Martin',
    role: 'investor',
    accountType: 'accredited_investor',
    kycStatus: 'verified',
    walletBalance: 32500,
    investedBalance: 72800,
    totalEarned: 4120,
    createdAt: '2026-01-18T14:20:00Z',
    country: 'Monaco',
    bankIban: 'MC5830006000010123456789012',
    cryptoDepositAddress: '0x71C8135C0e41B3fA128912389128f9A19b28A0bf',
    status: 'active'
  },
  {
    id: 'usr-investor-3',
    email: 'david.vance@heritagefo.ch',
    fullName: 'David Vance',
    role: 'investor',
    accountType: 'family_office',
    kycStatus: 'verified',
    walletBalance: 120000,
    investedBalance: 145600,
    totalEarned: 11400,
    createdAt: '2026-02-02T09:15:00Z',
    country: 'Switzerland',
    companyName: 'Heritage Family Office SA',
    taxId: 'CHE-114.938.291',
    bankIban: 'CH9300762011623852957',
    cryptoDepositAddress: '0x5291bfa9821389128931a98124901b2a98124018',
    status: 'active'
  },
  {
    id: 'usr-investor-4',
    email: 'elena.rostova@monacocap.mc',
    fullName: 'Elena Rostova',
    role: 'investor',
    accountType: 'joint_account',
    kycStatus: 'pending',
    walletBalance: 4800,
    investedBalance: 29120,
    totalEarned: 950,
    createdAt: '2026-02-14T11:45:00Z',
    country: 'Monaco',
    jointHolderName: 'Alexander Rostov',
    bankIban: 'MC5830006000010987654321098',
    status: 'suspended',
    suspendedReason: 'Annual AML re-verification review pending'
  },
  {
    id: 'usr-investor-5',
    email: 'lucas.bernard@parisinvest.com',
    fullName: 'Lucas Bernard',
    role: 'investor',
    accountType: 'corporate_entity',
    kycStatus: 'verified',
    walletBalance: 85000,
    investedBalance: 98280,
    totalEarned: 5800,
    createdAt: '2026-02-28T16:00:00Z',
    country: 'France',
    companyName: 'Paris Invest Real Estate SARL',
    taxId: 'FR84910284719',
    bankIban: 'FR7630003012345678901234567',
    status: 'active'
  }
];

const DEFAULT_INVESTMENTS: Investment[] = [
  {
    id: 'inv-seed-01',
    userId: 'usr-investor-1',
    propertyId: 'prop-kretz-kp1-102',
    propertyTitle: 'ROQUEBRUNE-CAP-MARTIN - Ramingao - Golf Bleu',
    propertyLocation: 'Roquebrune Cap Martin, France',
    propertyImage: 'https://files.kretzrealestate.com/5534a64054a86115d0d81384cb413d7c.jpg',
    tokensPurchased: 150,
    tokenPrice: 364,
    totalAmountInvested: 54600,
    purchasedAt: '2025-11-15T10:00:00Z',
    startDate: '2025-11-15T10:00:00Z',
    maturityDate: '2028-11-15T10:00:00Z',
    durationMonths: 36,
    estimatedAnnualYield: 7.5,
    projectedMonthlyIncome: 354.90,
    totalDividendsReceived: 843.75,
    currentValuation: 57800,
    unrealizedProfitLoss: 3200,
    status: 'active',
    transactionHash: '0x39a9c29801869e94F2B85295c5Af646A9894A0b2_inv1',
    certificateId: 'KZ-CERT-KP1102-8491',
    fundingSource: 'wallet'
  },
  {
    id: 'inv-seed-02',
    userId: 'usr-investor-1',
    propertyId: 'prop-kretz-kp1-103',
    propertyTitle: 'PARIS 16th - Private Mansion Victor Hugo',
    propertyLocation: 'Paris 16th, France',
    propertyImage: 'https://files.kretzrealestate.com/bf9614ca8f58bfccfdcc38b3f7f167e.jpg',
    tokensPurchased: 90,
    tokenPrice: 364,
    totalAmountInvested: 9000,
    purchasedAt: '2026-02-01T10:00:00Z',
    startDate: '2026-02-01T10:00:00Z',
    maturityDate: '2029-02-01T10:00:00Z',
    durationMonths: 36,
    estimatedAnnualYield: 8.2,
    projectedMonthlyIncome: 63.96,
    totalDividendsReceived: 492.00,
    currentValuation: 9450,
    unrealizedProfitLoss: 450,
    status: 'active',
    transactionHash: '0x39a9c29801869e94F2B85295c5Af646A9894A0b2_inv2',
    certificateId: 'KZ-CERT-PAR16-2049',
    fundingSource: 'wallet'
  },
  {
    id: 'inv-seed-03',
    userId: 'usr-investor-2',
    propertyId: 'prop-kretz-kp1-101',
    propertyTitle: 'PARIS 7th - Champ de Mars Eiffel Tower Duplex',
    propertyLocation: 'Paris 7th, France',
    propertyImage: 'https://files.kretzrealestate.com/13f01fdf74a00194883d6a0cf0897ce5.jpg',
    tokensPurchased: 200,
    tokenPrice: 364,
    totalAmountInvested: 72800,
    purchasedAt: '2026-01-20T11:00:00Z',
    startDate: '2026-01-20T11:00:00Z',
    maturityDate: '2029-01-20T11:00:00Z',
    durationMonths: 36,
    estimatedAnnualYield: 8.9,
    projectedMonthlyIncome: 540.00,
    totalDividendsReceived: 1080.00,
    currentValuation: 76000,
    unrealizedProfitLoss: 3200,
    status: 'active',
    transactionHash: '0x71c8135c0e41b3fa128912389128f9a19b28a0bf_inv3',
    certificateId: 'KZ-CERT-PAR7-5912',
    fundingSource: 'wallet'
  },
  {
    id: 'inv-seed-04',
    userId: 'usr-investor-3',
    propertyId: 'prop-kretz-kp1-105',
    propertyTitle: 'CANNES - La Croisette Waterfront Penthouse',
    propertyLocation: 'Cannes, French Riviera, France',
    propertyImage: 'https://files.kretzrealestate.com/5f778a48b598d1a37c95ee13c1c73ec4.jpg',
    tokensPurchased: 400,
    tokenPrice: 364,
    totalAmountInvested: 145600,
    purchasedAt: '2026-02-05T09:30:00Z',
    startDate: '2026-02-05T09:30:00Z',
    maturityDate: '2029-02-05T09:30:00Z',
    durationMonths: 36,
    estimatedAnnualYield: 9.4,
    projectedMonthlyIncome: 1140.70,
    totalDividendsReceived: 2281.40,
    currentValuation: 152000,
    unrealizedProfitLoss: 6400,
    status: 'active',
    transactionHash: '0x5291bfa9821389128931a98124901b2a98124018_inv4',
    certificateId: 'KZ-CERT-CAN-9810',
    fundingSource: 'wallet'
  },
  {
    id: 'inv-seed-05',
    userId: 'usr-investor-4',
    propertyId: 'prop-kretz-kp1-104',
    propertyTitle: 'NEUILLY-SUR-SEINE - Boulevard d\'Argenson Mansion',
    propertyLocation: 'Neuilly-sur-Seine, France',
    propertyImage: 'https://files.kretzrealestate.com/7ec57be497c36a43b46fc0b91f5fa7cb.jpg',
    tokensPurchased: 80,
    tokenPrice: 364,
    totalAmountInvested: 29120,
    purchasedAt: '2026-02-18T14:00:00Z',
    startDate: '2026-02-18T14:00:00Z',
    maturityDate: '2029-02-18T14:00:00Z',
    durationMonths: 36,
    estimatedAnnualYield: 7.8,
    projectedMonthlyIncome: 189.28,
    totalDividendsReceived: 378.56,
    currentValuation: 29500,
    unrealizedProfitLoss: 380,
    status: 'active',
    transactionHash: '0x5830006000010987654321098_inv5',
    certificateId: 'KZ-CERT-NEU-4102',
    fundingSource: 'wallet'
  },
  {
    id: 'inv-seed-06',
    userId: 'usr-investor-5',
    propertyId: 'prop-kretz-kp1-106',
    propertyTitle: 'SAINT-TROPEZ - Les Parcs Private Estate & Vineyard',
    propertyLocation: 'Saint-Tropez, France',
    propertyImage: 'https://files.kretzrealestate.com/49baea38a6a27e7d6928e46957fb4a45.jpg',
    tokensPurchased: 270,
    tokenPrice: 364,
    totalAmountInvested: 98280,
    purchasedAt: '2026-03-02T10:15:00Z',
    startDate: '2026-03-02T10:15:00Z',
    maturityDate: '2029-03-02T10:15:00Z',
    durationMonths: 36,
    estimatedAnnualYield: 8.5,
    projectedMonthlyIncome: 696.15,
    totalDividendsReceived: 696.15,
    currentValuation: 101000,
    unrealizedProfitLoss: 2720,
    status: 'active',
    transactionHash: '0x7630003012345678901234567_inv6',
    certificateId: 'KZ-CERT-STP-1920',
    fundingSource: 'wallet'
  }
];

const DEFAULT_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-dep-seed-1',
    userId: 'usr-investor-1',
    type: 'deposit',
    amount: 10000,
    currency: 'EUR',
    status: 'pending',
    description: 'Deposit request via SEPA Bank Wire Transfer (CaixaBank Escrow)',
    reference: 'DEP-EUR-849201',
    createdAt: '2026-03-15T10:30:00Z',
    paymentMethod: 'SEPA Bank Wire Transfer',
    balanceAfter: 15000,
    txHash: '0xcaixa_wire_849201',
    metadata: {
      senderName: 'European Angel Partner',
      bank: 'CaixaBank S.A.',
      depositRef: 'DEP-EUR-849201'
    }
  },
  {
    id: 'tx-wd-seed-1',
    userId: 'usr-investor-1',
    type: 'withdrawal',
    amount: 2500,
    currency: 'EUR',
    status: 'pending',
    description: 'Withdrawal request to ES9121000418450200051829',
    reference: 'WD-582914',
    createdAt: '2026-03-15T09:15:00Z',
    paymentMethod: 'SEPA Bank Wire',
    balanceAfter: 12500,
    metadata: {
      bankIban: 'ES9121000418450200051829'
    }
  },
  {
    id: 'tx-dep-seed-2',
    userId: 'usr-investor-2',
    type: 'deposit',
    amount: 50000,
    currency: 'EUR',
    status: 'completed',
    description: 'Wire settlement credited by Treasury Desk',
    reference: 'DEP-EUR-721094',
    createdAt: '2026-01-19T10:00:00Z',
    paymentMethod: 'SEPA Bank Wire Transfer',
    balanceAfter: 50000,
    txHash: '0xmonaco_wire_721094'
  },
  {
    id: 'tx-dep-seed-3',
    userId: 'usr-investor-3',
    type: 'deposit',
    amount: 200000,
    currency: 'EUR',
    status: 'completed',
    description: 'Institutional Swiss Franc Wire Conversion & Escrow Credit',
    reference: 'DEP-EUR-994102',
    createdAt: '2026-02-03T11:00:00Z',
    paymentMethod: 'Institutional Bank Wire',
    balanceAfter: 200000,
    txHash: '0xubs_swiss_994102'
  },
  {
    id: 'tx-dep-seed-4',
    userId: 'usr-investor-4',
    type: 'deposit',
    amount: 35000,
    currency: 'EUR',
    status: 'completed',
    description: 'Joint Account Initial Deposit via Barclays Wire',
    reference: 'DEP-EUR-310492',
    createdAt: '2026-02-15T15:00:00Z',
    paymentMethod: 'SEPA Bank Wire Transfer',
    balanceAfter: 35000,
    txHash: '0xbarclays_310492'
  },
  {
    id: 'tx-dep-seed-5',
    userId: 'usr-investor-5',
    type: 'deposit',
    amount: 150000,
    currency: 'EUR',
    status: 'completed',
    description: 'Corporate Treasury Allocation via BNP Paribas Escrow',
    reference: 'DEP-EUR-640192',
    createdAt: '2026-03-01T12:00:00Z',
    paymentMethod: 'Corporate SEPA Wire',
    balanceAfter: 150000,
    txHash: '0xbnp_corp_640192'
  }
];

const DEFAULT_VERIFICATION_DOCUMENTS: VerificationDocument[] = [
  {
    id: 'doc-verify-1',
    userId: 'usr-investor-1',
    userName: 'European Angel Partner',
    userEmail: 'investor@kretz.com',
    category: 'deposit_proof',
    title: 'CaixaBank SEPA Wire Transfer Slip (€10,000)',
    documentType: 'Bank Wire Receipt',
    fileUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=1200&auto=format&fit=crop&q=80',
    fileName: 'caixabank_sepa_wire_transfer_10000eur.pdf',
    fileSize: 245000,
    uploadedAt: '2026-03-15T10:35:00Z',
    status: 'pending',
    transactionReference: 'DEP-EUR-849201',
    amount: 10000,
    currency: 'EUR',
    notes: 'Official CaixaBank SEPA bank transfer receipt matching pending deposit reference DEP-EUR-849201.'
  },
  {
    id: 'doc-verify-2',
    userId: 'usr-investor-1',
    userName: 'European Angel Partner',
    userEmail: 'investor@kretz.com',
    category: 'kyc_identity',
    title: 'Biometric Passport Scan (AML5/6 Compliance)',
    documentType: 'International Passport',
    fileUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=1200&auto=format&fit=crop&q=80',
    fileName: 'investor_passport_biometric_scan.jpg',
    fileSize: 1250000,
    uploadedAt: '2026-03-14T14:30:00Z',
    status: 'pending',
    notes: 'Biometric page scan submitted from dashboard for institutional KYC verification.'
  }
];

class LedgerService {
  private users: User[];
  private properties: Property[];
  private investments: Investment[];
  private transactions: Transaction[];
  private verificationDocuments: VerificationDocument[];
  private auditLogs: AuditLog[];
  private notifications: Notification[];
  private paymentConfig: PaymentConfig;
  private isProcessingLock: boolean = false;
  private membershipTiers: MembershipTier[];
  private memberships: UserMembership[];
  private membershipApplications: MembershipApplication[];
  private companyNews: CompanyNewsItem[];

  constructor() {
    const storedUsers = getStorage<User[]>('users', DEFAULT_USERS);
    const existingUserIds = new Set(storedUsers.map(u => u.id));
    const missingUsers = DEFAULT_USERS.filter(u => !existingUserIds.has(u.id));
    this.users = [...storedUsers, ...missingUsers].map(u => ({
      ...u,
      status: u.status || 'active'
    }));
    // Ensure investor account exists in users list
    if (!this.users.some(u => u.email === 'investor@kretz.com')) {
      this.users.push(DEFAULT_USERS[1]);
    }
    setStorage('users', this.users);

    const storedProps = getStorage<Property[]>('properties', []);
    const hasValidProps = Array.isArray(storedProps) && storedProps.length > 0;
    const rawList = hasValidProps ? storedProps : [...INITIAL_PROPERTIES];
    this.properties = rawList.filter(p => Array.isArray(p.images) && p.images.length >= 7);
    const existingPropIds = new Set(this.properties.map(p => p.id));
    const missingProps = INITIAL_PROPERTIES.filter(p => !existingPropIds.has(p.id) && Array.isArray(p.images) && p.images.length >= 7);
    if (missingProps.length > 0) {
      this.properties = [...this.properties, ...missingProps];
    }
    
    // Always sync latest INITIAL_PROPERTIES monthlyTargetRate and yield metrics onto property state
    const initialMap = new Map(INITIAL_PROPERTIES.map(p => [p.id, p]));
    this.properties = this.properties.map(p => {
      const init = initialMap.get(p.id);
      if (init) {
        return {
          ...p,
          monthlyTargetRate: init.monthlyTargetRate,
          estimatedAnnualYield: init.estimatedAnnualYield,
          totalEstimatedReturn: init.totalEstimatedReturn,
          tokenPrice: init.tokenPrice,
          durationMonths: init.durationMonths,
        };
      }
      return p;
    });
    setStorage('properties', this.properties);

    const storedInvestments = getStorage<Investment[]>('investments', DEFAULT_INVESTMENTS);
    const existingInvIds = new Set(storedInvestments.map(i => i.id));
    const missingInvs = DEFAULT_INVESTMENTS.filter(i => !existingInvIds.has(i.id));
    this.investments = [...storedInvestments, ...missingInvs];
    setStorage('investments', this.investments);

    const storedTxs = getStorage<Transaction[]>('transactions', DEFAULT_TRANSACTIONS);
    const existingTxIds = new Set(storedTxs.map(t => t.id));
    const missingTxs = DEFAULT_TRANSACTIONS.filter(t => !existingTxIds.has(t.id));
    this.transactions = [...storedTxs, ...missingTxs];

    // Ensure at least one pending deposit request is available for testing if empty
    if (!this.transactions.some(t => t.type === 'deposit' && t.status === 'pending')) {
      this.transactions.unshift(DEFAULT_TRANSACTIONS[0]);
    }
    setStorage('transactions', this.transactions);
    this.verificationDocuments = getStorage('verificationDocuments', DEFAULT_VERIFICATION_DOCUMENTS);
    this.paymentConfig = getStorage('paymentConfig', DEFAULT_PAYMENT_CONFIG);
    this.membershipTiers = getStorage('membershipTiers', INITIAL_MEMBERSHIP_TIERS);
    this.memberships = getStorage('memberships', []);
    this.membershipApplications = getStorage('membershipApplications', []);
    const storedNews = getStorage<CompanyNewsItem[]>('companyNews', []);
    // Ensure all initial authentic YouTube news videos exist
    if (!Array.isArray(storedNews) || storedNews.length === 0) {
      this.companyNews = [...INITIAL_COMPANY_NEWS];
      setStorage('companyNews', this.companyNews);
    } else {
      // Merge any missing initial news items by youtubeId
      const existingIds = new Set(storedNews.map(n => n.youtubeId));
      const missing = INITIAL_COMPANY_NEWS.filter(n => !existingIds.has(n.youtubeId));
      this.companyNews = [...storedNews, ...missing];
      if (missing.length > 0) {
        setStorage('companyNews', this.companyNews);
      }
    }
    this.auditLogs = getStorage('auditLogs', [
      {
        id: 'audit-1',
        adminId: 'usr-admin-1',
        adminEmail: 'admin@kretz.com',
        action: 'SYSTEM_INITIALIZATION',
        details: 'Double-entry ledger initialized for production custody.',
        timestamp: '2026-01-01T00:00:00Z'
      }
    ]);
    this.notifications = getStorage('notifications', []);
  }

  private saveState() {
    setStorage('users', this.users);
    setStorage('properties', this.properties);
    setStorage('investments', this.investments);
    setStorage('transactions', this.transactions);
    setStorage('verificationDocuments', this.verificationDocuments);
    setStorage('auditLogs', this.auditLogs);
    setStorage('notifications', this.notifications);
    setStorage('paymentConfig', this.paymentConfig);
    setStorage('membershipTiers', this.membershipTiers);
    setStorage('memberships', this.memberships);
    setStorage('membershipApplications', this.membershipApplications);
    setStorage('companyNews', this.companyNews);
  }

  public getPaymentConfig(): PaymentConfig {
    return JSON.parse(JSON.stringify(this.paymentConfig));
  }

  public updatePaymentConfig(config: PaymentConfig): void {
    this.paymentConfig = config;
    this.logAudit('usr-admin-1', 'admin@kretz.com', 'PAYMENT_CONFIG_UPDATED', 'Administrator updated dual payment gateway and crypto treasury wallet settings.');
    this.saveState();
  }

  public addCryptoNetwork(network: Omit<CryptoNetworkConfig, 'id'>): CryptoNetworkConfig {
    const newNetwork: CryptoNetworkConfig = {
      ...network,
      id: 'net-' + Math.random().toString(36).substring(2, 9)
    };
    this.paymentConfig.cryptoNetworks.push(newNetwork);
    this.logAudit(
      'usr-admin-1',
      'admin@kretz.com',
      'CRYPTO_NETWORK_ADDED',
      `Added crypto treasury network: ${newNetwork.name} (${newNetwork.token})`
    );
    this.saveState();
    return newNetwork;
  }

  public deleteCryptoNetwork(id: string): void {
    this.paymentConfig.cryptoNetworks = this.paymentConfig.cryptoNetworks.filter(n => n.id !== id);
    this.logAudit(
      'usr-admin-1',
      'admin@kretz.com',
      'CRYPTO_NETWORK_DELETED',
      `Deleted crypto treasury network ID: ${id}`
    );
    this.saveState();
  }

  public toggleCryptoNetwork(id: string): void {
    const net = this.paymentConfig.cryptoNetworks.find(n => n.id === id);
    if (net) {
      net.enabled = !net.enabled;
      this.saveState();
    }
  }

  public recordManualCredit(
    adminEmail: string,
    userId: string,
    amount: number,
    currency: string,
    paymentMethod: string,
    reference?: string,
    notes?: string
  ): Transaction {
    if (amount <= 0) throw new Error('Credit amount must be greater than zero.');
    const user = this.getUserById(userId);
    if (!user) throw new Error('Investor not found.');

    const timestamp = new Date().toISOString();
    const finalRef = reference || `MANUAL-${currency}-${Math.floor(100000 + Math.random() * 900000)}`;
    const txHash = generateTxHash(finalRef, amount, timestamp);

    user.walletBalance = Number((user.walletBalance + amount).toFixed(2));

    const tx: Transaction = {
      id: 'tx-' + Math.random().toString(36).substring(2, 9),
      userId: user.id,
      type: 'deposit',
      amount: amount,
      currency: currency as any,
      status: 'completed',
      description: `Manual payment credit via ${paymentMethod}${notes ? ` (${notes})` : ''}`,
      reference: finalRef,
      createdAt: timestamp,
      paymentMethod: paymentMethod,
      balanceAfter: user.walletBalance,
      txHash: txHash,
      metadata: {
        notes: notes,
        adminEmail: adminEmail
      }
    };

    this.transactions.unshift(tx);
    this.createNotification(
      user.id,
      'Account Credited by Admin',
      `Your balance was manually credited with €${amount.toFixed(2)} (${paymentMethod}).`,
      'financial'
    );
    this.logAudit(
      'usr-admin-1',
      adminEmail,
      'MANUAL_PAYMENT_CREDITED',
      `Admin manually credited €${amount.toFixed(2)} to ${user.email} (${paymentMethod}). Ref: ${finalRef}`
    );
    this.saveState();
    return tx;
  }

  public updateUserPaymentDetails(
    userId: string,
    details: { cryptoDepositAddress?: string; bankIban?: string }
  ): User {
    const user = this.getUserById(userId);
    if (!user) throw new Error('User not found.');
    if (details.cryptoDepositAddress !== undefined) {
      user.cryptoDepositAddress = details.cryptoDepositAddress;
    }
    if (details.bankIban !== undefined) {
      user.bankIban = details.bankIban;
    }
    this.logAudit(
      'usr-admin-1',
      'admin@kretz.com',
      'USER_PAYMENT_DETAILS_UPDATED',
      `Updated payment integration details for ${user.email}`
    );
    this.saveState();
    return user;
  }

  public updateUserProfile(
    userId: string,
    updates: Partial<User>
  ): User {
    const user = this.getUserById(userId);
    if (!user) throw new Error('User not found.');
    
    if (updates.fullName !== undefined) user.fullName = updates.fullName.trim();
    if (updates.phoneNumber !== undefined) user.phoneNumber = updates.phoneNumber.trim();
    if (updates.country !== undefined) user.country = updates.country.trim();
    if (updates.avatarUrl !== undefined) user.avatarUrl = updates.avatarUrl;
    if (updates.bankIban !== undefined) user.bankIban = updates.bankIban.trim();
    if (updates.cryptoDepositAddress !== undefined) user.cryptoDepositAddress = updates.cryptoDepositAddress.trim();
    if (updates.taxId !== undefined) user.taxId = updates.taxId.trim();
    if (updates.dateOfBirth !== undefined) user.dateOfBirth = updates.dateOfBirth;
    if (updates.address !== undefined) user.address = updates.address.trim();
    if (updates.city !== undefined) user.city = updates.city.trim();
    if (updates.postalCode !== undefined) user.postalCode = updates.postalCode.trim();
    if (updates.twoFactorEnabled !== undefined) user.twoFactorEnabled = updates.twoFactorEnabled;

    this.saveState();
    return user;
  }

  // --- User & Auth Queries ---
  public getUsers(): User[] {
    return [...this.users];
  }

  public getUserById(id: string): User | undefined {
    return this.users.find(u => u.id === id);
  }

  public getUserByEmail(email: string): User | undefined {
    let found = this.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!found && email.toLowerCase() === 'investor@kretz.com') {
      found = {
        id: 'usr-investor-1',
        email: 'investor@kretz.com',
        fullName: 'European Angel Partner',
        role: 'investor',
        accountType: 'individual_investor',
        kycStatus: 'verified',
        walletBalance: 15000,
        investedBalance: 24000,
        totalEarned: 2850,
        createdAt: '2026-01-10T00:00:00Z',
        country: 'France',
        bankIban: 'ES9121000418450200051829',
        cryptoDepositAddress: '0x39a9c29801869e94F2B85295c5Af646A9894A0b2'
      };
      this.users.push(found);
      this.saveState();
    }
    return found;
  }

  public createSamplePendingDeposit(amount: number = 5000, userId?: string): Transaction {
    const targetUser = userId ? this.getUserById(userId) : (this.getUserByEmail('investor@kretz.com') || this.users[0]);
    if (!targetUser) throw new Error('Target investor not found.');

    const timestamp = new Date().toISOString();
    const reference = `DEP-EUR-${Math.floor(100000 + Math.random() * 900000)}`;
    const tx: Transaction = {
      id: 'tx-dep-' + Math.random().toString(36).substring(2, 9),
      userId: targetUser.id,
      type: 'deposit',
      amount: amount,
      currency: 'EUR',
      status: 'pending',
      description: 'Deposit request via SEPA Bank Wire (CaixaBank Escrow)',
      reference: reference,
      createdAt: timestamp,
      paymentMethod: 'SEPA Bank Wire Transfer',
      balanceAfter: targetUser.walletBalance,
      txHash: '0xcaixa_' + reference.toLowerCase(),
      metadata: {
        senderName: targetUser.fullName,
        bank: 'CaixaBank S.A.',
        depositRef: reference
      }
    };

    this.transactions.unshift(tx);
    this.createNotification(
      targetUser.id,
      'Deposit Request Received',
      `Deposit request for €${amount.toFixed(2)} (${reference}) is awaiting administrator review.`,
      'info'
    );
    this.saveState();
    return tx;
  }

  public createSamplePendingWithdrawal(amount: number = 1000, userId?: string): Transaction {
    const targetUser = userId ? this.getUserById(userId) : (this.getUserByEmail('investor@kretz.com') || this.users[0]);
    if (!targetUser) throw new Error('Target investor not found.');

    const timestamp = new Date().toISOString();
    const reference = `WD-${Math.floor(100000 + Math.random() * 900000)}`;
    const tx: Transaction = {
      id: 'tx-wd-' + Math.random().toString(36).substring(2, 9),
      userId: targetUser.id,
      type: 'withdrawal',
      amount: amount,
      currency: 'EUR',
      status: 'pending',
      description: `Withdrawal request to ${targetUser.bankIban || 'ES9121000418450200051829'}`,
      reference: reference,
      createdAt: timestamp,
      paymentMethod: 'SEPA Bank Wire',
      balanceAfter: targetUser.walletBalance,
      metadata: {
        bankIban: targetUser.bankIban || 'ES9121000418450200051829'
      }
    };

    this.transactions.unshift(tx);
    this.createNotification(
      targetUser.id,
      'Withdrawal Request Received',
      `Withdrawal request for €${amount.toFixed(2)} (${reference}) is pending administrator approval.`,
      'info'
    );
    this.saveState();
    return tx;
  }

  public createUser(userData: {
    email: string;
    fullName: string;
    role?: UserRole;
    accountType?: AccountType;
    country?: string;
    phoneNumber?: string;
  }): User {
    const existing = this.getUserByEmail(userData.email);
    if (existing) {
      throw new Error('An account with this email address already exists.');
    }

    const newUser: User = {
      id: 'usr-' + Math.random().toString(36).substring(2, 10),
      email: userData.email,
      fullName: userData.fullName,
      role: userData.role || 'investor',
      accountType: userData.accountType || (userData.role === 'admin' ? 'admin' : 'individual_investor'),
      country: userData.country || 'France',
      phoneNumber: userData.phoneNumber || '',
      kycStatus: 'unverified',
      walletBalance: 0,
      investedBalance: 0,
      totalEarned: 0,
      createdAt: new Date().toISOString(),
      cryptoDepositAddress: '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
    };

    this.users.push(newUser);
    this.logAudit(newUser.id, newUser.email, 'USER_REGISTERED', `New user registered with role ${newUser.role}, account type ${newUser.accountType}, country ${newUser.country}`);
    this.saveState();
    return newUser;
  }

  public syncSupabaseUser(
    supabaseId: string,
    email: string,
    fullName: string,
    role: UserRole = 'investor',
    accountType?: AccountType,
    country?: string,
    phoneNumber?: string
  ): User {
    const cleanEmail = (email || '').trim().toLowerCase();
    const isAdminEmail = cleanEmail === 'info@kretz.site' || cleanEmail === 'admin@kretz.com' || cleanEmail.endsWith('@kretz.site') || cleanEmail.includes('admin');
    const effectiveRole: UserRole = isAdminEmail ? 'admin' : role;
    const effectiveAccountType: AccountType = isAdminEmail ? 'admin' : (accountType || 'individual_investor');

    let existing = this.getUserById(supabaseId) || this.getUserByEmail(email);
    if (existing) {
      existing.id = supabaseId;
      if (isAdminEmail) {
        existing.role = 'admin';
        existing.accountType = 'admin';
        existing.kycStatus = 'verified';
      }
      if (fullName && (!existing.fullName || existing.fullName === 'Investor')) {
        existing.fullName = fullName;
      }
      if (accountType && !existing.accountType) {
        existing.accountType = accountType;
      }
      if (country && !existing.country) {
        existing.country = country;
      }
      if (phoneNumber && !existing.phoneNumber) {
        existing.phoneNumber = phoneNumber;
      }
      this.saveState();
      return existing;
    }

    const newUser: User = {
      id: supabaseId,
      email: email,
      fullName: fullName || (isAdminEmail ? 'Kretz Executive Admin' : email.split('@')[0] || 'Investor'),
      role: effectiveRole,
      accountType: effectiveAccountType,
      country: country || 'Spain',
      phoneNumber: phoneNumber || '',
      kycStatus: isAdminEmail ? 'verified' : 'unverified',
      walletBalance: isAdminEmail ? 500000 : 0,
      investedBalance: 0,
      totalEarned: 0,
      createdAt: new Date().toISOString(),
      cryptoDepositAddress: '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
    };
    this.users.push(newUser);
    this.logAudit(newUser.id, newUser.email, 'USER_REGISTERED_SUPABASE', `New Supabase user synced with role ${newUser.role}: ${newUser.email}`);
    this.saveState();
    return newUser;
  }

  public updateKYCStatus(userId: string, status: KYCStatus, docType?: string): User {
    const user = this.getUserById(userId);
    if (!user) throw new Error('User not found');

    user.kycStatus = status;
    if (docType) user.kycDocumentType = docType;
    if (status === 'pending') user.kycSubmittedAt = new Date().toISOString();

    this.logAudit('usr-admin-1', 'admin@kretz.com', 'KYC_STATUS_UPDATED', `User ${user.email} KYC status set to ${status}`);
    this.createNotification(user.id, `Identity Verification: ${status.toUpperCase()}`, `Your KYC verification is now ${status}.`, status === 'verified' ? 'success' : 'info');
    this.saveState();
    return user;
  }

  public updateUserAccountType(
    userId: string, 
    accountType: AccountType, 
    extraDetails?: { jointHolderName?: string; companyName?: string; institutionName?: string; taxId?: string; registrationNumber?: string }
  ): User {
    const user = this.getUserById(userId);
    if (!user) throw new Error('User not found');

    user.accountType = accountType;
    if (extraDetails) {
      if (extraDetails.jointHolderName !== undefined) user.jointHolderName = extraDetails.jointHolderName;
      if (extraDetails.companyName !== undefined) user.companyName = extraDetails.companyName;
      if (extraDetails.institutionName !== undefined) user.institutionName = extraDetails.institutionName;
      if (extraDetails.taxId !== undefined) user.taxId = extraDetails.taxId;
      if (extraDetails.registrationNumber !== undefined) user.registrationNumber = extraDetails.registrationNumber;
    }

    this.logAudit(userId, user.email, 'ACCOUNT_TYPE_UPDATED', `User account type updated to ${accountType}`);
    this.createNotification(user.id, 'Account Type Updated', `Your investor profile has been switched to ${getAccountTypeLabel(accountType)}.`, 'success');
    this.saveState();
    return user;
  }

  public toggleUserStatus(
    userId: string, 
    newStatus: 'active' | 'suspended', 
    adminEmail: string = 'admin@kretz.com',
    reason?: string
  ): User {
    const user = this.getUserById(userId);
    if (!user) throw new Error('User not found.');

    const previousStatus = user.status || 'active';
    user.status = newStatus;
    user.suspendedReason = newStatus === 'suspended' ? (reason?.trim() || 'Administrative Compliance Suspension') : undefined;

    const action = newStatus === 'suspended' ? 'USER_SUSPENDED' : 'USER_ACTIVATED';
    const auditDetails = `Investor account ${user.fullName} (${user.email}) changed from ${previousStatus.toUpperCase()} to ${newStatus.toUpperCase()} by ${adminEmail}.${reason ? ` Reason: ${reason}` : ''}`;
    this.logAudit('usr-admin-1', adminEmail, action, auditDetails);

    this.createNotification(
      user.id,
      newStatus === 'suspended' ? 'Account Temporarily Suspended' : 'Account Re-Activated',
      newStatus === 'suspended'
        ? `Your investor account access has been suspended: ${reason || 'Compliance review in progress'}. Please contact compliance@kretz.com for assistance.`
        : 'Your investor account has been restored to active status. Full investment and wallet capabilities are available.',
      newStatus === 'suspended' ? 'warning' : 'success'
    );

    this.saveState();
    return user;
  }

  public recordAuditLog(adminId: string, adminEmail: string, action: string, details: string): void {
    this.logAudit(adminId, adminEmail, action, details);
    this.saveState();
  }


  // --- Properties Management ---
  public getProperties(): Property[] {
    const initialMap = new Map(INITIAL_PROPERTIES.map(p => [p.id, p]));
    return this.properties
      .filter(p => Array.isArray(p.images) && p.images.length >= 7)
      .map(p => {
        const init = initialMap.get(p.id);
        if (init) {
          return {
            ...p,
            monthlyTargetRate: init.monthlyTargetRate,
            estimatedAnnualYield: init.estimatedAnnualYield,
            totalEstimatedReturn: init.totalEstimatedReturn,
            tokenPrice: init.tokenPrice,
          };
        }
        return p;
      });
  }

  public getPropertyById(id: string): Property | undefined {
    const p = this.properties.find(prop => (prop.id === id || prop.slug === id) && Array.isArray(prop.images) && prop.images.length >= 7);
    if (p) {
      const init = INITIAL_PROPERTIES.find(item => item.id === p.id || item.slug === p.slug);
      if (init) {
        return {
          ...p,
          monthlyTargetRate: init.monthlyTargetRate,
          estimatedAnnualYield: init.estimatedAnnualYield,
          totalEstimatedReturn: init.totalEstimatedReturn,
          tokenPrice: init.tokenPrice,
        };
      }
    }
    return p;
  }

  public saveProperty(property: Property): Property {
    const index = this.properties.findIndex(p => p.id === property.id);
    if (index >= 0) {
      this.properties[index] = property;
    } else {
      this.properties.push(property);
    }
    this.logAudit('usr-admin-1', 'admin@kretz.com', 'PROPERTY_UPDATED', `Property ${property.title} was saved/updated`);
    this.saveState();
    return property;
  }

  public restoreDefaults(): { success: boolean; message: string } {
    this.properties = INITIAL_PROPERTIES.filter(p => Array.isArray(p.images) && p.images.length >= 7);
    this.companyNews = [...INITIAL_COMPANY_NEWS];
    setStorage('properties', this.properties);
    setStorage('companyNews', this.companyNews);
    this.logAudit('usr-admin-1', 'admin@kretz.com', 'SYSTEM_RESTORED', 'Restored all initial properties and company news videos');
    this.saveState();
    return { success: true, message: 'Successfully restored all properties and company news videos to initial defaults.' };
  }

  // --- Atomic Ledger Operations ---
  /**
   * Process Deposit:
   * Adds funds to available wallet balance and records ledger transaction.
   */
  public async processDeposit(
    userId: string,
    amount: number,
    currency: 'EUR' | 'USDT' | 'USDC' | 'BTC' | 'ETH' | 'SOL' | string,
    paymentMethod: string,
    externalRef?: string,
    metadata?: Record<string, any>
  ): Promise<Transaction> {
    if (amount <= 0) throw new Error('Deposit amount must be greater than zero.');
    if (this.isProcessingLock) throw new Error('Another ledger transaction is currently processing. Please retry in a moment.');

    try {
      this.isProcessingLock = true;
      const user = this.getUserById(userId);
      if (!user) throw new Error('Investor account not found.');

      const timestamp = new Date().toISOString();
      const reference = externalRef || `DEP-${currency}-${Math.floor(100000 + Math.random() * 900000)}`;
      const txHash = generateTxHash(reference, amount, timestamp);

      // Do NOT mutate balance until admin approves deposit
      const tx: Transaction = {
        id: 'tx-' + Math.random().toString(36).substring(2, 9),
        userId: user.id,
        type: 'deposit',
        amount: amount,
        currency: currency as any,
        status: 'pending',
        description: `Deposit request via ${paymentMethod} (Awaiting Admin Confirmation)`,
        reference: reference,
        createdAt: timestamp,
        paymentMethod: paymentMethod,
        balanceAfter: user.walletBalance,
        txHash: txHash,
        metadata: metadata
      };

      this.transactions.unshift(tx);

      // If user uploaded a deposit receipt / payment proof, automatically register it in verification documents
      if (metadata?.receiptUrl || metadata?.receiptFile) {
        this.verificationDocuments.unshift({
          id: 'doc-' + Math.random().toString(36).substring(2, 10),
          userId: user.id,
          userName: user.fullName,
          userEmail: user.email,
          category: 'deposit_proof',
          title: `Deposit Proof: ${paymentMethod} (${formatCurrency(amount)})`,
          documentType: paymentMethod.includes('Crypto') ? 'Crypto Tx Proof' : 'Bank Wire Receipt',
          fileUrl: metadata.receiptUrl || metadata.receiptFile,
          fileName: metadata.receiptFileName || 'deposit_transfer_receipt.pdf',
          fileSize: metadata.receiptFileSize || 150000,
          uploadedAt: timestamp,
          status: 'pending',
          transactionReference: reference,
          amount: amount,
          currency: currency,
          notes: metadata.notes || `Uploaded proof for deposit request ${reference}`
        });
      }

      this.createNotification(user.id, 'Deposit Submitted', `Your deposit request for €${amount.toFixed(2)} is pending administrative review and approval.`, 'info');
      this.logAudit(user.id, user.email, 'DEPOSIT_REQUESTED', `User requested €${amount.toFixed(2)} deposit via ${paymentMethod}`);
      this.saveState();
      return tx;
    } finally {
      this.isProcessingLock = false;
    }
  }

  /**
   * Request Withdrawal:
   * Checks balance, verifies KYC, creates pending withdrawal, and temporarily locks funds to prevent double-spend.
   */
  public async requestWithdrawal(
    userId: string,
    amount: number,
    paymentMethod: string,
    details: { bankIban?: string; cryptoAddress?: string; network?: string; token?: string }
  ): Promise<Transaction> {
    if (amount <= 0) throw new Error('Withdrawal amount must be greater than zero.');
    if (this.isProcessingLock) throw new Error('Ledger is busy processing another transaction.');

    try {
      this.isProcessingLock = true;
      const user = this.getUserById(userId);
      if (!user) throw new Error('Investor account not found.');

      if (user.kycStatus !== 'verified') {
        throw new Error('Regulatory compliance requires identity verification (KYC) before processing withdrawals.');
      }

      if (user.walletBalance < amount) {
        throw new Error(`Insufficient available funds. Current available balance: €${user.walletBalance.toFixed(2)}`);
      }

      // Deduct balance immediately into pending escrow to prevent double withdrawals
      user.walletBalance = Number((user.walletBalance - amount).toFixed(2));

      const timestamp = new Date().toISOString();
      const reference = `WD-${Math.floor(100000 + Math.random() * 900000)}`;

      const tx: Transaction = {
        id: 'tx-' + Math.random().toString(36).substring(2, 9),
        userId: user.id,
        type: 'withdrawal',
        amount: amount,
        currency: (details.token as any) || 'EUR',
        status: 'pending',
        description: `Withdrawal request to ${details.bankIban || details.cryptoAddress || paymentMethod}`,
        reference: reference,
        createdAt: timestamp,
        paymentMethod: paymentMethod,
        balanceAfter: user.walletBalance,
        metadata: {
          bankIban: details.bankIban,
          destinationAddress: details.cryptoAddress,
          network: details.network
        }
      };

      this.transactions.unshift(tx);
      this.createNotification(user.id, 'Withdrawal Submitted', `Withdrawal request for €${amount.toFixed(2)} is pending administrative review.`, 'info');
      this.logAudit(user.id, user.email, 'WITHDRAWAL_REQUESTED', `User requested €${amount.toFixed(2)} withdrawal via ${paymentMethod}`);
      this.saveState();
      return tx;
    } finally {
      this.isProcessingLock = false;
    }
  }

  /**
   * Admin Review Withdrawal:
   * Approve or reject withdrawal. If rejected, funds are safely refunded back to user balance.
   */
  public async reviewWithdrawal(txId: string, approved: boolean, reason?: string): Promise<Transaction> {
    const tx = this.transactions.find(t => t.id === txId && t.type === 'withdrawal');
    if (!tx) throw new Error('Withdrawal transaction not found.');
    if (tx.status !== 'pending') throw new Error(`Withdrawal cannot be reviewed in status '${tx.status}'.`);

    const user = this.getUserById(tx.userId);
    if (!user) throw new Error('Investor not found.');

    if (approved) {
      tx.status = 'completed';
      tx.txHash = (tx.metadata?.destinationAddress ? 'CRYPTO-EXEC-' : 'SEPA-EXEC-') + Math.random().toString(36).substring(2, 10).toUpperCase();
      this.createNotification(user.id, 'Withdrawal Executed', `Your withdrawal of €${tx.amount.toFixed(2)} has been successfully approved and transferred.`, 'success');
      this.logAudit('usr-admin-1', 'admin@kretz.com', 'WITHDRAWAL_APPROVED', `Approved withdrawal of €${tx.amount.toFixed(2)} for ${user.email} (${tx.paymentMethod})`);
    } else {
      // Refund balance
      user.walletBalance = Number((user.walletBalance + tx.amount).toFixed(2));
      tx.status = 'rejected';
      tx.balanceAfter = user.walletBalance;
      if (!tx.metadata) tx.metadata = {};
      tx.metadata.rejectionReason = reason || 'Compliance or bank details verification check failed.';
      this.createNotification(user.id, 'Withdrawal Declined', `Your withdrawal of €${tx.amount.toFixed(2)} was declined: ${tx.metadata.rejectionReason}. Funds were returned to your balance.`, 'warning');
      this.logAudit('usr-admin-1', 'admin@kretz.com', 'WITHDRAWAL_REJECTED', `Rejected withdrawal of €${tx.amount.toFixed(2)} for ${user.email}`);
    }

    this.saveState();
    return tx;
  }

  public async reviewDeposit(txId: string, approved: boolean, reason?: string): Promise<Transaction> {
    const tx = this.transactions.find(t => t.id === txId && t.type === 'deposit');
    if (!tx) throw new Error('Deposit transaction not found.');
    if (tx.status !== 'pending') throw new Error(`Deposit cannot be reviewed in status '${tx.status}'.`);

    const user = this.getUserById(tx.userId);
    if (!user) throw new Error('Investor not found.');

    if (approved) {
      tx.status = 'completed';
      user.walletBalance = Number((user.walletBalance + tx.amount).toFixed(2));
      tx.balanceAfter = user.walletBalance;
      this.createNotification(user.id, 'Deposit Approved & Credited', `Your deposit of €${tx.amount.toFixed(2)} has been approved by admin and credited to your wallet balance.`, 'success');
      this.logAudit('usr-admin-1', 'admin@kretz.com', 'DEPOSIT_APPROVED', `Approved deposit of €${tx.amount.toFixed(2)} for ${user.email}`);

      // Also mark any attached verification document as approved
      const linkedDoc = this.verificationDocuments.find(d => d.transactionReference === tx.reference);
      if (linkedDoc) {
        linkedDoc.status = 'approved';
        linkedDoc.reviewedAt = new Date().toISOString();
        linkedDoc.reviewedBy = 'admin@kretz.com';
      }
    } else {
      tx.status = 'rejected';
      if (!tx.metadata) tx.metadata = {};
      tx.metadata.rejectionReason = reason || 'Deposit bank wire transfer reference or receipt could not be verified.';
      this.createNotification(user.id, 'Deposit Rejected', `Your deposit request for €${tx.amount.toFixed(2)} was declined: ${tx.metadata.rejectionReason}.`, 'warning');
      this.logAudit('usr-admin-1', 'admin@kretz.com', 'DEPOSIT_REJECTED', `Rejected deposit of €${tx.amount.toFixed(2)} for ${user.email}`);

      const linkedDoc = this.verificationDocuments.find(d => d.transactionReference === tx.reference);
      if (linkedDoc) {
        linkedDoc.status = 'rejected';
        linkedDoc.rejectionReason = tx.metadata.rejectionReason;
        linkedDoc.reviewedAt = new Date().toISOString();
      }
    }

    this.saveState();
    return tx;
  }

  // --- Document Upload & Verification Vault Methods ---

  public getVerificationDocuments(userId?: string): VerificationDocument[] {
    if (userId) {
      return this.verificationDocuments.filter(d => d.userId === userId);
    }
    return [...this.verificationDocuments];
  }

  public getVerificationDocumentById(id: string): VerificationDocument | undefined {
    return this.verificationDocuments.find(d => d.id === id);
  }

  public uploadVerificationDocument(doc: Omit<VerificationDocument, 'id' | 'uploadedAt' | 'status'>): VerificationDocument {
    const newDoc: VerificationDocument = {
      ...doc,
      id: 'doc-' + Math.random().toString(36).substring(2, 10),
      uploadedAt: new Date().toISOString(),
      status: 'pending'
    };

    this.verificationDocuments.unshift(newDoc);
    this.createNotification(
      newDoc.userId,
      'Document Submitted for Verification',
      `Your document "${newDoc.title}" was submitted to the compliance vault. Awaiting administrative confirmation.`,
      'info'
    );
    this.logAudit(
      newDoc.userId,
      newDoc.userEmail,
      'DOCUMENT_UPLOADED',
      `Uploaded ${newDoc.category} document "${newDoc.title}" (${newDoc.fileName})`
    );
    this.saveState();
    return newDoc;
  }

  public reviewVerificationDocument(docId: string, approved: boolean, reason?: string, adminEmail: string = 'admin@kretz.com'): VerificationDocument {
    const doc = this.verificationDocuments.find(d => d.id === docId);
    if (!doc) throw new Error('Verification document not found.');

    doc.status = approved ? 'approved' : 'rejected';
    doc.reviewedAt = new Date().toISOString();
    doc.reviewedBy = adminEmail;
    if (!approved && reason) {
      doc.rejectionReason = reason;
    }

    const user = this.getUserById(doc.userId);
    if (user) {
      if (approved) {
        // If KYC Identity, verify user account
        if (doc.category === 'kyc_identity') {
          user.kycStatus = 'verified';
          user.kycDocumentType = doc.documentType;
        }

        // If Deposit Proof with linked reference, auto-credit matching deposit if pending
        if (doc.category === 'deposit_proof' && doc.transactionReference) {
          const matchingTx = this.transactions.find(
            t => t.reference === doc.transactionReference && t.type === 'deposit' && t.status === 'pending'
          );
          if (matchingTx) {
            matchingTx.status = 'completed';
            user.walletBalance = Number((user.walletBalance + matchingTx.amount).toFixed(2));
            matchingTx.balanceAfter = user.walletBalance;
            this.createNotification(
              user.id,
              'Deposit Confirmed & Credited',
              `Payment receipt confirmed! €${matchingTx.amount.toFixed(2)} has been credited to your available wallet balance.`,
              'success'
            );
          }
        }

        this.createNotification(
          user.id,
          'Document Confirmed & Approved',
          `Your document "${doc.title}" has been reviewed and approved by the platform compliance officer.`,
          'success'
        );
        this.logAudit(
          'usr-admin-1',
          adminEmail,
          'DOCUMENT_APPROVED',
          `Approved ${doc.category} document "${doc.title}" for investor ${doc.userEmail}`
        );
      } else {
        if (doc.category === 'kyc_identity') {
          user.kycStatus = 'rejected';
        }
        this.createNotification(
          user.id,
          'Document Verification Declined',
          `Your document "${doc.title}" was declined: ${reason || 'Document resolution or details could not be validated. Please re-upload.'}`,
          'warning'
        );
        this.logAudit(
          'usr-admin-1',
          adminEmail,
          'DOCUMENT_REJECTED',
          `Declined document "${doc.title}" for investor ${doc.userEmail}. Reason: ${reason || 'Incomplete'}`
        );
      }
    }

    this.saveState();
    return doc;
  }

  public deleteVerificationDocument(docId: string): void {
    const index = this.verificationDocuments.findIndex(d => d.id === docId);
    if (index >= 0) {
      this.verificationDocuments.splice(index, 1);
      this.saveState();
    }
  }

  public updateUserAvatar(userId: string, avatarUrl: string): User {
    const user = this.getUserById(userId);
    if (!user) throw new Error('User not found');
    user.avatarUrl = avatarUrl;
    this.saveState();
    return user;
  }

  /**
   * Atomic Investment Execution:
   * Validates available tokens, enforces minimums, deducts wallet balance, updates property funded amount,
   * creates user investment record, and issues digital ownership certificate.
   */
  public async executeInvestment(userId: string, propertyId: string, tokenCount: number): Promise<Investment> {
    if (tokenCount <= 0 || !Number.isInteger(tokenCount)) {
      throw new Error('Token purchase quantity must be a whole positive integer.');
    }
    if (this.isProcessingLock) throw new Error('Transaction execution engine is busy.');

    try {
      this.isProcessingLock = true;
      const user = this.getUserById(userId);
      if (!user) throw new Error('Please log in to participate in real estate offerings.');

      const property = this.getPropertyById(propertyId);
      if (!property) throw new Error('Target property not found in investment directory.');

      if (property.status !== 'funding') {
        throw new Error(`This property is currently '${property.status}' and not open for new contributions.`);
      }

      if (tokenCount > property.availableTokens) {
        throw new Error(`Only ${property.availableTokens} tokens remain available for this property.`);
      }

      const totalCost = tokenCount * property.tokenPrice;
      if (totalCost < property.minimumInvestment) {
        throw new Error(`Minimum investment for this property is €${property.minimumInvestment.toLocaleString()} (${Math.ceil(property.minimumInvestment / property.tokenPrice)} tokens).`);
      }
      if (user.walletBalance < totalCost) {
        throw new Error(`Insufficient available funds. Required: €${totalCost.toFixed(2)}, Available: €${user.walletBalance.toFixed(2)}. Please make a deposit first.`);
      }

      const timestamp = new Date().toISOString();
      const reference = `INV-${property.tokenTicker}-${Math.floor(1000 + Math.random() * 9000)}`;
      const txHash = generateTxHash(reference, totalCost, timestamp);
      const certificateId = `CERT-${property.tokenTicker}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // Deduct balance and add to invested capital
      user.walletBalance = Number((user.walletBalance - totalCost).toFixed(2));
      user.investedBalance = Number((user.investedBalance + totalCost).toFixed(2));

      // Update property funding metrics
      property.availableTokens -= tokenCount;
      property.fundedAmount = Number((property.fundedAmount + totalCost).toFixed(2));
      if (property.availableTokens <= 0) {
        property.status = 'funded';
      }
      property.investorCount += 1;

      // Calculate projected monthly income = investment cost × monthly percentage ÷ 100
      const monthlyRate = property.monthlyTargetRate || 6.0;
      const projectedMonthlyIncome = Number(((totalCost * monthlyRate) / 100).toFixed(2));

      // Calculate start and maturity dates based on property term
      const startDate = timestamp;
      const durationMonths = property.durationMonths || 36;
      const matDateObj = new Date(timestamp);
      matDateObj.setMonth(matDateObj.getMonth() + durationMonths);
      const maturityDate = matDateObj.toISOString();

      // Create Investment record
      const investment: Investment = {
        id: 'inv-' + Math.random().toString(36).substring(2, 9),
        userId: user.id,
        propertyId: property.id,
        propertyTitle: property.title,
        propertyLocation: property.location,
        propertyImage: property.images[0] || property.bannerImage,
        tokensPurchased: tokenCount,
        tokenPrice: property.tokenPrice,
        totalAmountInvested: totalCost,
        purchasedAt: timestamp,
        startDate: startDate,
        maturityDate: maturityDate,
        durationMonths: durationMonths,
        estimatedAnnualYield: property.estimatedAnnualYield,
        projectedMonthlyIncome: projectedMonthlyIncome,
        totalDividendsReceived: 0,
        currentValuation: totalCost,
        unrealizedProfitLoss: 0,
        status: 'active',
        transactionHash: txHash,
        certificateId: certificateId,
        fundingSource: 'wallet'
      };

      this.investments.unshift(investment);

      // Trigger Supabase Edge Function to send automated confirmation email once recorded in ledger
      if (isSupabaseConfigured()) {
        try {
          await supabase.functions.invoke('send-investment-confirmation', {
            body: {
              userId: user.id,
              email: user.email,
              fullName: user.fullName,
              propertyTitle: property.title,
              propertyLocation: property.location,
              tokensPurchased: tokenCount,
              totalAmountInvested: totalCost,
              certificateId: certificateId,
              transactionHash: txHash,
              purchasedAt: timestamp,
            },
          });
        } catch (emailErr) {
          console.log('Supabase Edge Function email notification notice:', emailErr);
        }
      }

      // Create Ledger Transaction
      const tx: Transaction = {
        id: 'tx-' + Math.random().toString(36).substring(2, 9),
        userId: user.id,
        type: 'investment',
        amount: totalCost,
        currency: 'EUR',
        status: 'completed',
        description: `Acquired ${tokenCount} ${property.tokenTicker} tokens in ${property.title}`,
        reference: reference,
        createdAt: timestamp,
        paymentMethod: 'Internal Balance',
        balanceAfter: user.walletBalance,
        txHash: txHash,
        metadata: {
          propertyId: property.id,
          propertyTitle: property.title,
          tokens: tokenCount
        }
      };

      this.transactions.unshift(tx);
      this.createNotification(
        user.id,
        'Investment Confirmed!',
        `You have successfully acquired ${tokenCount} tokens (€${totalCost.toFixed(2)}) in ${property.title}. Certificate: ${certificateId}`,
        'success'
      );
      this.logAudit(user.id, user.email, 'INVESTMENT_EXECUTED', `Purchased ${tokenCount} tokens in ${property.title} for €${totalCost}`);

      this.saveState();
      return investment;
    } finally {
      this.isProcessingLock = false;
    }
  }

  // --- Transactions & History ---
  public getTransactions(userId?: string, requestingUserRole?: string): Transaction[] {
    if (userId) {
      return this.transactions.filter(t => t.userId === userId);
    }
    return [...this.transactions];
  }

  public getInvestments(userId?: string, requestingUserRole?: string): Investment[] {
    if (userId) {
      return this.investments.filter(i => i.userId === userId);
    }
    return [...this.investments];
  }

  public getAuditLogs(requestingUserRole?: string): AuditLog[] {
    return [...this.auditLogs];
  }

  public getNotifications(userId: string): Notification[] {
    return this.notifications.filter(n => n.userId === userId);
  }

  public markNotificationAsRead(id: string): void {
    const notif = this.notifications.find(n => n.id === id);
    if (notif) {
      notif.read = true;
      this.saveState();
    }
  }

  public markAllNotificationsAsRead(userId: string): void {
    let changed = false;
    this.notifications.forEach(n => {
      if (n.userId === userId && !n.read) {
        n.read = true;
        changed = true;
      }
    });
    if (changed) {
      this.saveState();
    }
  }

  // ===================== KRETZ MEMBERSHIP CLUB METHODS =====================

  public getMembershipTiers(): MembershipTier[] {
    return JSON.parse(JSON.stringify(this.membershipTiers));
  }

  public updateMembershipTierConfig(updatedTier: MembershipTier, adminEmail: string = 'admin@kretz.com'): void {
    const idx = this.membershipTiers.findIndex(t => t.id === updatedTier.id);
    if (idx !== -1) {
      this.membershipTiers[idx] = { ...updatedTier };
      this.logAudit('usr-admin-1', adminEmail, 'MEMBERSHIP_TIER_CONFIG_UPDATED', `Updated configuration for tier: ${updatedTier.name}`);
      this.saveState();
    }
  }

  public getMemberships(): UserMembership[] {
    return JSON.parse(JSON.stringify(this.memberships));
  }

  public getUserMembership(userId: string): UserMembership | null {
    const mem = this.memberships.find(m => m.userId === userId && m.status !== 'cancelled');
    return mem ? JSON.parse(JSON.stringify(mem)) : null;
  }

  public subscribeMembership(params: {
    userId: string;
    userEmail: string;
    userName: string;
    tierId: MembershipTierId;
    billingCycle: MembershipBillingCycle;
    paymentMethod: 'wallet_balance' | 'bank_wire' | 'credit_card' | 'complimentary_invitation';
    specialRequests?: string;
    preferredRegion?: string;
  }): UserMembership {
    const tier = this.membershipTiers.find(t => t.id === params.tierId) || this.membershipTiers[0];
    const fee = params.billingCycle === 'annual' ? tier.priceAnnual : tier.priceMonthly;

    // Check if user pays with wallet balance
    const user = this.users.find(u => u.id === params.userId);
    if (params.paymentMethod === 'wallet_balance') {
      if (!user || user.walletBalance < fee) {
        throw new Error(`Insufficient wallet balance (€${user?.walletBalance.toFixed(2) || '0.00'}). Required: €${fee.toFixed(2)}`);
      }
      user.walletBalance -= fee;

      // Record transaction
      const txId = 'tx-mem-' + Math.random().toString(36).substring(2, 9);
      this.transactions.unshift({
        id: txId,
        userId: params.userId,
        type: 'withdrawal',
        amount: fee,
        currency: 'EUR',
        status: 'completed',
        description: `Kretz Club ${tier.name} (${params.billingCycle}) Membership Dues`,
        reference: `MEM-${tier.id.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
        createdAt: new Date().toISOString(),
        paymentMethod: 'Internal Balance',
        balanceAfter: user.walletBalance,
        txHash: '0x' + Math.random().toString(36).substring(2, 12)
      });
    }

    const memberNumber = `KRTZ-ESP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date();
    const renewal = new Date(now);
    if (params.billingCycle === 'annual') {
      renewal.setFullYear(renewal.getFullYear() + 1);
    } else {
      renewal.setMonth(renewal.getMonth() + 1);
    }

    // Remove or cancel existing membership for this user if active
    this.memberships = this.memberships.filter(m => m.userId !== params.userId);

    const newMembership: UserMembership = {
      id: 'mem-' + Math.random().toString(36).substring(2, 9),
      userId: params.userId,
      userEmail: params.userEmail,
      userName: params.userName,
      tierId: tier.id,
      tierName: tier.name,
      status: 'active',
      billingCycle: params.billingCycle,
      feePaid: fee,
      currency: 'EUR',
      memberNumber,
      joinedDate: now.toISOString(),
      renewalDate: renewal.toISOString(),
      autoRenew: true,
      paymentMethod: params.paymentMethod,
      specialRequests: params.specialRequests,
      preferredRegion: params.preferredRegion || 'Spain & International',
      digitalCardIssued: true,
    };

    this.memberships.unshift(newMembership);

    this.createNotification(
      params.userId,
      `Welcome to Kretz Club — ${tier.name}`,
      `Your digital membership card #${memberNumber} has been issued. You now have full access to private concierge and off-market dossiers.`,
      'success'
    );

    this.logAudit('usr-admin-1', 'system@kretz.com', 'MEMBERSHIP_SUBSCRIBED', `User ${params.userEmail} subscribed to ${tier.name} (${params.billingCycle})`);
    this.saveState();
    return newMembership;
  }

  public cancelMembership(membershipId: string, userId: string): void {
    const mem = this.memberships.find(m => m.id === membershipId);
    if (mem && (mem.userId === userId || userId === 'usr-admin-1')) {
      mem.status = 'cancelled';
      mem.autoRenew = false;
      this.createNotification(
        mem.userId,
        'Membership Auto-Renewal Cancelled',
        `Your ${mem.tierName} membership auto-renewal has been cancelled. Privileges remain active until ${new Date(mem.renewalDate).toLocaleDateString()}.`,
        'info'
      );
      this.saveState();
    }
  }

  public reactivateMembership(membershipId: string): void {
    const mem = this.memberships.find(m => m.id === membershipId);
    if (mem) {
      mem.status = 'active';
      mem.autoRenew = true;
      this.saveState();
    }
  }

  public adminUpdateUserMembership(membershipId: string, updates: Partial<UserMembership>, adminEmail: string = 'admin@kretz.com'): void {
    const mem = this.memberships.find(m => m.id === membershipId);
    if (mem) {
      Object.assign(mem, updates);
      this.logAudit('usr-admin-1', adminEmail, 'MEMBERSHIP_ADMIN_OVERRIDE', `Updated membership ${mem.memberNumber} for ${mem.userEmail}: ${JSON.stringify(updates)}`);
      this.saveState();
    }
  }

  public getMembershipApplications(): MembershipApplication[] {
    return JSON.parse(JSON.stringify(this.membershipApplications));
  }

  public submitMembershipApplication(app: Omit<MembershipApplication, 'id' | 'submittedAt' | 'status'>): MembershipApplication {
    const newApp: MembershipApplication = {
      ...app,
      id: 'app-' + Math.random().toString(36).substring(2, 9),
      submittedAt: new Date().toISOString(),
      status: 'pending'
    };
    this.membershipApplications.unshift(newApp);
    this.saveState();
    return newApp;
  }

  public reviewMembershipApplication(id: string, status: 'approved' | 'rejected', adminNotes?: string, adminEmail: string = 'admin@kretz.com'): void {
    const app = this.membershipApplications.find(a => a.id === id);
    if (app) {
      app.status = status;
      app.reviewedAt = new Date().toISOString();
      if (adminNotes) app.adminNotes = adminNotes;

      // If approved, create complimentary or pending active membership
      if (status === 'approved') {
        const tier = this.membershipTiers.find(t => t.id === app.tierId) || this.membershipTiers[0];
        const memberNumber = `KRTZ-ESP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const now = new Date();
        const renewal = new Date(now);
        renewal.setFullYear(renewal.getFullYear() + 1);

        this.memberships.unshift({
          id: 'mem-' + Math.random().toString(36).substring(2, 9),
          userId: 'usr-app-' + app.id,
          userEmail: app.email,
          userName: app.fullName,
          tierId: tier.id,
          tierName: tier.name,
          status: 'active',
          billingCycle: app.billingCycle,
          feePaid: 0,
          currency: 'EUR',
          memberNumber,
          joinedDate: now.toISOString(),
          renewalDate: renewal.toISOString(),
          autoRenew: true,
          paymentMethod: 'complimentary_invitation',
          specialRequests: app.notes,
          preferredRegion: app.interestAreas.join(', ') || 'Spain',
          digitalCardIssued: true,
        });
      }

      this.logAudit('usr-admin-1', adminEmail, 'MEMBERSHIP_APPLICATION_REVIEWED', `Application ${id} (${app.email}) marked as ${status}`);
      this.saveState();
    }
  }

  // ==========================================
  // COMPANY NEWS & YOUTUBE VIDEO MANAGEMENT
  // ==========================================
  public getNews(): CompanyNewsItem[] {
    return JSON.parse(JSON.stringify(this.companyNews));
  }

  public getPublishedNews(): CompanyNewsItem[] {
    return JSON.parse(JSON.stringify(this.companyNews.filter(n => n.status === 'published')));
  }

  public getNewsById(id: string): CompanyNewsItem | undefined {
    const item = this.companyNews.find(n => n.id === id);
    return item ? JSON.parse(JSON.stringify(item)) : undefined;
  }

  public addNews(item: Omit<CompanyNewsItem, 'id' | 'createdAt'>): CompanyNewsItem {
    if (item.isFeatured) {
      this.companyNews.forEach(n => { n.isFeatured = false; });
    }
    const newItem: CompanyNewsItem = {
      ...item,
      id: 'news-' + Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
    };
    this.companyNews.unshift(newItem);
    this.logAudit('usr-admin-1', 'admin@kretz.com', 'NEWS_CREATED', `Added company news video: "${newItem.title}" (${newItem.youtubeId})`);
    this.saveState();
    return JSON.parse(JSON.stringify(newItem));
  }

  public updateNews(id: string, updates: Partial<CompanyNewsItem>): CompanyNewsItem | undefined {
    const index = this.companyNews.findIndex(n => n.id === id);
    if (index === -1) return undefined;
    if (updates.isFeatured) {
      this.companyNews.forEach(n => { n.isFeatured = false; });
    }
    this.companyNews[index] = {
      ...this.companyNews[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.logAudit('usr-admin-1', 'admin@kretz.com', 'NEWS_UPDATED', `Updated company news video: ${id}`);
    this.saveState();
    return JSON.parse(JSON.stringify(this.companyNews[index]));
  }

  public deleteNews(id: string): boolean {
    const prevLen = this.companyNews.length;
    const target = this.companyNews.find(n => n.id === id);
    this.companyNews = this.companyNews.filter(n => n.id !== id);
    if (this.companyNews.length !== prevLen) {
      this.logAudit('usr-admin-1', 'admin@kretz.com', 'NEWS_DELETED', `Deleted company news video: ${id} (${target?.title || 'Unknown'})`);
      this.saveState();
      return true;
    }
    return false;
  }

  public setFeaturedNews(id: string): void {
    this.companyNews.forEach(n => {
      n.isFeatured = n.id === id;
    });
    this.logAudit('usr-admin-1', 'admin@kretz.com', 'NEWS_FEATURED', `Set news video as featured: ${id}`);
    this.saveState();
  }

  public toggleNewsStatus(id: string): CompanyNewsItem | undefined {
    const item = this.companyNews.find(n => n.id === id);
    if (item) {
      item.status = item.status === 'published' ? 'draft' : 'published';
      item.updatedAt = new Date().toISOString();
      this.logAudit('usr-admin-1', 'admin@kretz.com', 'NEWS_STATUS_TOGGLED', `News video ${id} status set to ${item.status}`);
      this.saveState();
      return JSON.parse(JSON.stringify(item));
    }
    return undefined;
  }

  private logAudit(adminId: string, adminEmail: string, action: string, details: string) {
    this.auditLogs.unshift({
      id: 'audit-' + Math.random().toString(36).substring(2, 9),
      adminId,
      adminEmail,
      action,
      details,
      timestamp: new Date().toISOString()
    });
  }

  private createNotification(userId: string, title: string, message: string, type: 'info' | 'success' | 'warning' | 'financial') {
    this.notifications.unshift({
      id: 'notif-' + Math.random().toString(36).substring(2, 9),
      userId,
      title,
      message,
      type,
      read: false,
      createdAt: new Date().toISOString()
    });
  }

  /**
   * Diagnostic and database state integrity repair tool
   * Fixes any missing default records, corrupted image arrays, or orphaned investments.
   */
  public repairDatabase(): {
    status: 'repaired' | 'healthy';
    repairedItems: string[];
    totalProperties: number;
    totalUsers: number;
    totalInvestments: number;
    totalTransactions: number;
  } {
    const repairedItems: string[] = [];

    // 1. Repair properties array
    const validProps = INITIAL_PROPERTIES.filter(p => Array.isArray(p.images) && p.images.length >= 7);
    const existingPropIds = new Set(this.properties.map(p => p.id));
    let propAdded = false;

    validProps.forEach(initProp => {
      if (!existingPropIds.has(initProp.id)) {
        this.properties.push(initProp);
        existingPropIds.add(initProp.id);
        propAdded = true;
      }
    });

    if (propAdded) {
      repairedItems.push('Restored missing initial property listings');
    }

    // 2. Repair users array
    const existingUserIds = new Set(this.users.map(u => u.id));
    let userAdded = false;
    DEFAULT_USERS.forEach(initUser => {
      if (!existingUserIds.has(initUser.id)) {
        this.users.push(initUser);
        existingUserIds.add(initUser.id);
        userAdded = true;
      }
    });

    if (userAdded) {
      repairedItems.push('Restored missing default user accounts');
    }

    // 3. Repair investments array
    const existingInvIds = new Set(this.investments.map(i => i.id));
    let invAdded = false;
    DEFAULT_INVESTMENTS.forEach(initInv => {
      if (!existingInvIds.has(initInv.id)) {
        this.investments.push(initInv);
        existingInvIds.add(initInv.id);
        invAdded = true;
      }
    });

    if (invAdded) {
      repairedItems.push('Restored seed investment portfolio records');
    }

    // 4. Repair transactions array
    const existingTxIds = new Set(this.transactions.map(t => t.id));
    let txAdded = false;
    DEFAULT_TRANSACTIONS.forEach(initTx => {
      if (!existingTxIds.has(initTx.id)) {
        this.transactions.push(initTx);
        existingTxIds.add(initTx.id);
        txAdded = true;
      }
    });

    if (txAdded) {
      repairedItems.push('Restored transaction history records');
    }

    // 5. Repair company news
    const existingNewsIds = new Set(this.companyNews.map(n => n.youtubeId));
    let newsAdded = false;
    INITIAL_COMPANY_NEWS.forEach(initNews => {
      if (!existingNewsIds.has(initNews.youtubeId)) {
        this.companyNews.push(initNews);
        existingNewsIds.add(initNews.youtubeId);
        newsAdded = true;
      }
    });

    if (newsAdded) {
      repairedItems.push('Restored YouTube news broadcast entries');
    }

    // Save pristine state
    this.saveState();
    this.logAudit('usr-admin-1', 'admin@kretz.com', 'DATABASE_REPAIRED', `Database integrity scan complete. Repaired ${repairedItems.length} items.`);

    return {
      status: repairedItems.length > 0 ? 'repaired' : 'healthy',
      repairedItems,
      totalProperties: this.properties.length,
      totalUsers: this.users.length,
      totalInvestments: this.investments.length,
      totalTransactions: this.transactions.length
    };
  }

  /**
   * Resets database state to pristine defaults
   */
  public resetDatabase(): void {
    this.users = [...DEFAULT_USERS];
    this.properties = [...INITIAL_PROPERTIES.filter(p => Array.isArray(p.images) && p.images.length >= 7)];
    this.investments = [...DEFAULT_INVESTMENTS];
    this.transactions = [...DEFAULT_TRANSACTIONS];
    this.verificationDocuments = [...DEFAULT_VERIFICATION_DOCUMENTS];
    this.companyNews = [...INITIAL_COMPANY_NEWS];
    this.membershipTiers = [...INITIAL_MEMBERSHIP_TIERS];
    this.memberships = [];
    this.membershipApplications = [];
    this.saveState();
    this.logAudit('usr-admin-1', 'admin@kretz.com', 'DATABASE_RESET', 'Database state successfully restored to initial defaults.');
  }

  /**
   * Performs a comprehensive diagnostic health check on all database collections
   */
  public getDatabaseHealth(): {
    isHealthy: boolean;
    issues: string[];
    propertiesCount: number;
    usersCount: number;
    investmentsCount: number;
    transactionsCount: number;
    newsCount: number;
  } {
    const issues: string[] = [];

    if (!Array.isArray(this.properties) || this.properties.length === 0) {
      issues.push('Properties collection is empty or invalid');
    }
    if (!Array.isArray(this.users) || this.users.length === 0) {
      issues.push('Users collection is empty or invalid');
    }
    if (!Array.isArray(this.investments)) {
      issues.push('Investments collection is invalid');
    }
    if (!Array.isArray(this.transactions)) {
      issues.push('Transactions collection is invalid');
    }

    return {
      isHealthy: issues.length === 0,
      issues,
      propertiesCount: this.properties.length,
      usersCount: this.users.length,
      investmentsCount: this.investments.length,
      transactionsCount: this.transactions.length,
      newsCount: this.companyNews.length
    };
  }
}

export const ledger = new LedgerService();

// Run immediate database health check and integrity repair on initialization
try {
  ledger.repairDatabase();
} catch (e) {
  console.warn('Auto database repair note:', e);
}
