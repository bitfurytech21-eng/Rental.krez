import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'portal';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'header' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={
          variant === 'portal'
            ? 'inline-flex items-center gap-1.5 min-h-[38px] rounded-[12px] border border-[#6FD8B0]/40 bg-[#121A1F] px-3 py-1.5 text-xs font-semibold text-[#6FD8B0] hover:border-[#6FD8B0] hover:bg-[#172229] transition-colors cursor-pointer'
            : 'inline-flex items-center gap-1.5 rounded-[10px] border border-current/25 px-3 py-1.5 text-xs font-heading font-semibold tracking-wider uppercase hover:border-[#c59b4c] hover:text-[#c59b4c] transition-all cursor-pointer'
        }
        aria-label="Install L'Agence app"
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span>Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={
            variant === 'portal'
              ? 'inline-flex items-center gap-1.5 min-h-[38px] rounded-[12px] border border-[#1F2C33] bg-[#121A1F] px-3 py-1.5 text-xs font-semibold text-[#F2F5F4] hover:border-[#6FD8B0] transition-colors cursor-pointer'
              : 'inline-flex items-center gap-1.5 rounded-[10px] border border-current/25 px-3 py-1.5 text-xs font-heading font-semibold tracking-wider uppercase hover:border-[#c59b4c] hover:text-[#c59b4c] transition-all cursor-pointer'
          }
          aria-label="Install app on iOS"
        >
          <Smartphone className="w-3.5 h-3.5 shrink-0" />
          <span>Get App</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
          >
            <div className="w-full max-w-sm rounded-2xl border border-[#2a3b42] bg-[#213138] p-6 text-[#f5f0ea] shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <h3 id="ios-install-title" className="text-lg font-heading font-bold text-white">
                  Install L&apos;Agence
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Close installation guide"
                  className="rounded-lg p-1 text-[#f5f0ea]/70 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ol className="mt-3 space-y-2 text-sm text-[#f5f0ea]/85 list-decimal list-inside">
                <li>
                  Tap the <strong>Share</strong> button in your Safari toolbar.
                </li>
                <li>
                  Scroll down and tap <strong>Add to Home Screen</strong>.
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-[#c59b4c] py-2.5 text-xs font-bold uppercase tracking-wider text-[#1a1a1a] hover:bg-[#d4ac5f] transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
