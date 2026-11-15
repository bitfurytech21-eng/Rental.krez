import React, { useEffect } from 'react';
import { hasConsentFor, subscribeToCookieConsent } from '../../lib/cookieConsent';

declare global {
  interface Window {
    smartsupp?: any;
    _smartsupp?: { key?: string; [key: string]: any };
  }
}

const SMARTSUPP_SCRIPT_ID = 'kretz-smartsupp-loader';

function loadSmartsupp(): boolean {
  const key = import.meta.env.VITE_SMARTSUPP_KEY?.trim();
  if (!key || !hasConsentFor('marketing') || typeof window === 'undefined') return false;

  window._smartsupp = window._smartsupp || {};
  window._smartsupp.key = key;

  // Preserve Smartsupp's command queue so chat:open can be called before
  // the vendor script has finished loading.
  if (typeof window.smartsupp !== 'function') {
    const queue: any = function (...args: any[]) {
      queue.q.push(args);
    };
    queue.q = [];
    window.smartsupp = queue;
  }

  if (!document.getElementById(SMARTSUPP_SCRIPT_ID)) {
    const script = document.createElement('script');
    script.id = SMARTSUPP_SCRIPT_ID;
    script.async = true;
    script.src = 'https://www.smartsuppchat.com/loader.js?';
    document.head.appendChild(script);
  }

  return true;
}

export const SmartsuppWidget: React.FC = () => {
  useEffect(() => {
    const syncConsent = () => {
      if (hasConsentFor('marketing')) {
        loadSmartsupp();
      } else if (typeof window.smartsupp === 'function') {
        // Close the chat immediately when optional chat consent is withdrawn.
        window.smartsupp('chat:close');
      }
    };

    const handleOpenSupport = () => {
      if (!hasConsentFor('marketing')) {
        window.dispatchEvent(new CustomEvent('kretz:open-cookie-settings'));
        return;
      }
      if (loadSmartsupp()) {
        window.smartsupp?.('chat:open');
      }
    };

    syncConsent();
    const unsubscribe = subscribeToCookieConsent(syncConsent);
    window.addEventListener('kretz:open-support', handleOpenSupport);

    return () => {
      unsubscribe();
      window.removeEventListener('kretz:open-support', handleOpenSupport);
    };
  }, []);

  // Smartsupp injects and manages its own launcher and conversation window.
  return null;
};
