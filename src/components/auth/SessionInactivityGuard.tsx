import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../lib/auth';

const INACTIVITY_WARNING_MS = 29 * 60 * 1000;
const WARNING_SECONDS = 60;

export const SessionInactivityGuard: React.FC = () => {
  const { user, logout } = useAuth();
  const [warning, setWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(WARNING_SECONDS);
  const warningRef = useRef(false);
  const resetActivityRef = useRef<() => void>(() => undefined);
  const logoutRef = useRef(logout);
  logoutRef.current = logout;

  useEffect(() => {
    if (!user?.id) {
      warningRef.current = false;
      setWarning(false);
      return;
    }

    let warningTimer: number | undefined;
    let signOutTimer: number | undefined;

    const clearTimers = () => {
      if (warningTimer !== undefined) window.clearTimeout(warningTimer);
      if (signOutTimer !== undefined) window.clearInterval(signOutTimer);
    };

    const resetActivity = () => {
      if (warningRef.current) return;
      clearTimers();
      warningTimer = window.setTimeout(() => {
        warningRef.current = true;
        setWarning(true);
        setSecondsLeft(WARNING_SECONDS);
        signOutTimer = window.setInterval(() => {
          setSecondsLeft((remaining) => {
            if (remaining <= 1) {
              if (signOutTimer !== undefined) window.clearInterval(signOutTimer);
              warningRef.current = false;
              setWarning(false);
              void logoutRef.current();
              return 0;
            }
            return remaining - 1;
          });
        }, 1000);
      }, INACTIVITY_WARNING_MS);
    };

    resetActivityRef.current = resetActivity;
    const activityEvents: Array<keyof WindowEventMap> = [
      'pointerdown',
      'keydown',
      'touchstart',
      'mousemove',
      'scroll',
      'wheel',
    ];
    activityEvents.forEach((eventName) => window.addEventListener(eventName, resetActivity, { passive: true }));
    resetActivity();

    return () => {
      clearTimers();
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, resetActivity));
      resetActivityRef.current = () => undefined;
    };
  }, [user?.id]);

  const staySignedIn = () => {
    warningRef.current = false;
    setWarning(false);
    setSecondsLeft(WARNING_SECONDS);
    resetActivityRef.current();
  };

  const signOutNow = () => {
    warningRef.current = false;
    setWarning(false);
    void logoutRef.current();
  };

  if (!user || !warning) return null;

  return (
    <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-sm">
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="session-timeout-title"
        aria-describedby="session-timeout-description"
        className="w-full max-w-md rounded-3xl border border-[#33433F] bg-[#11191B] p-6 text-[#F2F5F4] shadow-2xl sm:p-8"
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-400/10 text-amber-300">
          <span className="text-xl" aria-hidden="true">⏱</span>
        </div>
        <h2 id="session-timeout-title" className="text-center text-xl font-bold">Are you still there?</h2>
        <p id="session-timeout-description" className="mt-3 text-center text-sm leading-relaxed text-[#A9B8B5]">
          You’ve been inactive for a while. For your security, we’ll sign you out in {secondsLeft} seconds.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <button type="button" onClick={staySignedIn} className="min-h-12 w-full rounded-xl bg-[#6FD8B0] px-5 py-3 text-sm font-bold text-[#07110F] hover:bg-[#8BE5C2]">
            Stay signed in
          </button>
          <button type="button" onClick={signOutNow} className="min-h-11 w-full rounded-xl border border-[#33433F] px-5 py-3 text-sm font-semibold text-[#D5DEDC] hover:bg-white/5">
            Sign out now
          </button>
        </div>
      </section>
    </div>
  );
};
