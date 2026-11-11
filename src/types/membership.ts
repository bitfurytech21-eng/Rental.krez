export type MembershipTierId = 'heritage' | 'sovereign' | 'black_circle';

export type MembershipBillingCycle = 'annual' | 'monthly';

export type MembershipStatus = 'active' | 'pending_review' | 'cancelled' | 'expired';

export interface MembershipTier {
  id: MembershipTierId;
  name: string;
  badge: string;
  tagline: string;
  description: string;
  priceAnnual: number; // EUR
  priceMonthly: number; // EUR
  color: string;
  accentBg: string;
  popular?: boolean;
  benefits: string[];
  exclusiveAccess: string[];
  maxOffMarketDossiers: number;
  dedicatedConcierge: boolean;
  privateEventsPasses: number;
  invitationOnly?: boolean;
}

export interface UserMembership {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  tierId: MembershipTierId;
  tierName: string;
  status: MembershipStatus;
  billingCycle: MembershipBillingCycle;
  feePaid: number;
  currency: string;
  memberNumber: string; // e.g. KRTZ-ESP-8921
  joinedDate: string;
  renewalDate: string;
  autoRenew: boolean;
  paymentMethod: 'wallet_balance' | 'bank_wire' | 'credit_card' | 'complimentary_invitation';
  specialRequests?: string;
  preferredRegion?: string;
  digitalCardIssued: boolean;
}

export interface MembershipApplication {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  country: string;
  tierId: MembershipTierId;
  billingCycle: MembershipBillingCycle;
  notes?: string;
  interestAreas: string[];
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  adminNotes?: string;
}

export const INITIAL_MEMBERSHIP_TIERS: MembershipTier[] = [
  {
    id: 'heritage',
    name: 'Resident Heritage',
    badge: 'Silver Tier',
    tagline: 'Private community access & curated quarterly market dossiers',
    description: 'Designed for private real estate enthusiasts seeking verified off-market insights and priority invitations across Spain and France.',
    priceAnnual: 1800,
    priceMonthly: 180,
    color: '#69736F',
    accentBg: '#F1F4F1',
    popular: false,
    benefits: [
      'Quarterly confidential off-market acquisition bulletins (Spain & France)',
      'Direct contact desk with bilingual Kretz associate agents',
      'Invitation to bi-annual digital real estate salon presentations',
      'Priority access to newly listed fractional SPV allocations (24h head start)',
      'Digital verifiable Kretz Club membership credentials',
    ],
    exclusiveAccess: [
      'Curated Madrid, Barcelona & Balearics off-market portfolio',
      'Exclusive member community discord / private channel',
    ],
    maxOffMarketDossiers: 5,
    dedicatedConcierge: false,
    privateEventsPasses: 1,
    invitationOnly: false,
  },
  {
    id: 'sovereign',
    name: 'Sovereign Privilège',
    badge: 'Gold Tier · Most Popular',
    tagline: 'Dedicated private advisor & exclusive salon estate receptions',
    description: 'Bespoke lifestyle advisory with personal broker allocation, complimentary architectural staging audits, and in-person family estate receptions.',
    priceAnnual: 4800,
    priceMonthly: 460,
    color: '#D4AF37',
    accentBg: '#FAF5E8',
    popular: true,
    benefits: [
      'All Resident Heritage privileges included',
      'Dedicated Senior Private Wealth & Real Estate Advisor',
      'Immediate access to confidential off-market property dossiers with notarial audits',
      '2 VIP invitations per year to Kretz private estate cocktail salons (Madrid & Paris)',
      'Complimentary architectural pre-audit for member-owned luxury properties',
      '72-hour exclusive priority window on newly tokenized prime European properties',
    ],
    exclusiveAccess: [
      'Unrestricted confidential off-market catalog across Europe & Caribbean',
      'Direct WhatsApp concierge line with Senior Kretz advisory partners',
      'Preferred rates with CaixaBank & partner notary firms for closing deeds',
    ],
    maxOffMarketDossiers: 20,
    dedicatedConcierge: true,
    privateEventsPasses: 2,
    invitationOnly: false,
  },
  {
    id: 'black_circle',
    name: 'Founder’s Black Circle',
    badge: 'Patron · By Invitation / Advisory Board',
    tagline: 'Direct family partner access & bespoke multi-family office syndication',
    description: 'The highest echelon of membership. Direct directorship advisory with Olivier, Martin & Valentin Kretz, private jet and yacht hospitality privileges, and bespoke co-investment structuring.',
    priceAnnual: 12000,
    priceMonthly: 1150,
    color: '#182D2A',
    accentBg: '#E8ECE8',
    popular: false,
    benefits: [
      'All Sovereign Privilège privileges included',
      'Direct personal relationship with Kretz Partners (Olivier, Martin & Valentin)',
      'Unlimited bespoke off-market sourcing for ultra-prime mansions (€5M+ to €50M+)',
      'VIP guest access to annual Cap d’Antibes & Saint-Tropez regatta reception',
      'Private aviation & yacht charter preferred member rates via partner fleet',
      'Custom SPV fractional syndicate co-creation for family office capital',
      'Physical engraved brass & carbon membership card with NFC concierge link',
    ],
    exclusiveAccess: [
      'Bespoke Family Office syndication desk with legal structuring',
      'Discreet off-market listings with zero digital footprint',
      'Annual private dinner with the Kretz Family in Boulogne-Billancourt',
    ],
    maxOffMarketDossiers: 999,
    dedicatedConcierge: true,
    privateEventsPasses: 6,
    invitationOnly: true,
  },
];
