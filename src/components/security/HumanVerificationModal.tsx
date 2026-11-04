import React, { useState } from 'react';
import { TurnstileWidget } from './TurnstileWidget';
import { ShieldCheck, Lock, AlertTriangle, X } from 'lucide-react';

interface HumanVerificationModalProps {
  isOpen: boolean;
  onVerified: (token: string) => void;
  onCancel?: () => void;
  title?: string;
  description?: string;
}

export const HumanVerificationModal: React.FC<HumanVerificationModalProps> = ({
  isOpen,
  onVerified,
  onCancel,
  title = 'Security & Human Verification',
  description = 'To safeguard platform assets and investor accounts from automated bot abuse, please complete this brief verification check.',
}) => {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleComplete = () => {
    if (!token) {
      setError('Please complete the verification check before continuing.');
      return;
    }
    onVerified(token);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onCancel}
    >
      <div
        className="bg-[#102442] text-white w-full max-w-md rounded-2xl sm:rounded-3xl border border-[#1D3860] shadow-2xl p-6 sm:p-8 space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0B1B30] border border-[#1D3860] flex items-center justify-center text-[#BEE179]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white">
                {title}
              </h3>
              <span className="text-[10px] uppercase tracking-wider text-[#BEE179] font-bold">
                Cloudflare Managed Protection
              </span>
            </div>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="p-1 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <p className="text-xs text-[#8EA7C7] leading-relaxed">
          {description}
        </p>

        {error && (
          <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/30 text-red-200 text-xs">
            {error}
          </div>
        )}

        <div className="py-2">
          <TurnstileWidget
            onVerify={(t) => {
              setToken(t);
              setError(null);
            }}
            onExpire={() => setToken(null)}
            onError={(err) => setError(err)}
            theme="dark"
          />
        </div>

        <div className="pt-2 flex items-center justify-end gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-xs font-semibold text-[#8EA7C7] hover:text-white"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            disabled={!token}
            onClick={handleComplete}
            className="px-6 py-2.5 text-xs font-black bg-[#BEE179] hover:bg-[#aed860] disabled:opacity-40 disabled:cursor-not-allowed text-[#0B1B30] rounded-xl shadow-md transition-all cursor-pointer"
          >
            Confirm & Continue
          </button>
        </div>
      </div>
    </div>
  );
};
