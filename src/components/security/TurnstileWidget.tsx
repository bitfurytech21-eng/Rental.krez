import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

type TurnstileErrorCallback = (errorCode?: string | number) => boolean;

declare global {
  interface Window {
    turnstile?: {
      ready: (callback: () => void) => void;
      render: (container: HTMLElement | string, params: {
        sitekey: string;
        callback?: (token: string) => void;
        'error-callback'?: TurnstileErrorCallback;
        'expired-callback'?: () => void;
        'timeout-callback'?: () => void;
        theme?: 'light' | 'dark' | 'auto';
        size?: 'normal' | 'compact' | 'flexible';
        action?: string;
      }) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: (error: string) => void;
  action?: string;
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
  label?: string;
}

const DEFAULT_TEST_SITEKEY = '0x4AAAAAAGAW16GKNQCPgkic';
const SCRIPT_ID = 'cf-turnstile-script';
const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let scriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    const created = !script;
    if (!script) {
      script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src = SCRIPT_URL;
      // Load the API in ordered mode: Cloudflare requires the script to be
      // available before calling turnstile.ready().
      script.async = false;
      script.removeAttribute('async');
      script.removeAttribute('defer');
    }

    const activeScript = script;
    // Also normalize a script tag that may already have been inserted by an
    // earlier mount or by static HTML. Never leave async/defer on api.js.
    activeScript.removeAttribute('async');
    activeScript.removeAttribute('defer');
    activeScript.async = false;
    let settled = false;
    const cleanup = () => {
      activeScript.removeEventListener('load', onLoad);
      activeScript.removeEventListener('error', onError);
    };
    const onLoad = () => {
      if (settled) return;
      settled = true;
      cleanup();
      if (window.turnstile) resolve();
      else {
        activeScript.remove();
        scriptPromise = null;
        reject(new Error('Cloudflare Turnstile loaded but its API was unavailable. Please retry.'));
      }
    };
    const onError = () => {
      if (settled) return;
      settled = true;
      cleanup();
      activeScript.remove();
      scriptPromise = null;
      reject(new Error('Cloudflare Turnstile could not load. Check your connection and retry.'));
    };

    activeScript.addEventListener('load', onLoad, { once: true });
    activeScript.addEventListener('error', onError, { once: true });
    if (created) document.head.appendChild(activeScript);

    // Covers the case where the API becomes available while listeners are attached.
    if (window.turnstile) onLoad();
  }).catch((error: unknown) => {
    scriptPromise = null;
    throw error;
  });

  return scriptPromise;
}

export const TurnstileWidget: React.FC<TurnstileWidgetProps> = ({
  onVerify,
  onExpire,
  onError,
  action = 'general',
  theme = 'dark',
  className = '',
  label = 'Security Check: Cloudflare Turnstile Human Verification',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const callbacksRef = useRef({ onVerify, onExpire, onError });
  const [status, setStatus] = useState<'loading' | 'ready' | 'verified' | 'error' | 'expired'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  callbacksRef.current = { onVerify, onExpire, onError };

  const configuredSiteKey = String(import.meta.env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY || '').trim();
  // Never use a test sitekey in production.
  const siteKey = configuredSiteKey || (!import.meta.env.PROD ? DEFAULT_TEST_SITEKEY : '');

  useEffect(() => {
    let cancelled = false;
    let localWidgetId: string | null = null;

    const showError = (message: string) => {
      setStatus('error');
      setErrorMessage(message);
      callbacksRef.current.onError?.(message);
    };

    const renderWidget = () => {
      if (cancelled || !containerRef.current || !window.turnstile) return;

      try {
        containerRef.current.replaceChildren();
        const id = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme,
          size: 'flexible',
          action,
          callback: (token: string) => {
            if (cancelled) return;
            setStatus('verified');
            setErrorMessage(null);
            callbacksRef.current.onVerify(token);
          },
          'expired-callback': () => {
            if (cancelled) return;
            setStatus('expired');
            callbacksRef.current.onExpire?.();
          },
          'timeout-callback': () => {
            if (cancelled) return;
            setStatus('expired');
            callbacksRef.current.onExpire?.();
          },
          'error-callback': (code?: string | number) => {
            if (!cancelled) {
              const suffix = code === undefined ? '' : ' (' + String(code) + ')';
              showError('The security check could not complete' + suffix + '. Please retry.');
            }
            return true;
          },
        });
        localWidgetId = id;
        widgetIdRef.current = id;
        if (!cancelled) setStatus('ready');
      } catch (error) {
        showError(error instanceof Error ? error.message : 'Verification could not be initialized.');
      }
    };

    if (!siteKey) {
      showError('Cloudflare Turnstile is not configured for this production build. Please contact support.');
    } else {
      setStatus('loading');
      setErrorMessage(null);
      loadTurnstileScript()
        .then(() => {
          if (!cancelled) window.turnstile?.ready(renderWidget);
        })
        .catch((error: unknown) => {
          if (!cancelled) showError(error instanceof Error ? error.message : 'Cloudflare Turnstile could not load. Please retry.');
        });
    }

    return () => {
      cancelled = true;
      if (localWidgetId && window.turnstile) {
        try {
          window.turnstile.remove(localWidgetId);
        } catch {
          // Cloudflare may already have removed the widget during navigation.
        }
      }
      if (widgetIdRef.current === localWidgetId) widgetIdRef.current = null;
    };
  }, [siteKey, theme, action, retryCount]);

  const handleManualReset = () => {
    setErrorMessage(null);
    setStatus('loading');
    if (widgetIdRef.current && window.turnstile) {
      try {
        window.turnstile.reset(widgetIdRef.current);
        return;
      } catch {
        widgetIdRef.current = null;
      }
    }
    // Re-run script loading and widget rendering if no usable widget exists.
    setRetryCount((count) => count + 1);
  };

  return (
    <div className={'turnstile-security-wrapper space-y-2 ' + className}>
      {label && (
        <div className="flex items-center justify-between text-[11px] font-bold text-[#D1E2F7]">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#C5A880]" />
            <span>{label}</span>
          </span>
          {status === 'verified' && (
            <span className="text-[#C5A880] font-bold flex items-center gap-1 text-[10px]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Verified Human
            </span>
          )}
        </div>
      )}

      <div
        ref={containerRef}
        aria-live="polite"
        className="min-h-[65px] w-full flex items-center justify-center rounded-xl bg-black/10 border border-slate-700/30 overflow-hidden"
      />

      {status === 'error' && (
        <div role="alert" className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>{errorMessage || 'The security check could not complete.'}</span>
          </div>
          <button
            type="button"
            onClick={handleManualReset}
            className="shrink-0 text-xs font-semibold px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 rounded flex items-center gap-1 cursor-pointer text-amber-200"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      )}

      {status === 'expired' && (
        <div role="status" className="p-2 rounded-lg bg-red-950/40 border border-red-500/30 text-red-300 text-[11px] flex items-center justify-between gap-2">
          <span>Verification expired or timed out. Please refresh the security check.</span>
          <button
            type="button"
            onClick={handleManualReset}
            className="shrink-0 text-[11px] font-bold text-red-200 underline cursor-pointer"
          >
            Refresh Challenge
          </button>
        </div>
      )}
    </div>
  );
};
