/**
 * Shared in-memory store for Node/Express and Workers/Hono runtimes (demo state).
 * Not durable across isolates/processes; replace with D1/KV/Postgres in production.
 * Demo seed users are enabled by default for local/test/dev parity; set DEMO_SEED=false with real bindings in production.
 */
import { hashPassword } from './authService';

export interface MockUser {
  id: string; email: string; fullName: string; passwordHash: string; role: string;
  country?: string; phoneNumber?: string; countryCode?: string; kycStatus: string;
  balance: number; currency: string; isEmailVerified: boolean; status: string;
  createdAt: string; suspendedReason?: string;
}

export function sanitizeUser(user: MockUser): Omit<MockUser, 'passwordHash'> {
  const { passwordHash: _hash, ...safe } = user;
  return safe;
}

const demoSeed = (typeof process !== 'undefined' ? process.env?.DEMO_SEED : undefined) !== 'false';
export let mockUsers: MockUser[] = demoSeed ? [
  { id: 'usr-admin-kretz-site', email: 'info@kretz.site', fullName: 'Kretz Executive Admin', passwordHash: hashPassword('AdminSecret2026!'), role: 'admin', kycStatus: 'approved', balance: 500000, currency: 'EUR', country: 'Spain', countryCode: 'ES', phoneNumber: '+34 912 345 678', isEmailVerified: true, status: 'active', createdAt: '2025-01-01T09:00:00Z' },
  { id: 'usr-admin-01', email: 'admin@kretz.com', fullName: 'Chief Compliance Officer', passwordHash: hashPassword('AdminSecret2026!'), role: 'admin', kycStatus: 'approved', balance: 250000, currency: 'EUR', country: 'Spain', countryCode: 'ES', phoneNumber: '+34 912 345 678', isEmailVerified: true, status: 'active', createdAt: '2025-01-15T09:00:00Z' },
  { id: 'usr-investor-01', email: 'investor@kretz.com', fullName: 'European Angel Partner', passwordHash: hashPassword('InvestorPass123!'), role: 'investor', kycStatus: 'approved', balance: 45000, currency: 'EUR', isEmailVerified: true, status: 'active', createdAt: '2025-02-10T11:30:00Z' },
  { id: 'usr-investor-02', email: 'sophie.martin@luxcapital.fr', fullName: 'Sophie Martin', passwordHash: hashPassword('InvestorPass123!'), role: 'investor', kycStatus: 'pending', balance: 15000, currency: 'EUR', isEmailVerified: true, status: 'active', createdAt: '2025-03-01T14:20:00Z' }
] : [];

export let mockListings: any[] = [
  { id: 'prop-villa-mirador', slug: 'villa-mirador-marbella', title: 'Villa El Mirador', location: 'La Zagaleta, Benahavís, Spain', type: 'Luxury Villa', status: 'funding', fundedAmount: 1840000, targetAmount: 2450000, tokenPrice: 364, totalTokens: 6730, availableTokens: 1675, monthlyTargetRate: 6.10, projectedYield: 73.2, capitalAppreciation: 5.5, minimumInvestment: 1000, holdingPeriodMonths: 48, images: ['https://files.kretzrealestate.com/5534a64054a86115d0d81384cb413d7c.jpg'], specs: { bedrooms: 7, bathrooms: 9, builtAreaM2: 1280, plotAreaM2: 5200 }, financials: { grossRentAnnual: 220000, netYield: 73.2, totalIrr: 292.8 } },
  { id: 'prop-palacio-pedralbes', slug: 'palacio-pedralbes-barcelona', title: 'Palacio de Pedralbes', location: 'Pedralbes, Barcelona, Spain', type: 'Modernist Mansion', status: 'funding', fundedAmount: 980000, targetAmount: 1650000, tokenPrice: 364, totalTokens: 4532, availableTokens: 1840, monthlyTargetRate: 6.30, projectedYield: 75.6, capitalAppreciation: 4.8, minimumInvestment: 1000, holdingPeriodMonths: 48, images: ['https://files.kretzrealestate.com/6ad7ec3c06057549d91484987949c8f.jpg'], specs: { bedrooms: 6, bathrooms: 7, builtAreaM2: 980, plotAreaM2: 2100 }, financials: { grossRentAnnual: 140000, netYield: 75.6, totalIrr: 280 } },
  { id: 'prop-kretz-kp1-102', slug: 'roquebrune-cap-martin-ramingao', title: 'ROQUEBRUNE-CAP-MARTIN - Ramingao', location: 'Roquebrune-Cap-Martin, France', type: 'Villa', status: 'funding', fundedAmount: 4200000, targetAmount: 5900000, tokenPrice: 100, totalTokens: 59000, availableTokens: 17000, monthlyTargetRate: 0.8, projectedYield: 9.6, capitalAppreciation: 4.2, minimumInvestment: 100, holdingPeriodMonths: 36, images: ['https://files.kretzrealestate.com/5534a64054a86115d0d81384cb413d7c.jpg'], specs: { bedrooms: 5, bathrooms: 5, builtAreaM2: 620, plotAreaM2: 1800 }, financials: { grossRentAnnual: 520000, netYield: 9.6, totalIrr: 13.8 } },
  { id: 'prop-kretz-kp1-103', slug: 'paris-16-villa-montmorency', title: 'PARIS 16TH - Villa Montmorency', location: 'Paris 16th, France', type: 'Estate', status: 'funding', fundedAmount: 5100000, targetAmount: 7500000, tokenPrice: 100, totalTokens: 75000, availableTokens: 24000, monthlyTargetRate: 1.02, projectedYield: 12.2, capitalAppreciation: 3.8, minimumInvestment: 100, holdingPeriodMonths: 36, images: ['https://files.kretzrealestate.com/6ad7ec3c06057549d91484987949c8f.jpg'], specs: { bedrooms: 6, bathrooms: 6, builtAreaM2: 900, plotAreaM2: 1200 }, financials: { grossRentAnnual: 840000, netYield: 12.2, totalIrr: 16.0 } }
];

export let mockTransactions: any[] = [];

export let platformConfig: any = {
  platformName: 'Rental-log', tradingEnabled: true, depositsEnabled: true, withdrawalsEnabled: true,
  maintenanceMode: false, minInvestment: 100, maxInvestmentPerInvestor: 1000000,
  announcementBanner: { active: false, text: '', type: 'info' }
};

export function newId(prefix: string) {
  try {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const b = new Uint8Array(4); crypto.getRandomValues(b);
      return `${prefix}-${Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')}`;
    }
  } catch {}
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
