import React, { useEffect, useRef, useState } from 'react';
import { getApiUrl, getAuthToken } from '../../lib/api';

type ManualMethod = {
  id: string; name: string; logo_url?: string | null; instructions: string;
  account_details: Record<string, string>; minimum_amount: number; maximum_amount: number | null;
  fee_type: 'none' | 'fixed' | 'percent'; fee_value: number; extra_fields: Array<{key:string;label:string;required?:boolean}>;
};

interface Props { isOpen: boolean; onClose: () => void; onSuccess: () => void; onNavigateTransactions?: () => void; }

export const ManualDepositModal: React.FC<Props> = ({ isOpen, onClose, onSuccess, onNavigateTransactions }) => {
  const [methods, setMethods] = useState<ManualMethod[]>([]);
  const [methodId, setMethodId] = useState('');
  const [amount, setAmount] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [senderName, setSenderName] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0,10));
  const [extraValues, setExtraValues] = useState<Record<string,string>>({});
  const [proof, setProof] = useState<File | null>(null);
  const [proofData, setProofData] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const token = getAuthToken();
  const headers: HeadersInit = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const selected = methods.find(m => m.id === methodId);
  const fee = selected ? selected.fee_type === 'fixed' ? Number(selected.fee_value) : selected.fee_type === 'percent' ? Number(amount || 0) * Number(selected.fee_value) / 100 : 0 : 0;

  useEffect(() => {
    if (!isOpen) return;
    setError(''); setSubmitted(null);
    fetch(getApiUrl('/manual-payments/methods'), { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(async response => { const payload = await response.json(); if (!response.ok) throw new Error(payload.error || 'Unable to load payment methods.'); setMethods(payload.data || []); if (payload.data?.length) setMethodId(payload.data[0].id); })
      .catch(e => setError(e.message || 'Unable to load payment methods.'));
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

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    if (!selected) return setError('Select an available payment method.');
    if (!proof || !proofData) return setError('Upload proof of payment before submitting.');
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount < Number(selected.minimum_amount) || (selected.maximum_amount && numericAmount > Number(selected.maximum_amount))) return setError('Amount is outside the selected payment method limits.');
    setBusy(true);
    try {
      const response = await fetch(getApiUrl('/manual-payments/deposits'), {
        method: 'POST', headers,
        body: JSON.stringify({ methodId, amount: numericAmount, transactionId, senderName, paymentDate, proofBase64: proofData, proofMimeType: proof.type, extraValues })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Your deposit could not be submitted.');
      setSubmitted(payload.data); onSuccess();
    } catch (e: any) { setError(e.message || 'Your deposit could not be submitted.'); }
    finally { setBusy(false); }
  };

  return <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
    <div className="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl border border-[#303030] bg-[#101313] text-white p-5 sm:p-7">
      <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold">Manual bank / payment deposit</h2><p className="text-xs text-gray-400 mt-1">Your wallet is credited only after finance verifies your payment.</p></div><button onClick={onClose} className="text-gray-400 hover:text-white text-xl" aria-label="Close">×</button></div>
      {error && <p role="alert" className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">{error}</p>}
      {submitted ? <div className="mt-6 space-y-3"><div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4"><h3 className="font-bold text-emerald-300">Payment proof submitted</h3><p className="text-xs text-gray-200 mt-2">Reference: <b>{submitted.reference}</b></p><p className="text-xs text-gray-300 mt-1">Amount: €{Number(submitted.amount).toFixed(2)} · Status: Pending verification</p></div><button onClick={()=>{onClose();onNavigateTransactions?.();}} className="w-full rounded-lg bg-white text-black font-bold text-sm p-3">View transaction history</button></div> :
      <form onSubmit={submit} className="mt-5 space-y-4">
        <label className="block text-xs font-semibold text-gray-300">Payment method<select required value={methodId} onChange={e=>setMethodId(e.target.value)} className="mt-1 w-full rounded-lg bg-[#1c2422] border border-[#39433f] p-3 text-sm">{methods.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
        {selected && <div className="rounded-xl border border-[#39433f] bg-[#1a211f] p-4 space-y-3"><h3 className="text-sm font-bold">{selected.name} instructions</h3>{Object.entries(selected.account_details || {}).map(([key,value])=><div key={key} className="flex justify-between gap-3 text-xs"><span className="text-gray-400">{key}</span><b className="text-right break-all">{String(value)}</b></div>)}<div className="text-xs text-gray-200 whitespace-pre-wrap leading-relaxed">{selected.instructions}</div><p className="text-[11px] text-amber-200">Limits: €{Number(selected.minimum_amount).toFixed(2)} – {selected.maximum_amount ? `€${Number(selected.maximum_amount).toFixed(2)}` : 'No maximum'}</p></div>}
        <label className="block text-xs font-semibold text-gray-300">Amount (EUR)<input required type="number" min={selected?.minimum_amount || 0.01} max={selected?.maximum_amount || undefined} step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} className="mt-1 w-full rounded-lg bg-[#1c2422] border border-[#39433f] p-3 text-sm" /></label>
        <div className="rounded-lg bg-[#1a211f] p-3 text-xs flex justify-between"><span className="text-gray-400">Payment fee</span><b>€{fee.toFixed(2)}</b></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><label className="block text-xs font-semibold text-gray-300">Sender name<input required value={senderName} onChange={e=>setSenderName(e.target.value)} className="mt-1 w-full rounded-lg bg-[#1c2422] border border-[#39433f] p-3 text-sm" /></label><label className="block text-xs font-semibold text-gray-300">Payment date<input required type="date" value={paymentDate} onChange={e=>setPaymentDate(e.target.value)} className="mt-1 w-full rounded-lg bg-[#1c2422] border border-[#39433f] p-3 text-sm" /></label></div>
        <label className="block text-xs font-semibold text-gray-300">Bank / payment transaction ID<input required minLength={4} maxLength={120} value={transactionId} onChange={e=>setTransactionId(e.target.value)} className="mt-1 w-full rounded-lg bg-[#1c2422] border border-[#39433f] p-3 text-sm" /></label>
        {selected?.extra_fields?.map(field=><label key={field.key} className="block text-xs font-semibold text-gray-300">{field.label}<input required={Boolean(field.required)} value={extraValues[field.key] || ''} onChange={e=>setExtraValues(prev=>({...prev,[field.key]:e.target.value}))} className="mt-1 w-full rounded-lg bg-[#1c2422] border border-[#39433f] p-3 text-sm" /></label>)}
        <label className="block text-xs font-semibold text-gray-300">Proof of payment (JPG, PNG, WEBP, PDF · max 5 MB)<input ref={fileRef} required type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={e=>chooseFile(e.target.files?.[0])} className="mt-1 w-full rounded-lg border border-dashed border-[#52615b] p-3 text-xs" /></label>
        {proof && <p className="text-xs text-emerald-300">{proof.name} · {(proof.size/1024).toFixed(0)} KB</p>}
        <button disabled={busy || !selected} className="w-full rounded-lg bg-white text-black font-bold text-sm p-3 disabled:opacity-50">{busy ? 'Submitting for verification…' : 'Submit payment proof'}</button>
      </form>}
    </div>
  </div>;
};
