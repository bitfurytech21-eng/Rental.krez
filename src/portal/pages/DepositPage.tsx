import React, { useEffect, useState } from 'react';
import { Building2, Coins, Copy, Check, CheckCircle2, ArrowRight } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { usePortal } from '../state/PortalContext';
import { portalApi } from '../services/portalApi';
import { PortalPaymentConfig, PortalTransaction } from '../types';
import { formatEuro } from '../utils/format';
import { validateDepositAmount } from '../utils/validate';
import { Stepper } from '../components/Stepper';

const DEPOSIT_STEPS = ['Method', 'Amount', 'Instructions', 'Confirmation'];

export const DepositPage: React.FC = () => {
  const toast = useToast();
  const { navigatePortal, refreshAll } = usePortal();

  const [step, setStep] = useState(0);
  const [config, setConfig] = useState<PortalPaymentConfig | null>(null);
  const [method, setMethod] = useState<'SEPA Bank Wire' | 'Instant Bank Transfer' | 'USDC (Solana / ERC-20)'>('SEPA Bank Wire');
  const [amountInput, setAmountInput] = useState('1000');
  const [txHash, setTxHash] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [createdTx, setCreatedTx] = useState<PortalTransaction | null>(null);

  useEffect(() => {
    portalApi
      .getPaymentConfig()
      .then(setConfig)
      .catch(() => {});
  }, []);

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

  const amountCheck = validateDepositAmount(amountInput);

  const handleNextFromAmount = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!amountCheck.valid) {
      setError(amountCheck.error || 'Enter a valid deposit amount.');
      return;
    }
    setStep(2);
  };

  const handleSubmitDeposit = async () => {
    if (submitting) return;
    setError(null);
    if (!amountCheck.valid) {
      setError(amountCheck.error || 'Invalid amount.');
      setStep(1);
      return;
    }
    setSubmitting(true);
    try {
      const tx = await portalApi.submitDeposit({
        amount: amountCheck.value,
        currency: 'EUR',
        method,
        txHash: txHash.trim() || undefined,
      });
      setCreatedTx(tx);
      setStep(3);
      toast.success('Deposit notification recorded.');
      await refreshAll();
    } catch (err: any) {
      const msg = err?.message || 'Unable to record deposit notification.';
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const isCrypto = method.includes('USDC');
  const primaryCrypto = config?.cryptoNetworks?.[0];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Stepper steps={DEPOSIT_STEPS} currentStep={step} />

      {error && (
        <div role="alert" className="portal-card border-[#FB7185]/50 p-4 text-sm text-[#FB7185]">
          {error}
        </div>
      )}

      {step === 0 && (
        <div className="portal-card p-5 sm:p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-white">Select funding rail</h2>
            <p className="text-xs text-[#8EA7C7] mt-1">
              Funds are credited to your EUR wallet upon escrow reconciliation.
            </p>
          </div>

          <div className="space-y-3">
            {[
              {
                id: 'SEPA Bank Wire' as const,
                title: 'SEPA Bank Wire',
                detail: 'Standard EUR institutional settlement · 1–2 business days · €0 fee',
                icon: Building2,
              },
              {
                id: 'Instant Bank Transfer' as const,
                title: 'Instant SEPA Transfer',
                detail: 'Same-day EUR clearing from European bank accounts · €0 fee',
                icon: Building2,
              },
              {
                id: 'USDC (Solana / ERC-20)' as const,
                title: 'Stablecoin Treasury Settlement (USDC)',
                detail: 'On-chain settlement converted 1:1 to EUR upon confirmation',
                icon: Coins,
              },
            ].map((item) => {
              const Icon = item.icon;
              const selected = method === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMethod(item.id)}
                  className={`w-full p-4 rounded-xl border text-left flex items-start gap-3.5 transition-colors ${
                    selected
                      ? 'bg-[#152E54] border-[#C5A880]'
                      : 'bg-[#0B1B30] border-[#1D3860] hover:border-[#C5A880]/50'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#102442] border border-[#1D3860] text-[#C5A880] flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{item.title}</div>
                    <div className="text-xs text-[#8EA7C7] mt-0.5">{item.detail}</div>
                  </div>
                </button>
              );
            })}
          </div>

          <button type="button" onClick={() => setStep(1)} className="portal-btn-primary w-full">
            <span>Continue to amount</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {step === 1 && (
        <form onSubmit={handleNextFromAmount} className="portal-card p-5 sm:p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-white">Deposit amount (EUR)</h2>
            <p className="text-xs text-[#8EA7C7] mt-1">
              Funding rail · {method} · Minimum €100.00
            </p>
          </div>

          <div>
            <label htmlFor="deposit-amount" className="block text-xs font-semibold text-[#C5A880] mb-2">
              Amount in EUR
            </label>
            <input
              id="deposit-amount"
              type="number"
              min="100"
              step="0.01"
              required
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              className="portal-input text-lg font-bold portal-tabular"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {[500, 1000, 5000, 10000].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmountInput(String(preset))}
                className="min-h-[40px] px-3.5 rounded-xl border border-[#1D3860] bg-[#0B1B30] text-xs font-semibold text-white hover:border-[#C5A880] portal-tabular"
              >
                {formatEuro(preset)}
              </button>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setStep(0)} className="portal-btn-secondary flex-1">
              Back
            </button>
            <button type="submit" className="portal-btn-primary flex-1">
              View instructions
            </button>
          </div>
        </form>
      )}

      {step === 2 && (
        <div className="portal-card p-5 sm:p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-white">Escrow transfer instructions</h2>
            <p className="text-xs text-[#8EA7C7] mt-1">
              Initiate your transfer of{' '}
              <span className="text-white font-semibold portal-tabular">{formatEuro(amountCheck.value)}</span>{' '}
              using the details below, then submit confirmation.
            </p>
          </div>

          {!isCrypto ? (
            <div className="portal-surface-elevated p-4 space-y-3 text-xs">
              {[
                { label: 'Beneficiary', value: config?.traditional.beneficiary || 'L’Agence Escrow Services' },
                { label: 'Bank', value: config?.traditional.bankName || 'BNP Paribas Institutional' },
                { label: 'IBAN', value: config?.traditional.iban || 'FR76 3000 4000 0300 0012 3456 789' },
                { label: 'BIC / SWIFT', value: config?.traditional.bic || 'BNPAFRPP' },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3">
                  <span className="text-[#8EA7C7]">{row.label}</span>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-white truncate">{row.value}</span>
                    <button
                      type="button"
                      onClick={() => void copyValue(row.label, row.value)}
                      aria-label={`Copy ${row.label}`}
                      className="w-8 h-8 rounded-lg border border-[#1D3860] flex items-center justify-center text-[#C5A880] hover:border-[#C5A880] shrink-0"
                    >
                      {copiedField === row.label ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="portal-surface-elevated p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#8EA7C7]">Network</span>
                <span className="text-white font-semibold">
                  {primaryCrypto?.network || 'Solana / ERC-20'} ({primaryCrypto?.asset || 'USDC'})
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[#8EA7C7]">Treasury address</span>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-white truncate">
                    {primaryCrypto?.address || '0x71C7656EC7ab88b098defB751B7401B5f6d8976F'}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      void copyValue(
                        'Address',
                        primaryCrypto?.address || '0x71C7656EC7ab88b098defB751B7401B5f6d8976F'
                      )
                    }
                    className="w-8 h-8 rounded-lg border border-[#1D3860] flex items-center justify-center text-[#C5A880]"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="deposit-tx-hash" className="block text-xs font-medium text-[#C5A880] mb-1.5">
                  Transaction hash (optional)
                </label>
                <input
                  id="deposit-tx-hash"
                  type="text"
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  placeholder="Paste transaction hash if already sent"
                  className="portal-input font-mono text-xs"
                />
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setStep(1)} className="portal-btn-secondary flex-1">
              Back
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmitDeposit}
              className="portal-btn-primary flex-1"
            >
              {submitting ? 'Submitting...' : 'Confirm transfer sent'}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="portal-card p-6 space-y-5">
          <div className="w-12 h-12 rounded-xl bg-[#34D399]/15 border border-[#34D399]/40 text-[#34D399] flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Deposit notification received</h2>
            <p className="text-sm text-[#8EA7C7] mt-1 leading-relaxed">
              Your deposit of <span className="text-white font-semibold portal-tabular">{formatEuro(createdTx?.amount || amountCheck.value)}</span> via {method} has been queued for escrow settlement.
            </p>
          </div>

          {createdTx?.reference && (
            <div className="portal-surface-elevated p-4 flex items-center justify-between text-xs">
              <span className="text-[#8EA7C7]">Tracking reference</span>
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
