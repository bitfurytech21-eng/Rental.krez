/**
 * Supabase Typed Service Layer for L'Agence Real Estate Platform
 *
 * Provides type-safe Supabase database operations that replace the Cloudflare
 * Hono API + in-memory ledger. All functions fall back gracefully when
 * Supabase is not configured.
 *
 * Tables: profiles, properties, investments, transactions, verification_documents,
 * audit_logs, notifications, payment_config, crypto_networks, membership_tiers,
 * memberships, membership_applications, company_news, favorites, user_preferences,
 * sub_balances, p2p_listings
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';
import {
  User, UserRole, AccountType, KYCStatus
} from '../types/user';
import {
  Property, PropertyStatus, PropertyType
} from '../types/property';
import {
  Investment
} from '../types/investment';
import {
  Transaction, TransactionType, TransactionStatus
} from '../types/transaction';
import {
  VerificationDocument, DocumentCategory, PaymentConfig,
  CryptoNetworkConfig, TraditionalPaymentConfig
} from './ledger';
import { AuditLog, AuditCategory, AuditSeverity } from './ledger';
import { Notification } from './ledger';
import {
  MembershipTier as MembershipTierType,
  UserMembership,
  MembershipApplication
} from '../types/membership';
import { CompanyNewsItem } from '../types/news';

/* ------------------------------------------------------------------ */
/*  Supabase row types (mirror DB schema)                             */
/* ------------------------------------------------------------------ */

export interface SupabaseProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  account_type: string;
  kyc_status: string;
  kyc_document_type?: string;
  kyc_submitted_at?: string;
  wallet_balance: number;
  invested_balance: number;
  total_earned: number;
  created_at: string;
  phone_number?: string;
  country?: string;
  crypto_deposit_address?: string;
  bank_iban?: string;
  avatar_url?: string;
  joint_holder_name?: string;
  company_name?: string;
  institution_name?: string;
  tax_id?: string;
  registration_number?: string;
  date_of_birth?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  two_factor_enabled: boolean;
  status: string;
  suspended_reason?: string;
  updated_at: string;
}

export interface SupabaseProperty {
  id: string;
  slug: string;
  title: string;
  location: string;
  city: string;
  country: string;
  type: string;
  status: string;
  images: string[];
  banner_image: string;
  target_amount: number;
  funded_amount: number;
  token_price: number;
  total_tokens: number;
  available_tokens: number;
  estimated_annual_yield: number;
  capital_appreciation_yield: number;
  total_estimated_return: number;
  duration_months: number;
  minimum_investment: number;
  distribution_frequency: string;
  token_ticker: string;
  blockchain_network: string;
  token_contract_address?: string;
  description?: string;
  investment_structure?: string;
  highlights: string[];
  risks: string[];
  exit_strategy?: string;
  financial_breakdown?: any;
  fee_structure?: any;
  payment_schedule?: any;
  documents: any[];
  investor_count: number;
  created_at: string;
  is_sample_record: boolean;
  surface_area_m2?: number;
  bedrooms?: number;
  bathrooms?: number;
  year_build?: string;
  energy_rating?: string;
  cadastral_reference?: string;
  amenities: string[];
  timeline: any[];
  operator_name?: string;
  kretz_features: string[];
  reental_features: string[];
  ref?: string;
  agent?: any;
  is_exclusive: boolean;
  is_off_market: boolean;
  tour_url?: string;
  external_tour_url?: string;
  youtube_id?: string;
  monthly_target_rate?: number;
  spv_entity_name?: string;
  solana_mint_address?: string;
  solana_program_id?: string;
  is_fully_funded: boolean;
  approved_for_frontend: boolean;
  assigned_function?: string;
  assigned_at?: string;
  assigned_by?: string;
  approved_at?: string;
  approved_by?: string;
  approval_notes?: string;
  frontend_visibility_status: string;
  sensitivity_analysis?: any;
  spv_jurisdiction?: string;
  updated_at: string;
}

export interface SupabaseInvestment {
  id: string;
  user_id: string;
  property_id: string;
  property_title: string;
  property_location: string;
  property_image: string;
  tokens_purchased: number;
  token_price: number;
  total_amount_invested: number;
  purchased_at: string;
  start_date: string;
  maturity_date: string;
  duration_months: number;
  duration_days?: number;
  estimated_annual_yield: number;
  projected_monthly_income: number;
  total_dividends_received: number;
  current_valuation?: number;
  unrealized_profit_loss?: number;
  status: string;
  transaction_hash: string;
  certificate_id: string;
  funding_source?: string;
  reinvested_from_id?: string;
  created_at: string;
  updated_at: string;
}

export interface SupabaseTransaction {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  reference: string;
  created_at: string;
  payment_method: string;
  tx_hash?: string;
  balance_after: number;
  metadata?: any;
  updated_at: string;
}

export interface SupabaseVerificationDocument {
  id: string;
  user_id: string;
  category: string;
  title: string;
  document_type: string;
  file_url: string;
  file_name: string;
  file_size: number;
  uploaded_at: string;
  status: string;
  rejection_reason?: string;
  reviewed_at?: string;
  reviewed_by?: string;
  transaction_reference?: string;
  amount?: number;
  currency?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface SupabaseAuditLog {
  id: string;
  admin_id?: string;
  admin_email: string;
  action: string;
  details: string;
  timestamp: string;
  ip_address?: string;
  category?: string;
  severity?: string;
  target_user_id?: string;
  target_user_email?: string;
  metadata?: any;
  created_at: string;
}

export interface SupabaseNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

export interface SupabaseCryptoNetwork {
  id: string;
  name: string;
  token: string;
  network: string;
  wallet_address: string;
  contract_end?: string;
  contract_address?: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

/* ------------------------------------------------------------------ */
/*  Mapping helpers (Supabase row -> App type)                        */
/* ------------------------------------------------------------------ */

function profileFromRow(row: SupabaseProfile): User {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: (row.role as UserRole) || 'investor',
    accountType: (row.account_type as AccountType) || undefined,
    kycStatus: (row.kyc_status as KYCStatus) || 'unverified',
    kycDocumentType: row.kyc_document_type,
    kycSubmittedAt: row.kyc_submitted_at,
    walletBalance: Number(row.wallet_balance) || 0,
    investedBalance: Number(row.invested_balance) || 0,
    totalEarned: Number(row.total_earned) || 0,
    createdAt: row.created_at,
    phoneNumber: row.phone_number,
    country: row.country,
    cryptoDepositAddress: row.crypto_deposit_address,
    bankIban: row.bank_iban,
    avatarUrl: row.avatar_url,
    jointHolderName: row.joint_holder_name,
    companyName: row.company_name,
    institutionName: row.institution_name,
    taxId: row.tax_id,
    registrationNumber: row.registration_number,
    dateOfBirth: row.date_of_birth,
    address: row.address,
    city: row.city,
    postalCode: row.postal_code,
    twoFactorEnabled: row.two_factor_enabled,
    status: (row.status as 'active' | 'suspended') || 'active',
    suspendedReason: row.suspended_reason,
  };
}

function propertyFromRow(row: SupabaseProperty): Property {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    location: row.location,
    city: row.city,
    country: row.country,
    type: (row.type as PropertyType) || 'Residential',
    status: (row.status as PropertyStatus) || 'funding',
    images: Array.isArray(row.images) ? row.images : [],
    bannerImage: row.banner_image,
    targetAmount: Number(row.target_amount) || 0,
    fundedAmount: Number(row.funded_amount) || 0,
    tokenPrice: Number(row.token_price) || 0,
    totalTokens: Number(row.total_tokens) || 0,
    availableTokens: Number(row.available_tokens) || 0,
    estimatedAnnualYield: Number(row.estimated_annual_yield) || 0,
    capitalAppreciationYield: Number(row.capital_appreciation_yield) || 0,
    totalEstimatedReturn: Number(row.total_estimated_return) || 0,
    durationMonths: Number(row.duration_months) || 36,
    minimumInvestment: Number(row.minimum_investment) || 750,
    distributionFrequency: (row.distribution_frequency as 'Monthly' | 'Quarterly') || 'Monthly',
    tokenTicker: row.token_ticker,
    blockchainNetwork: row.blockchain_network || 'Polygon POS',
    tokenContractAddress: row.token_contract_address || '',
    description: row.description || '',
    investmentStructure: row.investment_structure || '',
    highlights: Array.isArray(row.highlights) ? row.highlights : [],
    risks: Array.isArray(row.risks) ? row.risks : [],
    exitStrategy: row.exit_strategy || '',
    financialBreakdown: row.financial_breakdown || {
      propertyPrice: 0, refurbishmentBudget: 0, legalAndClosingCosts: 0,
      operatingReserve: 0, totalProjectCost: 0, projectedAnnualGrossRent: 0,
      estimatedOperatingExpenses: 0, projectedAnnualNetRent: 0,
      estimatedNetYield: 0, estimatedCapitalGainYield: 0, totalEstimatedYield: 0,
    },
    feeStructure: row.fee_structure || {
      structuringFee: '0%', managementFee: '0%', withdrawalFee: '0%', exitFee: '0%',
    },
    paymentSchedule: row.payment_schedule || {
      distributionFrequency: 'Monthly', payoutDate: '1st of every month',
      annualReconciliation: 'Annual audit statement issued in February',
      maturityTerms: '100% Principal + capital gains distributed upon terminal asset sale',
    },
    documents: Array.isArray(row.documents) ? row.documents : [],
    investorCount: Number(row.investor_count) || 0,
    createdAt: row.created_at,
    isSampleRecord: row.is_sample_record,
    surfaceAreaM2: row.surface_area_m2,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    yearBuilt: row.year_build,
    energyRating: row.energy_rating,
    cadastralReference: row.cadastral_reference,
    amenities: Array.isArray(row.amenities) ? row.amenities : [],
    timeline: Array.isArray(row.timeline) ? row.timeline : [],
    operatorName: row.operator_name,
    kretzFeatures: Array.isArray(row.kretz_features) ? row.kretz_features : [],
    reentalFeatures: Array.isArray(row.reental_features) ? row.reental_features : [],
    ref: row.ref,
    agent: row.agent,
    isExclusive: row.is_exclusive,
    isOffMarket: row.is_off_market,
    tourUrl: row.tour_url,
    externalTourUrl: row.external_tour_url,
    youtubeId: row.youtube_id,
    monthlyTargetRate: row.monthly_target_rate,
    spvEntityName: row.spv_entity_name,
    solanaMintAddress: row.solana_mint_address,
    solanaProgramId: row.solana_program_id,
    isFullyFunded: row.is_fully_funded,
    approvedForFrontend: row.approved_for_frontend,
    assignedFunction: row.assigned_function,
    assignedAt: row.assigned_at,
    assignedBy: row.assigned_by,
    approvedAt: row.approved_at,
    approvedBy: row.approved_by,
    approvalNotes: row.approval_notes,
    frontendVisibilityStatus: row.frontend_visibility_status as any,
    sensitivityAnalysis: row.sensitivity_analysis,
    spvJurisdiction: row.spv_jurisdiction,
  };
}

function investmentFromRow(row: SupabaseInvestment): Investment {
  return {
    id: row.id,
    userId: row.user_id,
    propertyId: row.property_id,
    propertyTitle: row.property_title,
    propertyLocation: row.property_location,
    propertyImage: row.property_image,
    tokensPurchased: Number(row.tokens_purchased) || 0,
    tokenPrice: Number(row.token_price) || 0,
    totalAmountInvested: Number(row.total_amount_invested) || 0,
    purchasedAt: row.purchased_at,
    startDate: row.start_date,
    maturityDate: row.maturity_date,
    durationMonths: Number(row.duration_months) || 36,
    durationDays: row.duration_days,
    estimatedAnnualYield: Number(row.estimated_annual_yield) || 0,
    projectedMonthlyIncome: Number(row.projected_monthly_income) || 0,
    totalDividendsReceived: Number(row.total_dividends_received) || 0,
    currentValuation: row.current_valuation ? Number(row.current_valuation) : undefined,
    unrealizedProfitLoss: row.unrealized_profit_loss ? Number(row.unrealized_profit_loss) : undefined,
    status: (row.status as Investment['status']) || 'active',
    transactionHash: row.transaction_hash,
    certificateId: row.certificate_id,
    fundingSource: (row.funding_source as Investment['fundingSource']) || 'wallet',
    reinvestedFromId: row.reinvested_from_id,
  };
}

function transactionFromRow(row: SupabaseTransaction): Transaction {
  return {
    id: row.id,
    userId: row.user_id,
    type: (row.type as TransactionType) || 'deposit',
    amount: Number(row.amount) || 0,
    currency: (row.currency as Transaction['currency']) || 'EUR',
    status: (row.status as TransactionStatus) || 'pending',
    description: row.description,
    reference: row.reference,
    createdAt: row.created_at,
    paymentMethod: row.payment_method,
    txHash: row.tx_hash,
    balanceAfter: Number(row.balance_after) || 0,
    metadata: row.metadata || {},
  };
}

function verificationDocFromRow(row: SupabaseVerificationDocument): VerificationDocument {
  return {
    id: row.id,
    userId: row.user_id,
    userName: '',
    userEmail: '',
    category: (row.category as DocumentCategory) || 'general',
    title: row.title,
    documentType: row.document_type,
    fileUrl: row.file_url,
    fileName: row.file_name,
    fileSize: Number(row.file_size) || 0,
    uploadedAt: row.uploaded_at,
    status: (row.status as 'pending' | 'approved' | 'rejected') || 'pending',
    rejectionReason: row.rejection_reason,
    reviewedAt: row.reviewed_at,
    reviewedBy: row.reviewed_by,
    transactionReference: row.transaction_reference,
    amount: row.amount ? Number(row.amount) : undefined,
    currency: row.currency,
    notes: row.notes,
  };
}

function auditLogFromRow(row: SupabaseAuditLog): AuditLog {
  return {
    id: row.id,
    adminId: row.admin_id || '',
    adminEmail: row.admin_email,
    action: row.action,
    details: row.details,
    timestamp: row.timestamp,
    ipAddress: row.ip_address,
    category: (row.category as AuditCategory) || 'system',
    severity: (row.severity as AuditSeverity) || 'info',
    targetUserId: row.target_user_id,
    targetUserEmail: row.target_user_email,
    metadata: row.metadata || {},
  };
}

function notificationFromRow(row: SupabaseNotification): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    message: row.message,
    type: (row.type as Notification['type']) || 'info',
    read: row.read,
    createdAt: row.created_at,
  };
}

function cryptoNetworkFromRow(row: SupabaseCryptoNetwork): CryptoNetworkConfig {
  return {
    id: row.id,
    name: row.name,
    token: row.token,
    network: row.network,
    walletAddress: row.wallet_address,
    contractEnd: row.contract_end,
    contractAddress: row.contract_address,
    enabled: row.enabled,
  };
}

/* ------------------------------------------------------------------ */
/*  Supabase Service                                                  */
/* ------------------------------------------------------------------ */

export class SupabaseService {
  private configured: boolean;

  constructor() {
    this.configured = isSupabaseConfigured();
  }

  /** Returns true when Supabase env vars are valid */
  isAvailable(): boolean {
    return this.configured;
  }

  /* ================================================================ */
  /*  PROFILES                                                        */
  /* ================================================================ */

  async getProfiles(): Promise<User[]> {
    if (!this.configured) return [];
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || [] as SupabaseProfile[]).map(profileFromRow);
  }

  async getProfileById(id: string): Promise<User | null> {
    if (!this.configured) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return profileFromRow(data as SupabaseProfile);
  }

  async getProfileByEmail(email: string): Promise<User | null> {
    if (!this.configured) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();
    if (error) return null;
    return profileFromRow(data as SupabaseProfile);
  }

  async createProfile(profile: Partial<User>): Promise<User> {
    if (!this.configured) throw new Error('Supabase not configured');
    const row: Partial<SupabaseProfile> = {
      email: profile.email?.toLowerCase(),
      full_name: profile.fullName,
      role: profile.role || 'investor',
      account_type: profile.accountType || 'individual_investor',
      kyc_status: profile.kycStatus || 'unverified',
      wallet_balance: profile.walletBalance || 0,
      invested_balance: profile.investedBalance || 0,
      total_earned: profile.totalEarned || 0,
      phone_number: profile.phoneNumber,
      country: profile.country,
      crypto_deposit_address: profile.cryptoDepositAddress,
      bank_iban: profile.bankIban,
      avatar_url: profile.avatarUrl,
      joint_holder_name: profile.jointHolderName,
      company_name: profile.companyName,
      institution_name: profile.institutionName,
      tax_id: profile.taxId,
      registration_number: profile.registrationNumber,
      date_of_birth: profile.dateOfBirth,
      address: profile.address,
      city: profile.city,
      postal_code: profile.postalCode,
      two_factor_enabled: profile.twoFactorEnabled || false,
      status: profile.status || 'active',
      suspended_reason: profile.suspendedReason,
    };
    const { data, error } = await supabase
      .from('profiles')
      .insert([row])
      .select()
      .single();
    if (error) throw error;
    return profileFromRow(data as SupabaseProfile);
  }

  async updateProfile(id: string, updates: Partial<User>): Promise<User> {
    if (!this.configured) throw new Error('Supabase not configured');
    const row: Partial<SupabaseProfile> = {};
    if (updates.email !== undefined) row.email = updates.email.toLowerCase();
    if (updates.fullName !== undefined) row.full_name = updates.fullName;
    if (updates.role !== undefined) row.role = updates.role;
    if (updates.accountType !== undefined) row.account_type = updates.accountType;
    if (updates.kycStatus !== undefined) row.kyc_status = updates.kycStatus;
    if (updates.walletBalance !== undefined) row.wallet_balance = updates.walletBalance;
    if (updates.investedBalance !== undefined) row.invested_balance = updates.investedBalance;
    if (updates.totalEarned !== undefined) row.total_earned = updates.totalEarned;
    if (updates.avatarUrl !== undefined) row.avatar_url = updates.avatarUrl;
    if (updates.status !== undefined) row.status = updates.status;
    if (updates.suspendedReason !== undefined) row.suspended_reason = updates.suspendedReason;
    row.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('profiles')
      .update(row)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return profileFromRow(data as SupabaseProfile);
  }

  async deleteProfile(id: string): Promise<void> {
    if (!this.configured) return;
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) throw error;
  }

  /* ================================================================ */
  /*  PROPERTIES                                                      */
  /* ================================================================ */

  async getProperties(): Promise<Property[]> {
    if (!this.configured) return [];
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || [] as SupabaseProperty[]).map(propertyFromRow);
  }

  async getPropertyById(id: string): Promise<Property | null> {
    if (!this.configured) return null;
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return propertyFromRow(data as SupabaseProperty);
  }

  async getPropertyBySlug(slug: string): Promise<Property | null> {
    if (!this.configured) return null;
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('slug', slug)
      .single();
    if (error) return null;
    return propertyFromRow(data as SupabaseProperty);
  }

  async createProperty(property: Partial<Property>): Promise<Property> {
    if (!this.configured) throw new Error('Supabase not configured');
    const row: Partial<SupabaseProperty> = {
      id: property.id || crypto.randomUUID(),
      slug: property.slug,
      title: property.title,
      location: property.location,
      city: property.city,
      country: property.country,
      type: property.type,
      status: property.status || 'funding',
      images: property.images || [],
      banner_image: property.bannerImage,
      target_amount: property.targetAmount,
      funded_amount: property.fundedAmount || 0,
      token_price: property.tokenPrice,
      total_tokens: property.totalTokens,
      available_tokens: property.availableTokens,
      estimated_annual_yield: property.estimatedAnnualYield,
      capital_appreciation_yield: property.capitalAppreciationYield,
      total_estimated_return: property.totalEstimatedReturn,
      duration_months: property.durationMonths,
      minimum_investment: property.minimumInvestment,
      distribution_frequency: property.distributionFrequency,
      token_ticker: property.tokenTicker,
      blockchain_network: property.blockchainNetwork,
      token_contract_address: property.tokenContractAddress,
      description: property.description,
      investment_structure: property.investmentStructure,
      highlights: property.highlights || [],
      risks: property.risks || [],
      exit_strategy: property.exitStrategy,
      financial_breakdown: property.financialBreakdown,
      fee_structure: property.feeStructure,
      payment_schedule: property.paymentSchedule,
      documents: property.documents || [],
      investor_count: property.investorCount || 0,
      is_sample_record: property.isSampleRecord || false,
      surface_area_m2: property.surfaceAreaM2,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      year_build: property.yearBuilt ? String(property.yearBuilt) : undefined,
      energy_rating: property.energyRating,
      cadastral_reference: property.cadastralReference,
      amenities: property.amenities || [],
      timeline: property.timeline || [],
      operator_name: property.operatorName,
      kretz_features: property.kretzFeatures || [],
      reental_features: property.reentalFeatures || [],
      ref: property.ref,
      agent: property.agent,
      is_exclusive: property.isExclusive || false,
      is_off_market: property.isOffMarket || false,
      tour_url: property.tourUrl,
      external_tour_url: property.externalTourUrl,
      youtube_id: property.youtubeId,
      monthly_target_rate: property.monthlyTargetRate,
      spv_entity_name: property.spvEntityName,
      solana_mint_address: property.solanaMintAddress,
      solana_program_id: property.solanaProgramId,
      is_fully_funded: property.isFullyFunded || false,
      approved_for_frontend: property.approvedForFrontend || false,
      assigned_function: property.assignedFunction,
      assigned_at: property.assignedAt,
      assigned_by: property.assignedBy,
      approved_at: property.approvedAt,
      approved_by: property.approvedBy,
      approval_notes: property.approvalNotes,
      frontend_visibility_status: property.frontendVisibilityStatus || 'visible',
      sensitivity_analysis: property.sensitivityAnalysis,
      spv_jurisdiction: property.spvJurisdiction,
    };
    const { data, error } = await supabase
      .from('properties')
      .insert([row])
      .select()
      .single();
    if (error) throw error;
    return propertyFromRow(data as SupabaseProperty);
  }

  async updateProperty(id: string, updates: Partial<Property>): Promise<Property> {
    if (!this.configured) throw new Error('Supabase not configured');
    const row: Partial<SupabaseProperty> = {};
    if (updates.title !== undefined) row.title = updates.title;
    if (updates.status !== undefined) row.status = updates.status;
    if (updates.fundedAmount !== undefined) row.funded_amount = updates.fundedAmount;
    if (updates.availableTokens !== undefined) row.available_tokens = updates.availableTokens;
    if (updates.approvedForFrontend !== undefined) row.approved_for_frontend = updates.approvedForFrontend;
    if (updates.investorCount !== undefined) row.investor_count = updates.investorCount;
    row.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('properties')
      .update(row)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return propertyFromRow(data as SupabaseProperty);
  }

  async deleteProperty(id: string): Promise<void> {
    if (!this.configured) return;
    const { error } = await supabase.from('properties').delete().eq('id', id);
    if (error) throw error;
  }

  /* ================================================================ */
  /*  INVESTMENTS                                                     */
  /* ================================================================ */

  async getInvestments(userId?: string): Promise<Investment[]> {
    if (!this.configured) return [];
    let query = supabase.from('investments').select('*').order('purchased_at', { ascending: false });
    if (userId) query = query.eq('user_id', userId);
    const { data, error } = await query;
    if (error) throw error;
    return (data || [] as SupabaseInvestment[]).map(investmentFromRow);
  }

  async createInvestment(investment: Partial<Investment>): Promise<Investment> {
    if (!this.configured) throw new Error('Supabase not configured');
    const row: Partial<SupabaseInvestment> = {
      user_id: investment.userId,
      property_id: investment.propertyId,
      property_title: investment.propertyTitle,
      property_location: investment.propertyLocation,
      property_image: investment.propertyImage,
      tokens_purchased: investment.tokensPurchased,
      token_price: investment.tokenPrice,
      total_amount_invested: investment.totalAmountInvested,
      purchased_at: investment.purchasedAt || new Date().toISOString(),
      start_date: investment.startDate || new Date().toISOString(),
      maturity_date: investment.maturityDate,
      duration_months: investment.durationMonths,
      duration_days: investment.durationDays,
      estimated_annual_yield: investment.estimatedAnnualYield,
      projected_monthly_income: investment.projectedMonthlyIncome,
      total_dividends_received: investment.totalDividendsReceived || 0,
      current_valuation: investment.currentValuation,
      unrealized_profit_loss: investment.unrealizedProfitLoss,
      status: investment.status || 'active',
      transaction_hash: investment.transactionHash,
      certificate_id: investment.certificateId,
      funding_source: investment.fundingSource,
      reinvested_from_id: investment.reinvestedFromId,
    };
    const { data, error } = await supabase
      .from('investments')
      .insert([row])
      .select()
      .single();
    if (error) throw error;
    return investmentFromRow(data as SupabaseInvestment);
  }

  async updateInvestment(id: string, updates: Partial<Investment>): Promise<Investment> {
    if (!this.configured) throw new Error('Supabase not configured');
    const row: Partial<SupabaseInvestment> = {};
    if (updates.status !== undefined) row.status = updates.status;
    if (updates.currentValuation !== undefined) row.current_valuation = updates.currentValuation;
    if (updates.unrealizedProfitLoss !== undefined) row.unrealized_profit_loss = updates.unrealizedProfitLoss;
    if (updates.totalDividendsReceived !== undefined) row.total_dividends_received = updates.totalDividendsReceived;
    row.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('investments')
      .update(row)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return investmentFromRow(data as SupabaseInvestment);
  }

  /* ================================================================ */
  /*  TRANSACTIONS                                                    */
  /* ================================================================ */

  async getTransactions(userId?: string): Promise<Transaction[]> {
    if (!this.configured) return [];
    let query = supabase.from('transactions').select('*').order('created_at', { ascending: false });
    if (userId) query = query.eq('user_id', userId);
    const { data, error } = await query;
    if (error) throw error;
    return (data || [] as SupabaseTransaction[]).map(transactionFromRow);
  }

  async createTransaction(transaction: Partial<Transaction>): Promise<Transaction> {
    if (!this.configured) throw new Error('Supabase not configured');
    const row: Partial<SupabaseTransaction> = {
      user_id: transaction.userId,
      type: transaction.type || 'deposit',
      amount: transaction.amount,
      currency: transaction.currency || 'EUR',
      status: transaction.status || 'pending',
      description: transaction.description,
      reference: transaction.reference,
      created_at: transaction.createdAt || new Date().toISOString(),
      payment_method: transaction.paymentMethod,
      tx_hash: transaction.txHash,
      balance_after: transaction.balanceAfter,
      metadata: transaction.metadata || {},
    };
    const { data, error } = await supabase
      .from('transactions')
      .insert([row])
      .select()
      .single();
    if (error) throw error;
    return transactionFromRow(data as SupabaseTransaction);
  }

  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction> {
    if (!this.configured) throw new Error('Supabase not configured');
    const row: Partial<SupabaseTransaction> = {};
    if (updates.status !== undefined) row.status = updates.status;
    if (updates.balanceAfter !== undefined) row.balance_after = updates.balanceAfter;
    if (updates.metadata !== undefined) row.metadata = updates.metadata;
    row.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('transactions')
      .update(row)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return transactionFromRow(data as SupabaseTransaction);
  }

  /* ================================================================ */
  /*  VERIFICATION DOCUMENTS                                          */
  /* ================================================================ */

  async getVerificationDocuments(userId?: string): Promise<VerificationDocument[]> {
    if (!this.configured) return [];
    let query = supabase.from('verification_documents').select('*').order('uploaded_at', { ascending: false });
    if (userId) query = query.eq('user_id', userId);
    const { data, error } = await query;
    if (error) throw error;
    return (data || [] as SupabaseVerificationDocument[]).map(verificationDocFromRow);
  }

  async createVerificationDocument(doc: Partial<VerificationDocument>): Promise<VerificationDocument> {
    if (!this.configured) throw new Error('Supabase not configured');
    const row: Partial<SupabaseVerificationDocument> = {
      user_id: doc.userId,
      category: doc.category || 'general',
      title: doc.title,
      document_type: doc.documentType,
      file_url: doc.fileUrl,
      file_name: doc.fileName,
      file_size: doc.fileSize,
      uploaded_at: doc.uploadedAt || new Date().toISOString(),
      status: doc.status || 'pending',
      rejection_reason: doc.rejectionReason,
      reviewed_at: doc.reviewedAt,
      reviewed_by: doc.reviewedBy,
      transaction_reference: doc.transactionReference,
      amount: doc.amount,
      currency: doc.currency,
      notes: doc.notes,
    };
    const { data, error } = await supabase
      .from('verification_documents')
      .insert([row])
      .select()
      .single();
    if (error) throw error;
    return verificationDocFromRow(data as SupabaseVerificationDocument);
  }

  async reviewVerificationDocument(id: string, approved: boolean, reason?: string, reviewedBy?: string): Promise<VerificationDocument> {
    if (!this.configured) throw new Error('Supabase not configured');
    const row: Partial<SupabaseVerificationDocument> = {
      status: approved ? 'approved' : 'rejected',
      rejection_reason: approved ? undefined : reason,
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewedBy,
    };
    const { data, error } = await supabase
      .from('verification_documents')
      .update(row)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return verificationDocFromRow(data as SupabaseVerificationDocument);
  }

  /* ================================================================ */
  /*  AUDIT LOGS                                                      */
  /* ================================================================ */

  async getAuditLogs(limit = 50): Promise<AuditLog[]> {
    if (!this.configured) return [];
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data || [] as SupabaseAuditLog[]).map(auditLogFromRow);
  }

  async createAuditLog(log: Partial<AuditLog>): Promise<AuditLog> {
    if (!this.configured) throw new Error('Supabase not configured');
    const row: Partial<SupabaseAuditLog> = {
      admin_id: log.adminId,
      admin_email: log.adminEmail,
      action: log.action,
      details: log.details,
      timestamp: log.timestamp || new Date().toISOString(),
      ip_address: log.ipAddress,
      category: log.category,
      severity: log.severity,
      target_user_id: log.targetUserId,
      target_user_email: log.targetUserEmail,
      metadata: log.metadata || {},
    };
    const { data, error } = await supabase
      .from('audit_logs')
      .insert([row])
      .select()
      .single();
    if (error) throw error;
    return auditLogFromRow(data as SupabaseAuditLog);
  }

  /* ================================================================ */
  /*  NOTIFICATIONS                                                   */
  /* ================================================================ */

  async getNotifications(userId?: string): Promise<Notification[]> {
    if (!this.configured) return [];
    let query = supabase.from('notifications').select('*').order('created_at', { ascending: false });
    if (userId) query = query.eq('user_id', userId);
    const { data, error } = await query;
    if (error) throw error;
    return (data || [] as SupabaseNotification[]).map(notificationFromRow);
  }

  async createNotification(notification: Partial<Notification>): Promise<Notification> {
    if (!this.configured) throw new Error('Supabase not configured');
    const row: Partial<SupabaseNotification> = {
      user_id: notification.userId,
      title: notification.title,
      message: notification.message,
      type: notification.type || 'info',
      read: notification.read || false,
      created_at: notification.createdAt || new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from('notifications')
      .insert([row])
      .select()
      .single();
    if (error) throw error;
    return notificationFromRow(data as SupabaseNotification);
  }

  async markNotificationRead(id: string): Promise<void> {
    if (!this.configured) return;
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);
    if (error) throw error;
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    if (!this.configured) return;
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);
    if (error) throw error;
  }

  /* ================================================================ */
  /*  PAYMENT CONFIG & CRYPTO NETWORKS                                */
  /* ================================================================ */

  async getPaymentConfig(): Promise<PaymentConfig> {
    if (!this.configured) {
      return {
        traditional: {
          beneficiary: 'PREDRAG MIRKOVIC',
          iban: 'CY05 9020 0001 0000 0201 0908 5462',
          bic: 'CARDCY2LXXX',
          bankName: 'UNLIMIT',
          supportEmail: 'info@kretz.site',
          instructions: 'Include your unique transfer reference in the wire transfer concept.',
          routingNumber: 'CY059020',
          address: 'LIMASSOL 125 GEORGIOU GRIVA DIGENI',
          country: 'CYPRUS',
        },
        cryptoNetworks: [],
      };
    }
    const { data, error } = await supabase.from('payment_config').select('*').limit(1).single();
    if (error) {
      return {
        traditional: {
          beneficiary: 'PREDRAG MIRKOVIC',
          iban: 'CY05 9020 0001 0000 0201 0908 5462',
          bic: 'CARDCY2LXXX',
          bankName: 'UNLIMIT',
          supportEmail: 'info@kretz.site',
          instructions: 'Include your unique transfer reference.',
          routingNumber: 'CY059020',
          address: 'LIMASSOL 125 GEORGIOU GRIVA DIGENI',
          country: 'CYPRUS',
        },
        cryptoNetworks: [],
      };
    }
    const cfg = data as any;
    const { data: nets, error: netsError } = await supabase
      .from('crypto_networks')
      .select('*')
      .order('created_at', { ascending: true });
    const networks: CryptoNetworkConfig[] = (netsError || !nets ? [] : nets).map(cryptoNetworkFromRow);
    return {
      traditional: {
        beneficiary: cfg.beneficiary,
        iban: cfg.iban,
        bic: cfg.bic,
        bankName: cfg.bank_name,
        supportEmail: cfg.support_email,
        instructions: cfg.instructions,
        routingNumber: cfg.routing_number,
        address: cfg.address,
        country: cfg.country,
      },
      cryptoNetworks: networks,
    };
  }

  async getCryptoNetworks(): Promise<CryptoNetworkConfig[]> {
    if (!this.configured) return [];
    const { data, error } = await supabase
      .from('crypto_networks')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || [] as SupabaseCryptoNetwork[]).map(cryptoNetworkFromRow);
  }

  async addCryptoNetwork(network: Omit<CryptoNetworkConfig, 'id'>): Promise<CryptoNetworkConfig> {
    if (!this.configured) throw new Error('Supabase not configured');
    const { data, error } = await supabase
      .from('crypto_networks')
      .insert([{
        name: network.name,
        token: network.token,
        network: network.network,
        wallet_address: network.walletAddress,
        contract_end: network.contractEnd,
        contract_address: network.contractAddress,
        enabled: network.enabled,
      }])
      .select()
      .single();
    if (error) throw error;
    return cryptoNetworkFromRow(data as SupabaseCryptoNetwork);
  }

  async deleteCryptoNetwork(id: string): Promise<void> {
    if (!this.configured) return;
    const { error } = await supabase.from('crypto_networks').delete().eq('id', id);
    if (error) throw error;
  }

  async toggleCryptoNetwork(id: string): Promise<void> {
    if (!this.configured) return;
    const { data: nets } = await supabase
      .from('crypto_networks')
      .select('enabled')
      .eq('id', id)
      .single();
    const current = (nets as any)?.enabled ?? true;
    const { error } = await supabase
      .from('crypto_networks')
      .update({ enabled: !current, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  }

  /* ================================================================ */
  /*  MEMBERSHIP TIERS                                                */
  /* ================================================================ */

  async getMembershipTiers(): Promise<MembershipTierType[]> {
    if (!this.configured) return [];
    const { data, error } = await supabase
      .from('membership_tiers')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []).map((t: any) => ({
      id: t.id as MembershipTierType['id'],
      name: t.name,
      shortLabel: t.short_label,
      tagline: t.description,
      description: t.description,
      priceAnnual: Number(t.min_investment?.replace(/[^\d.]/g, '')) || 1000,
      priceMonthly: Number(t.min_investment?.replace(/[^\d.]/g, '')) || 1000,
      color: t.badge,
      accentBg: t.badge,
      benefits: [],
      exclusiveAccess: [],
      maxOffMarketDossiers: 0,
      dedicatedConcierge: false,
      privateEventsPasses: 0,
      badge: t.badge,
      role: t.role as 'investor' | 'admin',
      minInvestment: t.min_investment,
    }));
  }

  /* ================================================================ */
  /*  COMPANY NEWS                                                    */
  /* ================================================================ */

  async getCompanyNews(): Promise<CompanyNewsItem[]> {
    if (!this.configured) return [];
    const { data, error } = await supabase
      .from('company_news')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((n: any) => ({
      id: n.id,
      title: n.title,
      description: n.description,
      category: n.category,
      source: n.source,
      tags: n.tags || [],
      youtubeId: n.youtube_id || '',
      youtubeUrl: n.youtube_url || '',
      thumbnailUrl: n.thumbnail_url || '',
      publishedDate: n.created_at,
      isFeatured: false,
      status: 'published' as const,
      createdAt: n.created_at,
    }));
  }

  /* ================================================================ */
  /*  FAVORITES                                                       */
  /* ================================================================ */

  async getFavorites(userId: string): Promise<string[]> {
    if (!this.configured) return [];
    const { data, error } = await supabase
      .from('favorites')
      .select('property_id')
      .eq('user_id', userId);
    if (error) return [];
    return (data || []).map((f: any) => f.property_id);
  }

  async addFavorite(userId: string, propertyId: string): Promise<void> {
    if (!this.configured) return;
    const { error } = await supabase
      .from('favorites')
      .insert([{ user_id: userId, property_id: propertyId }]);
    if (error) throw error;
  }

  async removeFavorite(userId: string, propertyId: string): Promise<void> {
    if (!this.configured) return;
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('property_id', propertyId);
    if (error) throw error;
  }

  /* ================================================================ */
  /*  USER PREFERENCES                                                */
  /* ================================================================ */

  async getPreferences(userId: string): Promise<Record<string, any>> {
    if (!this.configured) return {};
    const { data, error } = await supabase
      .from('user_preferences')
      .select('preferences')
      .eq('user_id', userId)
      .single();
    if (error) return {};
    return (data as any)?.preferences || {};
  }

  async savePreferences(userId: string, prefs: Record<string, any>): Promise<void> {
    if (!this.configured) return;
    const { error } = await supabase
      .from('user_preferences')
      .upsert([{ user_id: userId, preferences: prefs, updated_at: new Date().toISOString() }]);
    if (error) throw error;
  }

  /* ================================================================ */
  /*  SUB BALANCES                                                    */
  /* ================================================================ */

  async getSubBalances(userId: string): Promise<Record<string, number>> {
    if (!this.configured) return {};
    const { data, error } = await supabase
      .from('sub_balances')
      .select('currency, amount')
      .eq('user_id', userId);
    if (error) return {};
    const result: Record<string, number> = {};
    (data || []).forEach((b: any) => { result[b.currency] = Number(b.amount); });
    return result;
  }

  async setSubBalance(userId: string, currency: string, amount: number): Promise<void> {
    if (!this.configured) return;
    const { error } = await supabase
      .from('sub_balances')
      .upsert([{ user_id: userId, currency, amount, updated_at: new Date().toISOString() }]);
    if (error) throw error;
  }

  /* ================================================================ */
  /*  P2P LISTINGS                                                    */
  /* ================================================================ */

  async getP2PListings(): Promise<any[]> {
    if (!this.configured) return [];
    const { data, error } = await supabase
      .from('p2p_listings')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }
}

/* ------------------------------------------------------------------ */
/*  Singleton export                                                  */
/* ------------------------------------------------------------------ */

export const supabaseService = new SupabaseService();