import React, { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth';
import { isSupabaseConfigured, supabase } from '../../lib/supabaseClient';

type GateStatus = 'checking' | 'clear' | 'required' | 'error';

async function hasOutdatedLegalAcceptance(userId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    throw new Error('Authentication is not configured, so current legal acceptance cannot be verified.');
  }

  const [profileResult, settingsResult] = await Promise.all([
    supabase.from('profiles')
      .select('terms_version,risk_version')
      .eq('id', userId)
      .maybeSingle(),
    supabase.from('settings')
      .select('value')
      .eq('key', 'legal')
      .maybeSingle(),
  ]);

  if (profileResult.error) throw profileResult.error;
  if (settingsResult.error) throw settingsResult.error;
  if (!profileResult.data) throw new Error('Profile not found');

  const legal = settingsResult.data?.value as
    | { terms_version?: string; risk_version?: string }
    | null
    | undefined;
  if (!legal?.terms_version || !legal?.risk_version) {
    throw new Error('Legal versions are not configured');
  }

  return (
    profileResult.data.terms_version !== legal.terms_version ||
    profileResult.data.risk_version !== legal.risk_version
  );
}

/**
 * App-wide investor gate: covers the portal and public property routes after login.
 */
export const LegalReacceptanceGate: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [status, setStatus] = useState<GateStatus>('checking');
  const [checkedUserId, setCheckedUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'investor') {
      setStatus('clear');
      setCheckedUserId(null);
      setError(null);
      return;
    }
    if (user.id.startsWith('usr-dev-') && !isSupabaseConfigured()) {
      setStatus('clear');
      setCheckedUserId(user.id);
      setError(null);
      return;
    }

    let active = true;
    setStatus('checking');
    setCheckedUserId(null);
    setError(null);

    void hasOutdatedLegalAcceptance(user.id)
      .then((required) => {
        if (!active) return;
        setStatus(required ? 'required' : 'clear');
        setCheckedUserId(user.id);
      })
      .catch((err: any) => {
        if (!active) return;
        setStatus('error');
        setCheckedUserId(user.id);
        setError(err?.message || 'Unable to verify current legal acceptance.');
      });

    return () => {
      active = false;
    };
  }, [authLoading, user?.id, user?.role, retryCount]);

  const handleAccept = async () => {
    if (submitting || !user) return;
    setSubmitting(true);
    setError(null);
    try {
      const { error: rpcError } = await supabase.rpc('accept_latest_terms');
      if (rpcError) throw rpcError;

      const stillRequired = await hasOutdatedLegalAcceptance(user.id);
      if (stillRequired) {
        throw new Error('Your acceptance could not be verified. Please try again.');
      }
      setStatus('clear');
      setCheckedUserId(user.id);
    } catch (err: any) {
      setStatus('required');
      setError(err?.message || 'Unable to save your legal acceptance.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || !user || user.role !== 'investor') return null;
  if (user.id.startsWith('usr-dev-') && !isSupabaseConfigured()) return null;

  const waitingForCurrentUser = checkedUserId !== user.id;
  if (status === 'clear' && !waitingForCurrentUser) return null;

  if (status === 'checking' || waitingForCurrentUser) {
    return (
      <main className="fixed inset-0 z-[10000] flex min-h-screen items-center justify-center bg-[#0B0F10] px-5 text-[#F2F5F4]">
        <div className="text-center" role="status" aria-live="polite">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[#26383A] border-t-[#6FD8B0]" />
          <p className="text-sm font-semibold">Checking your legal acceptance…</p>
        </div>
      </main>
    );
  }

  if (status === 'error') {
    return (
      <main className="fixed inset-0 z-[10000] flex min-h-screen items-center justify-center bg-[#0B0F10] px-5 py-10 text-[#F2F5F4]">
        <section className="w-full max-w-xl rounded-3xl border border-[#26383A] bg-[#11191B] p-7 shadow-2xl sm:p-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#6FD8B0]">Legal acceptance</p>
          <h1 className="mt-3 text-2xl font-bold">We couldn’t verify your acceptance</h1>
          <p className="mt-3 text-sm leading-6 text-[#A9B8B5]">
            Your account remains restricted from money actions until the current legal versions can be checked.
          </p>
          {error && (
            <p role="alert" className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={() => setRetryCount((count) => count + 1)}
            className="mt-6 min-h-12 w-full rounded-xl bg-[#6FD8B0] px-5 py-3 text-sm font-bold text-[#07110F] hover:bg-[#8BE5C2]"
          >
            Retry
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="fixed inset-0 z-[10000] flex min-h-screen items-center justify-center overflow-y-auto bg-[#0B0F10] px-5 py-10 text-[#F2F5F4]">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-reacceptance-title"
        className="my-auto w-full max-w-xl rounded-3xl border border-[#26383A] bg-[#11191B] p-7 shadow-2xl sm:p-10"
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#6FD8B0]">Account update required</p>
        <h1 id="legal-reacceptance-title" className="mt-3 text-2xl font-bold sm:text-3xl">
          We’ve updated our terms
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#A9B8B5]">
          Please review the latest documents before continuing to your account. Money actions remain unavailable until you accept.
        </p>

        <div className="mt-7 space-y-3">
          <a href="/terms" target="_blank" rel="noreferrer" className="flex min-h-12 items-center justify-between rounded-xl border border-[#26383A] px-4 py-3 text-sm font-semibold text-[#F2F5F4] hover:border-[#6FD8B0]">
            <span>Terms and Conditions</span><span aria-hidden="true">↗</span>
          </a>
          <a href="/privacy" target="_blank" rel="noreferrer" className="flex min-h-12 items-center justify-between rounded-xl border border-[#26383A] px-4 py-3 text-sm font-semibold text-[#F2F5F4] hover:border-[#6FD8B0]">
            <span>Privacy Policy</span><span aria-hidden="true">↗</span>
          </a>
          <a href="/risk-warning" target="_blank" rel="noreferrer" className="flex min-h-12 items-center justify-between rounded-xl border border-[#26383A] px-4 py-3 text-sm font-semibold text-[#F2F5F4] hover:border-[#6FD8B0]">
            <span>Risk Warning</span><span aria-hidden="true">↗</span>
          </a>
        </div>

        {error && (
          <p role="alert" className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </p>
        )}

        <button
          type="button"
          disabled={submitting}
          onClick={() => { void handleAccept(); }}
          className="mt-7 min-h-12 w-full rounded-xl bg-[#6FD8B0] px-5 py-3 text-sm font-bold text-[#07110F] hover:bg-[#8BE5C2] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Saving acceptance…' : 'Accept'}
        </button>
      </section>
    </main>
  );
};
