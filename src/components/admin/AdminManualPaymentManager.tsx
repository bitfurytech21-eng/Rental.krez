import React, { useCallback, useEffect, useState } from 'react';
import { getApiUrl, getAuthToken, withActionEmailVerification } from '../../lib/api';
import { X, Eye, CheckCircle2, AlertCircle } from 'lucide-react';

type Method = {
  id: string;
  name: string;
  instructions: string;
  account_details: Record<string, string>;
  minimum_amount: number;
  maximum_amount: number | null;
  fee_type: 'none' | 'fixed' | 'percent';
  fee_value: number;
  enabled: boolean;
  logo_url?: string | null;
  extra_fields?: Array<{ key: string; label: string; required?: boolean }>;
};

export const AdminManualPaymentManager: React.FC<{
  mode?: 'all' | 'methods-only' | 'deposits-only';
}> = ({ mode = 'all' }) => {
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
  const [message, setMessage] = useState<{ text: string; tone: 'success' | 'error' } | null>(null);

  // Modal state replacing window.prompt and window.open
  const [rejectModalDeposit, setRejectModalDeposit] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [proofViewer, setProofViewer] = useState<{ url: string; ref: string } | null>(null);

  const headers = useCallback((): Record<string, string> => {
    const token = getAuthToken();
    return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  }, []);

  const load = useCallback(async () => {
    const [m, d] = await Promise.all([
      fetch(getApiUrl('/manual-payments/admin/methods'), { headers: headers() }),
      fetch(getApiUrl(`/manual-payments/admin/deposits?status=${status}`), { headers: headers() }),
    ]);
    const mp = await m.json();
    const dp = await d.json();
    if (!m.ok || !d.ok) throw new Error(mp.error || dp.error || 'Unable to load manual payment data.');
    setMethods(mp.data || []);
    setDeposits(dp.data || []);
  }, [headers, status]);

  useEffect(() => {
    load().catch((e) => setMessage({ text: e.message, tone: 'error' }));
  }, [load]);

  const reset = () => {
    setEditing(null);
    setName('');
    setInstructions('');
    setAccountDetails('{"Bank name":"","Account name":"","Account number":""}');
    setMinimum('100');
    setMaximum('');
    setFeeType('none');
    setFeeValue('0');
    setLogoUrl('');
    setExtraFields('[]');
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const parsedDetails = JSON.parse(accountDetails);
      if (!parsedDetails || typeof parsedDetails !== 'object' || Array.isArray(parsedDetails)) {
        throw new Error('Account details must be a JSON object.');
      }
      const parsedExtraFields = JSON.parse(extraFields);
      if (!Array.isArray(parsedExtraFields)) {
        throw new Error('Extra required fields must be a JSON array.');
      }
      const body = {
        name,
        logoUrl,
        extraFields: parsedExtraFields,
        instructions,
        accountDetails: parsedDetails,
        minimumAmount: Number(minimum),
        maximumAmount: maximum ? Number(maximum) : null,
        feeType,
        feeValue: Number(feeValue),
        enabled: true,
      };
      const response = await fetch(
        getApiUrl(editing ? `/manual-payments/admin/methods/${editing}` : '/manual-payments/admin/methods'),
        {
          method: editing ? 'PATCH' : 'POST',
          headers: headers(),
          body: JSON.stringify(body),
        }
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to save payment method.');
      reset();
      await load();
      setMessage({ text: 'Payment gateway method saved.', tone: 'success' });
    } catch (e: any) {
      setMessage({ text: e.message || 'Unable to save payment method.', tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (method: Method) => {
    setBusy(true);
    try {
      const response = await fetch(getApiUrl(`/manual-payments/admin/methods/${method.id}`), {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ enabled: !method.enabled }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to update payment method.');
      await load();
    } catch (e: any) {
      setMessage({ text: e.message, tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const executeReview = async (deposit: any, decision: 'approve' | 'reject', reasonText = '') => {
    setBusy(true);
    setMessage(null);
    try {
      await withActionEmailVerification(
        decision === 'approve' ? 'admin.deposit.approve' : 'admin.deposit.reject',
        async (grantId) => {
          const response = await fetch(getApiUrl(`/manual-payments/admin/deposits/${deposit.id}/review`), {
            method: 'POST',
            headers: { ...headers(), 'X-Action-Verification': grantId },
            body: JSON.stringify({ decision, reason: reasonText }),
          });
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.error || 'Deposit review failed.');
          return payload;
        }
      );
      setRejectModalDeposit(null);
      setRejectReason('');
      await load();
      setMessage({
        text: decision === 'approve' ? 'Deposit approved and wallet credited.' : 'Deposit rejected.',
        tone: 'success',
      });
    } catch (e: any) {
      setMessage({ text: e.message || 'Deposit review failed.', tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const openProof = async (deposit: any) => {
    try {
      const response = await fetch(getApiUrl(`/manual-payments/admin/deposits/${deposit.id}/proof`), {
        headers: headers(),
      });
      const payload = await response.json();
      if (!response.ok || !payload.data?.url) throw new Error(payload.error || 'No proof file is available.');
      setProofViewer({ url: payload.data.url, ref: deposit.reference || deposit.id });
    } catch (e: any) {
      setMessage({ text: e.message, tone: 'error' });
    }
  };

  const showMethods = mode === 'all' || mode === 'methods-only';
  const showDeposits = mode === 'all' || mode === 'deposits-only';

  return (
    <section className="space-y-6">
      {message && (
        <div
          role="status"
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-3 ${
            message.tone === 'success'
              ? 'bg-[#6FD8B0]/10 border-[#6FD8B0]/30 text-[#6FD8B0]'
              : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.tone === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
          <button type="button" onClick={() => setMessage(null)} className="text-[#8FA1A8] hover:text-[#F2F5F4] cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {showMethods && (
        <div className="rounded-2xl border border-[#1F2C33] bg-[#121A1F] p-5 sm:p-6">
          <h3 className="text-base font-bold text-[#F2F5F4]">Manual Payment Gateways</h3>
          <p className="text-xs text-[#8FA1A8] mt-1">
            Configure bank wire, SEPA, and crypto settlement instructions. Investor submissions remain pending until finance approval.
          </p>

          <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-5">
            <label className="text-xs font-semibold text-[#B6C4C9]">
              Method Name
              <input
                required
                minLength={2}
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 w-full rounded-xl bg-[#0B0F10] border border-[#1F2C33] px-3 py-2.5 text-sm text-[#F2F5F4] focus:outline-none focus:border-[#6FD8B0]"
                placeholder="SEPA bank transfer"
              />
            </label>
            <label className="text-xs font-semibold text-[#B6C4C9]">
              Minimum Amount (EUR)
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={minimum}
                onChange={(e) => setMinimum(e.target.value)}
                className="mt-1.5 w-full rounded-xl bg-[#0B0F10] border border-[#1F2C33] px-3 py-2.5 text-sm text-[#F2F5F4] tabular-nums focus:outline-none focus:border-[#6FD8B0]"
              />
            </label>
            <label className="text-xs font-semibold text-[#B6C4C9]">
              Maximum Amount (optional)
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={maximum}
                onChange={(e) => setMaximum(e.target.value)}
                className="mt-1.5 w-full rounded-xl bg-[#0B0F10] border border-[#1F2C33] px-3 py-2.5 text-sm text-[#F2F5F4] tabular-nums focus:outline-none focus:border-[#6FD8B0]"
              />
            </label>
            <label className="text-xs font-semibold text-[#B6C4C9]">
              Fee Type
              <select
                value={feeType}
                onChange={(e) => setFeeType(e.target.value as any)}
                className="mt-1.5 w-full rounded-xl bg-[#0B0F10] border border-[#1F2C33] px-3 py-2.5 text-sm text-[#F2F5F4] focus:outline-none focus:border-[#6FD8B0]"
              >
                <option value="none">No fee</option>
                <option value="fixed">Fixed fee (EUR)</option>
                <option value="percent">Percentage fee</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-[#B6C4C9]">
              Fee Value
              <input
                type="number"
                min="0"
                step="0.01"
                value={feeValue}
                onChange={(e) => setFeeValue(e.target.value)}
                className="mt-1.5 w-full rounded-xl bg-[#0B0F10] border border-[#1F2C33] px-3 py-2.5 text-sm text-[#F2F5F4] tabular-nums focus:outline-none focus:border-[#6FD8B0]"
              />
            </label>
            <label className="text-xs font-semibold text-[#B6C4C9]">
              Logo URL (optional)
              <input
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                className="mt-1.5 w-full rounded-xl bg-[#0B0F10] border border-[#1F2C33] px-3 py-2.5 text-sm text-[#F2F5F4] focus:outline-none focus:border-[#6FD8B0]"
                placeholder="https://..."
              />
            </label>
            <label className="text-xs font-semibold text-[#B6C4C9] md:col-span-2">
              Extra Required Fields (JSON array)
              <textarea
                value={extraFields}
                onChange={(e) => setExtraFields(e.target.value)}
                rows={2}
                className="mt-1.5 w-full rounded-xl bg-[#0B0F10] border border-[#1F2C33] p-2.5 font-mono text-xs text-[#F2F5F4] focus:outline-none focus:border-[#6FD8B0]"
                placeholder='[{"key":"reference","label":"Transfer reference","required":true}]'
              />
            </label>
            <label className="text-xs font-semibold text-[#B6C4C9] md:col-span-2">
              Account Details (JSON object)
              <textarea
                value={accountDetails}
                onChange={(e) => setAccountDetails(e.target.value)}
                rows={3}
                className="mt-1.5 w-full rounded-xl bg-[#0B0F10] border border-[#1F2C33] p-2.5 font-mono text-xs text-[#F2F5F4] focus:outline-none focus:border-[#6FD8B0]"
              />
            </label>
            <label className="text-xs font-semibold text-[#B6C4C9] md:col-span-2">
              Payment Instructions
              <textarea
                required
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={3}
                className="mt-1.5 w-full rounded-xl bg-[#0B0F10] border border-[#1F2C33] p-2.5 text-sm text-[#F2F5F4] focus:outline-none focus:border-[#6FD8B0]"
              />
            </label>
            <div className="md:col-span-2 flex gap-2">
              <button
                type="submit"
                disabled={busy}
                className="rounded-xl bg-[#6FD8B0] hover:bg-[#5ec8a0] text-[#0B0F10] px-4 py-2.5 text-xs font-bold disabled:opacity-50 cursor-pointer transition-colors"
              >
                {editing ? 'Update Payment Method' : 'Create Payment Method'}
              </button>
              {editing && (
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-xl border border-[#1F2C33] text-[#B6C4C9] hover:text-[#F2F5F4] px-4 py-2.5 text-xs font-semibold cursor-pointer"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>

          <div className="mt-6 space-y-2.5">
            {methods.map((method) => (
              <div
                key={method.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-[#0B0F10] border border-[#1F2C33] p-3.5"
              >
                <div>
                  <div className="text-sm font-semibold text-[#F2F5F4] flex items-center gap-2">
                    <span>{method.name}</span>
                    <span className={`text-[11px] font-semibold ${method.enabled ? 'text-[#6FD8B0]' : 'text-[#8FA1A8]'}`}>
                      · {method.enabled ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-xs text-[#8FA1A8] mt-0.5 tabular-nums">
                    Min €{Number(method.minimum_amount).toFixed(2)} ·{' '}
                    {method.maximum_amount ? `Max €${Number(method.maximum_amount).toFixed(2)}` : 'No max'} ·{' '}
                    {method.fee_type} fee
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(method.id);
                      setName(method.name);
                      setInstructions(method.instructions);
                      setAccountDetails(JSON.stringify(method.account_details || {}, null, 2));
                      setMinimum(String(method.minimum_amount));
                      setMaximum(method.maximum_amount ? String(method.maximum_amount) : '');
                      setFeeType(method.fee_type);
                      setFeeValue(String(method.fee_value));
                      setLogoUrl(method.logo_url || '');
                      setExtraFields(JSON.stringify(method.extra_fields || [], null, 2));
                    }}
                    className="rounded-lg border border-[#1F2C33] px-3 py-1.5 text-xs font-semibold text-[#F2F5F4] hover:border-[#6FD8B0]/50 cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => toggle(method)}
                    className="rounded-lg border border-[#1F2C33] px-3 py-1.5 text-xs font-semibold text-[#B6C4C9] hover:text-[#F2F5F4] cursor-pointer"
                  >
                    {method.enabled ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </div>
            ))}
            {!methods.length && (
              <p className="text-xs text-[#8FA1A8]">No manual payment methods configured yet.</p>
            )}
          </div>
        </div>
      )}

      {showDeposits && (
        <div className="rounded-2xl border border-[#1F2C33] bg-[#121A1F] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-[#F2F5F4]">Manual Deposit Submissions</h3>
              <p className="text-xs text-[#8FA1A8] mt-0.5">
                Verify transfer references and inspect uploaded settlement proofs.
              </p>
            </div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-xl bg-[#0B0F10] border border-[#1F2C33] px-3 py-2 text-xs font-semibold text-[#F2F5F4] focus:outline-none focus:border-[#6FD8B0]"
            >
              <option value="pending">Pending</option>
              <option value="completed">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="mt-4 space-y-3">
            {deposits.map((deposit) => (
              <article
                key={deposit.id}
                className="rounded-xl bg-[#0B0F10] border border-[#1F2C33] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#F2F5F4]">
                    <span>{deposit.profiles?.full_name || deposit.profiles?.email || deposit.user_id}</span>
                    <span className="text-[#6FD8B0] tabular-nums">€{Number(deposit.amount).toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-[#8FA1A8]">
                    {deposit.reference} · {deposit.payment_method} · <span className="capitalize">{deposit.status}</span>
                  </p>
                  <p className="text-xs text-[#B6C4C9]">
                    Sender: {deposit.sender_name || '—'} · Tx ID: {deposit.manual_transaction_id || '—'} · Date: {deposit.payment_date || '—'}
                  </p>
                  {deposit.rejection_reason && (
                    <p className="text-xs text-rose-400">Reason: {deposit.rejection_reason}</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => openProof(deposit)}
                    className="rounded-lg border border-[#1F2C33] px-3 py-1.5 text-xs font-semibold text-[#F2F5F4] hover:border-[#6FD8B0]/50 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#6FD8B0]" />
                    <span>View Proof</span>
                  </button>
                  {deposit.status === 'pending' && (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => executeReview(deposit, 'approve')}
                        className="rounded-lg bg-[#6FD8B0] hover:bg-[#5ec8a0] text-[#0B0F10] px-3 py-1.5 text-xs font-bold disabled:opacity-50 cursor-pointer"
                      >
                        Approve &amp; Credit
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setRejectModalDeposit(deposit);
                          setRejectReason('');
                        }}
                        className="rounded-lg bg-rose-950/50 text-rose-300 border border-rose-500/40 px-3 py-1.5 text-xs font-bold disabled:opacity-50 cursor-pointer hover:bg-rose-950/70"
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </article>
            ))}
            {!deposits.length && (
              <p className="text-xs text-[#8FA1A8] py-4 text-center">No manual deposits in this queue.</p>
            )}
          </div>
        </div>
      )}

      {/* Reject Reason Modal (replaces window.prompt) */}
      {rejectModalDeposit && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#121A1F] border border-[#1F2C33] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-[#F2F5F4]">Reject Deposit Submission</h4>
              <button type="button" onClick={() => setRejectModalDeposit(null)} className="text-[#8FA1A8] hover:text-[#F2F5F4] cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[#8FA1A8]">
              Provide a clear reconciliation note for <strong className="text-[#F2F5F4]">{rejectModalDeposit.reference}</strong> (€{Number(rejectModalDeposit.amount).toFixed(2)}).
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="e.g., Wire reference mismatch or unverified originating IBAN"
              className="w-full rounded-xl bg-[#0B0F10] border border-[#1F2C33] p-3 text-xs text-[#F2F5F4] focus:outline-none focus:border-[#6FD8B0]"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectModalDeposit(null)}
                className="px-4 py-2 rounded-xl border border-[#1F2C33] text-xs font-semibold text-[#B6C4C9] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy || !rejectReason.trim()}
                onClick={() => executeReview(rejectModalDeposit, 'reject', rejectReason.trim())}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Proof Preview Modal (replaces window.open) */}
      {proofViewer && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-[#121A1F] border border-[#1F2C33] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#1F2C33] flex items-center justify-between">
              <span className="text-xs font-bold text-[#F2F5F4]">Deposit Proof · {proofViewer.ref}</span>
              <div className="flex items-center gap-3">
                <a
                  href={proofViewer.url}
                  download={`proof-${proofViewer.ref}`}
                  className="text-xs font-semibold text-[#6FD8B0] hover:underline"
                >
                  Download File
                </a>
                <button type="button" onClick={() => setProofViewer(null)} className="text-[#8FA1A8] hover:text-[#F2F5F4] cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-4 bg-[#0B0F10] max-h-[75vh] overflow-auto flex items-center justify-center">
              {proofViewer.url.toLowerCase().includes('.pdf') || proofViewer.url.startsWith('data:application/pdf') ? (
                <iframe src={proofViewer.url} title="Deposit Proof" className="w-full h-[65vh] rounded-lg border border-[#1F2C33]" />
              ) : (
                <img src={proofViewer.url} alt="Deposit proof" className="max-w-full max-h-[65vh] rounded-lg object-contain" />
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
