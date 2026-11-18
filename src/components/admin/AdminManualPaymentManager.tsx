import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getApiUrl, getAuthToken } from '../../lib/api';
import {
  approveDepositSubmission,
  centsToEur,
  eurToCents,
  formatCentsEur,
  rejectDepositSubmission,
} from './adminSupabaseGateway';
import { AdminActionDialog } from './AdminActionDialog';

type Method = {
  id: string; name: string; instructions: string; account_details: Record<string, string>;
  minimum_amount: number; maximum_amount: number | null; fee_type: 'none' | 'fixed' | 'percent';
  fee_value: number; enabled: boolean; logo_url?: string | null; extra_fields?: Array<{key:string;label:string;required?:boolean}>;
};

export const AdminManualPaymentManager: React.FC = () => {
  const [methods, setMethods] = useState<Method[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [status, setStatus] = useState('pending');
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [accountDetails, setAccountDetails] = useState('{"Bank name":"","Account name":"","Account number":""}');
  const [minimum, setMinimum] = useState('100');
  const [maximum, setMaximum] = useState('');
  const [feeType, setFeeType] = useState<'none' | 'fixed' | 'percent'>('none');
  const [feeValue, setFeeValue] = useState('0');
  const [logoUrl, setLogoUrl] = useState('');
  const [extraFields, setExtraFields] = useState('[]');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [notConfigured, setNotConfigured] = useState(false);
  const [approveTarget, setApproveTarget] = useState<any | null>(null);
  const [rejectTarget, setRejectTarget] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [proofUrls, setProofUrls] = useState<Record<string, string>>({});
  const reviewLockRef = useRef(false);

  const headers = useCallback((): Record<string, string> => {
    const token = getAuthToken();
    return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  }, []);

  const load = useCallback(async () => {
    const [m, d] = await Promise.all([
      fetch(getApiUrl('/manual-payments/admin/methods'), { headers: headers() }),
      fetch(getApiUrl(`/manual-payments/admin/deposits?status=${status}`), { headers: headers() })
    ]);
    if (m.status === 503 || d.status === 503) {
      setNotConfigured(true);
      setMethods([]);
      setDeposits([]);
      return;
    }
    setNotConfigured(false);
    const mp = await m.json(); const dp = await d.json();
    if (!m.ok || !d.ok) throw new Error(mp.error || dp.error || 'Unable to load manual payment data.');
    setMethods(mp.data || []); setDeposits(dp.data || []);
  }, [headers, status]);

  useEffect(() => { load().catch(e => setErrorMsg(e.message)); }, [load]);

  const reset = () => {
    setEditing(null); setName(''); setInstructions('');
    setAccountDetails('{"Bank name":"","Account name":"","Account number":""}');
    setMinimum('100'); setMaximum(''); setFeeType('none'); setFeeValue('0'); setLogoUrl(''); setExtraFields('[]');
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMessage(''); setErrorMsg('');
    try {
      const parsedDetails = JSON.parse(accountDetails);
      if (!parsedDetails || typeof parsedDetails !== 'object' || Array.isArray(parsedDetails)) throw new Error('Account details must be a JSON object.');
      const parsedExtraFields = JSON.parse(extraFields);
      if (!Array.isArray(parsedExtraFields)) throw new Error('Extra required fields must be a JSON array.');
      const body = { name, logoUrl, extraFields: parsedExtraFields, instructions, accountDetails: parsedDetails, minimumAmount: Number(minimum), maximumAmount: maximum ? Number(maximum) : null, feeType, feeValue: Number(feeValue), enabled: true };
      const response = await fetch(getApiUrl(editing ? `/manual-payments/admin/methods/${editing}` : '/manual-payments/admin/methods'), {
        method: editing ? 'PATCH' : 'POST', headers: headers(), body: JSON.stringify(body)
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to save payment method.');
      reset(); await load(); setMessage('Payment method saved.');
    } catch (e: any) { setErrorMsg(e.message || 'Unable to save payment method.'); }
    finally { setBusy(false); }
  };

  const toggle = async (method: Method) => {
    if (reviewLockRef.current) return;
    reviewLockRef.current = true;
    setBusy(true); setMessage(''); setErrorMsg('');
    try {
      const response = await fetch(getApiUrl(`/manual-payments/admin/methods/${method.id}`), {
        method: 'PATCH', headers: headers(), body: JSON.stringify({ enabled: !method.enabled })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to update payment method.');
      await load();
    } catch (e: any) { setErrorMsg(e.message); }
    finally { reviewLockRef.current = false; setBusy(false); }
  };

  const runDepositReview = async (deposit: any, decision: 'approve' | 'reject', providedReason?: string): Promise<string> => {
    const amtCents = eurToCents(deposit.amount);
    if (decision === 'approve') {
      await approveDepositSubmission(deposit.id, amtCents > 0 ? centsToEur(amtCents) : undefined, true);
    } else {
      const clean = (providedReason ?? rejectReason).trim();
      if (!clean) throw new Error('A rejection reason is required.');
      await rejectDepositSubmission(deposit.id, clean, true);
    }
    const investorLabel = deposit.profiles?.full_name || deposit.profiles?.email || deposit.user_id;
    const amtStr = formatCentsEur(amtCents);
    return decision === 'approve'
      ? `Approved ${amtStr} deposit for ${investorLabel} via approve_deposit.`
      : `Rejected ${amtStr} deposit for ${investorLabel} via reject_deposit.`;
  };

  const openProof = async (deposit: any) => {
    setMessage(''); setErrorMsg('');
    try {
      const response = await fetch(getApiUrl(`/manual-payments/admin/deposits/${deposit.id}/proof`), { headers: headers() });
      const payload = await response.json();
      if (!response.ok || !payload.data?.url) throw new Error(payload.error || 'Unable to load proof.');
      setProofUrls(prev => ({ ...prev, [deposit.id]: String(payload.data.url) }));
    } catch (e: any) { setErrorMsg(e.message); }
  };

  if (notConfigured) {
    return (
      <section className="rounded-2xl border border-[#e3e8e3] bg-white p-5 sm:p-6">
        <h3 className="text-base font-bold text-[#18211f]">Custom Offline Payment Gates</h3>
        <p className="text-xs text-[#69736f] mt-1">
          Custom offline payment methods and encrypted proof buckets activate automatically when Supabase Storage &amp; Database are connected. Limits and Corporate Escrow Bank Details above are active for all transactions.
        </p>
      </section>
    );
  }

  return <section className="space-y-6">
    <div className="rounded-2xl border border-[#e3e8e3] bg-white p-5 sm:p-7">
      <h2 className="text-xl font-bold text-[#18211f]">Manual payment methods</h2>
      <p className="text-sm text-[#69736f] mt-1">Configure bank transfer and other offline payment instructions. Investor deposits stay pending until finance approval.</p>
      <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5">
        <label className="text-xs font-semibold text-[#46534e]">Method name<input required minLength={2} maxLength={100} value={name} onChange={e=>setName(e.target.value)} className="mt-1 w-full rounded-lg border p-2.5 text-sm" placeholder="SEPA bank transfer" /></label>
        <label className="text-xs font-semibold text-[#46534e]">Minimum amount (EUR)<input required type="number" min="0.01" step="0.01" value={minimum} onChange={e=>setMinimum(e.target.value)} className="mt-1 w-full rounded-lg border p-2.5 text-sm" /></label>
        <label className="text-xs font-semibold text-[#46534e]">Maximum amount (optional)<input type="number" min="0.01" step="0.01" value={maximum} onChange={e=>setMaximum(e.target.value)} className="mt-1 w-full rounded-lg border p-2.5 text-sm" /></label>
        <label className="text-xs font-semibold text-[#46534e]">Fee type<select value={feeType} onChange={e=>setFeeType(e.target.value as any)} className="mt-1 w-full rounded-lg border p-2.5 text-sm"><option value="none">No fee</option><option value="fixed">Fixed fee (EUR)</option><option value="percent">Percentage fee</option></select></label>
        <label className="text-xs font-semibold text-[#46534e]">Fee value<input type="number" min="0" step="0.01" value={feeValue} onChange={e=>setFeeValue(e.target.value)} className="mt-1 w-full rounded-lg border p-2.5 text-sm" /></label>
        <label className="text-xs font-semibold text-[#46534e]">Logo URL (optional)<input value={logoUrl} onChange={e=>setLogoUrl(e.target.value)} className="mt-1 w-full rounded-lg border p-2.5 text-sm" placeholder="https://..." /></label>
        <label className="text-xs font-semibold text-[#46534e] md:col-span-2">Extra required fields (JSON array)<textarea value={extraFields} onChange={e=>setExtraFields(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border p-2.5 font-mono text-xs" placeholder='[{"key":"reference","label":"Transfer reference","required":true}]' /></label>
        <label className="text-xs font-semibold text-[#46534e] md:col-span-2">Account details (JSON object)<textarea value={accountDetails} onChange={e=>setAccountDetails(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border p-2.5 font-mono text-xs" /></label>
        <label className="text-xs font-semibold text-[#46534e] md:col-span-2">Payment instructions<textarea required value={instructions} onChange={e=>setInstructions(e.target.value)} rows={4} className="mt-1 w-full rounded-lg border p-2.5 text-sm" /></label>
        <div className="md:col-span-2 flex gap-2"><button disabled={busy} className="rounded-lg bg-[#1e3a34] text-white px-4 py-2.5 text-sm font-bold disabled:opacity-50 cursor-pointer">{editing ? 'Update method' : 'Create method'}</button>{editing && <button type="button" onClick={reset} className="rounded-lg border px-4 py-2.5 text-sm cursor-pointer">Cancel edit</button>}</div>
      </form>
      <div className="mt-6 space-y-2">
        {methods.map(method => <div key={method.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-3">
          <div><b className="text-sm">{method.name}</b><p className="text-xs text-gray-500">Min {formatCentsEur(eurToCents(method.minimum_amount))} · {method.maximum_amount ? `Max ${formatCentsEur(eurToCents(method.maximum_amount))}` : 'No maximum'} · {method.fee_type} fee</p></div>
          <div className="flex gap-2"><button type="button" onClick={()=>{setEditing(method.id);setName(method.name);setInstructions(method.instructions);setAccountDetails(JSON.stringify(method.account_details || {},null,2));setMinimum(String(method.minimum_amount));setMaximum(method.maximum_amount ? String(method.maximum_amount) : '');setFeeType(method.fee_type);setFeeValue(String(method.fee_value));setLogoUrl(method.logo_url || '');setExtraFields(JSON.stringify(method.extra_fields || [],null,2));}} className="rounded-lg border px-3 py-1.5 text-xs font-semibold cursor-pointer">Edit</button><button type="button" disabled={busy} onClick={()=>toggle(method)} className="rounded-lg border px-3 py-1.5 text-xs font-semibold cursor-pointer">{method.enabled ? 'Disable' : 'Enable'}</button></div>
        </div>)}
        {!methods.length && <p className="text-sm text-gray-500">No manual payment methods configured yet.</p>}
      </div>
    </div>
    <div className="rounded-2xl border border-[#e3e8e3] bg-white p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold text-[#18211f]">Manual deposit verification</h2><p className="text-xs text-gray-500 mt-1">Review payment references and privately open uploaded proofs.</p></div><select value={status} onChange={e=>setStatus(e.target.value)} className="rounded-lg border p-2 text-sm"><option value="pending">Pending</option><option value="completed">Approved</option><option value="rejected">Rejected</option></select></div>
      <div className="mt-4 space-y-3">
        {deposits.map(deposit => <article key={deposit.id} className="rounded-xl border p-4">
          <div className="flex flex-wrap justify-between gap-2"><b className="text-sm">{deposit.profiles?.full_name || deposit.profiles?.email || deposit.user_id}</b><b className="text-sm tabular-nums">{formatCentsEur(eurToCents(deposit.amount))}</b></div>
          <p className="text-xs text-gray-500 mt-1">{deposit.reference} · {deposit.payment_method} · {deposit.status}</p>
          <p className="text-xs mt-2">Sender: {deposit.sender_name || '—'} · Payment ID: {deposit.manual_transaction_id || '—'} · Date: {deposit.payment_date || '—'}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            <button type="button" onClick={()=>openProof(deposit)} className="rounded-lg border px-3 py-1.5 text-xs font-semibold cursor-pointer">Load proof link</button>
            {proofUrls[deposit.id] && (
              <a
                href={proofUrls[deposit.id]}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 px-3 py-1.5 text-xs font-semibold"
              >
                Open proof file
              </a>
            )}
            {deposit.status === 'pending' && <>
              <button type="button" disabled={busy} onClick={() => setApproveTarget(deposit)} className="rounded-lg bg-emerald-700 text-white px-3 py-1.5 text-xs font-bold disabled:opacity-50 cursor-pointer">Approve &amp; credit</button>
              <button type="button" disabled={busy} onClick={() => { setRejectTarget(deposit); setRejectReason(''); }} className="rounded-lg bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1.5 text-xs font-bold disabled:opacity-50 cursor-pointer">Reject</button>
            </>}
          </div>
          {deposit.rejection_reason && <p className="text-xs text-rose-700 mt-2">Reason: {deposit.rejection_reason}</p>}
        </article>)}
        {!deposits.length && <p className="text-sm text-gray-500">No deposits in this queue.</p>}
      </div>
    </div>

    <AdminActionDialog
      open={Boolean(approveTarget)}
      actionName="Approve deposit"
      confirmLabel="Approve deposit"
      investorName={approveTarget?.profiles?.full_name || 'Investor'}
      investorEmail={approveTarget?.profiles?.email || approveTarget?.user_id || ''}
      amountCents={approveTarget ? eurToCents(approveTarget.amount) : 0}
      reference={approveTarget?.reference || approveTarget?.id || ''}
      onConfirm={async () => {
        if (!approveTarget) return;
        return runDepositReview(approveTarget, 'approve');
      }}
      onRefresh={async () => {
        await load().catch(() => {});
      }}
      onSuccess={(msg) => setMessage(msg)}
      onClose={() => setApproveTarget(null)}
    />

    <AdminActionDialog
      open={Boolean(rejectTarget)}
      actionName="Reject deposit"
      confirmLabel="Reject deposit"
      tone="danger"
      investorName={rejectTarget?.profiles?.full_name || 'Investor'}
      investorEmail={rejectTarget?.profiles?.email || rejectTarget?.user_id || ''}
      amountCents={rejectTarget ? eurToCents(rejectTarget.amount) : 0}
      reference={rejectTarget?.reference || rejectTarget?.id || ''}
      validate={() => (!rejectReason.trim() ? 'A rejection reason is required.' : null)}
      onConfirm={async () => {
        if (!rejectTarget) return;
        const msg = await runDepositReview(rejectTarget, 'reject', rejectReason);
        setRejectReason('');
        return msg;
      }}
      onRefresh={async () => {
        await load().catch(() => {});
      }}
      onSuccess={(msg) => setMessage(msg)}
      onClose={() => {
        setRejectTarget(null);
        setRejectReason('');
      }}
    >
      <div>
        <label className="block text-xs font-semibold text-[#B6C4C9] mb-1">
          Rejection Reason *
        </label>
        <textarea
          rows={3}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Enter rejection reason..."
          className="w-full p-3 bg-[#0B0F10] border border-[#1F2C33] rounded-xl text-xs text-[#F2F5F4]"
        />
      </div>
    </AdminActionDialog>

    {message && <p role="status" className="text-sm font-semibold text-emerald-700">{message}</p>}
    {errorMsg && <p role="alert" className="text-sm font-semibold text-rose-700">{errorMsg}</p>}
  </section>;
};
