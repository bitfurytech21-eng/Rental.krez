import React, { useState } from 'react';
import { User } from '../../types/user';
import { LuminousEclipseRing } from '../visuals/LuminousEclipseRing';
import { 
  ShieldCheck, 
  Wallet, 
  Building2, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  Lock, 
  Gift, 
  X,
  ExternalLink
} from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { useToast } from '../../context/ToastContext';

interface FirstTimeOnboardingModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onExploreProperties: () => void;
  onOpenDeposit: () => void;
  onOpenVerification: () => void;
}

export const FirstTimeOnboardingModal: React.FC<FirstTimeOnboardingModalProps> = ({
  user,
  isOpen,
  onClose,
  onExploreProperties,
  onOpenDeposit,
  onOpenVerification,
}) => {
  const toast = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([1]);

  if (!isOpen) return null;

  const steps = [
    {
      id: 1,
      title: "SPV Security & Encryption",
      description: "Argon2id session credentials & Cloudflare Turnstile token security active.",
      icon: Lock,
      status: "completed",
    },
    {
      id: 2,
      title: "Identity & Regulatory KYC",
      description: "European anti-money laundering compliance and accredited investor attestation.",
      icon: ShieldCheck,
      status: user.kycStatus === 'verified' ? "completed" : "action_required",
    },
    {
      id: 3,
      title: "Treasury Wallet & CaixaBank Escrow",
      description: "Fund your account via SEPA wire transfer or USDC/SOL crypto gateway.",
      icon: Wallet,
      status: user.walletBalance > 0 ? "completed" : "pending",
    },
    {
      id: 4,
      title: "First Property Unit Allocation",
      description: "Acquire notarized SPV fractional property units starting at €100.",
      icon: Building2,
      status: user.investedBalance > 0 ? "completed" : "pending",
    },
  ];

  const handleStepAction = (stepId: number) => {
    if (stepId === 2) {
      onClose();
      onOpenVerification();
    } else if (stepId === 3) {
      onClose();
      onOpenDeposit();
    } else if (stepId === 4) {
      onClose();
      onExploreProperties();
    }
  };

  const handleCompleteAll = () => {
    try {
      localStorage.setItem(`kretz_onboarding_completed_${user.id}`, 'true');
    } catch {}
    toast.success("Investor initialization complete. Welcome to L'Agence Platform!");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0E1217] border border-white/10 rounded-3xl shadow-2xl overflow-hidden text-white">
        
        {/* Top Decorative Glow Header */}
        <div className="relative p-6 sm:p-8 bg-gradient-to-b from-[#141A24] to-[#0E1217] border-b border-white/10 overflow-hidden flex flex-col sm:flex-row items-center gap-6">
          {/* Luminous Eclipse Ring visual */}
          <div className="shrink-0 relative">
            <LuminousEclipseRing size={120}>
              <Sparkles className="w-6 h-6 text-[#55BDE8] animate-pulse" />
            </LuminousEclipseRing>
          </div>

          <div className="flex-1 text-center sm:text-left space-y-1.5 min-w-0">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#55BDE8]/15 border border-[#55BDE8]/30 text-[10px] font-mono font-bold text-[#55BDE8]">
              <Sparkles className="w-3 h-3" /> FIRST-TIME INVESTOR ONBOARDING
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
              Welcome to L'Agence, {user.fullName.split(' ')[0]}
            </h2>
            <p className="text-xs text-[#A5A6A5] leading-relaxed">
              Your investor portal is initialized. Complete these 4 steps to activate full SPV property allocation rights.
            </p>
          </div>

          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step List Content */}
        <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
          {steps.map((step) => {
            const Icon = step.icon;
            const isDone = step.status === 'completed';
            const isAction = step.status === 'action_required';

            return (
              <div
                key={step.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isDone
                    ? 'bg-[#141B26]/60 border-[#43C98B]/30'
                    : isAction
                    ? 'bg-[#1A2332] border-[#55BDE8]/40 shadow-lg'
                    : 'bg-[#121620]/80 border-white/10'
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 mt-0.5 ${
                      isDone
                        ? 'bg-[#43C98B]/20 text-[#43C98B] border border-[#43C98B]/40'
                        : isAction
                        ? 'bg-[#55BDE8]/20 text-[#55BDE8] border border-[#55BDE8]/40'
                        : 'bg-white/5 text-slate-400 border border-white/10'
                    }`}
                  >
                    {isDone ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                  </div>

                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs sm:text-sm text-white">{step.title}</span>
                      {isDone && (
                        <span className="text-[9.5px] font-mono font-bold text-[#43C98B] bg-[#43C98B]/10 px-2 py-0.5 rounded-full border border-[#43C98B]/25">
                          Verified
                        </span>
                      )}
                      {isAction && (
                        <span className="text-[9.5px] font-mono font-bold text-[#55BDE8] bg-[#55BDE8]/10 px-2 py-0.5 rounded-full border border-[#55BDE8]/25 animate-pulse">
                          Next Step
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#A5A6A5] leading-relaxed">{step.description}</p>
                  </div>
                </div>

                {!isDone && (
                  <button
                    onClick={() => handleStepAction(step.id)}
                    className="cinematic-btn-primary px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer shrink-0 self-start sm:self-auto flex items-center gap-1.5"
                  >
                    <span>Execute Step</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="p-5 bg-[#141A24] border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[#55BDE8] font-semibold">
            <Gift className="w-4 h-4" />
            <span>VIP Allocation Bonus: €500 Active</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-semibold cursor-pointer w-full sm:w-auto"
            >
              Remind Me Later
            </button>
            <button
              onClick={handleCompleteAll}
              className="cinematic-btn-primary px-5 py-2 rounded-xl font-bold cursor-pointer w-full sm:w-auto"
            >
              Enter Dashboard Portal
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
