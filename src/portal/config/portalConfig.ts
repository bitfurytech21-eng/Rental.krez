import { PortalConfig } from '../types';

/**
 * Single centralized placeholder configuration used strictly until live values
 * load from /api/v1/payments/config and /api/v1/treasury/rates.
 * Do not duplicate bank details, fees, or limits elsewhere in the frontend.
 */
export const PORTAL_PLACEHOLDER_CONFIG: PortalConfig = {
  isPlaceholder: true,
  traditional: {
    beneficiary: '[Placeholder: Escrow Beneficiary]',
    bankName: '[Placeholder: Settlement Bank]',
    iban: '[Placeholder: IBAN Pending Backend Sync]',
    bic: '[Placeholder: BIC]',
    address: '[Placeholder: Bank Address]',
    country: '[Placeholder: Country]',
  },
  cryptoNetworks: [],
  limits: {
    minDepositEur: 100,
    maxDepositEur: 5_000_000,
    minWithdrawalEur: 250,
    minInvestmentEur: 1000,
    maxInvestmentPerInvestorEur: 500_000,
  },
  fees: {
    sepaDepositFeeEur: 0,
    cardDepositFeeEur: 0,
    withdrawalFeeEur: 0,
    investmentFeePercent: 0,
    treasuryFxFeePercent: 0,
  },
  settlement: {
    sepaDepositEta: '[Placeholder: Pending schedule]',
    cardDepositEta: '[Placeholder: Pending schedule]',
    withdrawalEta: '[Placeholder: Pending schedule]',
  },
};

export const PORTAL_PLACEHOLDER_TREASURY_RATES: {
  isPlaceholder: boolean;
  base: string;
  ratesToEur: Record<string, number>;
  feePercent: number;
} = {
  isPlaceholder: true,
  base: 'EUR',
  ratesToEur: {},
  feePercent: 0,
};
