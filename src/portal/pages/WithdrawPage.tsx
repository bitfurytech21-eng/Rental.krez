import React, { useState } from 'react';
import {
  Landmark,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  ArrowRight,
  Copy,
  Check,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { usePortal } from '../state/PortalContext';
import { portalApi } from '../services/portalApi';
import { PortalTransaction } from '../types';
import { formatEuro, maskIban } from '../utils/format';
import { validateWithdrawalAmount } from '../utils/validate';
import { Stepper } from '../components/Stepper';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSkeleton } from '../components/LoadingSkeleton';

const WITHDRAW_STEPS = ['Amount', 'Destination', 'Review', 'Confirmation'];

export const WithdrawPage: React.FC = () => {
  const toast = useToast();
  const {
    loading,
    balance,
    profile,
    portalConfig,
    sampleDataEnabled,
    navigatePortal,
    refreshAll,
  } = usePortal();

  const [step, setStep] = useState(0);
  const [amountInput, setAmountInput] = useState<string>(() =>
    String(portalConfig.limits.minWithdrawalEur)
  );
  const [amountError, setAmountError] = useState<string | null>(null);
  const [otpRequired, setOtpRequired] = useState(true);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [devGrantId, setDevGrantId] = useState<string | undefined>(undefined);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [requestingCode, setRequestingCode] = useState(false);
  const [createdTx, setCreatedTx] = useState<PortalTransaction | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);

  if (loading && !sampleDataEnabled) {
    return <LoadingSkeleton rows={3} />;
  }

  const isVerified = profile?.kycStatus === 'verified';
  const registeredIban = profile?.bankIban?.trim() || '';
  const hasBankAccount = Boolean(registeredIban);

  if (profile && (!isVerified || !hasBankAccount)) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="portal-card border-[#FCD34D]/45 space-y-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-[14px] bg-[#FCD34D]/12 border border-[#FCD34D]/35 text-[#FCD34D] flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#F2F5F4]">Withdrawals unavailable</h2>
              <p className="text-sm text-[#8FA1A8] mt-1.5 leading-relaxed">
                {!isVerified && !hasBankAccount
                  ? 'You must complete identity verification and link your personal SEPA bank account before requesting a withdrawal.'
                  : !isVerified
                  ? 'Your identity must be verified in the Compliance Vault before you can request a withdrawal.'
                  : 'Add your personal SEPA IBAN in Profile & Banking before requesting a withdrawal.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-1">
            {!isVerified && (
              <button
                type="button"
                onClick={() => navigatePortal('compliance')}
                className="portal-btn-primary"
              >
                <span>Verify identity</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
            {!hasBankAccount && (
              <button
                type="button"
                onClick={() => navigatePortal('profile')}
                className={!isVerified ? 'portal-btn-secondary' : 'portal-btn-primary'}
              >
                <span>Add bank account</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => navigatePortal('overview')}
              className="portal-btn-secondary"
            >
              Back to overview
            </button>
          </div>
        </div>
      </div>
    );
  }

  const minWithdrawalEur = portalConfig.limits.minWithdrawalEur;
  const feeAmount = portalConfig.fees.withdrawalFeeEur;
  const amountCheck = validateWithdrawalAmount(amountInput, balance, minWithdrawalEur);

  const handleAmountChange = (val: string) => {
    setAmountInput(val);
    const check = validateWithdrawalAmount(val, balance, minWithdrawalEur);
    setAmountError(val.trim() === '' ? 'Enter a withdrawal amount in EUR.' : check.valid ? null : check.error || null);
    if (submitError) setSubmitError(null);
  };

  const handleStep0Next = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!amountCheck.valid) {
      setAmountError(amountCheck.error || 'Enter a valid EUR withdrawal amount.');
      return;
    }
    setAmountError(null);
    setStep(1);
  };

  const requestSecurityCode = async (advanceToReview: boolean) => {
    setSubmitError(null);
    if (sampleDataEnabled) {
      setOtpRequired(false);
      setMaskedEmail(profile?.email || '');
      if (advanceToReview) setStep(2);
      toast.info('Sample withdrawal review ready (preview mode).');
      return;
    }

    setRequestingCode(true);
    try {
      const reqRes = await portalApi.requestActionVerification('investor.withdrawal.create');
      setOtpRequired(reqRes.otpRequired);
      setMaskedEmail(reqRes.maskedEmail || profile?.email || '');
      setDevGrantId(reqRes.grantId);
      if (advanceToReview) {
        setStep(2);
      }
      if (reqRes.otpRequired) {
        toast.info(`6-digit security code sent to ${reqRes.maskedEmail || 'your email'}.`);
      }
    } catch (err: any) {
      setSubmitError(err?.message || 'Unable to send security verification code.');
    } finally {
      setRequestingCode(false);
    }
  };

  const handleConfirmWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitError(null);

    if (!amountCheck.valid) {
      setAmountError(amountCheck.error || 'Invalid amount.');
      setStep(0);
      return;
    }

    if (sampleDataEnabled) {
      setCreatedTx({
        id: 'sample-wth-preview',
        type: 'withdrawal',
        amount: amountCheck.value,
        currency: 'EUR',
        status: 'pending',
        reference: 'SAMPLE-WTH-PREVIEW',
        createdAt: new Date().toISOString(),
        paymentMethod: 'SEPA bank transfer',
      });
      setStep(3);
      toast.info('Sample withdrawal receipt generated (preview mode).');
      return;
    }

    if (otpRequired && otpCode.trim().length !== 6) {
      setOtpError('Enter the 6-digit security code sent to your email.');
      return;
    }
    setOtpError(null);

    setSubmitting(true);
    try {
      let grantId = devGrantId;
      if (otpRequired) {
        grantId = await portalApi.verifyActionCode('investor.withdrawal.create', otpCode.trim());
      }

      const tx = await portalApi.submitWithdrawal({
        amount: amountCheck.value,
        destination: registeredIban,
        method: 'Bank Wire SEPA',
        accountHolderName: profile?.bankAccountHolder || profile?.fullName || '',
        grantId,
      });
      setCreatedTx(tx);
      setStep(3);
      toast.success('Withdrawal request submitted.');
      await refreshAll();
    } catch (err: any) {
      const msg = err?.message || 'Unable to submit withdrawal request.';
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const copyReference = async (val: string) => {
    try {
      await navigator.clipboard.writeText(val);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 1800);
      toast.info('Reference copied to clipboard.');
    } catch {
      toast.error('Unable to copy to clipboard.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Stepper steps={WITHDRAW_STEPS} currentStep={step} />

      {submitError && (
        <div role="alert" className="portal-card border-[#FB7185]/50 text-sm text-[#FB7185]">
          {submitError}
        </div>
      )}

      {/* Step 1: Amount */}
      {step === 0 && (
        <form onSubmit={handleStep0Next} noValidate className="portal-card space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-[#F2F5F4]">Withdrawal amount</h2>
            <p className="text-xs text-[#8FA1A8] mt-1 portal-tabular">
              Available balance ·{' '}
              <span className="text-[#F2F5F4] font-semibold">{formatEuro(balance)}</span> · Minimum{' '}
              {formatEuro(minWithdrawalEur)}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <label htmlFor="withdraw-amount" className="text-sm font-medium text-[#F2F5F4]">
                Amount (EUR)
              </label>
              <button
                type="button"
                onClick={() => {
                  const maxVal = Math.floor(balance * 100) / 100;
                  handleAmountChange(maxVal > 0 ? String(maxVal) : '0');
                }}
                className="min-h-[44px] px-3 rounded-[14px] border border-[#1F2C33] bg-[#0B0F10] text-xs font-semibold text-[#6FD8B0] hover:border-[#6FD8B0] transition-colors"
              >
                Max
              </button>
            </div>
            <input
              id="withdraw-amount"
              type="number"
              min={minWithdrawalEur}
              max={balance > 0 ? balance : undefined}
              step="0.01"
              value={amountInput}
              onChange={(e) => handleAmountChange(e.target.value)}
              aria-invalid={Boolean(amountError)}
              aria-describedby={amountError ? 'withdraw-amount-error' : undefined}
              className={`portal-input text-lg font-bold portal-tabular ${
                amountError ? '!border-[#FB7185]' : ''
              }`}
            />
            {amountError && (
              <p id="withdraw-amount-error" role="alert" className="mt-1.5 text-xs text-[#FB7185]">
                {amountError}
              </p>
            )}
          </div>

          <button type="submit" className="portal-btn-primary w-full">
            <span>Continue to destination</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* Step 2: Destination (user's own verified bank account only, IBAN masked) */}
      {step === 1 && (
        <div className="portal-card space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-[#F2F5F4]">Destination account</h2>
            <p className="text-xs text-[#8FA1A8] mt-1">
              For security, funds are transferred exclusively to your registered personal bank account.
            </p>
          </div>

          <div className="portal-surface-elevated p-4 border-[#6FD8B0]/45 flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-[14px] bg-[#121A1F] border border-[#1F2C33] text-[#6FD8B0] flex items-center justify-center shrink-0">
              <Landmark className="w-5 h-5" />
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-[#F2F5F4]">
                  {profile?.bankAccountHolder || profile?.fullName || 'Account Holder'}
                </span>
                <StatusBadge status="completed" label="Verified IBAN" />
              </div>
              <div className="text-xs font-mono text-[#F2F5F4]">{maskIban(registeredIban)}</div>
              <div className="text-xs text-[#8FA1A8]">SEPA bank transfer</div>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setStep(0)} className="portal-btn-secondary flex-1">
              Back
            </button>
            <button
              type="button"
              disabled={requestingCode}
              onClick={() => void requestSecurityCode(true)}
              className="portal-btn-primary flex-1"
            >
              <span>{requestingCode ? 'Sending code...' : 'Continue to review'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review + 6-digit email security code */}
      {step === 2 && (
        <form onSubmit={handleConfirmWithdrawal} noValidate className="portal-card space-y-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-[#172228] border border-[#6FD8B0]/40 text-[#6FD8B0] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#F2F5F4]">Review &amp; authorize withdrawal</h2>
              <p className="text-xs text-[#8FA1A8] mt-1">
                Verify payout summary and complete email security confirmation.
              </p>
            </div>
          </div>

          <div className="portal-surface-elevated p-4 space-y-2.5 text-xs">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[#8FA1A8]">Destination IBAN</span>
              <span className="font-mono text-[#F2F5F4]">{maskIban(registeredIban)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[#8FA1A8]">Withdrawal amount</span>
              <span className="text-[#F2F5F4] font-semibold portal-tabular">
                {formatEuro(amountCheck.value)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[#8FA1A8]">Transfer fee</span>
              <span className="text-[#F2F5F4] font-semibold portal-tabular">
                {formatEuro(feeAmount)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[#8FA1A8]">Estimated arrival</span>
              <span className="text-[#F2F5F4] font-medium">
                {portalConfig.settlement.withdrawalEta}
              </span>
            </div>
            <div className="pt-2 border-t border-[#1F2C33] flex items-center justify-between text-sm">
              <span className="font-semibold text-[#F2F5F4]">Net payout</span>
              <span className="font-bold text-[#6FD8B0] portal-tabular">
                {formatEuro(Math.max(0, amountCheck.value - feeAmount))}
              </span>
            </div>
          </div>

          {otpRequired ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="withdraw-otp" className="text-sm font-medium text-[#F2F5F4]">
                  6-digit email security code ({maskedEmail || profile?.email})
                </label>
                <button
                  type="button"
                  disabled={requestingCode}
                  onClick={() => void requestSecurityCode(false)}
                  className="min-h-[44px] px-2 text-xs font-semibold text-[#6FD8B0] hover:underline"
                >
                  {requestingCode ? 'Sending...' : 'Resend code'}
                </button>
              </div>
              <input
                id="withdraw-otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otpCode}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setOtpCode(val);
                  if (otpError && val.length === 6) setOtpError(null);
                }}
                aria-invalid={Boolean(otpError)}
                aria-describedby={otpError ? 'withdraw-otp-error' : undefined}
                placeholder="000000"
                className={`portal-input font-mono tracking-[0.3em] ${
                  otpError ? '!border-[#FB7185]' : ''
                }`}
              />
              {otpError && (
                <p id="withdraw-otp-error" role="alert" className="text-xs text-[#FB7185]">
                  {otpError}
                </p>
              )}
            </div>
          ) : (
            <div className="portal-surface-elevated p-3.5 text-xs text-[#6FD8B0] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Security verification ready. Click confirm to submit withdrawal.</span>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setStep(1)} className="portal-btn-secondary flex-1">
              Back
            </button>
            <button type="submit" disabled={submitting} className="portal-btn-primary flex-1">
              {submitting ? 'Submitting...' : 'Confirm withdrawal'}
            </button>
          </div>
        </form>
      )}

      {/* Step 4: Confirmation */}
      {step === 3 && (
        <div className="portal-card space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div className="w-12 h-12 rounded-[14px] bg-[#FCD34D]/12 border border-[#FCD34D]/35 text-[#FCD34D] flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <StatusBadge status="pending" label="Pending" />
          </div>

          <div>
            <h2 className="text-xl font-semibold text-[#F2F5F4]">Withdrawal request pending</h2>
            <p className="text-sm text-[#8FA1A8] mt-1 leading-relaxed">
              Your withdrawal of{' '}
              <span className="text-[#F2F5F4] font-semibold portal-tabular">
                {formatEuro(createdTx?.amount || amountCheck.value)}
              </span>{' '}
              to {maskIban(registeredIban)} is pending compliance settlement (
              {portalConfig.settlement.withdrawalEta}).
            </p>
          </div>

          {createdTx?.reference && (
            <div className="portal-surface-elevated p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs text-[#8FA1A8]">Withdrawal reference</div>
                <div className="mt-1 font-mono text-sm font-semibold text-[#6FD8B0] truncate">
                  {createdTx.reference}
                </div>
              </div>
              <button
                type="button"
                onClick={() => void copyReference(createdTx.reference)}
                aria-label="Copy withdrawal reference"
                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-[14px] border border-[#1F2C33] bg-[#121A1F] flex items-center justify-center text-[#6FD8B0] hover:border-[#6FD8B0] shrink-0 transition-colors"
              >
                {copiedRef ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
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
