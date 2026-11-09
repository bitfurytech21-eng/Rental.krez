import { Property } from '../types/property';
import {
  PropertyDocumentType,
  PaymentScheduleConfig,
  PaymentInstallment,
  BuyerCustomization,
  GeneratedDocumentRecord,
  DocumentValidationCheck,
  DocumentHistoryEntry
} from '../types/document';

const STORAGE_KEY = 'rental_log_generated_property_documents';

export const DOCUMENT_TITLES: Record<PropertyDocumentType, { title: string; subtitle: string; category: string }> = {
  'brochure': {
    title: 'Property Information Brochure',
    subtitle: 'Comprehensive Prestige Architectural & Lifestyle Presentation',
    category: 'Presentation'
  },
  'investment-overview': {
    title: 'Property Investment Overview',
    subtitle: 'Institutional Financial Underwriting & Pro-Forma Returns',
    category: 'Financial'
  },
  'buyer-inquiry-offer': {
    title: 'Buyer Inquiry and Offer Summary',
    subtitle: 'Formal Acquisition Proposal & Client Requirements',
    category: 'Commercial'
  },
  'reservation-request': {
    title: 'Reservation Request Form',
    subtitle: 'Exclusive Asset Hold & Initial Due Diligence Request',
    category: 'Legal / Transaction'
  },
  'reservation-agreement': {
    title: 'Reservation Agreement Draft',
    subtitle: 'Confidential Preliminary Agreement (Subject to Legal Review)',
    category: 'Draft Legal'
  },
  'payment-schedule': {
    title: 'Payment Schedule and Installment Summary',
    subtitle: 'Structured Capital Calls, Fees & Escrow Milestones',
    category: 'Financial / Escrow'
  },
  'buyer-checklist': {
    title: 'Required Buyer Documents Checklist',
    subtitle: 'AML / KYC Compliance & Notarial Closing Prerequisites',
    category: 'Compliance'
  }
};

export class PropertyDocumentEngine {
  /**
   * Generates default or customized payment schedule for a property
   */
  public static calculatePaymentSchedule(
    property: Property,
    planType: 'full_upfront' | 'deposit_installments' | 'custom_schedule' = 'deposit_installments',
    customDepositPercent: number = 20,
    customOfferAmount?: number
  ): PaymentScheduleConfig {
    const price = customOfferAmount && customOfferAmount > 0 ? customOfferAmount : property.targetAmount;
    const reservationFee = Math.min(25000, Math.max(5000, Math.round(price * 0.01))); // 1% or max 25k
    const agencyFeePercent = 5.0; // standard European luxury buyer representation
    const agencyFeeAmount = Math.round((price * agencyFeePercent) / 100);
    const notarialAndTaxPercent = 7.5; // French droit d'enregistrement & notarial statutory fees
    const notarialAndTaxAmount = Math.round((price * notarialAndTaxPercent) / 100);
    const totalAdditionalFees = agencyFeeAmount + notarialAndTaxAmount;
    const totalTransactionAmount = price + totalAdditionalFees;

    const installments: PaymentInstallment[] = [];

    if (planType === 'full_upfront') {
      installments.push({
        installmentNumber: 1,
        label: 'Full Balance at Notarial Deed Signing',
        percentage: 100,
        amount: price,
        dueDate: 'Upon Notarial Signature (30 Days from compromis)',
        status: 'due',
        description: 'Complete 100% settlement of purchase price into notary escrow account.'
      });
    } else if (planType === 'deposit_installments') {
      const depositPct = Math.max(10, Math.min(50, customDepositPercent));
      const depositAmt = Math.round((price * depositPct) / 100);
      const remainingPct = 100 - depositPct;
      const remainingAmt = price - depositAmt;

      installments.push({
        installmentNumber: 1,
        label: `Initial Earnest Deposit (${depositPct}%)`,
        percentage: depositPct,
        amount: depositAmt,
        dueDate: 'Within 7 business days of Bilateral Reservation signing',
        status: 'due',
        description: 'Held in regulated Caisse des Dépôts / Notary escrow until condition satisfaction.'
      });

      // Split remainder into 2 installments (Interim Milestone + Final Deed Signing)
      const interimPct = Math.round(remainingPct / 2);
      const interimAmt = Math.round((price * interimPct) / 100);
      const finalPct = remainingPct - interimPct;
      const finalAmt = remainingAmt - interimAmt;

      installments.push({
        installmentNumber: 2,
        label: `Interim Milestone Capital Call (${interimPct}%)`,
        percentage: interimPct,
        amount: interimAmt,
        dueDate: '60 days following preliminary title audit clearance',
        status: 'pending',
        description: 'Secondary capital disbursement into secure institutional escrow.'
      });

      installments.push({
        installmentNumber: 3,
        label: `Final Deed Signing Balance (${finalPct}%)`,
        percentage: finalPct,
        amount: finalAmt,
        dueDate: 'At final acte authentique signature before French Notaire',
        status: 'pending',
        description: 'Final execution and transfer of freehold legal title deed.'
      });
    } else {
      // Custom schedule (4 milestones)
      const p1 = 15;
      const p2 = 35;
      const p3 = 30;
      const p4 = 20;

      const a1 = Math.round(price * 0.15);
      const a2 = Math.round(price * 0.35);
      const a3 = Math.round(price * 0.30);
      const a4 = price - (a1 + a2 + a3);

      installments.push(
        { installmentNumber: 1, label: 'Reservation & Title Audit Deposit (15%)', percentage: p1, amount: a1, dueDate: 'Day 10', status: 'due', description: 'Immediate title lock' },
        { installmentNumber: 2, label: 'Financing Clearance Milestone (35%)', percentage: p2, amount: a2, dueDate: 'Day 45', status: 'pending', description: 'Loan or SPV equity confirmation' },
        { installmentNumber: 3, label: 'Pre-Closing Audit Verification (30%)', percentage: p3, amount: a3, dueDate: 'Day 75', status: 'pending', description: 'Technical & cadastral sign-off' },
        { installmentNumber: 4, label: 'Final Notary Completion (20%)', percentage: p4, amount: a4, dueDate: 'Day 90', status: 'pending', description: 'Delivery of authentic deed and keys' }
      );
    }

    // Verify reconciliation
    const sumInstallments = installments.reduce((acc, i) => acc + i.amount, 0);
    const variance = price - sumInstallments;
    const reconciled = Math.abs(variance) <= 1; // within rounding euro

    return {
      planType,
      purchasePrice: price,
      reservationFee,
      depositPercent: customDepositPercent,
      depositAmount: Math.round((price * customDepositPercent) / 100),
      installments,
      agencyFeePercent,
      agencyFeeAmount,
      notarialAndTaxPercent,
      notarialAndTaxAmount,
      totalAdditionalFees,
      totalTransactionAmount,
      reconciled,
      variance
    };
  }

  /**
   * Run validation quality checks on property data before document publication
   */
  public static validatePropertyDocument(
    property: Property,
    customization?: BuyerCustomization,
    paymentSchedule?: PaymentScheduleConfig
  ): DocumentValidationCheck {
    const errors: string[] = [];
    const warnings: string[] = [];
    const missingFields: string[] = [];

    // 1. Mandatory property checks
    if (!property.id || !property.title) {
      errors.push('Missing unique property identifier or property title.');
    }
    if (!property.targetAmount || property.targetAmount <= 0) {
      errors.push('Invalid purchase price: Asking price must be greater than €0.');
    }
    if (!property.location && !property.city) {
      errors.push('Missing geographical location or metropolitan city.');
    }
    if (!property.images || property.images.length === 0) {
      errors.push('Property has no visual assets or gallery photographs.');
    }

    // 2. Missing field detection (rule: clearly marked as requiring completion)
    if (!property.ref) {
      missingFields.push('Official Cadastral / Agency Mandate Reference');
      warnings.push('Property reference number is not formally registered; using token ticker fallback.');
    }
    if (!property.surfaceAreaM2) {
      missingFields.push('Built Surface Area (m²)');
      warnings.push('Surface area not specified in original registry records.');
    }
    if (property.bedrooms === undefined || property.bedrooms === null) {
      missingFields.push('Bedrooms Count');
      warnings.push('Bedroom count requires confirmation from architectural floorplans.');
    }
    if (!property.agent || !property.agent.name) {
      missingFields.push('Authorized Listing Broker / Agency Representative');
      warnings.push('Assigned real estate broker details require assignment.');
    }
    if (!property.description || property.description.length < 20) {
      warnings.push('Property description is brief; full architectural narrative recommended.');
    }

    // 3. Payment reconciliation check
    const plan = paymentSchedule || this.calculatePaymentSchedule(property);
    const sumOfPayments = plan.installments.reduce((sum, i) => sum + i.amount, 0);
    const difference = plan.purchasePrice - sumOfPayments;
    const isBalanced = Math.abs(difference) <= 2;

    if (!isBalanced) {
      errors.push(`Payment reconciliation mismatch: Installments total (€${sumOfPayments.toLocaleString()}) does not equal purchase price (€${plan.purchasePrice.toLocaleString()}). Difference: €${difference}.`);
    }

    // 4. Customization checks
    if (customization?.customOfferAmount && customization.customOfferAmount < property.targetAmount * 0.5) {
      warnings.push('Custom offer is over 50% below current asking price; requires authorized broker review.');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      missingFields,
      reconciliationStatus: {
        isBalanced,
        purchasePrice: plan.purchasePrice,
        sumOfPayments,
        difference
      }
    };
  }

  /**
   * Retrieves all saved generated document records from storage
   */
  public static getAllDocuments(): GeneratedDocumentRecord[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  /**
   * Retrieves documents for a specific property
   */
  public static getDocumentsForProperty(propertyId: string): GeneratedDocumentRecord[] {
    const all = this.getAllDocuments();
    return all.filter((d) => d.propertyId === propertyId);
  }

  /**
   * Retrieves or initializes a document record for a property and document type
   */
  public static getOrCreateDocument(
    property: Property,
    documentType: PropertyDocumentType,
    customization?: BuyerCustomization
  ): GeneratedDocumentRecord {
    const all = this.getAllDocuments();
    const existingIndex = all.findIndex(
      (d) => d.propertyId === property.id && d.documentType === documentType
    );

    const now = new Date().toISOString();
    const propertyRef = property.ref || property.tokenTicker || `REF-${property.id.slice(-6).toUpperCase()}`;

    if (existingIndex !== -1) {
      const existing = all[existingIndex];
      // Check if outdated (e.g. if property updated or title changed)
      const isOutdated = existing.propertyTitle !== property.title || existing.propertyRef !== propertyRef;
      if (isOutdated && !existing.isOutdated) {
        existing.isOutdated = true;
        all[existingIndex] = existing;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      }
      return existing;
    }

    // Create new document record
    const paymentSchedule = this.calculatePaymentSchedule(
      property,
      'deposit_installments',
      20,
      customization?.customOfferAmount
    );

    const initialHistory: DocumentHistoryEntry = {
      id: `hist-${Date.now()}-1`,
      version: 'v1.0',
      timestamp: now,
      author: customization?.advisorName || property.agent?.name || 'Kretz Executive Desk',
      action: 'generated',
      notes: `Initial ${DOCUMENT_TITLES[documentType].title} generated from authentic listing data.`
    };

    const newDoc: GeneratedDocumentRecord = {
      id: `doc-${property.id}-${documentType}`,
      propertyId: property.id,
      propertyRef,
      propertyTitle: property.title,
      documentType,
      version: 'v1.0',
      createdAt: now,
      updatedAt: now,
      isOutdated: false,
      customization: customization || {
        advisorName: property.agent?.name || 'Kretz Real Estate Advisory',
        advisorEmail: property.agent?.email || 'prestige@kretz.site',
        advisorPhone: property.agent?.phone || '+33 7 53 07 75 72',
        financingMethod: 'cash'
      },
      paymentSchedule,
      history: [initialHistory]
    };

    all.push(newDoc);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return newDoc;
  }

  /**
   * Updates an existing document (e.g. customized buyer details, updated payment plan, regenerate)
   */
  public static updateDocument(
    property: Property,
    documentType: PropertyDocumentType,
    updates: {
      customization?: BuyerCustomization;
      paymentSchedule?: PaymentScheduleConfig;
      actionType?: 'edited' | 'regenerated';
      notes?: string;
    }
  ): GeneratedDocumentRecord {
    const all = this.getAllDocuments();
    const existingIndex = all.findIndex(
      (d) => d.propertyId === property.id && d.documentType === documentType
    );

    const now = new Date().toISOString();
    let currentDoc = existingIndex !== -1 ? all[existingIndex] : this.getOrCreateDocument(property, documentType);

    // Bump version if regenerating
    let newVersion = currentDoc.version;
    if (updates.actionType === 'regenerated') {
      const parts = currentDoc.version.replace('v', '').split('.');
      const major = parseInt(parts[0] || '1', 10);
      const minor = parseInt(parts[1] || '0', 10) + 1;
      newVersion = `v${major}.${minor}`;
    }

    const historyEntry: DocumentHistoryEntry = {
      id: `hist-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      version: newVersion,
      timestamp: now,
      author: updates.customization?.advisorName || currentDoc.customization?.advisorName || 'System',
      action: updates.actionType || 'edited',
      notes: updates.notes || `Document ${updates.actionType === 'regenerated' ? 'regenerated with fresh listing data' : 'parameters updated'}.`
    };

    const propertyRef = property.ref || property.tokenTicker || `REF-${property.id.slice(-6).toUpperCase()}`;

    currentDoc = {
      ...currentDoc,
      propertyRef,
      propertyTitle: property.title,
      version: newVersion,
      updatedAt: now,
      isOutdated: false,
      customization: updates.customization || currentDoc.customization,
      paymentSchedule: updates.paymentSchedule || currentDoc.paymentSchedule,
      history: [historyEntry, ...(currentDoc.history || [])]
    };

    if (existingIndex !== -1) {
      all[existingIndex] = currentDoc;
    } else {
      all.push(currentDoc);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return currentDoc;
  }

  /**
   * Marks all documents for a property as outdated when listing changes
   */
  public static flagPropertyDocumentsAsOutdated(propertyId: string): void {
    const all = this.getAllDocuments();
    let modified = false;
    all.forEach((doc) => {
      if (doc.propertyId === propertyId && !doc.isOutdated) {
        doc.isOutdated = true;
        modified = true;
      }
    });
    if (modified) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    }
  }

  /**
   * Formats missing or empty values with standard indicator [Requires Completion]
   */
  public static formatField(value: any, fallbackLabel = 'Requires Completion'): string {
    if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
      return `[${fallbackLabel}]`;
    }
    return String(value);
  }
}
