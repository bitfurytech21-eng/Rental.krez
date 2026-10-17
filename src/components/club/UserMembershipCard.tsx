import React, { useState } from 'react';
import { UserMembership, MembershipTier } from '../../types/membership';
import { ledger } from '../../lib/ledger';
import { formatCurrency, formatDate } from '../../lib/utils';
import { 
  Crown, ShieldCheck, Sparkles, QrCode, Calendar, 
  CreditCard, CheckCircle2, AlertTriangle, ArrowRight, 
  ExternalLink, Download, Clock, RefreshCw, X
} from 'lucide-react';

interface UserMembershipCardProps {
  membership: UserMembership;
  tiers: MembershipTier[];
  onRefresh: () => void;
  onUpgradeClick?: () => void;
}

export const UserMembershipCard: React.FC<UserMembershipCardProps> = ({
  membership,
  tiers,
  onRefresh,
  onUpgradeClick,
}) => {
  const [isCancelling, setIsCancelling] = useState(false);
  const [showPerksModal, setShowPerksModal] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const tier = tiers.find(t => t.id === membership.tierId);
  const isBlackCircle = membership.tierId === 'black_circle';
  const isGold = membership.tierId === 'sovereign';

  const handleCancelAutoRenew = () => {
    setIsCancelling(true);
    setTimeout(() => {
      ledger.cancelMembership(membership.id, membership.userId);
      setIsCancelling(false);
      setActionMessage('Auto-renewal has been cancelled. Your membership benefits remain active until the renewal date.');
      onRefresh();
    }, 500);
  };

  const handleReactivate = () => {
    ledger.reactivateMembership(membership.id);
    setActionMessage('Auto-renewal has been reactivated.');
    onRefresh();
  };

  return (
    <div className="space-y-6 text-left">
      {actionMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{actionMessage}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-emerald-700 hover:text-emerald-900 text-sm font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Digital Luxury Pass Card */}
      <div 
        className={`relative rounded-3xl p-6 sm:p-8 overflow-hidden shadow-2xl border transition-all ${
          isBlackCircle 
            ? 'bg-gradient-to-br from-[#0D1513] via-[#142421] to-[#0A0F0E] text-white border-white/20'
            : isGold
            ? 'bg-gradient-to-br from-[#2A2312] via-[#1D2B26] to-[#0E1B17] text-white border-[#D4AF37]/40'
            : 'bg-gradient-to-br from-[#182D2A] via-[#1F3A35] to-[#122320] text-white border-white/10'
        }`}
      >
        {/* Hologram Accent Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#B7E36A]/15 to-transparent rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Crown className={`w-5 h-5 ${isBlackCircle ? 'text-zinc-300' : isGold ? 'text-[#D4AF37]' : 'text-[#B7E36A]'}`} />
                <span className="text-xs font-bold uppercase tracking-widest text-white/80">Kretz Club Privé</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">
                {membership.tierName}
              </h3>
            </div>

            <div className="flex flex-col items-end">
              <span className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase border ${
                membership.status === 'active'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}>
                {membership.status === 'active' ? '● Active Member' : '● Renewal Paused'}
              </span>
              <span className="text-[10px] text-white/60 font-mono mt-1">
                {membership.memberNumber}
              </span>
            </div>
          </div>

          {/* Member Details & Passcode */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/10 text-xs">
            <div>
              <p className="text-[10px] text-white/50 uppercase tracking-wider">Member Name</p>
              <p className="font-bold text-white text-sm">{membership.userName}</p>
              <p className="text-[10px] text-white/60 truncate">{membership.userEmail}</p>
            </div>

            <div>
              <p className="text-[10px] text-white/50 uppercase tracking-wider">Renewal Schedule</p>
              <p className="font-bold text-white text-sm">
                {new Date(membership.renewalDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
              </p>
              <p className="text-[10px] text-white/60 capitalize">
                {membership.billingCycle} billing ({formatCurrency(membership.feePaid)})
              </p>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3">
              <div className="text-right sm:text-right">
                <p className="text-[10px] text-white/50 uppercase tracking-wider">Concierge Code</p>
                <p className="font-mono font-bold text-[#B7E36A] text-xs">KTZ-{membership.memberNumber.split('-').pop()}</p>
              </div>
              <div className="w-12 h-12 bg-white/10 rounded-xl p-1.5 border border-white/20 flex items-center justify-center">
                <QrCode className="w-full h-full text-white/90" />
              </div>
            </div>
          </div>

          {/* Action Ribbon */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/10">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPerksModal(true)}
                className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#B7E36A]" />
                <span>View Member Perquisites</span>
              </button>

              {onUpgradeClick && membership.tierId !== 'black_circle' && (
                <button
                  onClick={onUpgradeClick}
                  className="px-3.5 py-2 rounded-xl bg-[#B7E36A] hover:bg-[#A6D657] text-[#182D2A] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <span>Upgrade Tier</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs">
              {membership.autoRenew ? (
                <button
                  onClick={handleCancelAutoRenew}
                  disabled={isCancelling}
                  className="text-white/60 hover:text-white underline text-[11px] cursor-pointer"
                >
                  {isCancelling ? 'Processing...' : 'Pause Auto-Renewal'}
                </button>
              ) : (
                <button
                  onClick={handleReactivate}
                  className="text-[#B7E36A] hover:underline text-[11px] font-semibold cursor-pointer"
                >
                  Reactivate Auto-Renewal
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Perquisites Modal */}
      {showPerksModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 text-left border border-slate-200 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-emerald-800" />
                <h3 className="text-lg font-bold text-[#18211F]">
                  {membership.tierName} Perquisites
                </h3>
              </div>
              <button 
                onClick={() => setShowPerksModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 text-xs">
              <div>
                <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-2">
                  Active Member Inclusions:
                </p>
                <div className="space-y-2">
                  {tier?.benefits.map((b, i) => (
                    <div key={i} className="flex items-start gap-2 text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-2">
                <p className="font-bold text-[#18211F] text-xs">Bespoke Concierge Contact</p>
                <p className="text-slate-600 text-[11px]">
                  Quote your member ID <strong>#{membership.memberNumber}</strong> for priority requests, private Madrid salon bookings, or off-market property dossiers.
                </p>
                <div className="flex items-center gap-3 pt-1 text-emerald-800 font-bold">
                  <span>Tel: +34 91 000 81 22</span>
                  <span>·</span>
                  <span>club@kretz.com</span>
                </div>
              </div>

              {/* Legal Distinction Notice */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 leading-relaxed">
                <strong>Legal Reminder:</strong> Membership privileges constitute advisory and hospitality benefits and do not represent property deed equity or guaranteed investment yields.
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowPerksModal(false)}
                className="btn btn-primary py-2.5 px-5 text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
