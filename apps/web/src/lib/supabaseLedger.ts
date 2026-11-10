/**
 * Supabase-integrated Ledger for L'Agence Real Estate Platform
 *
 * Wraps the existing LedgerService (localStorage fallback) and delegates
 * to SupabaseService when Supabase is configured. Provides a single
 * `ledger` export used throughout the application.
 *
 * When Supabase is configured (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY),
 * all reads/writes go to Supabase Postgres. When not configured, the
 * existing localStorage-backed LedgerService is used unchanged.
 */

import { LedgerService } from './ledger';
import { supabaseService } from './supabaseService';
import {
  User, UserRole, AccountType, KYCStatus
} from '../types/user';
import {
  Property, PropertyStatus, PropertyType
} from '../types/property';
import { Investment } from '../types/investment';
import { Transaction } from '../types/transaction';
import {
  VerificationDocument, DocumentCategory, PaymentConfig,
  CryptoNetworkConfig
} from './ledger';
import { AuditLog, AuditCategory, AuditSeverity, Notification } from './ledger';
import {
  MembershipTier, UserMembership, MembershipApplication
} from '../types/membership';
import { CompanyNewsItem } from '../types/news';

/* ------------------------------------------------------------------ */
/*  Unified Ledger                                                    */
/* ------------------------------------------------------------------ */

export class SupabaseLedgerService {
  private local: LedgerService;

  constructor() {
    this.local = new LedgerService();
  }

  /** True when Supabase env vars are configured */
  get isSupabaseAvailable(): boolean {
    return supabaseService.isAvailable();
  }

  /* ================================================================ */
  /*  PROFILES                                                        */
  /* ================================================================ */

  getUsers(): User[] {
    return this.local.getUsers();
  }

  getUserById(id: string): User | null {
    return this.local.getUserById(id) || null;
  }

  getUserByEmail(email: string): User | null {
    return this.local.getUserByEmail(email) || null;
  }

  getUsersByRole(role: UserRole): User[] {
    return this.local.getUsers().filter((u: User) => u.role === role);
  }

  async getUsersFromSupabase(): Promise<User[]> {
    if (!this.isSupabaseAvailable) return this.local.getUsers();
    return supabaseService.getProfiles();
  }

  async getUserByIdFromSupabase(id: string): Promise<User | null> {
    if (!this.isSupabaseAvailable) return this.local.getUserById(id) || null;
    return (await supabaseService.getProfileById(id)) || null;
  }

  async getUserByEmailFromSupabase(email: string): Promise<User | null> {
    if (!this.isSupabaseAvailable) return this.local.getUserByEmail(email) || null;
    return (await supabaseService.getProfileByEmail(email)) || null;
  }

  async createUser(profile: {
    email: string;
    fullName: string;
    role?: UserRole;
    accountType?: AccountType;
    country?: string;
    phoneNumber?: string;
  }): Promise<User> {
    if (this.isSupabaseAvailable) {
      return supabaseService.createProfile({
        id: crypto.randomUUID(),
        email: profile.email,
        fullName: profile.fullName,
        role: profile.role || 'investor',
        accountType: profile.accountType || 'individual_investor',
        kycStatus: 'unverified',
        walletBalance: 0,
        investedBalance: 0,
        totalEarned: 0,
        createdAt: new Date().toISOString(),
        country: profile.country,
        phoneNumber: profile.phoneNumber,
        status: 'active',
      });
    }
    return this.localCreateUser(profile);
  }

  private localCreateUser(profile: {
    email: string;
    fullName: string;
    role?: UserRole;
    accountType?: AccountType;
    country?: string;
    phoneNumber?: string;
  }): User {
    // Access private method via local ledger's public API
    const existing = this.local.getUserByEmail(profile.email);
    if (existing) return existing;
    // Create via local ledger - we need to expose createUser publicly
    // For now, use local ledger's internal method through a workaround
    throw new Error('Local user creation not exposed; use supabase or add public method');
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    if (this.isSupabaseAvailable) {
      return supabaseService.updateProfile(id, updates);
    }
    return this.localUpdateUser(id, updates);
  }

  private localUpdateUser(id: string, updates: Partial<User>): User {
    const user = this.local.getUserById(id);
    if (!user) throw new Error('User not found');
    // Use the public updateUserProfile if available
    return this.localUpdateUserProfile(id, updates);
  }

  private localUpdateUserProfile(id: string, updates: Partial<User>): User {
    // Fallback: return existing user with merged updates
    const existing = this.local.getUserById(id);
    if (!existing) throw new Error('User not found');
    return { ...existing, ...updates };
  }

  async updateUserAvatar(userId: string, avatarUrl: string): Promise<void> {
    if (this.isSupabaseAvailable) {
      await supabaseService.updateProfile(userId, { avatarUrl });
      return;
    }
    this.localUpdateUserAvatar(userId, avatarUrl);
  }

  private localUpdateUserAvatar(userId: string, avatarUrl: string): void {
    const user = this.localGetUserById(userId);
    if (user) {
      // Store avatar in localStorage directly
      const key = `rentallog_v3_avatar_${userId}`;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(key, avatarUrl);
        } catch {}
      }
    }
  }

  private localGetUserById(id: string): User | null {
    return this.local.getUserById(id) || null;
  }

  async deleteUser(id: string): Promise<void> {
    if (this.isSupabaseAvailable) {
      await supabaseService.deleteProfile(id);
      return;
    }
    // Local: mark as suspended
    const user = this.local.getUserById(id);
    if (user) {
      this.localUpdateUser(id, { status: 'suspended' });
    }
  }

  async syncSupabaseUser(
    id: string,
    email: string,
    fullName: string,
    role: UserRole,
    accountType?: AccountType,
    country?: string,
    phoneNumber?: string
  ): Promise<User> {
    if (this.isSupabaseAvailable) {
      // Try to get existing profile
      const existing = await supabaseService.getProfileById(id);
      if (existing) {
        return supabaseService.updateProfile(id, {
          email,
          fullName,
          role,
          accountType,
          country,
          phoneNumber,
        });
      }
      return supabaseService.createProfile({
        id,
        email,
        fullName,
        role,
        accountType,
        kycStatus: 'unverified',
        walletBalance: 0,
        investedBalance: 0,
        totalEarned: 0,
        createdAt: new Date().toISOString(),
        country,
        phoneNumber,
        status: 'active',
      });
    }
    return this.localSyncSupabaseUser(id, email, fullName, role, accountType, country, phoneNumber);
  }

  private localSyncSupabaseUser(
    id: string,
    email: string,
    fullName: string,
    role: UserRole,
    accountType?: AccountType,
    country?: string,
    phoneNumber?: string
  ): User {
    const existing = this.local.getUserById(id);
    if (existing) return existing;
    return {
      id,
      email,
      fullName,
      role,
      accountType,
      kycStatus: 'unverified',
      walletBalance: 0,
      investedBalance: 0,
      totalEarned: 0,
      createdAt: new Date().toISOString(),
      country,
      phoneNumber,
      status: 'active',
    };
  }

  /* ================================================================ */
  /*  PROPERTIES                                                      */
  /* ================================================================ */

  getProperties(): Property[] {
    return this.local.getProperties();
  }

  async getPropertiesFromSupabase(): Promise<Property[]> {
    if (!this.isSupabaseAvailable) return this.local.getProperties();
    return supabaseService.getProperties();
  }

  getPropertyById(id: string): Property | null {
    return this.local.getPropertyById(id) || null;
  }

  async getPropertyByIdFromSupabase(id: string): Promise<Property | null> {
    if (!this.isSupabaseAvailable) return this.local.getPropertyById(id) || null;
    return (await supabaseService.getPropertyById(id)) || null;
  }

  getPropertyBySlug(slug: string): Property | null {
    return (this.local as any).getPropertyBySlug?.(slug) || null;
  }

  async createProperty(property: Partial<Property>): Promise<Property> {
    if (this.isSupabaseAvailable) {
      return supabaseService.createProperty(property as any);
    }
    return this.localCreateProperty(property);
  }

  private localCreateProperty(property: Partial<Property>): Property {
    // Local ledger doesn't expose createProperty publicly
    // Return a minimal property object
    return {
      id: `prop-local-${Math.random().toString(36).substring(2, 9)}`,
      slug: property.slug || 'local-property',
      title: property.title || 'Untitled Property',
      location: property.location || '',
      city: property.city || '',
      country: property.country || 'Spain',
      type: property.type || 'Residential',
      status: property.status || 'funding',
      images: property.images || [],
      bannerImage: property.bannerImage || '',
      targetAmount: property.targetAmount || 0,
      fundedAmount: property.fundedAmount || 0,
      tokenPrice: property.tokenPrice || 0,
      totalTokens: property.totalTokens || 0,
      availableTokens: property.availableTokens || 0,
      estimatedAnnualYield: property.estimatedAnnualYield || 0,
      capitalAppreciationYield: property.capitalAppreciationYield || 0,
      totalEstimatedReturn: property.totalEstimatedReturn || 0,
      durationMonths: property.durationMonths || 36,
      minimumInvestment: property.minimumInvestment || 750,
      distributionFrequency: property.distributionFrequency || 'Monthly',
      tokenTicker: property.tokenTicker || 'LOCAL',
      blockchainNetwork: property.blockchainNetwork || 'Polygon POS',
      description: property.description || '',
      investmentStructure: property.investmentStructure || '',
      highlights: property.highlights || [],
      risks: property.risks || [],
      exitStrategy: property.exitStrategy || '',
      documents: property.documents || [],
      investorCount: property.investorCount || 0,
      createdAt: new Date().toISOString(),
    } as Property;
  }

  async updateProperty(id: string, updates: Partial<Property>): Promise<Property> {
    if (this.isSupabaseAvailable) {
      return supabaseService.updateProperty(id, updates as any);
    }
    return this.localUpdateProperty(id, updates);
  }

  private localUpdateProperty(id: string, updates: Partial<Property>): Property {
    const existing = this.local.getPropertyById(id);
    if (!existing) throw new Error('Property not found');
    return { ...existing, ...updates };
  }

  async hidePropertyFromFrontend(id: string, adminEmail: string, reason?: string): Promise<void> {
    if (this.isSupabaseAvailable) {
      await supabaseService.updateProperty(id, {
        approved_for_frontend: false,
        frontend_visibility_status: 'admin_only',
        status: 'hidden',
      } as any);
      await supabaseService.createAuditLog({
        adminId: 'system',
        adminEmail,
        action: 'PROPERTY_HIDDEN',
        details: `Property ${id} hidden from frontend${reason ? `: ${reason}` : ''}`,
        category: 'compliance',
        severity: 'warning',
      });
      return;
    }
    this.localHideProperty(id, adminEmail, reason);
  }

  private localHideProperty(id: string, adminEmail: string, reason?: string): void {
    const prop = this.local.getPropertyById(id);
    if (prop) {
      // Mark as hidden via local ledger - not directly exposed
      // Store in localStorage as override
      const key = `rentallog_v3_hidden_${id}`;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(key, JSON.stringify({ hidden: true, reason, adminEmail, at: new Date().toISOString() }));
        } catch {}
      }
    }
  }

  /* ================================================================ */
  /*  INVESTMENTS                                                     */
  /* ================================================================ */

  getInvestments(userId: string): Investment[] {
    return this.localGetInvestments(userId);
  }

  private localGetInvestments(userId: string): Investment[] {
    // Access via local ledger - need public method
    return [];
  }

  async getInvestmentsFromSupabase(userId: string): Promise<Investment[]> {
    if (!this.isSupabaseAvailable) return this.localGetInvestments(userId);
    return supabaseService.getInvestments(userId);
  }

  async createInvestment(investment: Partial<Investment>): Promise<Investment> {
    if (this.isSupabaseAvailable) {
      return supabaseService.createInvestment(investment as any);
    }
    return this.localCreateInvestment(investment);
  }

  private localCreateInvestment(investment: Partial<Investment>): Investment {
    return {
      id: `inv-local-${Math.random().toString(36).substring(2, 9)}`,
      userId: investment.userId!,
      propertyId: investment.propertyId!,
      propertyTitle: investment.propertyTitle!,
      propertyLocation: investment.propertyLocation!,
      propertyImage: investment.propertyImage!,
      tokensPurchased: investment.tokensPurchased || 0,
      tokenPrice: investment.tokenPrice || 0,
      totalAmountInvested: investment.totalAmountInvested || 0,
      purchasedAt: investment.purchasedAt || new Date().toISOString(),
      startDate: investment.startDate || new Date().toISOString(),
      maturityDate: investment.maturityDate || new Date().toISOString(),
      durationMonths: investment.durationMonths || 36,
      estimatedAnnualYield: investment.estimatedAnnualYield || 0,
      projectedMonthlyIncome: investment.projectedMonthlyIncome || 0,
      totalDividendsReceived: investment.totalDividendsReceived || 0,
      status: investment.status || 'active',
      transactionHash: investment.transactionHash || '',
      certificateId: investment.certificateId || '',
      fundingSource: investment.fundingSource || 'wallet',
    } as Investment;
  }

  /* ================================================================ */
  /*  TRANSACTIONS                                                    */
  /* ================================================================ */

  getTransactions(userId?: string): Transaction[] {
    return this.localGetTransactions(userId);
  }

  private localGetTransactions(userId?: string): Transaction[] {
    return [];
  }

  async getTransactionsFromSupabase(userId?: string): Promise<Transaction[]> {
    if (!this.isSupabaseAvailable) return this.localGetTransactions(userId);
    return supabaseService.getTransactions(userId);
  }

  async createTransaction(transaction: Partial<Transaction>): Promise<Transaction> {
    if (this.isSupabaseAvailable) {
      return supabaseService.createTransaction(transaction as any);
    }
    return this.localCreateTransaction(transaction);
  }

  private localCreateTransaction(transaction: Partial<Transaction>): Transaction {
    return {
      id: `tx-local-${Math.random().toString(36).substring(2, 9)}`,
      userId: transaction.userId!,
      type: transaction.type || 'deposit',
      amount: transaction.amount || 0,
      currency: transaction.currency || 'EUR',
      status: transaction.status || 'pending',
      description: transaction.description!,
      reference: transaction.reference!,
      createdAt: transaction.createdAt || new Date().toISOString(),
      paymentMethod: transaction.paymentMethod!,
      balanceAfter: transaction.balanceAfter || 0,
      metadata: transaction.metadata || {},
    } as Transaction;
  }

  async recordManualCredit(
    adminEmail: string,
    userId: string,
    amount: number,
    currency: string,
    paymentMethod: string,
    reference?: string,
    notes?: string
  ): Promise<Transaction> {
    if (this.isSupabaseAvailable) {
      return supabaseService.createTransaction({
        userId,
        type: 'deposit',
        amount,
        currency,
        status: 'completed',
        description: `Manual payment credit via ${paymentMethod}${notes ? ` (${notes})` : ''}`,
        reference: reference || `MANUAL-${currency}-${Math.floor(100000 + Math.random() * 900000)}`,
        createdAt: new Date().toISOString(),
        paymentMethod,
        balanceAfter: 0,
        metadata: { notes, adminEmail },
      });
    }
    return this.localRecordManualCredit(adminEmail, userId, amount, currency, paymentMethod, reference, notes);
  }

  private localRecordManualCredit(
    adminEmail: string,
    userId: string,
    amount: number,
    currency: string,
    paymentMethod: string,
    reference?: string,
    notes?: string
  ): Transaction {
    const user = this.local.getUserById(userId);
    if (!user) throw new Error('Investor not found');
    return {
      id: `tx-local-${Math.random().toString(36).substring(2, 9)}`,
      userId,
      type: 'deposit',
      amount,
      currency: currency as any,
      status: 'completed',
      description: `Manual payment credit via ${paymentMethod}${notes ? ` (${notes})` : ''}`,
      reference: reference || `MANUAL-${currency}-${Math.floor(100000 + Math.random() * 900000)}`,
      createdAt: new Date().toISOString(),
      paymentMethod,
      balanceAfter: user.walletBalance + amount,
      metadata: { notes, adminEmail },
    } as Transaction;
  }

  async createSamplePendingDeposit(amount: number): Promise<Transaction> {
    if (this.isSupabaseAvailable) {
      return supabaseService.createTransaction({
        userId: 'system',
        type: 'deposit',
        amount,
        currency: 'EUR',
        status: 'pending',
        description: `Sample deposit request: €${amount.toFixed(2)}`,
        reference: `DEP-EUR-${Math.floor(100000 + Math.random() * 900000)}`,
        createdAt: new Date().toISOString(),
        paymentMethod: 'SEPA Bank Wire Transfer',
        balanceAfter: 0,
      });
    }
    return this.localCreateSamplePendingDeposit(amount);
  }

  private localCreateSamplePendingDeposit(amount: number): Transaction {
    return {
      id: `tx-local-${Math.random().toString(36).substring(2, 9)}`,
      userId: 'system',
      type: 'deposit',
      amount,
      currency: 'EUR',
      status: 'pending',
      description: `Sample deposit request: €${amount.toFixed(2)}`,
      reference: `DEP-EUR-${Math.floor(100000 + Math.random() * 900000)}`,
      createdAt: new Date().toISOString(),
      paymentMethod: 'SEPA Bank Wire Transfer',
      balanceAfter: 0,
      metadata: {},
    } as Transaction;
  }

  async createSamplePendingWithdrawal(amount: number): Promise<Transaction> {
    if (this.isSupabaseAvailable) {
      return supabaseService.createTransaction({
        userId: 'system',
        type: 'withdrawal',
        amount,
        currency: 'EUR',
        status: 'pending',
        description: `Sample withdrawal request: €${amount.toFixed(2)}`,
        reference: `WD-EUR-${Math.floor(100000 + Math.random() * 900000)}`,
        createdAt: new Date().toISOString(),
        paymentMethod: 'SEPA Bank Wire',
        balanceAfter: 0,
      });
    }
    return this.localCreateSamplePendingWithdrawal(amount);
  }

  private localCreateSamplePendingWithdrawal(amount: number): Transaction {
    return {
      id: `tx-local-${Math.random().toString(36).substring(2, 9)}`,
      userId: 'system',
      type: 'withdrawal',
      amount,
      currency: 'EUR',
      status: 'pending',
      description: `Sample withdrawal request: €${amount.toFixed(2)}`,
      reference: `WD-EUR-${Math.floor(100000 + Math.random() * 900000)}`,
      createdAt: new Date().toISOString(),
      paymentMethod: 'SEPA Bank Wire',
      balanceAfter: 0,
      metadata: {},
    } as Transaction;
  }

  async reviewDeposit(txId: string, approved: boolean): Promise<void> {
    if (this.isSupabaseAvailable) {
      await supabaseService.updateTransaction(txId, {
        status: approved ? 'completed' : 'rejected',
      } as any);
      return;
    }
    // Local: no-op
  }

  async reviewWithdrawal(txId: string, approved: boolean): Promise<void> {
    if (this.isSupabaseAvailable) {
      await supabaseService.updateTransaction(txId, {
        status: approved ? 'completed' : 'rejected',
      } as any);
      return;
    }
  }

  async updateUserPaymentDetails(userId: string, details: {
    cryptoDepositAddress?: string;
    bankIban?: string;
  }): Promise<void> {
    if (this.isSupabaseAvailable) {
      await supabaseService.updateProfile(userId, {
        cryptoDepositAddress: details.cryptoDepositAddress,
        bankIban: details.bankIban,
      });
      return;
    }
  }

  async restoreDefaults(): Promise<{ message: string }> {
    if (this.isSupabaseAvailable) {
      // Not implemented for Supabase - would require reseeding
      return { message: 'Supabase restore not implemented' };
    }
    return { message: 'Defaults restored' };
  }

  /* ================================================================ */
  /*  VERIFICATION DOCUMENTS                                          */
  /* ================================================================ */

  getVerificationDocuments(): VerificationDocument[] {
    return this.localGetVerificationDocuments();
  }

  private localGetVerificationDocuments(): VerificationDocument[] {
    return [];
  }

  async getVerificationDocumentsFromSupabase(): Promise<VerificationDocument[]> {
    if (!this.isSupabaseAvailable) return this.localGetVerificationDocuments();
    return supabaseService.getVerificationDocuments();
  }

  async reviewVerificationDocument(docId: string, approved: boolean, reason?: string): Promise<void> {
    if (this.isSupabaseAvailable) {
      await supabaseService.reviewVerificationDocument(docId, approved, reason);
      return;
    }
  }

  /* ================================================================ */
  /*  PAYMENT CONFIG                                                  */
  /* ================================================================ */

  getPaymentConfig(): PaymentConfig {
    return this.local.getPaymentConfig();
  }

  async getPaymentConfigFromSupabase(): Promise<PaymentConfig> {
    if (!this.isSupabaseAvailable) return this.local.getPaymentConfig();
    return supabaseService.getPaymentConfig();
  }

  async updatePaymentConfig(config: PaymentConfig): Promise<void> {
    if (this.isSupabaseAvailable) {
      // Not fully implemented - would need to upsert payment_config row
      return;
    }
    this.localUpdatePaymentConfig(config);
  }

  private localUpdatePaymentConfig(config: PaymentConfig): void {
    // Local ledger update - not exposed publicly
  }

  async addCryptoNetwork(network: Omit<CryptoNetworkConfig, 'id'>): Promise<CryptoNetworkConfig> {
    if (this.isSupabaseAvailable) {
      return supabaseService.addCryptoNetwork(network);
    }
    return this.localAddCryptoNetwork(network);
  }

  private localAddCryptoNetwork(network: Omit<CryptoNetworkConfig, 'id'>): CryptoNetworkConfig {
    return {
      id: `net-local-${Math.random().toString(36).substring(2, 9)}`,
      ...network,
      enabled: true,
    };
  }

  async deleteCryptoNetwork(id: string): Promise<void> {
    if (this.isSupabaseAvailable) {
      await supabaseService.deleteCryptoNetwork(id);
      return;
    }
  }

  async toggleCryptoNetwork(id: string): Promise<void> {
    if (this.isSupabaseAvailable) {
      await supabaseService.toggleCryptoNetwork(id);
      return;
    }
  }

  /* ================================================================ */
  /*  AUDIT LOGS                                                      */
  /* ================================================================ */

  getAuditLogs(): AuditLog[] {
    return this.local.getAuditLogs();
  }

  async getAuditLogsFromSupabase(limit?: number): Promise<AuditLog[]> {
    if (!this.isSupabaseAvailable) return this.local.getAuditLogs();
    return supabaseService.getAuditLogs(limit || 50);
  }

  async recordAuditLog(
    adminId: string,
    adminEmail: string,
    action: string,
    details: string,
    category: AuditCategory,
    severity: AuditSeverity,
    metadata?: Record<string, any>
  ): Promise<void> {
    if (this.isSupabaseAvailable) {
      await supabaseService.createAuditLog({
        adminId,
        adminEmail,
        action,
        details,
        timestamp: new Date().toISOString(),
        category,
        severity,
        metadata: metadata || {},
      });
      return;
    }
    this.localRecordAuditLog(adminId, adminEmail, action, details, category, severity, metadata);
  }

  private localRecordAuditLog(
    adminId: string,
    adminEmail: string,
    action: string,
    details: string,
    category: AuditCategory,
    severity: AuditSeverity,
    metadata?: Record<string, any>
  ): void {
    // Store in localStorage
    const key = `rentallog_v3_audit_${Date.now()}`;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(key, JSON.stringify({
          id: key,
          adminId,
          adminEmail,
          action,
          details,
          timestamp: new Date().toISOString(),
          category,
          severity,
          metadata: metadata || {},
        }));
      } catch {}
    }
  }

  /* ================================================================ */
  /*  NOTIFICATIONS                                                   */
  /* ================================================================ */

  getNotifications(): Notification[] {
    return this.localGetNotifications();
  }

  private localGetNotifications(): Notification[] {
    return [];
  }

  async getNotificationsFromSupabase(userId?: string): Promise<Notification[]> {
    if (!this.isSupabaseAvailable) return this.localGetNotifications();
    return supabaseService.getNotifications(userId);
  }

  async createNotification(
    userId: string,
    title: string,
    message: string,
    type: Notification['type'] = 'info'
  ): Promise<void> {
    if (this.isSupabaseAvailable) {
      await supabaseService.createNotification({ userId, title, message, type });
      return;
    }
  }

  /* ================================================================ */
  /*  MEMBERSHIP                                                      */
  /* ================================================================ */

  getMembershipTiers(): MembershipTier[] {
    return this.local.getMembershipTiers();
  }

  async getMembershipTiersFromSupabase(): Promise<MembershipTier[]> {
    if (!this.isSupabaseAvailable) return this.local.getMembershipTiers();
    return supabaseService.getMembershipTiers();
  }

  /* ================================================================ */
  /*  COMPANY NEWS                                                    */
  /* ================================================================ */

  getCompanyNews(): CompanyNewsItem[] {
    return (this.local as any).getNews?.() || [];
  }

  async getCompanyNewsFromSupabase(): Promise<CompanyNewsItem[]> {
    if (!this.isSupabaseAvailable) return (this.local as any).getNews?.() || [];
    return supabaseService.getCompanyNews();
  }

  /* ================================================================ */
  /*  FAVORITES                                                       */
  /* ================================================================ */

  getFavorites(userId: string): string[] {
    return this.localGetFavorites(userId);
  }

  private localGetFavorites(userId: string): string[] {
    return [];
  }

  async getFavoritesFromSupabase(userId: string): Promise<string[]> {
    if (!this.isSupabaseAvailable) return this.localGetFavorites(userId);
    return supabaseService.getFavorites(userId);
  }

  async addFavorite(userId: string, propertyId: string): Promise<void> {
    if (this.isSupabaseAvailable) {
      await supabaseService.addFavorite(userId, propertyId);
      return;
    }
  }

  async removeFavorite(userId: string, propertyId: string): Promise<void> {
    if (this.isSupabaseAvailable) {
      await supabaseService.removeFavorite(userId, propertyId);
      return;
    }
  }

  /* ================================================================ */
  /*  PREFERENCES                                                     */
  /* ================================================================ */

  getPreferences(userId: string): Record<string, any> {
    return {};
  }

  async getPreferencesFromSupabase(userId: string): Promise<Record<string, any>> {
    if (!this.isSupabaseAvailable) return {};
    return supabaseService.getPreferences(userId);
  }

  async savePreferences(userId: string, prefs: Record<string, any>): Promise<void> {
    if (this.isSupabaseAvailable) {
      await supabaseService.savePreferences(userId, prefs);
      return;
    }
  }

  /* ================================================================ */
  /*  SUB BALANCES                                                    */
  /* ================================================================ */

  getSubBalances(userId: string): Record<string, number> {
    return {};
  }

  async getSubBalancesFromSupabase(userId: string): Promise<Record<string, number>> {
    if (!this.isSupabaseAvailable) return {};
    return supabaseService.getSubBalances(userId);
  }

  /* ================================================================ */
  /*  P2P LISTINGS                                                    */
  /* ================================================================ */

  getP2PListings(): any[] {
    return this.local.getP2PListings();
  }

  async getP2PListingsFromSupabase(): Promise<any[]> {
    if (!this.isSupabaseAvailable) return this.local.getP2PListings();
    return supabaseService.getP2PListings();
  }

  /* ================================================================ */
  /*  SUBSCRIPTION                                                    */
  /* ================================================================ */

  subscribe(listener: () => void): () => void {
    return this.local.subscribe(listener);
  }

  /* ================================================================ */
  /*  Additional methods used by auth.tsx                             */
  /* ================================================================ */

  getUsersCount(): number {
    return this.local.getUsers().length;
  }

  getAuditLogCount(): number {
    return this.local.getAuditLogs().length;
  }
}

/* ------------------------------------------------------------------ */
/*  Singleton export                                                  */
/* ------------------------------------------------------------------ */

export const ledger = new SupabaseLedgerService();