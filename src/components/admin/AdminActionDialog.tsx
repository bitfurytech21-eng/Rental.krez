import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Loader2, X } from 'lucide-react';
import {
  eurToCents,
  formatCentsEur,
  formatPlainDatabaseError,
} from './adminSupabaseGateway';

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"]):not([disabled])',
].join(', ');

/**
 * Accessible dialog focus manager:
 * - Saves trigger element before opening
 * - Moves focus into the dialog on open
 * - Traps Tab / Shift+Tab inside the dialog and handles Escape
 * - Restores focus to the triggering element on close (or connected queue/main fallback if row was removed)
 */
export function useDialogFocus<T extends HTMLElement = HTMLDivElement>(
  open: boolean,
  onClose?: () => void,
  disabled = false
): React.RefObject<T | null> {
  const containerRef = useRef<T | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      wasOpenRef.current = true;
      previousFocusRef.current =
        typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null;

      const raf = window.requestAnimationFrame(() => {
        const container = containerRef.current;
        if (!container) return;
        const active = document.activeElement as HTMLElement | null;
        if (active && container.contains(active)) return;

        const firstInput = container.querySelector<HTMLElement>(
          'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])'
        );
        const firstFocusable = container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
        const target = firstInput || firstFocusable || container;
        target.focus({ preventScroll: true });
      });

      return () => window.cancelAnimationFrame(raf);
    }

    if (!open && wasOpenRef.current) {
      wasOpenRef.current = false;
      const prev = previousFocusRef.current;
      previousFocusRef.current = null;
      window.requestAnimationFrame(() => {
        if (prev && prev.isConnected && typeof prev.focus === 'function') {
          prev.focus({ preventScroll: true });
          return;
        }
        const fallback = document.querySelector<HTMLElement>(
          '[data-admin-queue-focus], #admin-main-heading, main h1, main h2, main'
        );
        if (fallback) {
          if (!fallback.hasAttribute('tabindex')) {
            fallback.setAttribute('tabindex', '-1');
          }
          fallback.focus({ preventScroll: true });
        }
      });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const container = containerRef.current;
      if (!container) return;

      if (e.key === 'Escape') {
        if (!disabled && onCloseRef.current) {
          e.preventDefault();
          e.stopPropagation();
          onCloseRef.current();
        }
        return;
      }

      if (e.key === 'Tab') {
        const focusables = Array.from(
          container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        ).filter((el) => el.offsetParent !== null || el === document.activeElement);

        if (focusables.length === 0) {
          e.preventDefault();
          container.focus({ preventScroll: true });
          return;
        }

        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;

        if (!active || !container.contains(active)) {
          e.preventDefault();
          (e.shiftKey ? last : first).focus();
        } else if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [open, disabled]);

  return containerRef;
}

export interface AdminActionDialogDetail {
  label: string;
  value: React.ReactNode;
  tone?: 'default' | 'accent' | 'danger' | 'mono';
}

export interface AdminActionDialogProps {
  open: boolean;
  actionName: string;
  confirmLabel?: string;
  description?: string;
  investorName: string;
  investorEmail: string;
  /** Exact integer cents (preferred over amountEur to avoid float math) */
  amountCents?: number | null;
  /** Fallback EUR value when cents not already computed */
  amountEur?: number | null;
  /** Optional custom amount label (e.g. "+€100.00" or "N/A (KYC review)") */
  amountDisplay?: string;
  reference: string;
  extraDetails?: AdminActionDialogDetail[];
  tone?: 'primary' | 'danger';
  validate?: () => string | null;
  children?: React.ReactNode;
  onConfirm: () => Promise<string | void>;
  onRefresh?: () => Promise<void> | void;
  onRefreshError?: (message: string) => void;
  onSuccess: (message: string) => void;
  onClose: () => void;
}

export const AdminActionDialog: React.FC<AdminActionDialogProps> = ({
  open,
  actionName,
  confirmLabel,
  description,
  investorName,
  investorEmail,
  amountCents,
  amountEur,
  amountDisplay,
  reference,
  extraDetails = [],
  tone = 'primary',
  validate,
  children,
  onConfirm,
  onRefresh,
  onRefreshError,
  onSuccess,
  onClose,
}) => {
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const lockRef = useRef<boolean>(false);
  const dialogFormRef = useDialogFocus<HTMLFormElement>(open, onClose, busy);

  useEffect(() => {
    if (!open) {
      setErrorMsg(null);
      setBusy(false);
      lockRef.current = false;
      return;
    }
    setErrorMsg(null);
  }, [open, actionName, reference]);

  if (!open) return null;

  const buttonText = confirmLabel || actionName;
  const resolvedAmount =
    amountDisplay !== undefined
      ? amountDisplay
      : amountCents !== undefined && amountCents !== null
      ? formatCentsEur(amountCents)
      : amountEur !== undefined && amountEur !== null
      ? formatCentsEur(eurToCents(amountEur))
      : '—';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockRef.current || busy) return;

    if (validate) {
      const validationError = validate();
      if (validationError) {
        setErrorMsg(validationError);
        return;
      }
    }

    lockRef.current = true;
    setBusy(true);
    setErrorMsg(null);

    try {
      const resultMsg = await onConfirm();
      if (onRefresh) {
        try {
          await onRefresh();
        } catch (refreshErr: any) {
          const parsedRefresh = formatPlainDatabaseError(
            refreshErr,
            'Action succeeded, but refreshing the queue failed.'
          );
          onRefreshError?.(parsedRefresh.message);
        }
      }
      onClose();
      onSuccess(resultMsg || `${actionName} completed.`);
    } catch (err: any) {
      const parsed = formatPlainDatabaseError(err);
      setErrorMsg(parsed.message);
      if (parsed.alreadyProcessed && onRefresh) {
        Promise.resolve(onRefresh()).catch((refreshErr: any) => {
          const parsedRefresh = formatPlainDatabaseError(
            refreshErr,
            'Unable to refresh list automatically.'
          );
          onRefreshError?.(parsedRefresh.message);
        });
      }
    } finally {
      setBusy(false);
      lockRef.current = false;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-action-dialog-title"
    >
      <form
        ref={dialogFormRef}
        tabIndex={-1}
        onSubmit={handleSubmit}
        noValidate
        className="bg-[#121A1F] border border-[#1F2C33] rounded-2xl max-w-md w-full p-6 space-y-4 my-8 shadow-2xl focus:outline-none"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#1F2C33] pb-3">
          <div>
            <h3 id="admin-action-dialog-title" className="text-sm font-bold text-[#F2F5F4]">
              {actionName}
            </h3>
            {description && (
              <p className="text-xs text-[#8FA1A8] mt-0.5">{description}</p>
            )}
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            aria-label="Close confirmation dialog"
            className="min-h-[44px] min-w-[44px] -mr-2 -mt-2 inline-flex items-center justify-center rounded-xl text-[#8FA1A8] hover:text-[#F2F5F4] hover:bg-[#162026] cursor-pointer disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Repeating Confirmation Summary */}
        <div className="bg-[#0B0F10] border border-[#1F2C33] rounded-xl p-3 text-xs text-[#B6C4C9] space-y-1.5 tabular-nums">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[#8FA1A8]">Action:</span>
            <strong className={tone === 'danger' ? 'text-rose-400 text-right' : 'text-[#6FD8B0] text-right'}>
              {actionName}
            </strong>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[#8FA1A8]">Investor:</span>
            <span className="text-right">
              <strong className="text-[#F2F5F4]">{investorName || 'Investor'}</strong>{' '}
              <span className="text-[#8FA1A8]">({investorEmail || '—'})</span>
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[#8FA1A8]">Amount (EUR):</span>
            <strong className="text-[#F2F5F4] text-right">{resolvedAmount}</strong>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[#8FA1A8]">Reference:</span>
            <strong className="font-mono text-[#F2F5F4] text-right break-all">{reference || '—'}</strong>
          </div>

          {extraDetails.map((detail, idx) => (
            <div key={`${detail.label}-${idx}`} className="flex items-baseline justify-between gap-2 pt-0.5 border-t border-[#1F2C33]/60">
              <span className="text-[#8FA1A8]">{detail.label}:</span>
              <span
                className={`text-right ${
                  detail.tone === 'accent'
                    ? 'font-bold text-[#6FD8B0]'
                    : detail.tone === 'danger'
                    ? 'font-bold text-rose-300'
                    : detail.tone === 'mono'
                    ? 'font-mono font-semibold text-[#F2F5F4] break-all'
                    : 'font-semibold text-[#F2F5F4]'
                }`}
              >
                {detail.value}
              </span>
            </div>
          ))}
        </div>

        {children}

        {errorMsg && (
          <div
            role="alert"
            aria-live="assertive"
            className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-[#1F2C33]">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-[#0B0F10] border border-[#1F2C33] text-xs font-semibold text-[#B6C4C9] hover:text-[#F2F5F4] cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60 ${
              tone === 'danger'
                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                : 'bg-[#6FD8B0] hover:bg-[#5ec8a0] text-[#0B0F10]'
            }`}
          >
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
            <span>{busy ? `${buttonText}...` : buttonText}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

