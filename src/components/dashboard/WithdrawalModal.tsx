import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../lib/auth';
import { formatCurrency, formatDate } from '../../lib/utils';
import { isValidIBAN } from '../../lib/validation';
import { getApiUrl, getAuthToken, monitoringApi, paymentsApi, securityApi, walletApi } from '../../lib/api';
import {
  formatEmailCodeSendError,
  getValidActionGrant,
  isActionVerifiedInSession,
  markActionVerified,
  sanitizeErrorForMonitoring,
} from '../../lib/actionVerificationSession';
import { ArrowUpRight, ShieldAlert, CheckCircle2, Building2, AlertCircle, History, X } from 'lucide-react';

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onNavigateProfile: () => void;
}
type Step = 1 | 2 | 3 | 4;

const ACTION_SCOPE = 'investor.withdrawal.create';
const MIN_WITHDRAWAL = 250;

function maskIban(value: string) {
  const clean = value.replace(/\s/g, '');
  if (clean.length < 8) return clean;
  return `${clean.slice(0, 4)} •••• •••• ${clean.slice(-4)}`;
}

export const WithdrawalModal: React.FC<WithdrawalModalProps> = ({
  isOpen, onClose, onSuccess, onNavigateProfile
}) => {
  const { user, refreshUser } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [showHistory, setShowHistory] = useState(false);
  const [amount, setAmount] = useState('');
  const [code, setCode] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [grantId, setGrantId] = useState('');
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [consecutiveSendFailures, setConsecutiveSendFailures] = useState(0);
  const [error, setError] = useState('');
  const [codeError, setCodeError] = useState('');
  const [withdrawalFeeEur, setWithdrawalFeeEur] = useState<number>(0);
  const [historyRows, setHistoryRows] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const sendingCodeRef = useRef(false);

  const balance = Number(user?.walletBalance || 0);
  const iban = user?.bankIban?.trim() || '';
  const verified = user?.kycStatus === 'verified';
  const numericAmount = Number(amount);
  const token = getAuthToken();
  const money = (value: number) => formatCurrency(value);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((prev) => Math.max(0, prev - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setShowHistory(false);
    setAmount('');
    setCode('');
    setMaskedEmail('');
    setGrantId(getValidActionGrant(ACTION_SCOPE) || '');
    setReference('');
    setBusy(false);
    setCodeSent(false);
    setCooldown(0);
    setConsecutiveSendFailures(0);
    setError('');
    setCodeError('');

    paymentsApi
      .getPublicPaymentConfig()
      .then((res: any) => {
        const feeVal = Number(res?.data?.traditional?.withdrawalFeeEur ?? res?.traditional?.withdrawalFeeEur ?? 0);
        if (Number.isFinite(feeVal) && feeVal >= 0) setWithdrawalFeeEur(feeVal);
      })
      .catch(() => {});

    setLoadingHistory(true);
    walletApi
      .getWithdrawals()
      .then((res) => {
        setHistoryRows(Array.isArray(res?.data) ? res.data : []);
      })
      .catch(() => setHistoryRows([]))
      .finally(() => setLoadingHistory(false));
  }, [isOpen]);

  if (!isOpen || !user) return null;

  const close = () => {
    setStep(1); setError(''); setCodeError(''); setCode(''); setGrantId('');
    onClose();
  };
  const blocker = !verified ? 'kyc' : !isValidIBAN(iban) ? 'bank' : null;
  const sessionHasGrant = Boolean(grantId || getValidActionGrant(ACTION_SCOPE) || isActionVerifiedInSession());

  const continueToDestination = () => {
    setError('');
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return setError('Enter a valid withdrawal amount.');
    if (numericAmount < MIN_WITHDRAWAL) return setError(`Minimum withdrawal amount is ${money(MIN_WITHDRAWAL)}.`);
    if (numericAmount > balance) return setError(`That exceeds your available balance of ${money(balance)}.`);
    if (blocker) return;
    setStep(2);
  };

  const submitWithdrawalOrder = async (activeGrantId?: string) => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(activeGrantId ? { 'X-Action-Verification': activeGrantId } : {}),
    };
    const idempotencyKey =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `withdrawal-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const response = await fetch(getApiUrl('/withdrawals'), {
      method: 'POST',
      headers: { ...headers, 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({
        amount: numericAmount,
        destination: iban.replace(/\s/g, '').toUpperCase(),
        method: 'Bank Wire SEPA',
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Your withdrawal request could not be recorded.');
    setReference(payload.data?.reference || payload.data?.id || 'Pending reference');
    if (payload.data) {
      setHistoryRows((prev) => [payload.data, ...prev]);
    }
    setStep(4);
    await refreshUser();
    onSuccess();
  };

  const requestCode = async (isResend = false) => {
    if (sendingCodeRef.current || busy) return;
    if (isResend && (cooldown > 0 || consecutiveSendFailures >= 2)) return;

    const cachedGrant = getValidActionGrant(ACTION_SCOPE);
    if (cachedGrant) {
      setGrantId(cachedGrant);
      setStep(3);
      return;
    }

    sendingCodeRef.current = true;
    setBusy(true);
    setError('');
    setCodeError('');
    try {
      const payload = await securityApi.requestActionCode(ACTION_SCOPE);
      setConsecutiveSendFailures(0);
      if (payload.otpRequired === false && payload.grantId) {
        markActionVerified(ACTION_SCOPE, payload.grantId);
        setGrantId(payload.grantId);
        setStep(3);
        return;
      }
      setMaskedEmail(payload.maskedEmail || 'your registered email');
      setCodeSent(true);
      setCooldown(60);
      setStep(3);
    } catch (e: any) {
      setConsecutiveSendFailures((prev) => prev + 1);
      const { message, errorCode } = sanitizeErrorForMonitoring(e);
      void monitoringApi.logClientError({
        category: 'security',
        eventType: 'WITHDRAWAL_CODE_SEND_FAILED',
        errorCode,
        message,
        scope: ACTION_SCOPE,
      });
      const safeMsg = formatEmailCodeSendError(e);
      if (step === 3) setCodeError(safeMsg);
      else setError(safeMsg);
    } finally {
      sendingCodeRef.current = false;
      setBusy(false);
    }
  };

  const confirmWithdrawal = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setCodeError('');
    setError('');

    const cachedGrant = grantId || getValidActionGrant(ACTION_SCOPE);
    if (cachedGrant) {
      setBusy(true);
      try {
        await submitWithdrawalOrder(cachedGrant);
      } catch (e: any) {
        setCodeError(e.message || 'Your withdrawal request could not be completed.');
      } finally {
        setBusy(false);
      }
      return;
    }

    if (!/^\d{6}$/.test(code)) return setCodeError('Enter the 6-digit code sent to your email.');
    setBusy(true);
    try {
      const verifyPayload = await securityApi.verifyActionCode(ACTION_SCOPE, code);
      if (!verifyPayload?.grantId) {
        throw new Error('The security code is invalid or expired.');
      }
      markActionVerified(ACTION_SCOPE, verifyPayload.grantId);
      setGrantId(verifyPayload.grantId);
      await submitWithdrawalOrder(verifyPayload.grantId);
    } catch (e: any) {
      const { message, errorCode } = sanitizeErrorForMonitoring(e);
      void monitoringApi.logClientError({
        category: 'security',
        eventType: 'WITHDRAWAL_CODE_VERIFY_FAILED',
        errorCode,
        message,
        scope: ACTION_SCOPE,
      });
      setCodeError('The security code is invalid or expired. Please check your code or request a new one.');
    } finally {
      setBusy(false);
    }
  };

  const availableBlock = blocker === 'kyc' || blocker === 'bank';
  const netPayout = Math.max(0, Number((numericAmount - withdrawalFeeEur).toFixed(2)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-3 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) close(); }}>
      <div className="my-auto max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[22px] border border-[#1F2C33] bg-[#0B0F10] p-5 text-[#F2F5F4] shadow-2xl sm:p-6" onClick={e => e.stopPropagation()}>
        <header className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#1F2C33] bg-[#121A1F] text-[#6FD8B0]"><ArrowUpRight className="size-5" /></div>
            <div>
              <p className="text-[10px] font-bold tracking-[.16em] text-[#8FA1A8]">INVESTOR PORTAL · WALLET</p>
              <h2 className="mt-1 text-xl font-bold">Withdraw funds</h2>
              <p className="mt-1 text-xs text-[#8FA1A8]">Withdrawals require email authorization and finance approval.</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowHistory((v) => !v)}
              aria-label="Toggle withdrawal history"
              className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold cursor-pointer ${
                showHistory
                  ? 'border-[#6FD8B0] bg-[#6FD8B0]/15 text-[#6FD8B0]'
                  : 'border-[#1F2C33] bg-[#121A1F] text-[#8FA1A8] hover:text-white'
              }`}
            >
              <History className="size-3.5" />
              <span>History ({historyRows.length})</span>
            </button>
            <button type="button" onClick={close} aria-label="Close withdrawal" className="grid min-h-[44px] min-w-[44px] shrink-0 place-items-center rounded-xl border border-[#1F2C33] text-[#8FA1A8] hover:text-white cursor-pointer">
              <X className="size-4" />
            </button>
          </div>
        </header>

        {showHistory ? (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Withdrawal Requests History</h3>
              <button
                type="button"
                onClick={() => setShowHistory(false)}
                className="min-h-[44px] px-2 text-xs font-semibold text-[#6FD8B0] hover:underline cursor-pointer"
              >
                New Withdrawal
              </button>
            </div>

            {loadingHistory ? (
              <div className="p-6 text-center text-xs text-[#8FA1A8]">Loading withdrawal history...</div>
            ) : historyRows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#1F2C33] p-6 text-center text-xs text-[#8FA1A8]">
                No wire withdrawals have been submitted from your account yet.
              </div>
            ) : (
              <div className="divide-y divide-[#1F2C33] rounded-2xl border border-[#1F2C33] bg-[#121A1F]">
                {historyRows.map((row: any) => {
                  const st = String(row.status || 'pending').toLowerCase();
                  return (
                    <div key={row.id || row.reference} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <div className="font-mono font-bold text-white truncate">{row.reference || row.id}</div>
                        <div className="text-[11px] text-[#8FA1A8] mt-0.5 truncate">
                          {row.paymentMethod || row.method || 'SEPA Wire'} · {formatDate(row.createdAt || row.created_at)}
                        </div>
                        {row.destination && (
                          <div className="text-[10.5px] font-mono text-[#8FA1A8]">{maskIban(String(row.destination))}</div>
                        )}
                      </div>
                      <div className="text-right shrink-0 space-y-1">
                        <div className="font-mono font-bold text-white">{money(Number(row.amount || 0))}</div>
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                            st === 'completed'
                              ? 'bg-[#6FD8B0]/15 text-[#6FD8B0]'
                              : st === 'rejected' || st === 'failed'
                              ? 'bg-rose-500/15 text-rose-300'
                              : 'bg-amber-400/15 text-amber-300'
                          }`}
                        >
                          {st}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          <>
            {step !== 4 && <div className="mb-5 flex gap-1.5" aria-label={`Step ${step} of 3`}>{[1,2,3].map(n => <span key={n} className={`h-1.5 flex-1 rounded-full ${n <= step ? 'bg-[#6FD8B0]' : 'bg-[#1F2C33]'}`} />)}</div>}
            {error && (
              <div role="alert" className="mb-4 rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-[13px] text-rose-300 space-y-2">
                <p>{error}</p>
                {consecutiveSendFailures >= 2 && (
                  <a href="/contact" className="inline-flex min-h-[44px] items-center font-semibold text-white underline underline-offset-4">
                    Contact support
                  </a>
                )}
              </div>
            )}

            {availableBlock && step !== 4 && (
              <div className="mb-4 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-[13px]">
                <div className="flex items-center gap-2 font-semibold text-amber-300"><ShieldAlert className="size-4" />{blocker === 'kyc' ? 'Verification required' : 'Add a bank account'}</div>
                <p className="mt-1 text-[#8FA1A8]">{blocker === 'kyc' ? 'Complete identity verification before withdrawing funds.' : 'Add a valid bank account in your own name to receive withdrawals.'}</p>
                <button type="button" onClick={() => { close(); onNavigateProfile(); }} className="mt-3 min-h-[44px] rounded-lg border border-amber-300/50 px-4 font-semibold text-amber-300 cursor-pointer">{blocker === 'kyc' ? 'Go to Compliance Vault' : 'Update bank details'}</button>
              </div>
            )}

            {step === 1 && <section className="space-y-4">
              <div><h3 className="text-2xl font-bold">Withdraw amount</h3><p className="mt-1 text-[13px] text-[#8FA1A8]">Available balance: <strong className="text-white">{money(balance)}</strong></p></div>
              <label htmlFor="withdrawal-modal-amount" className="flex h-20 items-center rounded-2xl border border-[#1F2C33] bg-[#121A1F] px-5 focus-within:border-[#6FD8B0]"><span className="text-3xl font-bold text-[#8FA1A8]">€</span><input id="withdrawal-modal-amount" aria-label="Withdrawal amount in euros" inputMode="decimal" type="number" min={MIN_WITHDRAWAL} max={balance} step="0.01" value={amount} onChange={e => { setAmount(e.target.value); setError(''); }} placeholder="0.00" className="h-full min-w-0 flex-1 bg-transparent pl-3 text-4xl font-bold outline-none placeholder:text-[#8FA1A8]/40" /><button type="button" onClick={() => { setAmount(balance.toFixed(2)); setError(''); }} className="min-h-[44px] rounded-lg border border-[#6FD8B0] px-3 text-xs font-semibold text-[#6FD8B0] cursor-pointer">Max</button></label>
              <p className="text-xs text-[#8FA1A8]">Minimum withdrawal: {money(MIN_WITHDRAWAL)}. Clearing fee: {withdrawalFeeEur > 0 ? money(withdrawalFeeEur) : '€0.00 (SEPA Standard)'}. Pending deposits and invested capital are excluded.</p>
              <button type="button" disabled={availableBlock || !amount || busy} onClick={continueToDestination} className="min-h-[44px] h-12 w-full rounded-[14px] bg-[#6FD8B0] font-bold text-[#07231A] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer">Continue</button>
            </section>}

            {step === 2 && <section className="space-y-4">
              <div><h3 className="text-2xl font-bold">Send to bank account</h3><p className="mt-1 text-[13px] text-[#8FA1A8]">Withdrawals are sent only to a bank account registered in your own name.</p></div>
              <div className="flex items-center gap-3 rounded-2xl border border-[#6FD8B0] bg-[#0F1A18] p-4"><Building2 className="size-6 shrink-0 text-[#6FD8B0]" /><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{user.fullName}</p><p className="mt-1 break-all text-xs text-[#8FA1A8]">{maskIban(iban)}</p></div></div>
              <p className="text-[13px] leading-relaxed text-[#8FA1A8]">To change your destination account, update your banking details in your profile. The registered beneficiary name must match your verified investor identity.</p>
              <button type="button" onClick={() => { close(); onNavigateProfile(); }} className="min-h-[44px] rounded-lg border border-[#1F2C33] px-4 text-[13px] cursor-pointer">Change bank account</button>
              <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setStep(1)} className="min-h-[44px] h-12 rounded-[14px] border border-[#1F2C33] font-semibold cursor-pointer">Back</button><button type="button" disabled={busy || consecutiveSendFailures >= 2} onClick={() => void requestCode(false)} className="min-h-[44px] h-12 rounded-[14px] bg-[#6FD8B0] font-bold text-[#07231A] disabled:opacity-40 cursor-pointer">{busy ? 'Sending code…' : sessionHasGrant ? 'Continue' : 'Send security code'}</button></div>
            </section>}

            {step === 3 && <form onSubmit={confirmWithdrawal} className="space-y-4">
              <div><h3 className="text-2xl font-bold">Confirm withdrawal</h3><p className="mt-1 text-[13px] text-[#8FA1A8]">{grantId ? 'Session security verification is active (remembered for 10 minutes).' : 'Review the request and enter the one-time security code.'}</p></div>
              <dl className="divide-y divide-[#1F2C33] rounded-2xl border border-[#1F2C33] bg-[#121A1F] text-sm">
                <div className="flex justify-between gap-3 p-3.5"><dt className="text-[#8FA1A8]">Withdrawal Amount</dt><dd className="font-semibold">{money(numericAmount)}</dd></div>
                <div className="flex justify-between gap-3 p-3.5"><dt className="text-[#8FA1A8]">Wire Clearing Fee</dt><dd className="font-semibold text-[#6FD8B0]">{withdrawalFeeEur > 0 ? money(withdrawalFeeEur) : '€0.00 (SEPA Free)'}</dd></div>
                <div className="flex justify-between gap-3 p-3.5"><dt className="text-[#8FA1A8]">Net Settlement</dt><dd className="font-bold text-white">{money(netPayout)}</dd></div>
                <div className="flex justify-between gap-3 p-3.5"><dt className="text-[#8FA1A8]">To</dt><dd className="max-w-[65%] break-all text-right font-semibold">{maskIban(iban)}</dd></div>
                <div className="flex justify-between gap-3 p-3.5"><dt className="text-[#8FA1A8]">Status on Submission</dt><dd className="text-right font-semibold text-amber-300">Pending finance approval</dd></div>
              </dl>
              {!grantId && (
                <>
                  {codeSent ? <p className="rounded-xl border border-[#1F2C33] bg-[#121A1F] p-3 text-xs text-[#8FA1A8]">A 6-digit code was sent to {maskedEmail}. Once verified, we remember it for 10 minutes.</p> : null}
                  <div>
                    <label htmlFor="withdrawal-modal-otp" className="block text-xs text-[#8FA1A8]">Security code</label>
                    <input id="withdrawal-modal-otp" required inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0,6)); setCodeError(''); }} placeholder="6-digit code" className="mt-1 min-h-[44px] h-12 w-full rounded-xl border border-[#1F2C33] bg-[#121A1F] px-4 text-center text-lg font-semibold tracking-[.4em] text-white outline-none placeholder:text-sm placeholder:tracking-normal focus:border-[#6FD8B0]" />
                  </div>
                </>
              )}
              {codeError && (
                <div role="alert" className="flex items-start gap-2 text-[13px] text-rose-400">
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p>{codeError}</p>
                    {consecutiveSendFailures >= 2 && (
                      <a href="/contact" className="inline-flex min-h-[44px] items-center font-semibold text-white underline underline-offset-4">
                        Contact support
                      </a>
                    )}
                  </div>
                </div>
              )}
              <button type="submit" disabled={busy || (!grantId && code.length !== 6)} className="min-h-[44px] h-12 w-full rounded-[14px] bg-[#6FD8B0] font-bold text-[#07231A] disabled:opacity-40 cursor-pointer">{busy ? 'Verifying and submitting…' : 'Confirm withdrawal'}</button>
              {!grantId && (
                consecutiveSendFailures >= 2 ? (
                  <a href="/contact" className="flex min-h-[44px] w-full items-center justify-center text-xs font-semibold text-[#6FD8B0] underline">
                    Contact support
                  </a>
                ) : (
                  <button type="button" disabled={busy || cooldown > 0} onClick={() => void requestCode(true)} className="min-h-[44px] w-full py-2 text-xs font-semibold text-[#6FD8B0] disabled:opacity-40 cursor-pointer">
                    {busy ? 'Sending code…' : cooldown > 0 ? `Resend code (${cooldown}s)` : 'Resend code'}
                  </button>
                )
              )}
              <button type="button" disabled={busy} onClick={() => setStep(2)} className="min-h-[44px] w-full py-2 text-xs text-[#8FA1A8] cursor-pointer">Back</button>
            </form>}

            {step === 4 && <section className="space-y-4">
              <div className="flex flex-col items-center gap-2 py-4 text-center"><div className="grid size-14 place-items-center rounded-full bg-[#6FD8B0]/15 text-[#6FD8B0]"><CheckCircle2 className="size-7" /></div><h3 className="text-2xl font-bold">Withdrawal submitted for review</h3><p className="text-[13px] text-[#8FA1A8]">Your funds are reserved and the request remains pending until treasury settles the wire transfer.</p></div>
              <dl className="divide-y divide-[#1F2C33] rounded-2xl border border-[#1F2C33] bg-[#121A1F] text-sm"><div className="flex justify-between p-4"><dt className="text-[#8FA1A8]">Status</dt><dd className="font-semibold text-amber-300">Pending review</dd></div><div className="flex justify-between gap-3 p-4"><dt className="text-[#8FA1A8]">Reference</dt><dd className="break-all text-right font-semibold">{reference}</dd></div><div className="flex justify-between gap-3 p-4"><dt className="text-[#8FA1A8]">Net Amount</dt><dd className="text-right font-semibold">{money(netPayout)}</dd></div><div className="flex justify-between gap-3 p-4"><dt className="text-[#8FA1A8]">Destination</dt><dd className="text-right font-semibold">{maskIban(iban)}</dd></div></dl>
              <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => { setShowHistory(true); setStep(1); }} className="min-h-[44px] h-12 rounded-[14px] border border-[#1F2C33] font-semibold cursor-pointer">View History</button><button type="button" onClick={close} className="min-h-[44px] h-12 rounded-[14px] bg-[#6FD8B0] font-bold text-[#07231A] cursor-pointer">Done</button></div>
            </section>}
          </>
        )}
      </div>
    </div>
  );
};
