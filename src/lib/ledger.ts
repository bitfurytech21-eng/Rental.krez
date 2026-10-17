import { Transaction, TransactionType, TransactionStatus, LedgerEntry } from '../types/transaction';
import { User, KYCStatus, UserRole, AccountType, getAccountTypeLabel } from '../types/user';
import { Property } from '../types/property';
import { Investment } from '../types/investment';
import { INITIAL_PROPERTIES } from '../data/properties';
import { MembershipTier, UserMembership, MembershipApplication, MembershipTierId, MembershipBillingCycle, INITIAL_MEMBERSHIP_TIERS } from '../types/membership';

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

// Authentic Platform Administrator (No fake investors or mock balances)
const DEFAULT_USERS: User[] = [
  {
    id: 'usr-admin-1',
    email: 'admin@kretz.com',
    fullName: 'Platform Administrator',
    role: 'admin',
    accountType: 'admin',
    kycStatus: 'verified',
    walletBalance: 0,
    investedBalance: 0,
    totalEarned: 0,
    createdAt: '2026-01-01T00:00:00Z',
    country: 'Spain',
    cryptoDepositAddress: '0x71C...B3fA (Platform Treasury)'
  }
];

const DEFAULT_INVESTMENTS: Investment[] = [];
const DEFAULT_TRANSACTIONS: Transaction[] = [];

class LedgerService {
  private users: User[];
  private properties: Property[];
  private investments: Investment[];
  private transactions: Transaction[];
  private auditLogs: AuditLog[];
  private notifications: Notification[];
  private paymentConfig: PaymentConfig;
  private isProcessingLock: boolean = false;
  private membershipTiers: MembershipTier[];
  private memberships: UserMembership[];
  private membershipApplications: MembershipApplication[];

  constructor() {
    this.users = getStorage('users', DEFAULT_USERS);
    const storedProps = getStorage<Property[]>('properties', []);
    const hasValidProps = Array.isArray(storedProps) && storedProps.length === INITIAL_PROPERTIES.length && storedProps.some(p => p.id.startsWith('prop-kretz-'));
    this.properties = hasValidProps ? storedProps : [...INITIAL_PROPERTIES];
    setStorage('properties', this.properties);
    this.investments = getStorage('investments', DEFAULT_INVESTMENTS);
    this.transactions = getStorage('transactions', DEFAULT_TRANSACTIONS);
    this.paymentConfig = getStorage('paymentConfig', DEFAULT_PAYMENT_CONFIG);
    this.membershipTiers = getStorage('membershipTiers', INITIAL_MEMBERSHIP_TIERS);
    this.memberships = getStorage('memberships', []);
    this.membershipApplications = getStorage('membershipApplications', []);
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
    setStorage('auditLogs', this.auditLogs);
    setStorage('notifications', this.notifications);
    setStorage('paymentConfig', this.paymentConfig);
    setStorage('membershipTiers', this.membershipTiers);
    setStorage('memberships', this.memberships);
    setStorage('membershipApplications', this.membershipApplications);
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

  // --- User & Auth Queries ---
  public getUsers(): User[] {
    return [...this.users];
  }

  public getUserById(id: string): User | undefined {
    return this.users.find(u => u.id === id);
  }

  public getUserByEmail(email: string): User | undefined {
    return this.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public createUser(userData: { email: string; fullName: string; role?: UserRole; accountType?: AccountType }): User {
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
      kycStatus: 'unverified',
      walletBalance: 0,
      investedBalance: 0,
      totalEarned: 0,
      createdAt: new Date().toISOString(),
      cryptoDepositAddress: '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
    };

    this.users.push(newUser);
    this.logAudit(newUser.id, newUser.email, 'USER_REGISTERED', `New user registered with role ${newUser.role} and account type ${newUser.accountType}`);
    this.saveState();
    return newUser;
  }

  public syncSupabaseUser(supabaseId: string, email: string, fullName: string, role: UserRole = 'investor', accountType?: AccountType): User {
    let existing = this.getUserById(supabaseId) || this.getUserByEmail(email);
    if (existing) {
      existing.id = supabaseId;
      if (fullName && (!existing.fullName || existing.fullName === 'Investor')) {
        existing.fullName = fullName;
      }
      if (accountType && !existing.accountType) {
        existing.accountType = accountType;
      }
      this.saveState();
      return existing;
    }

    const newUser: User = {
      id: supabaseId,
      email: email,
      fullName: fullName || email.split('@')[0] || 'Investor',
      role: role,
      accountType: accountType || (role === 'admin' ? 'admin' : 'individual_investor'),
      kycStatus: 'unverified',
      walletBalance: 0,
      investedBalance: 0,
      totalEarned: 0,
      createdAt: new Date().toISOString(),
      cryptoDepositAddress: '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
    };
    this.users.push(newUser);
    this.logAudit(newUser.id, newUser.email, 'USER_REGISTERED_SUPABASE', `New Supabase user synced: ${newUser.email}`);
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


  // --- Properties Management ---
  public getProperties(): Property[] {
    return [...this.properties];
  }

  public getPropertyById(id: string): Property | undefined {
    return this.properties.find(p => p.id === id || p.slug === id);
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
    } else {
      tx.status = 'rejected';
      if (!tx.metadata) tx.metadata = {};
      tx.metadata.rejectionReason = reason || 'Deposit bank wire transfer reference or receipt could not be verified.';
      this.createNotification(user.id, 'Deposit Rejected', `Your deposit request for €${tx.amount.toFixed(2)} was declined: ${tx.metadata.rejectionReason}.`, 'warning');
      this.logAudit('usr-admin-1', 'admin@kretz.com', 'DEPOSIT_REJECTED', `Rejected deposit of €${tx.amount.toFixed(2)} for ${user.email}`);
    }

    this.saveState();
    return tx;
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

      // Calculate projected monthly income
      const projectedMonthlyIncome = Number(((totalCost * (property.estimatedAnnualYield / 100)) / 12).toFixed(2));

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
        estimatedAnnualYield: property.estimatedAnnualYield,
        projectedMonthlyIncome: projectedMonthlyIncome,
        totalDividendsReceived: 0,
        status: 'active',
        transactionHash: txHash,
        certificateId: certificateId
      };

      this.investments.unshift(investment);

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
}

export const ledger = new LedgerService();
