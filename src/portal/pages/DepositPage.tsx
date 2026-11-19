import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Building2, Copy, Check, CheckCircle2, ArrowRight } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { usePortal } from '../state/PortalContext';
import { formatEuro } from '../utils/format';
import { Stepper } from '../components/Stepper';
import { StatusBadge } from '../components/StatusBadge';
import { getApiUrl, getAuthToken } from '../../lib/api';
import { isSupabaseConfigured, supabase } from '../../lib/supabaseClient';
import { portalApi } from '../services/portalApi';
import { PortalAssignedBankAccount } from '../types';

type DepositMethod = {
  id: string;
  method: 'bank' | 'usdt';
  minimum_amount: number | string;
  maximum_amount: number | string | null;
  name?: string;
  instructions?: string;
  network?: string;
  wallet_address?: string;
  detail_rows?: Array<{ label: string; value: string }>;
};

const DEPOSIT_STEPS = ['Amount', 'Method', 'Review', 'Confirmation'];
const QUICK_AMOUNTS = [100, 500, 1000, 5000];

const parseEurCents = (value: string | number | null | undefined): bigint | null => {
  const raw = String(value ?? '').trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) return null;
  const [whole, fraction = ''] = raw.split('.');
  try { return BigInt(whole) * 100n + BigInt((fraction + '00').slice(0, 2)); }
  catch { return null; }
};

const centsToDecimal = (cents: bigint): string => {
  const whole = cents / 100n;
  const fraction = String(cents % 100n).padStart(2, '0');
  return `${whole}.${fraction}`;
};

const money = (value: string | number | bigint): string => {
  const numeric = typeof value === 'bigint' ? Number(value) / 100 : Number(value);
  return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(numeric);
};

const methodLabel = (method: DepositMethod['method']) =>
  method === 'usdt' ? 'USDT (crypto)' : 'Bank transfer (SEPA)';

const mapAssignedAccountToMethod = (
  account: PortalAssignedBankAccount | null | undefined,
  fallbackMethod: 'bank' | 'usdt',
  minDepositEur: number,
  maxDepositEur: number
): DepositMethod | null => {
  if (!account) return null;
  const resolvedMethod: 'bank' | 'usdt' = account.method === 'usdt' ? 'usdt' : fallbackMethod;
  if (resolvedMethod === 'bank' && !account.iban && (!account.detailRows || account.detailRows.length === 0)) {
    return null;
  }
  if (resolvedMethod === 'usdt' && !account.walletAddress) {
    return null;
  }
  const detailRows =
    Array.isArray(account.detailRows) && account.detailRows.length > 0
      ? account.detailRows
      : resolvedMethod === 'bank'
      ? [
          account.beneficiary ? { label: 'Beneficiary', value: account.beneficiary } : null,
          account.bankName ? { label: 'Bank', value: account.bankName } : null,
          account.iban ? { label: 'IBAN', value: account.iban } : null,
          account.bic ? { label: 'BIC', value: account.bic } : null,
          account.reference ? { label: 'Reference', value: account.reference } : null,
        ].filter((row): row is { label: string; value: string } => Boolean(row))
      : [];
  return {
    id: account.gateId || `assigned-${resolvedMethod}`,
    method: resolvedMethod,
    minimum_amount: minDepositEur,
    maximum_amount: maxDepositEur || null,
    name: account.gateName || account.bankName || (resolvedMethod === 'usdt' ? 'USDT Treasury' : 'SEPA Bank Transfer'),
    instructions: account.instructions || '',
    network: account.network || '',
    wallet_address: account.walletAddress || '',
    detail_rows: detailRows,
  };
};

export const DepositPage: React.FC = () => {
  const toast = useToast();
  const {
    assignedBankAccount,
    assignedUsdtAccount,
    assignedPaymentMethods,
    portalConfig,
    refreshAll,
    navigatePortal,
  } = usePortal();

  const [methods, setMethods] = useState<DepositMethod[]>([]);
  const [method, setMethod] = useState<DepositMethod['method'] | ''>('');
  const [amountInput, setAmountInput] = useState('1000');
  const [step, setStep] = useState(0);
  const [loadingMethods, setLoadingMethods] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<any>(null);
  const [qrCode, setQrCode] = useState('');
  const [transactionHash, setTransactionHash] = useState('');
  const [hashBusy, setHashBusy] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofBusy, setProofBusy] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState('');

  const confirmationLock = useRef(false);
  const lockRef = useRef(false);

  const selected = methods.find(item => item.method === method);
  const amountCents = parseEurCents(amountInput);

  useEffect(() => {
    let cancelled = false;
    const minEur = portalConfig?.limits?.minDepositEur || 100;
    const maxEur = portalConfig?.limits?.maxDepositEur || 5000000;

    const buildFallbackFromAssigned = (): DepositMethod[] => {
      if (assignedPaymentMethods.length > 0) {
        return assignedPaymentMethods;
      }
      const derived: DepositMethod[] = [];
      const bank = mapAssignedAccountToMethod(assignedBankAccount, 'bank', minEur, maxEur);
      const usdt = mapAssignedAccountToMethod(assignedUsdtAccount, 'usdt', minEur, maxEur);
      if (bank) derived.push(bank);
      if (usdt) derived.push(usdt);
      return derived;
    };

    setLoadingMethods(true);
    setSubmitError(null);
    portalApi
      .getAssignedPaymentMethods()
      .then((available) => {
        if (cancelled) return;
        const resolved = available.length > 0 ? available : buildFallbackFromAssigned();
        setMethods(resolved);
        setMethod((prev) => {
          if (prev && resolved.some((item) => item.method === prev)) return prev;
          return resolved.length === 1 ? resolved[0].method : '';
        });
      })
      .catch((e) => {
        if (cancelled) return;
        const fallback = buildFallbackFromAssigned();
        if (fallback.length > 0) {
          setMethods(fallback);
          setMethod((prev) => {
            if (prev && fallback.some((item) => item.method === prev)) return prev;
            return fallback.length === 1 ? fallback[0].method : '';
          });
          setSubmitError(null);
        } else {
          setSubmitError(e?.message || 'Unable to load your assigned payment methods.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingMethods(false);
      });

    return () => {
      cancelled = true;
    };
  }, [assignedBankAccount, assignedUsdtAccount, assignedPaymentMethods, portalConfig?.limits?.maxDepositEur, portalConfig?.limits?.minDepositEur]);

  useEffect(() => {
    let cancelled = false;
    const address = selected?.method === 'usdt' ? selected.wallet_address?.trim() : '';
    if (step !== 3 || !address) { setQrCode(''); return; }
    QRCode.toDataURL(address, { width: 240, margin: 2, errorCorrectionLevel: 'M' })
      .then(value => { if (!cancelled) setQrCode(value); })
      .catch(() => { if (!cancelled) setQrCode(''); });
    return () => { cancelled = true; };
  }, [step, selected?.method, selected?.wallet_address]);

  const copyValue = async (val: string, label: string) => {
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

  const handleNextFromAmount = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (amountCents === null || amountCents <= 0n) {
      setSubmitError('Enter a valid EUR amount with up to two decimal places.');
      return;
    }
    setStep(1);
  };

  const handleNextFromMethod = () => {
    setSubmitError(null);
    if (!selected) {
      setSubmitError('Select one of your available payment methods.');
      return;
    }
    const minimumCents = parseEurCents(selected.minimum_amount);
    const maximumCents = selected.maximum_amount == null ? null : parseEurCents(selected.maximum_amount);
    if (minimumCents === null || amountCents === null || amountCents < minimumCents ||
        (maximumCents !== null && amountCents > maximumCents)) {
      setSubmitError(`Amount must be between ${money(minimumCents ?? 0n)} and ${maximumCents === null ? 'the allowed maximum' : money(maximumCents)}.`);
      return;
    }
    setStep(2);
  };

  const hasActiveSupabaseSession = async (): Promise<boolean> => {
    if (!isSupabaseConfigured()) return false;
    try {
      const { data } = await supabase.auth.getSession();
      return Boolean(data?.session?.access_token);
    } catch {
      return false;
    }
  };

  const handleConfirmAndSubmit = async () => {
    if (lockRef.current || submitting) return;
    setSubmitError(null);
    if (!selected || amountCents === null || amountCents <= 0n) {
      setSubmitError('Review a valid amount and an assigned payment method before confirming.');
      return;
    }
    lockRef.current = true;
    setSubmitting(true);
    try {
      let submittedRecord: any = null;
      if (await hasActiveSupabaseSession()) {
        const { data, error: rpcError } = await supabase.rpc('request_deposit', {
          p_amount: centsToDecimal(amountCents),
          p_method: selected.method
        });
        if (rpcError) throw rpcError;
        submittedRecord = data;
      } else {
        submittedRecord = await portalApi.submitDeposit({
          amount: Number(centsToDecimal(amountCents)),
          currency: 'EUR',
          method: selected.name || (selected.method === 'usdt' ? 'USDT' : 'SEPA Bank Wire'),
          methodId: selected.id,
        });
      }
      setSubmitted(submittedRecord);
      setTransactionHash('');
      setProofFile(null);
      setConfirmationMessage('');
      setStep(3);
      toast.success('Deposit instructions issued.');
      await refreshAll();
    } catch (e: any) {
      const code = String(e?.message || e?.code || '');
      if (code.includes('PAYMENT_METHOD_NOT_ASSIGNED') || code.includes('PAYMENT_METHOD_UNAVAILABLE')) {
        setSubmitError('This payment option is not set up for your account yet. Please contact support if you need help.');
      } else if (code.includes('AMOUNT_OUT_OF_RANGE')) {
        setSubmitError('The amount is outside this payment method’s allowed limits.');
      } else if (code.includes('LEGAL') || code.includes('consent')) {
        setSubmitError('Please review and accept the latest legal terms before requesting a deposit.');
      } else {
        setSubmitError(e?.message || 'Your deposit request could not be submitted. Please retry.');
      }
    } finally {
      lockRef.current = false;
      setSubmitting(false);
    }
  };

  const submitTransactionHash = async () => {
    if (!submitted?.id || confirmationLock.current || hashBusy) return;
    const hash = transactionHash.trim();
    if (!/^(0x)?[a-fA-F0-9]{64}$/.test(hash)) {
      setSubmitError('Enter a valid 64-character transaction hash.');
      return;
    }
    confirmationLock.current = true;
    setHashBusy(true);
    setSubmitError(null);
    setConfirmationMessage('');
    try {
      const data = (await hasActiveSupabaseSession())
        ? await (async () => {
            const { data: rpcData, error: rpcError } = await supabase.rpc('submit_tx_hash', {
              p_tx: submitted.id,
              p_hash: hash
            });
            if (rpcError) throw rpcError;
            return rpcData;
          })()
        : await portalApi.submitDepositTxHash(String(submitted.id), hash);
      setTransactionHash(hash);
      setConfirmationMessage(data?.transaction_id_submitted ? 'Transaction ID submitted for review.' : 'Transaction ID submitted.');
      toast.success('Transaction ID submitted.');
    } catch (e: any) {
      const message = String(e?.message || '');
      if (message.includes('TRANSACTION_HASH_ALREADY_USED')) setSubmitError('This transaction ID has already been used.');
      else if (message.includes('INVALID_TRANSACTION_HASH')) setSubmitError('That transaction ID looks invalid. Check it and try again.');
      else if (message.includes('DEPOSIT_NOT_PENDING_OR_NOT_OWNED')) setSubmitError('This deposit is no longer pending or does not belong to your account.');
      else setSubmitError(message || 'The transaction ID could not be submitted. Please retry.');
    } finally {
      confirmationLock.current = false;
      setHashBusy(false);
    }
  };

  const uploadProof = async () => {
    if (!submitted?.id || !proofFile || proofBusy) return;
    if (!['image/jpeg', 'image/png', 'application/pdf'].includes(proofFile.type)) {
      setSubmitError('Choose a JPG, PNG or PDF proof file.');
      return;
    }
    if (proofFile.size > 10 * 1024 * 1024) {
      setSubmitError('Proof files must be 10 MB or smaller.');
      return;
    }
    setProofBusy(true);
    setSubmitError(null);
    setConfirmationMessage('');
    let uploadedPath = '';
    try {
      if (await hasActiveSupabaseSession()) {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) throw userError || new Error('Please sign in again to upload proof.');
        const extension = proofFile.type === 'application/pdf' ? 'pdf' : proofFile.type === 'image/png' ? 'png' : 'jpg';
        uploadedPath = `${userData.user.id}/${submitted.id}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from('proofs').upload(uploadedPath, proofFile, {
          contentType: proofFile.type,
          upsert: false
        });
        if (uploadError) throw uploadError;
        const token = getAuthToken();
        const response = await fetch(getApiUrl(`/manual-payments/deposits/${submitted.id}/proof`), {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ path: uploadedPath })
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'The proof file could not be attached to this deposit.');
      } else {
        await portalApi.uploadDepositProof(String(submitted.id), proofFile);
      }
      setProofFile(null);
      setConfirmationMessage('Payment proof uploaded securely.');
      toast.success('Payment proof uploaded securely.');
    } catch (e: any) {
      if (uploadedPath) await supabase.storage.from('proofs').remove([uploadedPath]).catch(() => undefined);
      setSubmitError(e?.message || 'The proof file could not be uploaded. Please retry.');
    } finally {
      setProofBusy(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Stepper steps={DEPOSIT_STEPS} currentStep={step} />

      {submitError && (
        <div role="alert" className="portal-card border-[#FB7185]/50 text-sm text-[#FB7185]">
          {submitError}
        </div>
      )}

      {/* Step 0: Amount */}
      {step === 0 && (
        <form onSubmit={handleNextFromAmount} noValidate className="portal-card space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-[#F2F5F4]">Deposit amount</h2>
            <p className="text-xs text-[#8FA1A8] mt-1 portal-tabular">
              Enter the EUR amount you want to add to your wallet.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {QUICK_AMOUNTS.map((preset) => {
              const isSelected = Number(amountInput) === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmountInput(String(preset))}
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
              min="1"
              step="0.01"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              className="portal-input text-lg font-bold portal-tabular"
            />
          </div>

          <button type="submit" className="portal-btn-primary w-full">
            <span>Continue to method</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* Step 1: Method */}
      {step === 1 && (
        <div className="portal-card space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-[#F2F5F4]">Payment method</h2>
            <p className="text-xs text-[#8FA1A8] mt-1 portal-tabular">
              Deposit amount · {amountCents !== null ? money(amountCents) : formatEuro(0)}
            </p>
          </div>

          {loadingMethods ? (
            <div className="p-6 text-center text-sm text-[#8FA1A8]">Loading assigned payment methods...</div>
          ) : methods.length === 0 ? (
            <div role="alert" className="rounded-[14px] border border-amber-400/30 bg-amber-400/10 p-5 text-center text-sm text-amber-200">
              Your payment details are being set up. We’ll notify you when they’re ready.
            </div>
          ) : (
            <div className="space-y-3">
              {methods.map((item) => {
                const selectedFlag = method === item.method;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMethod(item.method)}
                    className={`w-full min-h-[64px] p-4 rounded-[14px] border text-left flex items-start gap-3.5 transition-colors ${
                      selectedFlag
                        ? 'bg-[#172228] border-[#6FD8B0]'
                        : 'bg-[#0B0F10] border-[#1F2C33] hover:border-[#6FD8B0]/55'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-[14px] bg-[#121A1F] border border-[#1F2C33] text-[#6FD8B0] flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">
                        {methodLabel(item.method)}
                        {item.name ? ` · ${item.name}` : ''}
                      </div>
                      <div className="text-xs text-[#A8C5BD] mt-1 portal-tabular font-medium">
                        {money(item.minimum_amount)} minimum {item.maximum_amount != null ? `· ${money(item.maximum_amount)} maximum` : ''}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setStep(0)} className="portal-btn-secondary flex-1">
              Back
            </button>
            <button
              type="button"
              disabled={methods.length === 0 || !selected}
              onClick={handleNextFromMethod}
              className="portal-btn-primary flex-1 disabled:opacity-40"
            >
              <span>Review deposit</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Review */}
      {step === 2 && selected && amountCents !== null && (
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
              <span className="text-[#F2F5F4] font-semibold">{methodLabel(selected.method)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[#8FA1A8]">Deposit amount</span>
              <span className="text-[#F2F5F4] font-semibold portal-tabular">
                {money(amountCents)}
              </span>
            </div>
          </div>

          {selected.method === 'usdt' && (
            <p className="text-xs leading-relaxed text-[#8FA1A8]">
              You’ll send USDT and we’ll credit your wallet in EUR at the rate when your payment is confirmed. The final amount may differ from this estimate.
            </p>
          )}

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

      {/* Step 3: Confirmation */}
      {step === 3 && submitted && selected && (
        <div className="portal-card space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div className="w-12 h-12 rounded-[14px] bg-[#6FD8B0]/12 border border-[#6FD8B0]/35 text-[#6FD8B0] flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <StatusBadge status={submitted?.status || 'pending'} label="Pending" />
          </div>

          <div>
            <h2 className="text-xl font-semibold text-[#F2F5F4]">Transfer instructions ready</h2>
            <p className="text-sm text-[#8FA1A8] mt-1 leading-relaxed">
              Send{' '}
              <span className="text-[#F2F5F4] font-semibold portal-tabular">
                {money(amountCents ?? 0n)}
              </span>{' '}
              via {methodLabel(selected.method)} and include the required payment reference below.
            </p>
          </div>

          {selected.method === 'usdt' ? (
            <div className="space-y-4">
              <div role="alert" className="rounded-2xl border-2 border-amber-400 bg-amber-400/10 p-4 text-sm font-bold leading-relaxed text-amber-200">
                Send only USDT on the {selected.network || 'assigned'} network. Funds sent on any other network or coin may be lost and cannot be recovered.
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-[#8FA1A8]">NETWORK</span>
                <span className="rounded-full border border-amber-300/40 bg-amber-300/10 px-3 py-1 text-xs font-bold text-amber-200">
                  {selected.network || 'Network not specified'}
                </span>
              </div>
              <div className="rounded-2xl border border-[#1F2C33] bg-[#121A1F] p-4">
                <p className="mb-2 text-xs font-semibold text-[#8FA1A8]">USDT WALLET ADDRESS</p>
                <p className="break-all font-mono text-sm leading-7 text-white">
                  {(selected.wallet_address || '').replace(/(.{4})/g, '$1 ').trim()}
                </p>
                <button
                  type="button"
                  onClick={() => void copyValue(selected.wallet_address || '', 'Wallet address')}
                  className="mt-3 h-11 w-full rounded-xl border border-[#6FD8B0]/50 font-semibold text-[#6FD8B0]"
                >
                  {copiedField === 'Wallet address' ? 'Copied' : 'Copy wallet address'}
                </button>
              </div>

              {qrCode && (
                <div className="flex flex-col items-center rounded-2xl border border-[#1F2C33] bg-white p-4">
                  <img src={qrCode} alt="QR code for the USDT wallet address" className="size-52 max-w-full" />
                  <span className="mt-2 text-xs font-semibold text-slate-700">Scan to copy wallet address</span>
                </div>
              )}

              {submitted.estimated_usdt_amount != null && (
                <div className="rounded-xl border border-[#1F2C33] p-3 text-sm">
                  <span className="text-[#8FA1A8]">Estimated USDT amount</span>
                  <p className="mt-1 text-lg font-bold">{submitted.estimated_usdt_amount} USDT</p>
                </div>
              )}

              <div className="rounded-xl border border-[#6FD8B0]/40 bg-[#6FD8B0]/5 p-3">
                <p className="text-xs text-[#8FA1A8]">PAYMENT REFERENCE</p>
                <p className="mt-1 break-all text-lg font-extrabold tracking-wide text-[#6FD8B0]">{submitted.reference}</p>
                <button
                  type="button"
                  onClick={() => void copyValue(submitted.reference, 'Payment reference')}
                  className="mt-2 h-10 rounded-lg border border-[#6FD8B0]/50 px-4 text-sm font-semibold text-[#6FD8B0]"
                >
                  Copy reference
                </button>
              </div>

              <div className="space-y-2 rounded-2xl border border-[#1F2C33] bg-[#121A1F] p-4">
                <label htmlFor="usdt-transaction-hash" className="block text-sm font-semibold">
                  Paste your transaction ID (optional but speeds up approval)
                </label>
                <input
                  id="usdt-transaction-hash"
                  value={transactionHash}
                  onChange={(e) => setTransactionHash(e.target.value)}
                  placeholder="Transaction hash"
                  autoComplete="off"
                  className="h-12 w-full rounded-xl border border-[#1F2C33] bg-[#0B0F10] px-3 font-mono text-sm outline-none focus:border-[#6FD8B0]"
                />
                <button
                  type="button"
                  disabled={hashBusy || !transactionHash.trim()}
                  onClick={() => void submitTransactionHash()}
                  className="h-11 w-full rounded-xl bg-[#6FD8B0] font-bold text-[#07231A] disabled:opacity-40"
                >
                  {hashBusy ? 'Submitting...' : 'Submit transaction ID'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 rounded-2xl border border-[#1F2C33] bg-[#121A1F] p-4">
              <h4 className="font-bold">{selected?.name || 'Bank transfer (SEPA)'}</h4>
              {selected?.detail_rows?.map((detail, index) => (
                <div key={`${detail.label}-${index}`} className="flex items-start justify-between gap-3 border-b border-[#1F2C33] py-2 text-sm">
                  <span className="shrink-0 text-[#8FA1A8]">{detail.label}</span>
                  <span className="min-w-0 break-all text-right font-semibold">{detail.value}</span>
                  <button
                    type="button"
                    aria-label={`Copy ${detail.label}`}
                    onClick={() => void copyValue(detail.value, detail.label)}
                    className="h-11 shrink-0 rounded-lg border border-[#6FD8B0]/40 px-2 text-xs font-semibold text-[#6FD8B0]"
                  >
                    Copy
                  </button>
                </div>
              ))}
              {selected?.instructions && (
                <div className="pt-2 text-sm leading-relaxed text-[#C2CFD2]">
                  <p className="mb-1 font-semibold">Instructions</p>
                  {selected.instructions}
                </div>
              )}
              <div className="rounded-xl border-2 border-[#6FD8B0] bg-[#6FD8B0]/10 p-3">
                <p className="text-xs font-bold tracking-wide text-[#6FD8B0]">REQUIRED PAYMENT REFERENCE — INCLUDE THIS IN YOUR TRANSFER</p>
                <p className="mt-1 break-all text-lg font-extrabold text-white">{submitted.reference}</p>
                <button
                  type="button"
                  onClick={() => void copyValue(submitted.reference, 'Payment reference')}
                  className="mt-2 h-10 rounded-lg border border-[#6FD8B0]/50 px-4 text-sm font-semibold text-[#6FD8B0]"
                >
                  Copy reference
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2 rounded-2xl border border-dashed border-[#1F2C33] p-4">
            <label htmlFor="deposit-proof-file" className="block text-sm font-semibold">Upload payment proof (optional)</label>
            <input
              id="deposit-proof-file"
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              onChange={(e) => setProofFile(e.target.files?.[0] || null)}
              className="block w-full text-xs text-[#8FA1A8] file:mr-3 file:rounded-lg file:border-0 file:bg-[#1F2C33] file:px-3 file:py-2 file:text-white"
            />
            <p className="text-xs text-[#8FA1A8]">JPG, PNG or PDF · maximum 10 MB · stored privately</p>
            <button
              type="button"
              disabled={!proofFile || proofBusy}
              onClick={() => void uploadProof()}
              className="h-11 w-full rounded-xl border border-[#6FD8B0]/50 font-semibold text-[#6FD8B0] disabled:opacity-40"
            >
              {proofBusy ? 'Uploading securely...' : 'Upload proof'}
            </button>
          </div>

          {confirmationMessage && <p role="status" className="text-sm text-[#6FD8B0]">{confirmationMessage}</p>}
          <div className="rounded-xl border border-amber-300/30 bg-amber-300/5 p-3 text-sm font-semibold text-amber-200">
            Pending: we’ll credit your wallet after the payment is confirmed.
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
