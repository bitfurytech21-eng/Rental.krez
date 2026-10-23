import React, { useState, useEffect, useRef } from 'react';
import {
  isPassGateUnlocked,
  verifyAndUnlockPassGate,
  getRateLimitStatus,
  subscribePassGate,
  PRIMARY_DEFAULT_PASSCODE,
} from '../../lib/passGate';
import { useAuth } from '../../lib/auth';
import {
  Shield,
  Lock,
  Unlock,
  KeyRound,
  Eye,
  EyeOff,
  AlertTriangle,
  ArrowRight,
  Building2,
  Clock,
  Sparkles,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';

interface AdminPassGateProps {
  children?: React.ReactNode;
  onSuccess?: () => void;
}

export const AdminPassGate: React.FC<AdminPassGateProps> = ({ children, onSuccess }) => {
  const { user, quickDemoSession } = useAuth();
  const [unlocked, setUnlocked] = useState<boolean>(() => isPassGateUnlocked());
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successAnimation, setSuccessAnimation] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState<number>(() => getRateLimitStatus().remainingSeconds);
  const [showHelpHint, setShowHelpHint] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Subscribe to external lock/unlock events
  useEffect(() => {
    const unsubscribe = subscribePassGate((newStatus) => {
      setUnlocked(newStatus);
      if (!newStatus) {
        setPasscode('');
        setSuccessAnimation(false);
      }
    });
    return unsubscribe;
  }, []);

  // Autofocus input on load
  useEffect(() => {
    if (!unlocked) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [unlocked]);

  // Live countdown timer for lockout cooldown
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setErrorMessage(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSeconds]);

  const handleUnlock = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting || lockoutSeconds > 0) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const result = verifyAndUnlockPassGate(passcode);

    if (result.success) {
      setSuccessAnimation(true);
      // Ensure admin session is established in auth context
      try {
        if (!user || user.role !== 'admin') {
          await quickDemoSession('admin');
        }
      } catch (err) {
        // Session fallback
      }

      setTimeout(() => {
        setUnlocked(true);
        setIsSubmitting(false);
        if (onSuccess) onSuccess();
      }, 700);
    } else {
      setIsShaking(true);
      setErrorMessage(result.message || 'Access Denied: Invalid security passcode.');
      if (result.remainingSeconds) {
        setLockoutSeconds(result.remainingSeconds);
      }
      setTimeout(() => setIsShaking(false), 500);
      setIsSubmitting(false);
    }
  };

  const handleQuickAutofill = () => {
    setPasscode(PRIMARY_DEFAULT_PASSCODE);
    setErrorMessage(null);
    inputRef.current?.focus();
  };

  // If already unlocked and has children, render children
  if (unlocked && children) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#0A1210] text-[#E4EDE8] flex flex-col justify-between relative overflow-hidden select-none font-sans">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-[#27845D]/15 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#B7E36A]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar Header */}
      <header className="relative z-10 container mx-auto px-6 py-6 flex items-center justify-between border-b border-[#1E2F2B]/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#162723] border border-[#263D37] flex items-center justify-center text-[#B7E36A]">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-black tracking-wider uppercase text-white flex items-center gap-1.5">
              <span>L'Agence</span>
              <span className="text-[#B7E36A] font-light">·</span>
              <span className="text-[#A2B5AD] font-medium">Kretz & De Spain</span>
            </div>
            <div className="text-[10px] text-[#697E76] font-mono">
              kretzdespain.com/admin
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#12221E] border border-[#223933] text-[11px] font-semibold text-[#8DA69D]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Pass Gate Armed</span>
          </div>
        </div>
      </header>

      {/* Main Pass Gate Card */}
      <main className="relative z-10 container mx-auto px-4 py-12 flex flex-col items-center justify-center flex-1">
        <div
          className={`w-full max-w-md bg-[#101F1B] border border-[#223832] rounded-3xl p-8 sm:p-10 shadow-2xl relative backdrop-blur-xl transition-all duration-300 ${
            isShaking ? 'animate-[shake_0.4s_ease-in-out]' : ''
          }`}
        >
          {/* Top Emblem */}
          <div className="flex flex-col items-center text-center mb-8">
            <div
              className={`w-16 h-16 rounded-3xl border flex items-center justify-center transition-all duration-500 shadow-xl ${
                successAnimation
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-400 scale-110'
                  : 'bg-[#182C27] border-[#2E4B43] text-[#B7E36A]'
              }`}
            >
              {successAnimation ? (
                <Unlock className="w-8 h-8 animate-bounce" />
              ) : (
                <Shield className="w-8 h-8" />
              )}
            </div>

            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#162723] border border-[#28413B] text-[10px] uppercase font-bold tracking-widest text-[#B7E36A] mt-5 mb-2">
              <Lock className="w-3 h-3" />
              <span>Restricted Pass Gate</span>
            </div>

            <h1 className="text-2xl font-black text-white tracking-tight">
              Administrative Pass Gate
            </h1>
            <p className="text-xs text-[#8DA69D] mt-1.5 max-w-xs leading-relaxed">
              Enter the authorized executive passcode to unlock custody records, investor deposits, and platform controls.
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-6 p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-300 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-normal font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Success Banner */}
          {successAnimation && (
            <div className="mb-6 p-3.5 bg-emerald-500/15 border border-emerald-500/40 rounded-2xl text-emerald-300 text-xs flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-bold">Pass Gate Cleared. Opening Admin Console...</span>
            </div>
          )}

          {/* Pass Gate Form */}
          <form onSubmit={handleUnlock} className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-[#A2B5AD] flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-[#B7E36A]" />
                  <span>Security Passcode</span>
                </label>
                {lockoutSeconds > 0 && (
                  <span className="text-[11px] font-mono text-amber-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Lockout: {lockoutSeconds}s
                  </span>
                )}
              </div>

              <div className="relative">
                <input
                  ref={inputRef}
                  type={showPasscode ? 'text' : 'password'}
                  value={passcode}
                  onChange={(e) => {
                    setPasscode(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  disabled={lockoutSeconds > 0 || isSubmitting || successAnimation}
                  placeholder="Enter Pass Gate Code"
                  autoComplete="off"
                  className="w-full px-4 py-3.5 pl-11 pr-12 rounded-2xl bg-[#0B1614] border border-[#263D37] text-white placeholder-[#546A62] text-sm font-mono tracking-wider focus:outline-none focus:border-[#27845D] focus:ring-1 focus:ring-[#27845D] transition-all disabled:opacity-50"
                />
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#546A62]">
                  <Lock className="w-4 h-4" />
                </div>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPasscode(!showPasscode)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#546A62] hover:text-[#A2B5AD] p-1 transition-colors cursor-pointer"
                  title={showPasscode ? 'Hide passcode' : 'Show passcode'}
                >
                  {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              disabled={isSubmitting || lockoutSeconds > 0 || successAnimation || !passcode.trim()}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-[#27845D] to-[#1E6749] hover:from-[#2e996c] hover:to-[#247a57] text-white font-bold rounded-2xl text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-emerald-900/30"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying Pass Gate...</span>
                </div>
              ) : successAnimation ? (
                <div className="flex items-center gap-2 text-white">
                  <Unlock className="w-4 h-4" />
                  <span>Pass Gate Authorized</span>
                </div>
              ) : (
                <>
                  <span>Unlock Admin Panel</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Executive Passcode Assistance */}
          <div className="mt-6 pt-5 border-t border-[#1C2F2A] flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => setShowHelpHint(!showHelpHint)}
                className="text-[#768C83] hover:text-[#A2B5AD] transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Pass Gate Credentials</span>
              </button>

              <button
                type="button"
                onClick={handleQuickAutofill}
                className="text-[11px] font-bold text-[#B7E36A] hover:underline flex items-center gap-1 cursor-pointer bg-[#182C27] hover:bg-[#203932] px-2.5 py-1 rounded-lg border border-[#2E4A42] transition-colors"
                title="Autofill standard executive passcode"
              >
                <Sparkles className="w-3 h-3 text-[#B7E36A]" />
                <span>Autofill ({PRIMARY_DEFAULT_PASSCODE})</span>
              </button>
            </div>

            {showHelpHint && (
              <div className="p-3 bg-[#0C1715] rounded-xl border border-[#203731] text-[11px] text-[#8DA69D] space-y-1.5 animate-in fade-in">
                <div className="font-bold text-white flex items-center gap-1">
                  <Lock className="w-3 h-3 text-[#B7E36A]" />
                  <span>Authorized Passcodes:</span>
                </div>
                <p className="text-[10px] leading-relaxed">
                  Default passcodes recognized by the executive pass gate:
                </p>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  <code className="px-2 py-0.5 bg-[#172A25] rounded text-[#B7E36A] font-mono text-[10px] border border-[#28453E]">
                    {PRIMARY_DEFAULT_PASSCODE}
                  </code>
                  <code className="px-2 py-0.5 bg-[#172A25] rounded text-slate-300 font-mono text-[10px] border border-[#28453E]">
                    Kretz2026!
                  </code>
                  <code className="px-2 py-0.5 bg-[#172A25] rounded text-slate-300 font-mono text-[10px] border border-[#28453E]">
                    admin2026
                  </code>
                </div>
                <p className="text-[10px] text-[#697E76] pt-1">
                  Administrators can modify or customize this passcode anytime under Admin Console &rarr; Admin Security.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Public Site Navigation */}
        <div className="mt-8 flex items-center gap-4 text-xs text-[#768C83]">
          <a
            href="/"
            className="hover:text-white transition-colors flex items-center gap-1.5"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Return to Public Marketplace</span>
          </a>
          <span>·</span>
          <span className="text-[#556961]">
            Encrypted Session · TLS 1.3
          </span>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="relative z-10 py-5 text-center text-[11px] text-[#4E625B] border-t border-[#1E2F2B]/50">
        L'Agence Real Estate & Private Equity · Institutional Custody & Asset Management
      </footer>
    </div>
  );
};
