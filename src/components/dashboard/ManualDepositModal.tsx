import React, { useEffect, useRef, useState } from 'react';
import { getApiUrl, getAuthToken } from '../../lib/api';
import { isSupabaseConfigured, supabase } from '../../lib/supabaseClient';

type DepositMethod = {
  id: string;
  method: 'bank' | 'usdt';
  minimum_amount: number | string;
  maximum_amount: number | string | null;
};
interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onNavigateTransactions?: () => void;
  onNavigateCompliance?: () => void;
  isVerified?: boolean;
}
type Step = 1 | 2 | 3 | 4;

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

export const ManualDepositModal: React.FC<Props> = ({
  isOpen, onClose, onSuccess, onNavigateTransactions, onNavigateCompliance, isVerified = true
}) => {
  const [methods, setMethods] = useState<DepositMethod[]>([]);
  const [method, setMethod] = useState<DepositMethod['method'] | ''>('');
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<Step>(1);
  const [busy, setBusy] = useState(false);
  const [loadingMethods, setLoadingMethods] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState<any>(null);
  const lockRef = useRef(false);

  const selected = methods.find(item => item.method === method);
  const amountCents = parseEurCents(amount);

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setError('');
    setSubmitted(null);
    setAmount('');
    setMethod('');
    setLoadingMethods(true);
    const authToken = getAuthToken();
    fetch(getApiUrl('/manual-payments/methods'), {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
    })
      .then(async response => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Unable to load your assigned payment methods.');
        const available = (Array.isArray(payload.data) ? payload.data : [])
          .filter((item: any) => item?.method === 'bank' || item?.method === 'usdt')
          .map((item: any) => ({
            id: String(item.id),
            method: item.method as DepositMethod['method'],
            minimum_amount: item.minimum_amount,
            maximum_amount: item.maximum_amount ?? null
          }));
        setMethods(available);
        if (available.length === 1) setMethod(available[0].method);
      })
      .catch(e => setError(e?.message || 'Unable to load your assigned payment methods.'))
      .finally(() => setLoadingMethods(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const continueToMethod = () => {
    setError('');
    if (amountCents === null || amountCents <= 0n) {
      setError('Enter a valid EUR amount with up to two decimal places.');
      return;
    }
    if (!isVerified) {
      setError('Complete identity verification before making a deposit.');
      return;
    }
    setStep(2);
  };

  const continueToReview = () => {
    setError('');
    if (!selected) {
      setError('Select one of your available payment methods.');
      return;
    }
    const minimumCents = parseEurCents(selected.minimum_amount);
    const maximumCents = selected.maximum_amount == null ? null : parseEurCents(selected.maximum_amount);
    if (minimumCents === null || amountCents === null || amountCents < minimumCents ||
        (maximumCents !== null && amountCents > maximumCents)) {
      setError(`Amount must be between ${money(minimumCents ?? 0n)} and ${maximumCents === null ? 'the allowed maximum' : money(maximumCents)}.`);
      return;
    }
    setStep(3);
  };

  const confirmDeposit = async () => {
    if (lockRef.current || busy) return;
    setError('');
    if (!isVerified) {
      setError('Complete identity verification before making a deposit.');
      return;
    }
    if (!selected || amountCents === null || amountCents <= 0n) {
      setError('Review a valid amount and an assigned payment method before confirming.');
      return;
    }
    if (!isSupabaseConfigured()) {
      setError('Secure deposit requests are temporarily unavailable. Please try again later.');
      return;
    }
    lockRef.current = true;
    setBusy(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('request_deposit', {
        p_amount: centsToDecimal(amountCents),
        p_method: selected.method
      });
      if (rpcError) throw rpcError;
      setSubmitted(data);
      setStep(4);
      onSuccess();
    } catch (e: any) {
      const code = String(e?.message || e?.code || '');
      if (code.includes('PAYMENT_METHOD_NOT_ASSIGNED') || code.includes('PAYMENT_METHOD_UNAVAILABLE')) {
        setError('Your selected payment method is no longer available. Refresh and try again.');
      } else if (code.includes('AMOUNT_OUT_OF_RANGE')) {
        setError('The amount is outside this payment method’s allowed limits.');
      } else if (code.includes('LEGAL') || code.includes('consent')) {
        setError('Please review and accept the latest legal terms before requesting a deposit.');
      } else {
        setError('Your deposit request could not be submitted. Please retry.');
      }
    } finally {
      lockRef.current = false;
      setBusy(false);
    }
  };

  const close = () => {
    setStep(1);
    setSubmitted(null);
    setError('');
    setMethods([]);
    setMethod('');
    setAmount('');
    onClose();
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm">
    <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-[22px] border border-[#1F2C33] bg-[#0B0F10] p-5 text-[#F2F5F4] shadow-2xl sm:p-6">
      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold tracking-[.16em] text-[#8FA1A8]">INVESTOR PORTAL · WALLET</p>
          <h2 className="mt-1 text-xl font-bold">Deposit funds</h2>
          <p className="mt-1 text-xs text-[#8FA1A8]">Your wallet is credited after your payment is confirmed.</p>
        </div>
        <button type="button" onClick={close} aria-label="Close deposit" className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#1F2C33] text-xl text-[#8FA1A8] hover:text-white">×</button>
      </header>

      <div className="mb-5 flex gap-1.5" aria-label={`Step ${step} of 4`}>
        {[1,2,3,4].map(n => <span key={n} className={`h-1.5 flex-1 rounded-full ${n <= step ? 'bg-[#6FD8B0]' : 'bg-[#1F2C33]'}`} />)}
      </div>
      {error && <p role="alert" className="mb-4 rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-[13px] text-rose-300">{error}</p>}

      {!isVerified && step !== 4 && <div className="mb-4 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-[13px]">
        <p className="font-semibold text-amber-300">Verification required</p>
        <p className="mt-1 text-[#8FA1A8]">Complete identity verification before depositing funds.</p>
        <button type="button" onClick={() => { close(); onNavigateCompliance?.(); }} className="mt-3 h-10 rounded-lg border border-amber-300/50 px-4 font-semibold text-amber-300">Go to Compliance Vault</button>
      </div>}

      {step === 1 && <section className="space-y-4">
        <div><h3 className="text-2xl font-bold">How much?</h3><p className="mt-1 text-[13px] text-[#8FA1A8]">Enter the EUR amount you want to add to your wallet.</p></div>
        <label className="flex h-20 items-center rounded-2xl border border-[#1F2C33] bg-[#121A1F] px-5 focus-within:border-[#6FD8B0]">
          <span className="text-3xl font-bold text-[#8FA1A8]">€</span>
          <input aria-label="Deposit amount in euros" inputMode="decimal" type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="h-full min-w-0 flex-1 bg-transparent pl-3 text-4xl font-bold outline-none placeholder:text-[#8FA1A8]/40" />
        </label>
        <div className="grid grid-cols-4 gap-2">{[100,500,1000,5000].map(value => <button key={value} type="button" onClick={() => setAmount(String(value))} className="h-10 rounded-xl border border-[#1F2C33] bg-[#121A1F] text-xs font-semibold hover:border-[#6FD8B0]">{money(value).replace(/\.00$/, '')}</button>)}</div>
        <p className="text-xs text-[#8FA1A8]">The minimum and maximum depend on your assigned payment method.</p>
        <button type="button" disabled={!isVerified || !amount || loadingMethods} onClick={continueToMethod} className="h-12 w-full rounded-[14px] bg-[#6FD8B0] font-bold text-[#07231A] disabled:cursor-not-allowed disabled:opacity-40">{loadingMethods ? 'Loading payment methods…' : 'Continue'}</button>
      </section>}

      {step === 2 && <section className="space-y-4">
        <div><h3 className="text-2xl font-bold">Payment method</h3><p className="mt-1 text-[13px] text-[#8FA1A8]">Choose an assigned payment method.</p></div>
        {methods.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#1F2C33] p-6 text-center text-sm text-[#8FA1A8]">Your payment details are being set up. We’ll notify you when they’re ready.</div>
        ) : (
          <fieldset className="space-y-3">
            <legend className="sr-only">Choose payment method</legend>
            {methods.map(item => <label key={item.id} className={`flex cursor-pointer items-center gap-3 rounded-2xl border bg-[#121A1F] p-4 ${method === item.method ? 'border-[#6FD8B0] bg-[#0F1A18]' : 'border-[#1F2C33]'}`}>
              <input type="radio" name="deposit-method" value={item.method} checked={method === item.method} onChange={() => setMethod(item.method)} className="size-5 accent-[#6FD8B0]" />
              <span className="min-w-0 flex-1 text-sm font-semibold">{methodLabel(item.method)}</span>
            </label>)}
          </fieldset>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setStep(1)} className="h-12 rounded-[14px] border border-[#1F2C33] font-semibold">Back</button>
          <button type="button" disabled={methods.length === 0 || !selected} onClick={continueToReview} className="h-12 rounded-[14px] bg-[#6FD8B0] font-bold text-[#07231A] disabled:opacity-40">Review deposit</button>
        </div>
      </section>}

      {step === 3 && selected && amountCents !== null && <section className="space-y-4">
        <div><h3 className="text-2xl font-bold">Review deposit</h3><p className="mt-1 text-[13px] text-[#8FA1A8]">Check the amount and payment method before confirming.</p></div>
        <dl className="divide-y divide-[#1F2C33] rounded-2xl border border-[#1F2C33] bg-[#121A1F] text-sm">
          <div className="flex justify-between gap-3 p-3.5"><dt className="text-[#8FA1A8]">Amount</dt><dd className="font-semibold">{money(amountCents)}</dd></div>
          <div className="flex justify-between gap-3 p-3.5"><dt className="text-[#8FA1A8]">Method</dt><dd className="text-right font-semibold">{methodLabel(selected.method)}</dd></div>
        </dl>
        {selected.method === 'usdt' && <p className="text-xs leading-relaxed text-[#8FA1A8]">You’ll send USDT and we’ll credit your wallet in EUR at the rate when your payment is confirmed. The final amount may differ from this estimate.</p>}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={busy} onClick={() => setStep(2)} className="h-12 rounded-[14px] border border-[#1F2C33] font-semibold disabled:opacity-40">Back</button>
          <button type="button" disabled={busy || !isVerified} onClick={confirmDeposit} className="h-12 rounded-[14px] bg-[#6FD8B0] font-bold text-[#07231A] disabled:opacity-40">{busy ? 'Submitting…' : 'Confirm deposit'}</button>
        </div>
      </section>}

      {step === 4 && submitted && <section className="space-y-4 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-[#6FD8B0]/15 text-[#6FD8B0] text-2xl">✓</div>
        <div><h3 className="text-2xl font-bold">Deposit request submitted</h3><p className="mt-1 text-[13px] text-[#8FA1A8]">Your request is pending payment confirmation. Your wallet will update after approval.</p></div>
        <div className="space-y-2 rounded-2xl border border-[#1F2C33] bg-[#121A1F] p-4 text-left text-sm">
          <div className="flex justify-between gap-3"><span className="text-[#8FA1A8]">Reference</span><b className="break-all">{submitted.reference}</b></div>
          <div className="flex justify-between"><span className="text-[#8FA1A8]">Amount</span><b>{money(submitted.amount)}</b></div>
          <div className="flex justify-between"><span className="text-[#8FA1A8]">Method</span><b>{submitted.payment_method}</b></div>
          <div className="flex justify-between"><span className="text-[#8FA1A8]">Status</span><b className="text-amber-300">Pending</b></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => { close(); onNavigateTransactions?.(); }} className="h-12 rounded-[14px] border border-[#1F2C33] font-semibold">View ledger</button>
          <button type="button" onClick={close} className="h-12 rounded-[14px] bg-[#6FD8B0] font-bold text-[#07231A]">Done</button>
        </div>
      </section>}
    </div>
  </div>;
};
