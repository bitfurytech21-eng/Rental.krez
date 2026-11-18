import { safeErrorMessage } from '../../lib/safeErrorMessage';
import React, { useState } from 'react';
import {
  Building2,
  CreditCard,
  Copy,
  Check,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { usePortal } from '../state/PortalContext';
import { portalApi } from '../services/portalApi';
import { PortalTransaction } from '../types';
import { formatEuro } from '../utils/format';
import { validateDepositAmount } from '../utils/validate';
import { Stepper } from '../components/Stepper';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSkeleton } from '../components/LoadingSkeleton';

const DEPOSIT_STEPS = ['Amount', 'Method', 'Review', 'Confirmation'];
const QUICK_AMOUNTS = [100, 500, 1000, 5000];

export const DepositPage: React.FC = () => {
  const toast = useToast();
  const { loading, profile, portalConfig, sampleDataEnabled, navigatePortal, refreshAll } = usePortal();

  const [step, setStep] = useState(0);
  const [method, setMethod] = useState<'SEPA bank transfer' | 'Card'>('SEPA bank transfer');
  const [amountInput, setAmountInput] = useState('1000');
  const [amountError, setAmountError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [createdTx, setCreatedTx] = useState<PortalTransaction | null>(null);

  if (loading && !sampleDataEnabled) {
    return <LoadingSkeleton rows={3} />;
  }

  // Deposits require an authenticated investor account, not completed KYC.

  const copyValue = async (label: string, val: string) => {
    if (!val) return;
    try {
      await navigator.clipboard.writeText(val);
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 1800);
      toast.info(`${label} copied to clipboard.`);
    } catch {
      toast.error('Unable to copy to clipboard.');
    }
  };

  const limits = portalConfig.limits;
  const amountCheck = validateDepositAmount(amountInput, limits);
  const feeAmount =
    method === 'SEPA bank transfer'
      ? portalConfig.fees.sepaDepositFeeEur
      : portalConfig.fees.cardDepositFeeEur;
  const totalAmount = amountCheck.valid ? amountCheck.value + feeAmount : 0;

  const handleAmountChange = (val: string) => {
    setAmountInput(val);
    const check = validateDepositAmount(val, limits);
    setAmountError(val.trim() === '' ? 'Enter a deposit amount in EUR.' : check.valid ? null : check.error || null);
    if (submitError) setSubmitError(null);
  };

  const handleNextFromAmount = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!amountCheck.valid) {
      setAmountError(
        amountCheck.error ||
          `Enter an amount between ${formatEuro(limits.minDepositEur)} and ${formatEuro(limits.maxDepositEur)}.`
      );
      return;
    }
    setAmountError(null);
    setStep(1);
  };

  const handleConfirmAndSubmit = async () => {
    if (submitting) return;
    setSubmitError(null);
    if (!amountCheck.valid) {
      setAmountError(amountCheck.error || 'Enter a valid EUR amount.');
      setStep(0);
      return;
    }

    if (sampleDataEnabled) {
      setCreatedTx({
        id: 'sample-dep-preview',
        type: 'deposit',
        amount: amountCheck.value,
        currency: 'EUR',
        status: 'pending',
        reference: 'SAMPLE-DEP-PREVIEW',
        createdAt: new Date().toISOString(),
        paymentMethod: method,
      });
      setStep(3);
      toast.info('Sample deposit instructions generated (preview mode).');
      return;
    }

    setSubmitting(true);
    try {
      const tx = await portalApi.submitDeposit({
        amount: amountCheck.value,
        currency: 'EUR',
        method,
      });
      setCreatedTx(tx);
      setStep(3);
      toast.success('Deposit instructions issued.');
      await refreshAll();
    } catch (err: any) {
      const msg = safeErrorMessage(err, 'Unable to record deposit request.');
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const bankDetails = [
    { label: 'Beneficiary', value: portalConfig.traditional.beneficiary },
    { label: 'Bank', value: portalConfig.traditional.bankName },
    { label: 'IBAN', value: portalConfig.traditional.iban },
    { label: 'BIC / SWIFT', value: portalConfig.traditional.bic },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Stepper steps={DEPOSIT_STEPS} currentStep={step} />

      {submitError && (
        <div role="alert" className="portal-card border-[#FB7185]/50 text-sm text-[#FB7185]">
          {submitError}
        </div>
      )}

      {/* Step 1: Amount */}
      {step === 0 && (
        <form onSubmit={handleNextFromAmount} noValidate className="portal-card space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-[#F2F5F4]">Deposit amount</h2>
            <p className="text-xs text-[#8FA1A8] mt-1 portal-tabular">
              Minimum {formatEuro(limits.minDepositEur)} · Maximum {formatEuro(limits.maxDepositEur)}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {QUICK_AMOUNTS.map((preset) => {
              const isSelected = Number(amountInput) === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleAmountChange(String(preset))}
                  className={`min-h-[44px] px-3 rounded-[14px] border text-xs font-semibold portal-tabular transition-colors ${
                    isSelected
                      ? 'bg-[#6FD8B0] border-[#6FD8B0] text-[#07231A]'
                      : 'bg-[#0B0F10] border-[#1F2C33] text-[#F2F5F4] hover:border-[#6FD8B0]'
                  }`}
                >
                  {formatEuro(preset)}
                </button>
              );
            })}
          </div>

          <div>
            <label htmlFor="deposit-amount" className="block text-sm font-medium text-[#F2F5F4] mb-2">
              Amount (EUR)
            </label>
            <input
              id="deposit-amount"
              type="number"
              min={limits.minDepositEur}
              max={limits.maxDepositEur}
              step="0.01"
              value={amountInput}
              onChange={(e) => handleAmountChange(e.target.value)}
              aria-invalid={Boolean(amountError)}
              aria-describedby={amountError ? 'deposit-amount-error' : undefined}
              className={`portal-input text-lg font-bold portal-tabular ${
                amountError ? '!border-[#FB7185]' : ''
              }`}
            />
            {amountError && (
              <p id="deposit-amount-error" role="alert" className="mt-1.5 text-xs text-[#FB7185]">
                {amountError}
              </p>
            )}
          </div>

          <button type="submit" className="portal-btn-primary w-full">
            <span>Continue to method</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* Step 2: Method */}
      {step === 1 && (
        <div className="portal-card space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-[#F2F5F4]">Payment method</h2>
            <p className="text-xs text-[#8FA1A8] mt-1 portal-tabular">
              Deposit amount · {formatEuro(amountCheck.value)}
            </p>
          </div>

          <div className="space-y-3">
            {[
              {
                id: 'SEPA bank transfer' as const,
                title: 'SEPA bank transfer',
                detail: `Wire from your European bank account · ${portalConfig.settlement.sepaDepositEta} · ${formatEuro(
                  portalConfig.fees.sepaDepositFeeEur
                )} fee`,
                icon: Building2,
              },
              {
                id: 'Card' as const,
                title: 'Card',
                detail: `Debit or credit card funding · ${portalConfig.settlement.cardDepositEta} · ${formatEuro(
                  portalConfig.fees.cardDepositFeeEur
                )} fee`,
                icon: CreditCard,
              },
            ].map((item) => {
              const Icon = item.icon;
              const selected = method === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMethod(item.id)}
                  className={`w-full min-h-[64px] p-4 rounded-[14px] border text-left flex items-start gap-3.5 transition-colors ${
                    selected
                      ? 'bg-[#172228] border-[#6FD8B0]'
                      : 'bg-[#0B0F10] border-[#1F2C33] hover:border-[#6FD8B0]/55'
                  }`}
                >
                  <div className="w-10 h-10 rounded-[14px] bg-[#121A1F] border border-[#1F2C33] text-[#6FD8B0] flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[#F2F5F4]">{item.title}</div>
                    <div className="text-xs text-[#8FA1A8] mt-0.5 portal-tabular">{item.detail}</div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setStep(0)} className="portal-btn-secondary flex-1">
              Back
            </button>
            <button type="button" onClick={() => setStep(2)} className="portal-btn-primary flex-1">
              <span>Review deposit</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 2 && (
        <div className="portal-card space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-[#F2F5F4]">Review deposit</h2>
            <p className="text-xs text-[#8FA1A8] mt-1">
              Confirm the deposit summary below to generate your payment reference.
            </p>
          </div>

          <div className="portal-surface-elevated p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[#8FA1A8]">Method</span>
              <span className="text-[#F2F5F4] font-semibold">{method}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[#8FA1A8]">Deposit amount</span>
              <span className="text-[#F2F5F4] font-semibold portal-tabular">
                {formatEuro(amountCheck.value)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[#8FA1A8]">Platform fee</span>
              <span className="text-[#F2F5F4] font-semibold portal-tabular">
                {formatEuro(feeAmount)}
              </span>
            </div>
            <div className="pt-2.5 border-t border-[#1F2C33] flex items-center justify-between text-sm">
              <span className="font-semibold text-[#F2F5F4]">Total</span>
              <span className="font-bold text-[#6FD8B0] portal-tabular">
                {formatEuro(totalAmount)}
              </span>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setStep(1)} className="portal-btn-secondary flex-1">
              Back
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => void handleConfirmAndSubmit()}
              className="portal-btn-primary flex-1"
            >
              {submitting ? 'Confirming...' : 'Confirm deposit'}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Confirmation */}
      {step === 3 && (
        <div className="portal-card space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div className="w-12 h-12 rounded-[14px] bg-[#6FD8B0]/12 border border-[#6FD8B0]/35 text-[#6FD8B0] flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <StatusBadge status={createdTx?.status || 'pending'} label="Pending" />
          </div>

          <div>
            <h2 className="text-xl font-semibold text-[#F2F5F4]">Transfer instructions ready</h2>
            <p className="text-sm text-[#8FA1A8] mt-1 leading-relaxed">
              Send{' '}
              <span className="text-[#F2F5F4] font-semibold portal-tabular">
                {formatEuro(createdTx?.amount || amountCheck.value)}
              </span>{' '}
              via {method} and include the required payment reference below so escrow reconciles your deposit.
            </p>
          </div>

          {createdTx?.reference && (
            <div className="portal-surface-elevated p-4 border-[#6FD8B0]/45 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-medium text-[#6FD8B0]">Required payment reference</div>
                <div className="mt-1 font-mono text-sm font-bold text-[#F2F5F4] truncate">
                  {createdTx.reference}
                </div>
              </div>
              <button
                type="button"
                onClick={() => void copyValue('Payment reference', createdTx.reference)}
                aria-label="Copy payment reference"
                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-[14px] border border-[#1F2C33] bg-[#121A1F] flex items-center justify-center text-[#6FD8B0] hover:border-[#6FD8B0] shrink-0 transition-colors"
              >
                {copiedField === 'Payment reference' ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          )}

          <div className="portal-surface-elevated p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#F2F5F4]">Escrow bank details</span>
              {portalConfig.isPlaceholder && (
                <span className="text-xs text-[#FCD34D]">Placeholder values</span>
              )}
            </div>
            {bankDetails.map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-3">
                <span className="text-[#8FA1A8] shrink-0">{row.label}</span>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-[#F2F5F4] truncate">{row.value}</span>
                  <button
                    type="button"
                    onClick={() => void copyValue(row.label, row.value)}
                    aria-label={`Copy ${row.label}`}
                    className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-[14px] border border-[#1F2C33] bg-[#121A1F] flex items-center justify-center text-[#6FD8B0] hover:border-[#6FD8B0] shrink-0 transition-colors"
                  >
                    {copiedField === row.label ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 pt-1">
            <button
              type="button"
              onClick={() => navigatePortal('ledger')}
              className="portal-btn-primary flex-1"
            >
              View in ledger
            </button>
            <button
              type="button"
              onClick={() => navigatePortal('overview')}
              className="portal-btn-secondary flex-1"
            >
              Back to overview
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
