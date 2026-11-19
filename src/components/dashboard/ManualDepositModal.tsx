import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { getApiUrl, getAuthToken } from '../../lib/api';
import { isSupabaseConfigured, supabase } from '../../lib/supabaseClient';
import { portalApi } from '../../portal/services/portalApi';

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
  const [qrCode, setQrCode] = useState('');
  const [transactionHash, setTransactionHash] = useState('');
  const [hashBusy, setHashBusy] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofBusy, setProofBusy] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const confirmationLock = useRef(false);
  const lockRef = useRef(false);

  const selected = methods.find(item => item.method === method);
  const amountCents = parseEurCents(amount);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setStep(1);
    setError('');
    setSubmitted(null);
    setAmount('');
    setMethod('');
    setLoadingMethods(true);
    portalApi
      .getAssignedPaymentMethods()
      .then((available) => {
        if (cancelled) return;
        setMethods(available);
        if (available.length === 1) setMethod(available[0].method);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || 'Unable to load your assigned payment methods.');
      })
      .finally(() => {
        if (!cancelled) setLoadingMethods(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    let cancelled = false;
    const address = selected?.method === 'usdt' ? selected.wallet_address?.trim() : '';
    if (step !== 4 || !address) { setQrCode(''); return; }
    QRCode.toDataURL(address, { width: 240, margin: 2, errorCorrectionLevel: 'M' })
      .then(value => { if (!cancelled) setQrCode(value); })
      .catch(() => { if (!cancelled) setQrCode(''); });
    return () => { cancelled = true; };
  }, [step, selected?.method, selected?.wallet_address]);

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

  const hasActiveSupabaseSession = async (): Promise<boolean> => {
    if (!isSupabaseConfigured()) return false;
    try {
      const { data } = await supabase.auth.getSession();
      return Boolean(data?.session?.access_token);
    } catch {
      return false;
    }
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
    lockRef.current = true;
    setBusy(true);
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
      setStep(4);
      onSuccess();
    } catch (e: any) {
      const code = String(e?.message || e?.code || '');
      if (code.includes('PAYMENT_METHOD_NOT_ASSIGNED') || code.includes('PAYMENT_METHOD_UNAVAILABLE')) {
        setError('This payment option is not set up for your account yet. Please refresh or contact support.');
      } else if (code.includes('AMOUNT_OUT_OF_RANGE')) {
        setError('The amount is outside this payment method’s allowed limits.');
      } else if (code.includes('LEGAL') || code.includes('consent')) {
        setError('Please review and accept the latest legal terms before requesting a deposit.');
      } else {
        setError(e?.message || 'Your deposit request could not be submitted. Please retry.');
      }
    } finally {
      lockRef.current = false;
      setBusy(false);
    }
  };


  const copyValue = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setConfirmationMessage(`${label} copied.`);
    } catch {
      setError(`Unable to copy ${label.toLowerCase()}. Please select and copy it manually.`);
    }
  };

  const submitTransactionHash = async () => {
    if (!submitted?.id || confirmationLock.current || hashBusy) return;
    const hash = transactionHash.trim();
    if (!/^(0x)?[a-fA-F0-9]{64}$/.test(hash)) {
      setError('Enter a valid 64-character transaction hash.');
      return;
    }
    confirmationLock.current = true;
    setHashBusy(true);
    setError('');
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
    } catch (e: any) {
      const message = String(e?.message || '');
      if (message.includes('TRANSACTION_HASH_ALREADY_USED')) setError('This transaction ID has already been used.');
      else if (message.includes('INVALID_TRANSACTION_HASH')) setError('That transaction ID looks invalid. Check it and try again.');
      else if (message.includes('DEPOSIT_NOT_PENDING_OR_NOT_OWNED')) setError('This deposit is no longer pending or does not belong to your account.');
      else setError(message || 'The transaction ID could not be submitted. Please retry.');
    } finally {
      confirmationLock.current = false;
      setHashBusy(false);
    }
  };

  const uploadProof = async () => {
    if (!submitted?.id || !proofFile || proofBusy) return;
    if (!['image/jpeg', 'image/png', 'application/pdf'].includes(proofFile.type)) {
      setError('Choose a JPG, PNG or PDF proof file.');
      return;
    }
    if (proofFile.size > 10 * 1024 * 1024) {
      setError('Proof files must be 10 MB or smaller.');
      return;
    }
    setProofBusy(true);
    setError('');
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
    } catch (e: any) {
      if (uploadedPath) await supabase.storage.from('proofs').remove([uploadedPath]).catch(() => undefined);
      setError(e?.message || 'The proof file could not be uploaded. Please retry.');
    } finally {
      setProofBusy(false);
    }
  };

  const close = () => {
    setStep(1);
    setSubmitted(null);
    setTransactionHash('');
    setProofFile(null);
    setQrCode('');
    setConfirmationMessage('');
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
        <button type="button" onClick={close} aria-label="Close deposit" className="grid size-11 shrink-0 place-items-center rounded-xl border border-[#1F2C33] text-xl text-[#8FA1A8] hover:text-white">×</button>
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
        <div className="grid grid-cols-4 gap-2">{[100,500,1000,5000].map(value => <button key={value} type="button" onClick={() => setAmount(String(value))} className="h-11 rounded-xl border border-[#1F2C33] bg-[#121A1F] text-xs font-semibold hover:border-[#6FD8B0]">{money(value).replace(/\.00$/, '')}</button>)}</div>
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
              <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{methodLabel(item.method)}</span><span className="mt-0.5 block text-xs text-[#8FA1A8]">{money(item.minimum_amount)} minimum · {item.maximum_amount == null ? 'No maximum listed' : `${money(item.maximum_amount)} maximum`}</span></span>
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
          <div className="flex justify-between gap-3 p-3.5"><dt className="text-[#8FA1A8]">Method</dt><dd className="text-right font-semibold">{selected.name || methodLabel(selected.method)}</dd></div>
          {selected.method === 'usdt' && <>
            <div className="flex justify-between gap-3 p-3.5"><dt className="text-[#8FA1A8]">Token</dt><dd className="font-semibold">USDT</dd></div>
            <div className="flex justify-between gap-3 p-3.5"><dt className="text-[#8FA1A8]">Network</dt><dd className="text-right font-semibold">{selected.network || 'Network not specified'}</dd></div>
            <div className="p-3.5"><dt className="mb-1 text-[#8FA1A8]">Wallet address</dt><dd className="break-all font-mono text-xs leading-5">{selected.wallet_address || 'Address not configured'}</dd></div>
          </>}
          {selected.detail_rows?.map((row, index) => <div key={index} className="flex flex-col gap-1 p-3.5"><dt className="text-[#8FA1A8]">{row.label}</dt><dd className="break-all font-semibold">{row.value}</dd></div>)}
          {selected.instructions ? <div className="p-3.5"><dt className="mb-1 text-[#8FA1A8]">Instructions</dt><dd className="whitespace-pre-wrap text-xs leading-relaxed">{selected.instructions}</dd></div> : null}
          <div className="flex justify-between gap-3 p-3.5"><dt className="text-[#8FA1A8]">Minimum</dt><dd className="font-semibold">{money(selected.minimum_amount)}</dd></div>
          <div className="flex justify-between gap-3 p-3.5"><dt className="text-[#8FA1A8]">Maximum</dt><dd className="font-semibold">{selected.maximum_amount == null ? 'No maximum listed' : money(selected.maximum_amount)}</dd></div>
        </dl>
        {selected.method === 'usdt' && <p className="text-xs leading-relaxed text-[#8FA1A8]">You’ll send USDT and we’ll credit your wallet in EUR at the rate when your payment is confirmed. The final amount may differ from this estimate.</p>}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={busy} onClick={() => setStep(2)} className="h-12 rounded-[14px] border border-[#1F2C33] font-semibold disabled:opacity-40">Back</button>
          <button type="button" disabled={busy || !isVerified} onClick={confirmDeposit} className="h-12 rounded-[14px] bg-[#6FD8B0] font-bold text-[#07231A] disabled:opacity-40">{busy ? 'Submitting…' : 'Confirm deposit'}</button>
        </div>
      </section>}

      {step === 4 && submitted && <section className="space-y-4">
        <div className="text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-[#6FD8B0]/15 text-[#6FD8B0] text-2xl">✓</div>
          <h3 className="mt-2 text-2xl font-bold">Complete your payment</h3>
          <p className="mt-1 text-[13px] text-[#8FA1A8]">Your deposit request is recorded. Follow the payment instructions below.</p>
        </div>

        {selected?.method === 'usdt' ? (
          <div className="space-y-4">
            <div role="alert" className="rounded-2xl border-2 border-amber-400 bg-amber-400/10 p-4 text-sm font-bold leading-relaxed text-amber-200">
              Send only USDT on the {selected.network || 'assigned'} network. Funds sent on any other network or coin may be lost and cannot be recovered.
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-[#8FA1A8]">NETWORK</span>
              <span className="rounded-full border border-amber-300/40 bg-amber-300/10 px-3 py-1 text-xs font-bold text-amber-200">{selected.network || 'Network not specified'}</span>
            </div>
            <div className="rounded-2xl border border-[#1F2C33] bg-[#121A1F] p-4">
              <p className="mb-2 text-xs font-semibold text-[#8FA1A8]">USDT WALLET ADDRESS</p>
              <p className="break-all font-mono text-sm leading-7 text-white">{(selected.wallet_address || '').replace(/(.{4})/g, '$1 ').trim()}</p>
              <button type="button" onClick={() => copyValue(selected.wallet_address || '', 'Wallet address')} className="mt-3 h-11 w-full rounded-xl border border-[#6FD8B0]/50 font-semibold text-[#6FD8B0]">Copy wallet address</button>
            </div>
            {qrCode && <div className="flex flex-col items-center rounded-2xl border border-[#1F2C33] bg-white p-4">
              <img src={qrCode} alt="QR code for the USDT wallet address" className="size-52 max-w-full" />
              <span className="mt-2 text-xs font-semibold text-slate-700">Scan to copy wallet address</span>
            </div>}
            {submitted.estimated_usdt_amount != null && <div className="rounded-xl border border-[#1F2C33] p-3 text-sm"><span className="text-[#8FA1A8]">Estimated USDT amount</span><p className="mt-1 text-lg font-bold">{submitted.estimated_usdt_amount} USDT</p></div>}
            <div className="rounded-xl border border-[#6FD8B0]/40 bg-[#6FD8B0]/5 p-3">
              <p className="text-xs text-[#8FA1A8]">PAYMENT REFERENCE</p>
              <p className="mt-1 break-all text-lg font-extrabold tracking-wide text-[#6FD8B0]">{submitted.reference}</p>
              <button type="button" onClick={() => copyValue(submitted.reference, 'Payment reference')} className="mt-2 h-10 rounded-lg border border-[#6FD8B0]/50 px-4 text-sm font-semibold text-[#6FD8B0]">Copy reference</button>
            </div>
            <div className="space-y-2 rounded-2xl border border-[#1F2C33] bg-[#121A1F] p-4">
              <label htmlFor="usdt-transaction-hash" className="block text-sm font-semibold">Paste your transaction ID (optional but speeds up approval)</label>
              <input id="usdt-transaction-hash" value={transactionHash} onChange={e => setTransactionHash(e.target.value)} placeholder="Transaction hash" autoComplete="off" className="h-12 w-full rounded-xl border border-[#1F2C33] bg-[#0B0F10] px-3 font-mono text-sm outline-none focus:border-[#6FD8B0]" />
              <button type="button" disabled={hashBusy || !transactionHash.trim()} onClick={submitTransactionHash} className="h-11 w-full rounded-xl bg-[#6FD8B0] font-bold text-[#07231A] disabled:opacity-40">{hashBusy ? 'Submitting…' : 'Submit transaction ID'}</button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 rounded-2xl border border-[#1F2C33] bg-[#121A1F] p-4">
            <h4 className="font-bold">{selected?.name || 'Bank transfer (SEPA)'}</h4>
            {selected?.detail_rows?.map((detail, index) => <div key={`${detail.label}-${index}`} className="flex items-start justify-between gap-3 border-b border-[#1F2C33] py-2 text-sm">
              <span className="shrink-0 text-[#8FA1A8]">{detail.label}</span>
              <span className="min-w-0 break-all text-right font-semibold">{detail.value}</span>
              <button type="button" aria-label={`Copy ${detail.label}`} onClick={() => copyValue(detail.value, detail.label)} className="h-11 shrink-0 rounded-lg border border-[#6FD8B0]/40 px-2 text-xs font-semibold text-[#6FD8B0]">Copy</button>
            </div>)}
            {selected?.instructions && <div className="pt-2 text-sm leading-relaxed text-[#C2CFD2]"><p className="mb-1 font-semibold">Instructions</p>{selected.instructions}</div>}
            <div className="rounded-xl border-2 border-[#6FD8B0] bg-[#6FD8B0]/10 p-3">
              <p className="text-xs font-bold tracking-wide text-[#6FD8B0]">REQUIRED PAYMENT REFERENCE — INCLUDE THIS IN YOUR TRANSFER</p>
              <p className="mt-1 break-all text-lg font-extrabold text-white">{submitted.reference}</p>
              <button type="button" onClick={() => copyValue(submitted.reference, 'Payment reference')} className="mt-2 h-10 rounded-lg border border-[#6FD8B0]/50 px-4 text-sm font-semibold text-[#6FD8B0]">Copy reference</button>
            </div>
          </div>
        )}

        <div className="space-y-2 rounded-2xl border border-dashed border-[#1F2C33] p-4">
          <label htmlFor="deposit-proof-file" className="block text-sm font-semibold">Upload payment proof (optional)</label>
          <input id="deposit-proof-file" type="file" accept="image/jpeg,image/png,application/pdf" onChange={e => setProofFile(e.target.files?.[0] || null)} className="block w-full text-xs text-[#8FA1A8] file:mr-3 file:rounded-lg file:border-0 file:bg-[#1F2C33] file:px-3 file:py-2 file:text-white" />
          <p className="text-xs text-[#8FA1A8]">JPG, PNG or PDF · maximum 10 MB · stored privately</p>
          <button type="button" disabled={!proofFile || proofBusy} onClick={uploadProof} className="h-11 w-full rounded-xl border border-[#6FD8B0]/50 font-semibold text-[#6FD8B0] disabled:opacity-40">{proofBusy ? 'Uploading securely…' : 'Upload proof'}</button>
        </div>

        {confirmationMessage && <p role="status" className="text-sm text-[#6FD8B0]">{confirmationMessage}</p>}
        <div className="rounded-xl border border-amber-300/30 bg-amber-300/5 p-3 text-sm font-semibold text-amber-200">Pending: we’ll credit your wallet after the payment is confirmed.</div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => { close(); onNavigateTransactions?.(); }} className="h-12 rounded-[14px] border border-[#1F2C33] font-semibold">View ledger</button>
          <button type="button" onClick={close} className="h-12 rounded-[14px] bg-[#6FD8B0] font-bold text-[#07231A]">Done</button>
        </div>
      </section>}
    </div>
  </div>;
};
