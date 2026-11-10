import React, { useState } from 'react';
import { X, CheckCircle2, ShieldCheck, ArrowRight, ArrowLeft, Upload, FileCheck, Lock, User, Wallet, Award } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../context/ToastContext';
import { ledger } from '../../lib/ledger';

interface KycOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const KycOnboardingModal: React.FC<KycOnboardingModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    // Step 1: Account
    accountType: user?.accountType || 'individual_investor',
    fullName: user?.fullName || '',
    email: user?.email || '',
    phone: '+33 6 12 34 56 78',
    country: user?.country || 'France',
    taxId: 'FR-948201948',

    // Step 2: Identity
    idType: 'passport',
    idNumber: '19EA92014',
    issuingCountry: 'France',
    expiryDate: '2032-08-15',
    idFileUploaded: true,

    // Step 3: Accreditation
    investorStatus: 'accredited',
    annualIncome: '150k_300k',
    netWorth: '1m_plus',
    sourceOfFunds: 'investment_profits',

    // Step 4: Wallet
    walletAddress: user?.cryptoDepositAddress || '0x71C8135C0e41B3fA128912389128f9A19b28A0bf',
    network: 'Ethereum Mainnet',

    // Step 5: Review
    termsAccepted: false,
    privacyAccepted: false,
    riskDisclosuresAccepted: false,
  });

  if (!isOpen) return null;

  const totalSteps = 5;
  const stepTitles = [
    'Account Profile',
    'Identity Verification',
    'Accreditation Tier',
    'Wallet Custody',
    'Review & Sign',
  ];

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      if (user?.id) {
        ledger.updateKYCStatus(user.id, 'verified', formData.idType);
        ledger.updateUserAccountType(user.id, formData.accountType as any);
        ledger.updateUserProfile(user.id, {
          fullName: formData.fullName || user.fullName,
          country: formData.country,
          cryptoDepositAddress: formData.walletAddress,
        });
      }
      if (refreshUser) await refreshUser();
      toast.success('KYC Identity & Accreditation verified successfully!');
      if (onSuccess) onSuccess();
      onClose();
    } catch {
      toast.error('Failed to complete verification. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[560px] my-8 rounded-[12px] bg-white dark:bg-[#111A2C] border border-[#E2E8F0] dark:border-[#1E293B] shadow-2xl overflow-hidden text-[#0F172A] dark:text-[#E2E8F0] transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] dark:border-[#1E293B]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#0F4C81]/10 dark:bg-[#14B8A6]/10 text-[#0F4C81] dark:text-[#14B8A6] flex items-center justify-center">
              <ShieldCheck className="w-[18px] h-[18px]" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-[16px] font-semibold leading-tight">Institutional KYC Onboarding</h2>
              <p className="text-[12px] text-[#64748B] dark:text-[#94A3B8]">
                Step {currentStep} of {totalSteps}: {stepTitles[currentStep - 1]}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-[8px] text-[#64748B] dark:text-[#94A3B8] hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] transition-colors"
          >
            <X className="w-[18px] h-[18px]" strokeWidth={1.5} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[#E2E8F0] dark:bg-[#1E293B] h-1.5 overflow-hidden">
          <div
            className="h-full bg-[#0F4C81] dark:bg-[#14B8A6] transition-all duration-300 ease-out"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>

        {/* Body Form Card */}
        <div className="p-6">
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-[16px] font-semibold mb-1">Account & Investor Entity</h3>
                <p className="text-[12px] text-[#64748B] dark:text-[#94A3B8]">
                  Select the legal entity profile for your tokenized fractional investments.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                {[
                  { id: 'individual_investor', label: 'Individual Investor', desc: 'Personal portfolio' },
                  { id: 'accredited_investor', label: 'Accredited Investor', desc: 'HNW qualification' },
                  { id: 'corporate_entity', label: 'Corporate / LLC', desc: 'Company treasury' },
                  { id: 'family_office', label: 'Family Office', desc: 'Trust / SPV vehicle' },
                ].map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, accountType: type.id as any })}
                    className={`p-3 text-left rounded-[8px] border transition-colors ${
                      formData.accountType === type.id
                        ? 'border-[#0F4C81] dark:border-[#14B8A6] bg-[#0F4C81]/5 dark:bg-[#14B8A6]/10'
                        : 'border-[#E2E8F0] dark:border-[#1E293B] hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B]/40'
                    }`}
                  >
                    <div className="font-semibold text-[14px]">{type.label}</div>
                    <div className="text-[12px] text-[#64748B] dark:text-[#94A3B8]">{type.desc}</div>
                  </button>
                ))}
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-[12px] font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">
                    Legal Full Name
                  </label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-3 py-2 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E293B] bg-transparent text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0F4C81] dark:focus:ring-[#14B8A6]"
                    placeholder="e.g. Predrag Mirkovic"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">
                      Tax Residency Country
                    </label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="w-full px-3 py-2 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E293B] bg-transparent text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0F4C81] dark:focus:ring-[#14B8A6]"
                      placeholder="e.g. France, Spain, Monaco"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">
                      Tax Identification Number (TIN)
                    </label>
                    <input
                      type="text"
                      value={formData.taxId}
                      onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                      className="w-full px-3 py-2 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E293B] bg-transparent text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0F4C81] dark:focus:ring-[#14B8A6]"
                      placeholder="e.g. FR-894210"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-[16px] font-semibold mb-1">Government ID Verification</h3>
                <p className="text-[12px] text-[#64748B] dark:text-[#94A3B8]">
                  Upload an official photo ID required under European AML/CFT regulations.
                </p>
              </div>

              <div className="flex gap-2">
                {['passport', 'national_id', 'drivers_license'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFormData({ ...formData, idType: t })}
                    className={`flex-1 py-2 px-3 text-center text-[12px] font-medium rounded-[8px] border capitalize transition-colors ${
                      formData.idType === t
                        ? 'border-[#0F4C81] dark:border-[#14B8A6] bg-[#0F4C81]/10 dark:bg-[#14B8A6]/10 text-[#0F4C81] dark:text-[#14B8A6]'
                        : 'border-[#E2E8F0] dark:border-[#1E293B] hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B]/40'
                    }`}
                  >
                    {t.replace('_', ' ')}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">
                    Document Number
                  </label>
                  <input
                    type="text"
                    value={formData.idNumber}
                    onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E293B] bg-transparent text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0F4C81] dark:focus:ring-[#14B8A6]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">
                    Issuing Country
                  </label>
                  <input
                    type="text"
                    value={formData.issuingCountry}
                    onChange={(e) => setFormData({ ...formData, issuingCountry: e.target.value })}
                    className="w-full px-3 py-2 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E293B] bg-transparent text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0F4C81] dark:focus:ring-[#14B8A6]"
                  />
                </div>
              </div>

              {/* Upload Dropzone */}
              <div className="border-2 border-dashed border-[#E2E8F0] dark:border-[#1E293B] rounded-[8px] p-6 text-center hover:border-[#0F4C81] dark:hover:border-[#14B8A6] transition-colors cursor-pointer bg-[#F8FAFC]/50 dark:bg-[#0B1220]/50">
                <div className="w-10 h-10 rounded-full bg-[#14B8A6]/10 text-[#14B8A6] mx-auto flex items-center justify-center mb-2">
                  <Upload className="w-[18px] h-[18px]" strokeWidth={1.5} />
                </div>
                <div className="text-[14px] font-medium">government_id_scan.pdf</div>
                <div className="text-[12px] text-[#16A34A] flex items-center justify-center gap-1 mt-1 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> High-Resolution OCR Verified (2.4 MB)
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-[16px] font-semibold mb-1">Accreditation & Financial Scope</h3>
                <p className="text-[12px] text-[#64748B] dark:text-[#94A3B8]">
                  Confirm your investor category to access unrestricted fractional real estate offerings.
                </p>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">
                  Accreditation Classification
                </label>
                <select
                  value={formData.investorStatus}
                  onChange={(e) => setFormData({ ...formData, investorStatus: e.target.value })}
                  className="w-full px-3 py-2 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111A2C] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0F4C81] dark:focus:ring-[#14B8A6]"
                >
                  <option value="accredited">Accredited Investor (EU MiFID II / SEC Rule 501)</option>
                  <option value="qualified">Qualified Institutional Buyer (QIB)</option>
                  <option value="hnwi">High Net Worth Individual (&gt;€1,000,000 Liquid)</option>
                  <option value="retail">Retail Investor (Standard caps apply)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">
                    Annual Income Range
                  </label>
                  <select
                    value={formData.annualIncome}
                    onChange={(e) => setFormData({ ...formData, annualIncome: e.target.value })}
                    className="w-full px-3 py-2 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111A2C] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0F4C81] dark:focus:ring-[#14B8A6]"
                  >
                    <option value="50k_150k">€50,000 – €150,000</option>
                    <option value="150k_300k">€150,000 – €300,000</option>
                    <option value="300k_plus">€300,000+</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">
                    Estimated Net Worth
                  </label>
                  <select
                    value={formData.netWorth}
                    onChange={(e) => setFormData({ ...formData, netWorth: e.target.value })}
                    className="w-full px-3 py-2 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111A2C] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0F4C81] dark:focus:ring-[#14B8A6]"
                  >
                    <option value="250k_1m">€250,000 – €1,000,000</option>
                    <option value="1m_plus">€1,000,000 – €5,000,000</option>
                    <option value="5m_plus">€5,000,000+</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">
                  Primary Source of Invested Capital
                </label>
                <select
                  value={formData.sourceOfFunds}
                  onChange={(e) => setFormData({ ...formData, sourceOfFunds: e.target.value })}
                  className="w-full px-3 py-2 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111A2C] text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0F4C81] dark:focus:ring-[#14B8A6]"
                >
                  <option value="investment_profits">Real Estate & Capital Market Earnings</option>
                  <option value="business_dividends">Corporate Operating Dividends</option>
                  <option value="employment">Professional Executive Compensation</option>
                  <option value="inheritance">Estate Inheritance / Family Trust</option>
                </select>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-[16px] font-semibold mb-1">Custody & On-Chain Delivery</h3>
                <p className="text-[12px] text-[#64748B] dark:text-[#94A3B8]">
                  Link your self-custody wallet for holding ERC-3643 compliant security tokens.
                </p>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">
                  Designated Whitelist Wallet Address
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={formData.walletAddress}
                    onChange={(e) => setFormData({ ...formData, walletAddress: e.target.value })}
                    className="flex-1 px-3 py-2 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E293B] bg-transparent text-[14px] font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-[#0F4C81] dark:focus:ring-[#14B8A6]"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-[8px] bg-[#F8FAFC] dark:bg-[#0B1220] border border-[#E2E8F0] dark:border-[#1E293B] space-y-2">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-[#64748B] dark:text-[#94A3B8]">Network Standard</span>
                  <span className="font-semibold text-[#0F172A] dark:text-[#E2E8F0]">ERC-3643 Permissioned Token</span>
                </div>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-[#64748B] dark:text-[#94A3B8]">Yield Payout Destination</span>
                  <span className="font-semibold text-[#14B8A6]">USDC or Direct SEPA Bank IBAN</span>
                </div>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-[#64748B] dark:text-[#94A3B8]">Identity Claim Issuer</span>
                  <span className="font-semibold text-[#16A34A]">ONCHAINID Verifier #8492</span>
                </div>
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-[16px] font-semibold mb-1">Review & Sign Acknowledgement</h3>
                <p className="text-[12px] text-[#64748B] dark:text-[#94A3B8]">
                  Please review your submission and agree to the institutional investor disclaimers.
                </p>
              </div>

              <div className="p-4 rounded-[8px] bg-[#F8FAFC] dark:bg-[#0B1220] border border-[#E2E8F0] dark:border-[#1E293B] space-y-2 text-[12px]">
                <div className="flex justify-between">
                  <span className="text-[#64748B] dark:text-[#94A3B8]">Investor:</span>
                  <span className="font-medium text-[#0F172A] dark:text-[#E2E8F0]">{formData.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B] dark:text-[#94A3B8]">Tier:</span>
                  <span className="font-medium capitalize text-[#0F172A] dark:text-[#E2E8F0]">
                    {formData.investorStatus.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B] dark:text-[#94A3B8]">Tax Residency:</span>
                  <span className="font-medium text-[#0F172A] dark:text-[#E2E8F0]">{formData.country}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B] dark:text-[#94A3B8]">Linked Wallet:</span>
                  <span className="font-mono text-[#0F172A] dark:text-[#E2E8F0] tabular-nums">
                    {formData.walletAddress.slice(0, 8)}...{formData.walletAddress.slice(-6)}
                  </span>
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                <label className="flex items-start gap-2.5 cursor-pointer text-[12px]">
                  <input
                    type="checkbox"
                    checked={formData.termsAccepted}
                    onChange={(e) => setFormData({ ...formData, termsAccepted: e.target.checked })}
                    className="mt-0.5 rounded border-[#E2E8F0] dark:border-[#1E293B] text-[#0F4C81] focus:ring-[#0F4C81]"
                  />
                  <span className="text-[#64748B] dark:text-[#94A3B8]">
                    I confirm that the personal and financial information provided is true, accurate, and complete.
                  </span>
                </label>
                <label className="flex items-start gap-2.5 cursor-pointer text-[12px]">
                  <input
                    type="checkbox"
                    checked={formData.riskDisclosuresAccepted}
                    onChange={(e) => setFormData({ ...formData, riskDisclosuresAccepted: e.target.checked })}
                    className="mt-0.5 rounded border-[#E2E8F0] dark:border-[#1E293B] text-[#0F4C81] focus:ring-[#0F4C81]"
                  />
                  <span className="text-[#64748B] dark:text-[#94A3B8]">
                    I acknowledge fractional real estate securities risks, secondary market liquidity limitations, and platform Terms of Service.
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#F8FAFC] dark:bg-[#0B1220] border-t border-[#E2E8F0] dark:border-[#1E293B]">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E293B] text-[14px] font-medium text-[#0F172A] dark:text-[#E2E8F0] hover:bg-white dark:hover:bg-[#111A2C] transition-colors"
            >
              <ArrowLeft className="w-[18px] h-[18px]" strokeWidth={1.5} /> Back
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            disabled={submitting || (currentStep === 5 && (!formData.termsAccepted || !formData.riskDisclosuresAccepted))}
            onClick={handleNext}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[8px] bg-[#0F4C81] hover:bg-[#0F4C81]/90 text-white text-[14px] font-semibold transition-all shadow-[0_1px_3px_rgba(0,0,0,0.06)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {currentStep === totalSteps ? (
              submitting ? 'Verifying...' : 'Submit & Complete KYC'
            ) : (
              <>
                Continue <ArrowRight className="w-[18px] h-[18px]" strokeWidth={1.5} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
