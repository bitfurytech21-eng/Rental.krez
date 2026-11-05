import React, { useState, useEffect } from 'react';
import { 
  COOKIE_CATEGORIES, 
  CookieCategory, 
  CookieConsentState 
} from '../../types/cookies';
import { 
  getCookieConsent, 
  saveCookieConsent, 
  acceptAllCookies, 
  rejectOptionalCookies 
} from '../../lib/cookieConsent';
import { 
  ShieldCheck, 
  X, 
  Check, 
  Lock, 
  ChevronDown, 
  ChevronUp, 
  Info,
  Cookie
} from 'lucide-react';

interface CookieSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigatePrivacy?: () => void;
}

export const CookieSettingsModal: React.FC<CookieSettingsModalProps> = ({
  isOpen,
  onClose,
  onNavigatePrivacy,
}) => {
  const [categories, setCategories] = useState<{
    strictlyNecessary: boolean;
    analytics: boolean;
    marketing: boolean;
    preferences: boolean;
  }>({
    strictlyNecessary: true,
    analytics: false,
    marketing: false,
    preferences: false,
  });

  const [expandedCategory, setExpandedCategory] = useState<string | null>('strictlyNecessary');

  useEffect(() => {
    if (isOpen) {
      const current = getCookieConsent();
      if (current) {
        setCategories(current.categories);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggle = (id: CookieCategory) => {
    if (id === 'strictlyNecessary') return; // Cannot toggle strictly necessary
    setCategories((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleSave = () => {
    saveCookieConsent(categories);
    onClose();
  };

  const handleAcceptAll = () => {
    acceptAllCookies();
    onClose();
  };

  const handleRejectOptional = () => {
    rejectOptionalCookies();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-[#0B1B30] text-[#EEF1EC] w-full max-w-2xl rounded-2xl sm:rounded-3xl border border-[#1D3860] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-[#1D3860] flex items-center justify-between bg-[#0B1B30]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#102442] border border-[#1D3860] flex items-center justify-center text-[#C5A880]">
              <Cookie className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Cookie & Privacy Preferences
              </h2>
              <p className="text-xs text-[#8EA7C7] mt-0.5">
                Customize data storage categories according to your preferences
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8EA7C7] hover:text-white hover:bg-[#102442] transition-colors cursor-pointer"
            aria-label="Close cookie settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Categories List (Scrollable) */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 divide-y divide-[#1D3860]">
          <p className="text-xs text-[#8EA7C7] leading-relaxed pb-2">
            We respect your privacy choices. Under EU ePrivacy and GDPR regulations, essential cookies are deployed for security and session verification, while optional performance, marketing, and personalization technologies require your prior consent.
          </p>

          {COOKIE_CATEGORIES.map((cat) => {
            const isEnabled = categories[cat.id];
            const isExpanded = expandedCategory === cat.id;

            return (
              <div key={cat.id} className="pt-4 first:pt-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{cat.name}</span>
                      {cat.required ? (
                        <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-[#102442] text-[#C5A880] border border-[#1D3860]">
                          Always Active
                        </span>
                      ) : (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isEnabled
                              ? 'bg-[#102442] text-[#C5A880] border border-[#1D3860]'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {isEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#8EA7C7] mt-1 leading-relaxed">
                      {cat.description}
                    </p>
                  </div>

                  {/* Toggle Control */}
                  <div className="shrink-0 pt-0.5">
                    {cat.required ? (
                      <div className="w-12 h-6 rounded-full bg-[#102442] flex items-center justify-end px-1 cursor-not-allowed opacity-80" title="Strictly necessary cookies cannot be disabled">
                        <Lock className="w-3.5 h-3.5 text-[#C5A880]" />
                      </div>
                    ) : (
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isEnabled}
                        onClick={() => handleToggle(cat.id)}
                        className={`w-12 h-6 rounded-full transition-colors cursor-pointer relative p-0.5 focus:outline-none focus:ring-2 focus:ring-[#C5A880] ${
                          isEnabled ? 'bg-[#C5A880]' : 'bg-slate-700'
                        }`}
                      >
                        <span
                          className={`block w-5 h-5 rounded-full bg-[#0B1B30] shadow-md transform transition-transform ${
                            isEnabled ? 'translate-x-6' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    )}
                  </div>
                </div>

                {/* Cookie Details Dropdown */}
                <div className="mt-3">
                  <button
                    onClick={() =>
                      setExpandedCategory(isExpanded ? null : cat.id)
                    }
                    className="text-[11px] font-semibold text-[#C5A880] hover:underline flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>{isExpanded ? 'Hide specific cookies' : 'View specific cookies & storage items'}</span>
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>

                  {isExpanded && (
                    <div className="mt-2.5 p-3 rounded-xl bg-[#102442] border border-[#1D3860] space-y-2 text-xs">
                      {cat.cookies.map((cookie) => (
                        <div
                          key={cookie.name}
                          className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-[#1D3860] last:border-0 last:pb-0 gap-1"
                        >
                          <div>
                            <span className="font-mono text-[#C5A880] font-semibold">{cookie.name}</span>
                            <p className="text-[11px] text-[#8EA7C7] mt-0.5">{cookie.purpose}</p>
                          </div>
                          <div className="text-[10px] text-slate-400 sm:text-right shrink-0">
                            <div>Provider: {cookie.provider}</div>
                            <div>Duration: {cookie.duration}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-5 sm:p-6 border-t border-[#1D3860] bg-[#0B1B30] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-[#8EA7C7] order-2 sm:order-1">
            {onNavigatePrivacy && (
              <button
                onClick={() => {
                  onClose();
                  onNavigatePrivacy();
                }}
                className="hover:text-white underline cursor-pointer"
              >
                Read our full Privacy & Cookie Policy
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end order-1 sm:order-2">
            <button
              onClick={handleRejectOptional}
              className="flex-1 sm:flex-none px-4 py-2 text-xs font-semibold rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/15 transition-colors cursor-pointer"
            >
              Reject Optional
            </button>
            <button
              onClick={handleSave}
              className="flex-1 sm:flex-none px-4 py-2 text-xs font-semibold rounded-xl bg-[#102442] hover:bg-[#163058] text-[#C5A880] border border-[#1D3860] transition-colors cursor-pointer"
            >
              Save Preferences
            </button>
            <button
              onClick={handleAcceptAll}
              className="w-full sm:w-auto px-5 py-2 text-xs font-bold rounded-xl bg-[#C5A880] hover:bg-[#B39369] text-[#0B1B30] transition-colors cursor-pointer shadow-md"
            >
              Accept All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
