import { useEffect } from 'react';

const SMARTSUPP_KEY = import.meta.env.VITE_SMARTSUPP_KEY || '61033062bd34d55a58c3546d5b618ead716fb2a3';

export function SmartsuppWidget() {
  useEffect(() => {
    if (window.location.pathname.startsWith('/admin') || window.location.pathname === '/admin-login') return;
    if (document.getElementById('smartsupp-loader')) return;

    window._smartsupp = window._smartsupp || {};
    window._smartsupp.key = SMARTSUPP_KEY;
    const script = document.createElement('script');
    script.id = 'smartsupp-loader';
    script.async = true;
    script.src = 'https://www.smartsuppchat.com/loader.js';
    document.head.appendChild(script);
  }, []);

  return null;
}

declare global {
  interface Window {
    _smartsupp?: Record<string, any>;
    smartsupp?: any;
  }
}
