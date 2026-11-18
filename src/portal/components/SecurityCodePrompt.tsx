import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Mail, ShieldCheck, X } from 'lucide-react';
import { monitoringApi, securityApi } from '../../lib/api';
import {
  formatEmailCodeSendError,
  getValidActionGrant,
  markActionVerified,
  sanitizeErrorForMonitoring,
  SensitiveActionScope,
} from '../../lib/actionVerificationSession';

interface SecurityCodePromptProps {
  isOpen: boolean;
  actionScope: SensitiveActionScope;
  title: string;
  description: string;
  confirmLabel?: string;
  onVerified: (grantId: string) => void;
  onClose: () => void;
  onContactSupport?: () => void;
}

export const SecurityCodePrompt: React.FC<SecurityCodePromptProps> = ({
  isOpen,
  actionScope,
  title,
  description,
  confirmLabel = 'Verify & Continue',
  onVerified,
  onClose,
  onContactSupport,
}) => {
  const [code, setCode] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [consecutiveSendFailures, setConsecutiveSendFailures] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const requestInFlightRef = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((prev) => Math.max(0, prev - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const sendCode = async (isInitialRequest = false) => {
    if (requestInFlightRef.current || sending) return;
    if (!isInitialRequest && (cooldown > 0 || consecutiveSendFailures >= 2)) return;

    requestInFlightRef.current = true;
    setSending(true);
    setError(null);
    if (!isInitialRequest) {
      setStatusMessage(null);
    }

    try {
      const res = await securityApi.requestActionCode(actionScope);
      setConsecutiveSendFailures(0);
      if (res.maskedEmail) setMaskedEmail(res.maskedEmail);

      if (res.otpRequired === false && res.grantId) {
        markActionVerified(actionScope, res.grantId);
        onVerified(res.grantId);
        return;
      }

      setCooldown(60);
      setStatusMessage(
        res.maskedEmail
          ? `A 6-digit security code has been sent to ${res.maskedEmail}.`
          : 'A 6-digit security code has been sent to your registered email.'
      );
    } catch (err: any) {
      const nextFailures = consecutiveSendFailures + 1;
      setConsecutiveSendFailures(nextFailures);
      const { message, errorCode } = sanitizeErrorForMonitoring(err);
      void monitoringApi.logClientError({
        category: 'security',
        eventType: 'SENSITIVE_ACTION_CODE_SEND_FAILED',
        errorCode,
        message,
        scope: actionScope,
      });
      setError(formatEmailCodeSendError(err));
    } finally {
      requestInFlightRef.current = false;
      setSending(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setCode('');
      setError(null);
      setStatusMessage(null);
      setConsecutiveSendFailures(0);
      setCooldown(0);
      return;
    }

    const cachedGrant = getValidActionGrant(actionScope);
    if (cachedGrant) {
      onVerified(cachedGrant);
      return;
    }

    void sendCode(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, actionScope]);

  if (!isOpen) return null;

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (verifying) return;
    const clean = code.replace(/\D/g, '').slice(0, 6);
    if (clean.length !== 6) {
      setError('Enter the 6-digit security code sent to your email.');
      return;
    }

    setVerifying(true);
    setError(null);
    try {
      const res = await securityApi.verifyActionCode(actionScope, clean);
      markActionVerified(actionScope, res.grantId);
      onVerified(res.grantId);
    } catch (err: any) {
      const { message, errorCode } = sanitizeErrorForMonitoring(err);
      void monitoringApi.logClientError({
        category: 'security',
        eventType: 'SENSITIVE_ACTION_CODE_VERIFY_FAILED',
        errorCode,
        message,
        scope: actionScope,
      });
      setError('The security code is invalid or expired. Please check the code or request a new one.');
    } finally {
      setVerifying(false);
    }
  };

  const handleSupportClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onContactSupport) {
      e.preventDefault();
      onClose();
      onContactSupport();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="security-code-modal-title"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close security verification dialog"
          className="absolute right-4 top-4 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-start gap-3 pr-10">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 id="security-code-modal-title" className="text-lg font-semibold text-slate-900">
              {title}
            </h2>
            <p className="mt-1 text-sm text-slate-600">{description}</p>
          </div>
        </div>

        <form onSubmit={handleVerifySubmit} noValidate className="mt-5 space-y-4">
          {statusMessage && (
            <div
              role="status"
              className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900"
            >
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
              <span>{statusMessage}</span>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <div className="space-y-2">
                <p>{error}</p>
                {consecutiveSendFailures >= 2 && (
                  <a
                    href="/contact"
                    onClick={handleSupportClick}
                    className="inline-flex min-h-[44px] items-center font-semibold text-rose-900 underline underline-offset-4 hover:text-rose-700"
                  >
                    Contact support
                  </a>
                )}
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="sensitive-action-security-code"
              className="block text-sm font-medium text-slate-800"
            >
              6-digit email security code
            </label>
            <input
              id="sensitive-action-security-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="mt-1.5 min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-center font-mono text-lg tracking-[0.35em] text-slate-900 focus:border-slate-900 focus:outline-none"
            />
            <p className="mt-1.5 text-xs text-slate-500">
              {maskedEmail
                ? `Sent to ${maskedEmail}. Once verified, we remember this verification for 10 minutes.`
                : 'Once verified, we remember this verification for 10 minutes in your session.'}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            {consecutiveSendFailures < 2 ? (
              <button
                type="button"
                disabled={sending || cooldown > 0}
                onClick={() => void sendCode(false)}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              >
                {sending
                  ? 'Sending code...'
                  : cooldown > 0
                  ? `Resend code (${cooldown}s)`
                  : 'Resend code'}
              </button>
            ) : (
              <a
                href="/contact"
                onClick={handleSupportClick}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-rose-300 bg-rose-50 px-4 text-xs font-semibold text-rose-800 transition hover:bg-rose-100"
              >
                Contact support
              </a>
            )}

            <button
              type="submit"
              disabled={verifying || sending || code.replace(/\D/g, '').length !== 6}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              {verifying ? 'Verifying...' : confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
