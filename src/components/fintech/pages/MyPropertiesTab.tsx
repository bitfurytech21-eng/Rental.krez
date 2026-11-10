import React, { useState } from 'react';
import {
  Building2, TrendingUp, DollarSign, Calendar, Send, FileText,
  Plus, CheckCircle2, ArrowRight, ExternalLink, X, ShieldCheck
} from 'lucide-react';
import { Property } from '../../../types/property';
import { Investment } from '../../../types/investment';
import { formatCurrency, formatDate } from '../../../lib/utils';
import { useToast } from '../../../context/ToastContext';

interface MyPropertiesTabProps {
  investments: Investment[];
  properties: Property[];
  onSelectProperty: (property: Property) => void;
  onExploreProperties: () => void;
}

export const MyPropertiesTab: React.FC<MyPropertiesTabProps> = ({
  investments,
  properties,
  onSelectProperty,
  onExploreProperties,
}) => {
  const toast = useToast();
  const [transferModalItem, setTransferModalItem] = useState<any | null>(null);
  const [transferAddress, setTransferAddress] = useState('');
  const [transferAmount, setTransferAmount] = useState(1);
  const [isTransferring, setIsTransferring] = useState(false);

  // Combine investments with property details
  const myHoldings = investments.map((inv) => {
    const prop = properties.find((p) => p.id === inv.propertyId);
    return {
      id: inv.id,
      property: prop || {
        id: inv.propertyId,
        title: inv.propertyTitle,
        location: inv.propertyLocation,
        images: [inv.propertyImage],
        estimatedAnnualYield: inv.estimatedAnnualYield,
        tokenPrice: inv.tokenPrice,
        totalValuation: 4500000,
      },
      tokens: inv.tokensPurchased,
      value: inv.currentValuation || inv.totalAmountInvested,
      incomeEarned: inv.totalDividendsReceived || (inv.totalAmountInvested * 0.045),
      nextPayout: 'April 1, 2026',
      nextPayoutAmount: ((inv.totalAmountInvested * (inv.estimatedAnnualYield / 100)) / 12),
      yield: inv.estimatedAnnualYield,
    };
  });

  const totalValue = myHoldings.reduce((sum, h) => sum + h.value, 0);
  const totalEarned = myHoldings.reduce((sum, h) => sum + h.incomeEarned, 0);
  const totalTokens = myHoldings.reduce((sum, h) => sum + h.tokens, 0);

  const handleExecuteTransfer = () => {
    if (!transferAddress.trim() || !transferAddress.startsWith('0x')) {
      toast.error('Please enter a valid BEP-20 address (0x...)');
      return;
    }
    setIsTransferring(true);
    setTimeout(() => {
      setIsTransferring(false);
      toast.success(`Transferred ${transferAmount} tokens to ${transferAddress.slice(0, 8)}...`);
      setTransferModalItem(null);
      setTransferAddress('');
    }, 800);
  };

  return (
    <div className="space-y-[16px] text-[#0F172A] dark:text-[#E2E8F0]">
      {/* Portfolio Header Strip */}
      <div className="p-[20px] rounded-[12px] bg-white dark:bg-[#111A2C] border border-[#E2E8F0] dark:border-[#1E293B] shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-[20px] font-semibold text-[#0F172A] dark:text-[#E2E8F0]">
            My Property Portfolio
          </h2>
          <p className="text-[12px] text-[#64748B] dark:text-[#94A3B8]">
            Active real estate equity holdings and accumulated yield performance
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-[12px]">
          <div className="p-3 rounded-[8px] bg-[#F8FAFC] dark:bg-[#0B1220] border border-[#E2E8F0] dark:border-[#1E293B]">
            <span className="text-[#64748B] dark:text-[#94A3B8] block">Total Property Equity</span>
            <span className="text-[16px] font-bold tabular-nums text-[#0F172A] dark:text-[#E2E8F0]">
              {formatCurrency(totalValue)}
            </span>
          </div>
          <div className="p-3 rounded-[8px] bg-[#F8FAFC] dark:bg-[#0B1220] border border-[#E2E8F0] dark:border-[#1E293B]">
            <span className="text-[#64748B] dark:text-[#94A3B8] block">Lifetime Yield Earned</span>
            <span className="text-[16px] font-bold tabular-nums text-[#16A34A]">
              +{formatCurrency(totalEarned)}
            </span>
          </div>
          <div className="p-3 rounded-[8px] bg-[#F8FAFC] dark:bg-[#0B1220] border border-[#E2E8F0] dark:border-[#1E293B]">
            <span className="text-[#64748B] dark:text-[#94A3B8] block">Security Tokens Held</span>
            <span className="text-[16px] font-bold tabular-nums text-[#0F4C81] dark:text-[#14B8A6]">
              {totalTokens.toLocaleString()} units
            </span>
          </div>
        </div>
      </div>

      {/* Property Cards Grid */}
      {myHoldings.length === 0 ? (
        <div className="p-12 text-center rounded-[12px] bg-white dark:bg-[#111A2C] border border-[#E2E8F0] dark:border-[#1E293B] space-y-3">
          <Building2 className="w-12 h-12 text-[#64748B] mx-auto" />
          <h4 className="text-[16px] font-semibold text-[#0F172A] dark:text-[#E2E8F0]">No Property Token Holdings</h4>
          <p className="text-[13px] text-[#64748B] dark:text-[#94A3B8] max-w-sm mx-auto">
            You do not hold active real estate tokens yet. Browse marketplace offerings to acquire fractional property units.
          </p>
          <button
            onClick={onExploreProperties}
            className="px-4 py-2 rounded-[8px] bg-[#0F4C81] text-white text-[13px] font-semibold cursor-pointer shadow-xs"
          >
            Explore Marketplace
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[16px]">
          {myHoldings.map((item) => {
          const prop = item.property as Property;
          return (
            <div
              key={item.id}
              className="rounded-[12px] bg-white dark:bg-[#111A2C] border border-[#E2E8F0] dark:border-[#1E293B] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden flex flex-col justify-between"
            >
              {/* Image & Yield Header */}
              <div className="relative aspect-[16/10] bg-[#F8FAFC] dark:bg-[#0B1220] overflow-hidden">
                <img
                  src={prop.images?.[0] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&auto=format&fit=crop'}
                  alt={prop.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 right-3">
                  <span className="px-2.5 py-1 rounded-full bg-white/95 dark:bg-[#111A2C]/95 text-[#16A34A] text-[12px] font-bold shadow-xs tabular-nums">
                    {item.yield}% p.a.
                  </span>
                </div>
                <div className="absolute bottom-3 left-3">
                  <span className="px-2.5 py-0.5 rounded-full bg-black/70 text-white text-[11px] font-semibold backdrop-blur-xs">
                    {item.tokens} Tokens
                  </span>
                </div>
              </div>

              {/* Body Content */}
              <div className="p-[20px] space-y-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="text-[12px] text-[#64748B] dark:text-[#94A3B8]">{prop.location}</div>
                  <h4 className="text-[16px] font-semibold leading-snug line-clamp-1">{prop.title}</h4>
                </div>

                {/* Financial stats strip */}
                <div className="grid grid-cols-2 gap-2 p-3 rounded-[8px] bg-[#F8FAFC] dark:bg-[#0B1220] border border-[#E2E8F0] dark:border-[#1E293B] text-[12px]">
                  <div>
                    <span className="text-[#64748B] dark:text-[#94A3B8] block">Current Value</span>
                    <span className="text-[14px] font-bold tabular-nums text-[#0F172A] dark:text-[#E2E8F0]">
                      {formatCurrency(item.value)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[#64748B] dark:text-[#94A3B8] block">Income Earned</span>
                    <span className="text-[14px] font-bold tabular-nums text-[#16A34A]">
                      +{formatCurrency(item.incomeEarned)}
                    </span>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-[#E2E8F0] dark:border-[#1E293B] flex justify-between">
                    <span className="text-[#64748B] dark:text-[#94A3B8]">Next Payout ({item.nextPayout}):</span>
                    <span className="font-semibold tabular-nums text-[#16A34A]">
                      +{formatCurrency(item.nextPayoutAmount)}
                    </span>
                  </div>
                </div>

                {/* 3 Actions: Buy More / Transfer / Docs */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button
                    onClick={() => onSelectProperty(prop)}
                    className="flex items-center justify-center gap-1 py-2 px-2 rounded-[8px] bg-[#0F4C81] text-white text-[12px] font-semibold hover:bg-[#0F4C81]/90 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Buy More
                  </button>
                  <button
                    onClick={() => setTransferModalItem(item)}
                    className="flex items-center justify-center gap-1 py-2 px-2 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E293B] text-[12px] font-medium hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" /> Transfer
                  </button>
                  <button
                    onClick={() => onSelectProperty(prop)}
                    className="flex items-center justify-center gap-1 py-2 px-2 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E293B] text-[12px] font-medium hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] transition-colors cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" /> Docs
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Transfer Modal */}
      {transferModalItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
        >
          <div
            className="w-full max-w-[480px] rounded-[12px] bg-white dark:bg-[#111A2C] border border-[#E2E8F0] dark:border-[#1E293B] shadow-2xl p-6 text-[#0F172A] dark:text-[#E2E8F0] space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#1E293B] pb-3">
              <h3 className="text-[16px] font-semibold">Transfer Security Tokens</h3>
              <button
                onClick={() => setTransferModalItem(null)}
                className="p-1 rounded text-[#64748B] hover:bg-black/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-[8px] bg-[#F8FAFC] dark:bg-[#0B1220] border border-[#E2E8F0] dark:border-[#1E293B] text-[12px]">
              <div className="font-semibold text-[14px]">{transferModalItem.property.title}</div>
              <div className="text-[#64748B] dark:text-[#94A3B8] mt-1">
                Available to transfer: <span className="font-semibold tabular-nums">{transferModalItem.tokens} tokens</span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[12px] font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">
                  Recipient Whitelisted Wallet Address (ERC-3643)
                </label>
                <input
                  type="text"
                  placeholder="0x..."
                  value={transferAddress}
                  onChange={(e) => setTransferAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E293B] bg-transparent text-[14px] font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-[#0F4C81]"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">
                  Quantity to Transfer
                </label>
                <input
                  type="number"
                  min={1}
                  max={transferModalItem.tokens}
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(Math.min(transferModalItem.tokens, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="w-full px-3 py-2 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E293B] bg-transparent text-[14px] tabular-nums font-semibold focus:outline-none focus:ring-2 focus:ring-[#0F4C81]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E8F0] dark:border-[#1E293B]">
              <button
                type="button"
                onClick={() => setTransferModalItem(null)}
                className="px-4 py-2 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E293B] text-[14px] font-medium hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isTransferring}
                onClick={handleExecuteTransfer}
                className="px-5 py-2 rounded-[8px] bg-[#0F4C81] text-white text-[14px] font-semibold hover:bg-[#0F4C81]/90 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isTransferring ? 'Broadcasting...' : 'Confirm Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
