export type PropertyDocumentType =
  | 'brochure'
  | 'investment-overview'
  | 'buyer-inquiry-offer'
  | 'reservation-request'
  | 'reservation-agreement'
  | 'payment-schedule'
  | 'buyer-checklist';

export interface DocumentHistoryEntry {
  id: string;
  version: string;
  timestamp: string;
  author: string;
  action: 'generated' | 'edited' | 'regenerated' | 'downloaded' | 'printed';
  notes?: string;
  changesSummary?: string;
}

export interface PaymentInstallment {
  installmentNumber: number;
  label: string;
  percentage: number;
  amount: number;
  dueDate: string;
  status: 'pending' | 'due' | 'paid';
  description: string;
}

export interface PaymentScheduleConfig {
  planType: 'full_upfront' | 'deposit_installments' | 'custom_schedule';
  purchasePrice: number;
  reservationFee: number;
  depositPercent: number;
  depositAmount: number;
  installments: PaymentInstallment[];
  agencyFeePercent: number;
  agencyFeeAmount: number;
  notarialAndTaxPercent: number;
  notarialAndTaxAmount: number;
  totalAdditionalFees: number;
  totalTransactionAmount: number;
  reconciled: boolean;
  variance: number;
}

export interface BuyerCustomization {
  buyerName?: string;
  buyerEmail?: string;
  buyerPhone?: string;
  buyerNationality?: string;
  buyerAddress?: string;
  buyerPassportNumber?: string;
  customOfferAmount?: number;
  financingMethod?: 'cash' | 'mortgage' | 'crypto_usdt' | 'spv_tokenized';
  specialConditions?: string;
  advisorName?: string;
  advisorEmail?: string;
  advisorPhone?: string;
}

export interface GeneratedDocumentRecord {
  id: string;
  propertyId: string;
  propertyRef: string;
  propertyTitle: string;
  documentType: PropertyDocumentType;
  version: string;
  createdAt: string;
  updatedAt: string;
  isOutdated: boolean;
  customization: BuyerCustomization;
  paymentSchedule: PaymentScheduleConfig;
  history: DocumentHistoryEntry[];
}

export interface DocumentValidationCheck {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  missingFields: string[];
  reconciliationStatus: {
    isBalanced: boolean;
    purchasePrice: number;
    sumOfPayments: number;
    difference: number;
  };
}
