import React, { useState, useEffect } from 'react';
import { 
  getCookieConsent, 
  acceptAllCookies, 
  rejectOptionalCookies,
  subscribeToCookieConsent 
} from '../../lib/cookieConsent';
import { CookieSettingsModal } from './CookieSettingsModal';
import { Cookie, Shield, Sliders, ExternalLink } from 'lucide-react';

interface CookieConsentBannerProps {
  onNavigatePrivacy?: () => void;
}

export const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({
  onNavigatePrivacy,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Check if user has already made a decision
    const current = getCookieConsent();
    if (!current || !current.hasChosen) {
      // Show banner after brief delay to avoid layout shift
      const timer = setTimeout(() => setIsVisible(true), 350);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }

    // Subscribe to changes in case user resets or changes consent
    const unsubscribe = subscribeToCookieConsent((state) => {
      setIsVisible(!state.hasChosen);
    });
    return () => unsubscribe();
  }, []);

  const handleAcceptAll = () => {
    acceptAllCookies();
    setIsVisible(false);
  };

  const handleRejectOptional = () => {
    rejectOptionalCookies();
    setIsVisible(false);
  };

  const handleOpenSettings = () => {
    setIsModalOpen(true);
  };

  if (!isVisible && !isModalOpen) return null;

  return (
    <>
      {isVisible && (
        <aside
          role="region"
          aria-label="Cookie consent banner"
          className="fixed bottom-0 left-0 right-0 z-40 p-3 sm:p-5 pointer-events-none animate-in slide-in-from-bottom duration-300"
        >
          <div className="max-w-5xl mx-auto bg-[#0B1B30]/95 text-[#EEF1EC] backdrop-blur-md rounded-2xl sm:rounded-3xl border border-[#1D3860] shadow-2xl p-5 sm:p-6 pointer-events-auto">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              
              {/* Informative text */}
              <div className="flex items-start gap-3.5 flex-1">
                <div className="w-9 h-9 rounded-xl bg-[#102442] border border-[#1D3860] flex items-center justify-center text-[#C5A880] shrink-0 mt-0.5">
                  <Cookie className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">We Respect Your Privacy</span>
                    <span className="text-[10px] font-semibold text-[#C5A880] uppercase tracking-wider bg-[#102442] px-2 py-0.5 rounded-full border border-[#1D3860]">
                      GDPR & ePrivacy
                    </span>
                  </div>
                  <p className="text-xs text-[#8EA7C7] leading-relaxed">
                    Kretz uses strictly necessary cookies to deliver secure authentication, double-entry financial ledger integrity, and Cloudflare Turnstile bot verification. Optional cookies for analytics, performance, and embedded broadcast playback require your consent.{' '}
                    {onNavigatePrivacy && (
                      <button
                        onClick={onNavigatePrivacy}
                        className="text-[#C5A880] hover:underline font-medium cursor-pointer"
                      >
                        Privacy Policy
                      </button>
                    )}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0">
                <button
                  onClick={handleOpenSettings}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/15 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Sliders className="w-3.5 h-3.5 text-[#C5A880]" />
                  <span>Cookie Settings</span>
                </button>

                <button
                  onClick={handleRejectOptional}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#102442] hover:bg-[#163058] text-slate-200 border border-[#1D3860] transition-colors cursor-pointer"
                >
                  Reject Optional
                </button>

                <button
                  onClick={handleAcceptAll}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-[#C5A880] hover:bg-[#B39369] text-[#0B1B30] transition-colors cursor-pointer shadow-md"
                >
                  Accept All
                </button>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* Preferences Modal */}
      <CookieSettingsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onNavigatePrivacy={onNavigatePrivacy}
      />
    </>
  );
};
