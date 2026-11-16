import React, { useEffect, useState } from 'react';
import { Building2, Coins, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { usePortal } from '../state/PortalContext';
import { portalApi } from '../services/portalApi';
import { PortalTransaction } from '../types';
import { formatEuro, maskIban } from '../utils/format';
import { validateCryptoAddress, validateIban, validateWithdrawalAmount } from '../utils/validate';
import { Stepper } from '../components/Stepper';

const WITHDRAW_STEPS = ['Destination', 'Amount', 'Verification', 'Receipt'];

export const WithdrawPage: React.FC = () => {
  const toast = useToast();
  const { balance, profile, navigatePortal, refreshAll } = usePortal();

  const [step, setStep] = useState(0);
  const [rail, setRail] = useState<'Bank Wire SEPA' | 'Crypto Wallet'>('Bank Wire SEPA');
  const [destination, setDestination] = useState<string>('');
  const [amountInput, setAmountInput] = useState<string>('500');
  const [otpRequired, setOtpRequired] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [devGrantId, setDevGrantId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdTx, setCreatedTx] = useState<PortalTransaction | null>(null);

  useEffect(() => {
    if (rail === 'Bank Wire SEPA' && profile?.bankIban && !destination) {
      setDestination(profile.bankIban);
    } else if (rail === 'Crypto Wallet' && profile?.cryptoDepositAddress && !destination) {
      setDestination(profile.cryptoDepositAddress);
    }
  }, [profile, rail, destination]);

  const handleRailChange = (nextRail: 'Bank Wire SEPA' | 'Crypto Wallet') => {
    setRail(nextRail);
    setError(null);
    if (nextRail === 'Bank Wire SEPA') {
      setDestination(profile?.bankIban || '');
    } else {
      setDestination(profile?.cryptoDepositAddress || '');
    }
  };

  const handleStep0Next = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (rail === 'Bank Wire SEPA') {
      const check = validateIban(destination);
      if (!check.valid) {
        setError(check.error || 'Enter a valid SEPA IBAN.');
        return;
      }
      setDestination(check.clean);
    } else {
      const check = validateCryptoAddress(destination);
      if (!check.valid) {
        setError(check.error || 'Enter a valid crypto wallet address.');
        return;
      }
      setDestination(check.clean);
    }
    setStep(1);
  };

  const amountCheck = validateWithdrawalAmount(amountInput, balance);

  const handleStep1Next = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!amountCheck.valid) {
      setError(amountCheck.error || 'Invalid withdrawal amount.');
      return;
    }

    setSubmitting(true);
    try {
      const reqRes = await portalApi.requestActionVerification('investor.withdrawal.create');
      setOtpRequired(reqRes.otpRequired);
      setMaskedEmail(reqRes.maskedEmail || profile?.email || '');
      setDevGrantId(reqRes.grantId);
      setStep(2);
      if (reqRes.otpRequired) {
        toast.info(`Security code sent to ${reqRes.maskedEmail || 'your email'}.`);
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to prepare withdrawal verification.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    setSubmitting(true);
    try {
      let grantId = devGrantId;
      if (otpRequired) {
        if (otpCode.trim().length !== 6) {
          setError('Enter the 6-digit email verification code.');
          setSubmitting(false);
          return;
        }
        grantId = await portalApi.verifyActionCode('investor.withdrawal.create', otpCode.trim());
      }

      const tx = await portalApi.submitWithdrawal({
        amount: amountCheck.value,
        destination,
        method: rail,
        grantId,
      });
      setCreatedTx(tx);
      setStep(3);
      toast.success('Withdrawal request submitted.');
      await refreshAll();
    } catch (err: any) {
      const msg = err?.message || 'Unable to submit withdrawal request.';
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Stepper steps={WITHDRAW_STEPS} currentStep={step} />

      {error && (
        <div role="alert" className="portal-card border-[#FB7185]/50 p-4 text-sm text-[#FB7185]">
          {error}
        </div>
      )}

      {step === 0 && (
        <form onSubmit={handleStep0Next} className="portal-card p-5 sm:p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-white">Withdrawal destination</h2>
            <p className="text-xs text-[#8EA7C7] mt-1 portal-tabular">
              Available balance · {formatEuro(balance)} · Minimum withdrawal €250.00
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { id: 'Bank Wire SEPA' as const, label: 'SEPA Bank Wire', icon: Building2 },
              { id: 'Crypto Wallet' as const, label: 'USDC Wallet', icon: Coins },
            ].map((item) => {
              const Icon = item.icon;
              const active = rail === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleRailChange(item.id)}
                  className={`p-4 rounded-xl border text-left flex items-center gap-3 transition-colors ${
                    active
                      ? 'bg-[#152E54] border-[#C5A880]'
                      : 'bg-[#0B1B30] border-[#1D3860] hover:border-[#C5A880]/50'
                  }`}
                >
                  <Icon className="w-5 h-5 text-[#C5A880]" />
                  <span className="text-sm font-semibold text-white">{item.label}</span>
                </button>
              );
            })}
          </div>

          <div>
            <label htmlFor="withdraw-destination" className="block text-xs font-semibold text-[#C5A880] mb-2">
              {rail === 'Bank Wire SEPA' ? 'Registered IBAN' : 'Destination wallet address'}
            </label>
            <input
              id="withdraw-destination"
              type="text"
              required
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder={rail === 'Bank Wire SEPA' ? 'FR76...' : '0x... or Solana address'}
              className="portal-input font-mono text-xs sm:text-sm"
            />
            {rail === 'Bank Wire SEPA' && profile?.bankIban && (
              <p className="mt-1.5 text-xs text-[#8EA7C7]">
                Profile IBAN · {maskIban(profile.bankIban)}
              </p>
            )}
          </div>

          <button type="submit" className="portal-btn-primary w-full">
            <span>Continue to amount</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}

      {step === 1 && (
        <form onSubmit={handleStep1Next} className="portal-card p-5 sm:p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-white">Withdrawal amount (EUR)</h2>
            <p className="text-xs text-[#8EA7C7] mt-1 portal-tabular">
              Available wallet balance · {formatEuro(balance)}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="withdraw-amount" className="text-xs font-semibold text-[#C5A880]">
                Amount in EUR (Min €250)
              </label>
              <button
                type="button"
                onClick={() => setAmountInput(String(Math.floor(balance)))}
                className="text-xs font-semibold text-[#C5A880] hover:underline"
              >
                Use max available
              </button>
            </div>
            <input
              id="withdraw-amount"
              type="number"
              min="250"
              step="0.01"
              required
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              className="portal-input text-lg font-bold portal-tabular"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setStep(0)} className="portal-btn-secondary flex-1">
              Back
            </button>
            <button type="submit" disabled={submitting} className="portal-btn-primary flex-1">
              {submitting ? 'Preparing...' : 'Continue to verification'}
            </button>
          </div>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleConfirmWithdrawal} className="portal-card p-5 sm:p-6 space-y-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#152E54] border border-[#C5A880]/40 text-[#C5A880] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Authorize withdrawal</h2>
              <p className="text-xs text-[#8EA7C7] mt-1">
                Review payout summary and confirm authorization.
              </p>
            </div>
          </div>

          <div className="portal-surface-elevated p-4 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#8EA7C7]">Payout rail</span>
              <span className="text-white font-semibold">{rail}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[#8EA7C7]">Destination</span>
              <span className="font-mono text-white truncate">{destination}</span>
            </div>
            <div className="pt-2 border-t border-[#1D3860] flex items-center justify-between text-sm">
              <span className="font-semibold text-white">Amount to reserve</span>
              <span className="font-bold text-[#C5A880] portal-tabular">{formatEuro(amountCheck.value)}</span>
            </div>
          </div>

          {otpRequired && (
            <div>
              <label htmlFor="withdraw-otp" className="block text-xs font-semibold text-[#C5A880] mb-2">
                6-digit security code sent to {maskedEmail}
              </label>
              <input
                id="withdraw-otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="portal-input font-mono tracking-[0.3em]"
              />
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setStep(1)} className="portal-btn-secondary flex-1">
              Back
            </button>
            <button type="submit" disabled={submitting} className="portal-btn-primary flex-1">
              {submitting ? 'Submitting payout...' : 'Authorize & submit'}
            </button>
          </div>
        </form>
      )}

      {step === 3 && (
        <div className="portal-card p-6 space-y-5">
          <div className="w-12 h-12 rounded-xl bg-[#34D399]/15 border border-[#34D399]/40 text-[#34D399] flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Withdrawal request submitted</h2>
            <p className="text-sm text-[#8EA7C7] mt-1 leading-relaxed">
              <span className="text-white font-semibold portal-tabular">
                {formatEuro(createdTx?.amount || amountCheck.value)}
              </span>{' '}
              has been reserved from your wallet for compliance settlement via {rail}.
            </p>
          </div>

          {createdTx?.reference && (
            <div className="portal-surface-elevated p-4 flex items-center justify-between text-xs">
              <span className="text-[#8EA7C7]">Payout reference</span>
              <span className="font-mono font-semibold text-[#C5A880]">{createdTx.reference}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => navigatePortal('ledger')} className="portal-btn-primary flex-1">
              View in ledger
            </button>
            <button type="button" onClick={() => navigatePortal('overview')} className="portal-btn-secondary flex-1">
              Back to overview
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
