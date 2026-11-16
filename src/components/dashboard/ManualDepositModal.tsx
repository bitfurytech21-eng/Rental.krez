import React, { useEffect, useRef, useState } from 'react';
import { getApiUrl, getAuthToken } from '../../lib/api';

type ManualMethod = {
  id: string; name: string; logo_url?: string | null; instructions: string;
  account_details: Record<string, string>; minimum_amount: number; maximum_amount: number | null;
  fee_type: 'none' | 'fixed' | 'percent'; fee_value: number;
  extra_fields: Array<{key:string;label:string;required?:boolean}>;
};
interface Props {
  isOpen: boolean; onClose: () => void; onSuccess: () => void;
  onNavigateTransactions?: () => void; onNavigateCompliance?: () => void;
  isVerified?: boolean;
}
type Step = 1 | 2 | 3 | 4;

export const ManualDepositModal: React.FC<Props> = ({
  isOpen, onClose, onSuccess, onNavigateTransactions, onNavigateCompliance, isVerified = true
}) => {
  const [methods, setMethods] = useState<ManualMethod[]>([]);
  const [methodId, setMethodId] = useState('');
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<Step>(1);
  const [transactionId, setTransactionId] = useState('');
  const [senderName, setSenderName] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0,10));
  const [extraValues, setExtraValues] = useState<Record<string,string>>({});
  const [proof, setProof] = useState<File | null>(null);
  const [proofData, setProofData] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingMethods, setLoadingMethods] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const token = getAuthToken();
  const headers: HeadersInit = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const selected = methods.find(m => m.id === methodId);
  const numericAmount = Number(amount);
  const fee = selected ? selected.fee_type === 'fixed' ? Number(selected.fee_value) : selected.fee_type === 'percent' ? numericAmount * Number(selected.fee_value) / 100 : 0 : 0;
  const money = (value: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(value);

  useEffect(() => {
    if (!isOpen) return;
    setStep(1); setError(''); setSubmitted(null); setAmount(''); setProof(null); setProofData('');
    setTransactionId(''); setSenderName(''); setExtraValues({});
    setLoadingMethods(true);
    fetch(getApiUrl('/manual-payments/methods'), { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(async response => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Unable to load payment methods.');
        const available = payload.data || [];
        setMethods(available);
        if (available.length) setMethodId(available[0].id);
      })
      .catch(e => setError(e.message || 'Unable to load payment methods.'))
      .finally(() => setLoadingMethods(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const chooseFile = (file?: File) => {
    setError('');
    if (!file) { setProof(null); setProofData(''); return; }
    const allowed = ['image/jpeg','image/png','image/webp','application/pdf'];
    if (!allowed.includes(file.type)) { setError('Upload a JPG, PNG, WEBP, or PDF file.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Proof files must be 5 MB or smaller.'); return; }
    const reader = new FileReader();
    reader.onload = () => { setProof(file); setProofData(String(reader.result || '')); };
    reader.onerror = () => setError('The proof file could not be read.');
    reader.readAsDataURL(file);
  };

  const continueToMethod = () => {
    setError('');
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return setError('Enter a valid deposit amount.');
    if (!isVerified) return setError('Complete identity verification before making a deposit.');
    setStep(2);
  };
  const continueToReview = () => {
    setError('');
    if (!selected) return setError('No payment method is available. Please try again later.');
    if (numericAmount < Number(selected.minimum_amount) || (selected.maximum_amount && numericAmount > Number(selected.maximum_amount))) {
      return setError(`Amount must be between ${money(Number(selected.minimum_amount))} and ${selected.maximum_amount ? money(Number(selected.maximum_amount)) : 'the allowed maximum'}.`);
    }
    setStep(3);
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    if (!selected) return setError('Select an available payment method.');
    if (!proof || !proofData) return setError('Upload proof of payment before submitting.');
    if (!transactionId.trim() || !senderName.trim()) return setError('Enter the sender name and payment transaction ID.');
    setBusy(true);
    try {
      const response = await fetch(getApiUrl('/manual-payments/deposits'), {
        method: 'POST', headers,
        body: JSON.stringify({
          methodId, amount: numericAmount, transactionId: transactionId.trim(),
          senderName: senderName.trim(), paymentDate, proofBase64: proofData,
          proofMimeType: proof.type, extraValues
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Your deposit could not be submitted.');
      setSubmitted(payload.data); setStep(4); onSuccess();
    } catch (e: any) { setError(e.message || 'Your deposit could not be submitted.'); }
    finally { setBusy(false); }
  };

  const close = () => { setStep(1); setSubmitted(null); setError(''); onClose(); };
  const copy = (value: string) => { if (navigator.clipboard?.writeText) navigator.clipboard.writeText(value); };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm">
    <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-[22px] border border-[#1F2C33] bg-[#0B0F10] p-5 text-[#F2F5F4] shadow-2xl sm:p-6">
      <header className="mb-5 flex items-start justify-between gap-3">
        <div><p className="text-[10px] font-bold tracking-[.16em] text-[#8FA1A8]">INVESTOR PORTAL · WALLET</p><h2 className="mt-1 text-xl font-bold">Deposit funds</h2><p className="mt-1 text-xs text-[#8FA1A8]">Your wallet is credited after finance verifies your payment.</p></div>
        <button type="button" onClick={close} aria-label="Close deposit" className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#1F2C33] text-xl text-[#8FA1A8] hover:text-white">×</button>
      </header>

      <div className="mb-5 flex gap-1.5" aria-label={`Step ${step} of 4`}>
        {[1,2,3,4].map(n=><span key={n} className={`h-1.5 flex-1 rounded-full ${n <= step ? 'bg-[#6FD8B0]' : 'bg-[#1F2C33]'}`} />)}
      </div>
      {error && <p role="alert" className="mb-4 rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-[13px] text-rose-300">{error}</p>}

      {!isVerified && step !== 4 && <div className="mb-4 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-[13px]">
        <p className="font-semibold text-amber-300">Verification required</p>
        <p className="mt-1 text-[#8FA1A8]">Complete identity verification before depositing funds.</p>
        <button type="button" onClick={() => { close(); onNavigateCompliance?.(); }} className="mt-3 h-10 rounded-lg border border-amber-300/50 px-4 font-semibold text-amber-300">Go to Compliance Vault</button>
      </div>}

      {step === 1 && <section className="space-y-4">
        <div><h3 className="text-2xl font-bold">How much?</h3><p className="mt-1 text-[13px] text-[#8FA1A8]">Funds are added to your wallet after payment verification.</p></div>
        <label className="flex h-20 items-center rounded-2xl border border-[#1F2C33] bg-[#121A1F] px-5 focus-within:border-[#6FD8B0]">
          <span className="text-3xl font-bold text-[#8FA1A8]">€</span><input aria-label="Deposit amount in euros" inputMode="decimal" type="number" min="0.01" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00" className="h-full min-w-0 flex-1 bg-transparent pl-3 text-4xl font-bold outline-none placeholder:text-[#8FA1A8]/40" />
        </label>
        <div className="grid grid-cols-4 gap-2">{[100,500,1000,5000].map(v=><button key={v} type="button" onClick={()=>setAmount(String(v))} className="h-10 rounded-xl border border-[#1F2C33] bg-[#121A1F] text-xs font-semibold hover:border-[#6FD8B0]">{money(v).replace('.00','')}</button>)}</div>
        <p className="text-xs text-[#8FA1A8]">Minimum and maximum limits depend on the payment method selected next.</p>
        <button type="button" disabled={!isVerified || !amount || loadingMethods} onClick={continueToMethod} className="h-12 w-full rounded-[14px] bg-[#6FD8B0] font-bold text-[#07231A] disabled:cursor-not-allowed disabled:opacity-40">{loadingMethods ? 'Loading payment methods…' : 'Continue'}</button>
      </section>}

      {step === 2 && <section className="space-y-4">
        <div><h3 className="text-2xl font-bold">Payment method</h3><p className="mt-1 text-[13px] text-[#8FA1A8]">Choose from the payment methods currently enabled by the platform.</p></div>
        {methods.length === 0 ? <div className="rounded-2xl border border-dashed border-[#1F2C33] p-6 text-center text-sm text-[#8FA1A8]">No deposit methods are currently available. Please try again later.</div> :
          <fieldset className="space-y-3"><legend className="sr-only">Choose payment method</legend>{methods.map(m=><label key={m.id} className={`flex cursor-pointer items-center gap-3 rounded-2xl border bg-[#121A1F] p-4 ${methodId===m.id?'border-[#6FD8B0] bg-[#0F1A18]':'border-[#1F2C33]'}`}>
            <input type="radio" name="deposit-method" value={m.id} checked={methodId===m.id} onChange={()=>setMethodId(m.id)} className="size-5 accent-[#6FD8B0]" />
            <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{m.name}</span><span className="mt-0.5 block text-xs text-[#8FA1A8]">{money(Number(m.minimum_amount))} minimum · {m.maximum_amount ? money(Number(m.maximum_amount))+' maximum' : 'No maximum listed'}</span></span>
            <span className="text-xs text-[#8FA1A8]">{m.fee_type==='none'?'No fee':m.fee_type==='fixed'?money(Number(m.fee_value)):`${m.fee_value}% fee`}</span>
          </label>)}</fieldset>}
        <div className="grid grid-cols-2 gap-2"><button type="button" onClick={()=>setStep(1)} className="h-12 rounded-[14px] border border-[#1F2C33] font-semibold">Back</button><button type="button" disabled={!selected} onClick={continueToReview} className="h-12 rounded-[14px] bg-[#6FD8B0] font-bold text-[#07231A] disabled:opacity-40">Review deposit</button></div>
      </section>}

      {step === 3 && selected && <form onSubmit={submit} className="space-y-4">
        <div><h3 className="text-2xl font-bold">Review deposit</h3><p className="mt-1 text-[13px] text-[#8FA1A8]">Follow the payment instructions and submit your proof for review.</p></div>
        <dl className="divide-y divide-[#1F2C33] rounded-2xl border border-[#1F2C33] bg-[#121A1F] text-sm">
          <div className="flex justify-between gap-3 p-3.5"><dt className="text-[#8FA1A8]">Amount</dt><dd className="font-semibold">{money(numericAmount)}</dd></div>
          <div className="flex justify-between gap-3 p-3.5"><dt className="text-[#8FA1A8]">Method</dt><dd className="text-right font-semibold">{selected.name}</dd></div>
          <div className="flex justify-between gap-3 p-3.5"><dt className="text-[#8FA1A8]">Limits</dt><dd className="font-mono text-xs text-[#8FA1A8]">{money(Number(selected.minimum_amount))} – {selected.maximum_amount ? money(Number(selected.maximum_amount)) : 'No cap'}</dd></div>
          <div className="flex justify-between gap-3 p-3.5"><dt className="text-[#8FA1A8]">Fee</dt><dd className="font-semibold">{money(fee)}</dd></div>
          <div className="flex justify-between gap-3 p-3.5"><dt className="font-semibold">Total to pay</dt><dd className="font-bold text-[#6FD8B0]">{money(numericAmount+fee)}</dd></div>
        </dl>
        <div className="space-y-3 rounded-2xl border border-[#1F2C33] bg-[#121A1F] p-4">
          <h4 className="text-sm font-semibold">Transfer &amp; Wallet Instructions</h4>
          {Object.entries(selected.account_details || {}).map(([key,value])=><div key={key} className="flex items-center justify-between gap-3 text-xs"><span className="text-[#8FA1A8]">{key}</span><span className="flex items-center gap-2 text-right font-semibold break-all font-mono">{String(value)}<button type="button" onClick={()=>copy(String(value))} className="shrink-0 text-[#6FD8B0] cursor-pointer hover:underline">Copy</button></span></div>)}
          <p className="whitespace-pre-wrap text-xs leading-relaxed text-[#8FA1A8]">{selected.instructions}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs text-[#8FA1A8]">Sender name<input required value={senderName} onChange={e=>setSenderName(e.target.value)} className="mt-1 h-11 w-full rounded-lg border border-[#1F2C33] bg-[#0B0F10] px-3 text-sm text-[#F2F5F4]" /></label>
          <label className="block text-xs text-[#8FA1A8]">Payment date<input required type="date" value={paymentDate} onChange={e=>setPaymentDate(e.target.value)} className="mt-1 h-11 w-full rounded-lg border border-[#1F2C33] bg-[#0B0F10] px-3 text-sm text-[#F2F5F4]" /></label>
        </div>
        <label className="block text-xs text-[#8FA1A8]">Bank reference / on-chain transaction hash<input required minLength={4} maxLength={120} value={transactionId} onChange={e=>setTransactionId(e.target.value)} placeholder="e.g. SEPA-2026... or 5xK...txHash" className="mt-1 h-11 w-full rounded-lg border border-[#1F2C33] bg-[#0B0F10] px-3 text-sm font-mono text-[#F2F5F4]" /></label>
        {selected.extra_fields?.map(field=><label key={field.key} className="block text-xs text-[#8FA1A8]">{field.label}<input required={Boolean(field.required)} value={extraValues[field.key]||''} onChange={e=>setExtraValues(prev=>({...prev,[field.key]:e.target.value}))} className="mt-1 h-11 w-full rounded-lg border border-[#1F2C33] bg-[#0B0F10] px-3 text-sm text-[#F2F5F4]" /></label>)}
        <label className="block text-xs text-[#8FA1A8]">Proof of payment (JPG, PNG, WEBP or PDF · max 5 MB)<input ref={fileRef} required type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={e=>chooseFile(e.target.files?.[0])} className="mt-1 w-full rounded-xl border border-dashed border-[#2F4650] p-3 text-xs text-[#F2F5F4]" /></label>
        {proof && <p className="text-xs text-[#6FD8B0]">{proof.name} · {(proof.size/1024).toFixed(0)} KB</p>}
        <div className="grid grid-cols-2 gap-2"><button type="button" onClick={()=>setStep(2)} className="h-12 rounded-[14px] border border-[#1F2C33] font-semibold cursor-pointer">Back</button><button type="submit" disabled={busy || !proof || !isVerified} className="h-12 rounded-[14px] bg-[#6FD8B0] font-bold text-[#07231A] disabled:opacity-40 cursor-pointer">{busy?'Submitting…':'Confirm deposit'}</button></div>
        <p className="text-center text-[11px] leading-relaxed text-[#8FA1A8]">Your wallet is not credited at submission. Funds are added only after finance or blockchain settlement is verified.</p>
      </form>}

      {step === 4 && submitted && <section className="space-y-4 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-[#6FD8B0]/15 text-[#6FD8B0] text-2xl">✓</div>
        <div><h3 className="text-2xl font-bold">Deposit submitted</h3><p className="mt-1 text-[13px] text-[#8FA1A8]">Your payment proof has been sent for finance verification.</p></div>
        <div className="space-y-2 rounded-2xl border border-[#1F2C33] bg-[#121A1F] p-4 text-left text-sm">
          <div className="flex justify-between gap-3"><span className="text-[#8FA1A8]">Reference</span><b className="break-all">{submitted.reference}</b></div>
          <div className="flex justify-between"><span className="text-[#8FA1A8]">Amount</span><b>{money(Number(submitted.amount))}</b></div>
          <div className="flex justify-between"><span className="text-[#8FA1A8]">Status</span><b className="text-amber-300">Pending verification</b></div>
        </div>
        <p className="text-xs text-[#8FA1A8]">Your wallet balance will update only after the deposit is approved.</p>
        <div className="grid grid-cols-2 gap-2"><button type="button" onClick={()=>{close();onNavigateTransactions?.();}} className="h-12 rounded-[14px] border border-[#1F2C33] font-semibold">View ledger</button><button type="button" onClick={close} className="h-12 rounded-[14px] bg-[#6FD8B0] font-bold text-[#07231A]">Done</button></div>
      </section>}
    </div>
  </div>;
};
