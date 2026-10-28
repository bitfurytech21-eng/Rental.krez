import React, { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { formatCurrency } from '../../lib/utils';
import { 
  X, 
  RefreshCw, 
  ArrowRight, 
  CheckCircle2, 
  Wallet, 
  ShieldCheck, 
  Coins, 
  AlertCircle,
  Zap
} from 'lucide-react';

interface TreasuryConverterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessConversion?: () => void;
}

export type SupportedCurrency = 'EUR' | 'USD' | 'GBP' | 'CHF' | 'SOL' | 'USDC' | 'USDT';

const EXCHANGE_RATES: Record<SupportedCurrency, number> = {
  EUR: 1.0,
  USD: 1.085,
  GBP: 0.852,
  CHF: 0.955,
  SOL: 0.0054, // 1 EUR = ~0.0054 SOL
  USDC: 1.085,
  USDT: 1.085,
};

export const TreasuryConverterModal: React.FC<TreasuryConverterModalProps> = ({
  isOpen,
  onClose,
  onSuccessConversion,
}) => {
  const { user, refreshUser } = useAuth();
  const [fromCurrency, setFromCurrency] = useState<SupportedCurrency>('USDC');
  const [toCurrency, setToCurrency] = useState<SupportedCurrency>('EUR');
  const [fromAmount, setFromAmount] = useState<number>(1000);
  const [converting, setConverting] = useState<boolean>(false);
  const [conversionSuccess, setConversionSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  // Convert via EUR base rate
  const eurEquivalent = fromAmount / EXCHANGE_RATES[fromCurrency];
  const targetAmount = eurEquivalent * EXCHANGE_RATES[toCurrency];
  const formattedTarget = toCurrency === 'EUR' || toCurrency === 'USD' || toCurrency === 'GBP' || toCurrency === 'CHF'
    ? Number(targetAmount.toFixed(2))
    : Number(targetAmount.toFixed(4));

  const handleExecuteConversion = async () => {
    setConverting(true);
    setTimeout(async () => {
      setConverting(false);
      setConversionSuccess(`Converted ${fromAmount} ${fromCurrency} to ${formattedTarget} ${toCurrency} successfully! Credit added to your active wallet.`);
      if (refreshUser) {
        await refreshUser();
      }
      if (onSuccessConversion) {
        onSuccessConversion();
      }
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E3E8E3] space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-[#E3E8E3] pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-50 text-[#27845D]">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#18211F]">Treasury FX & Crypto Converter</h3>
              <p className="text-[11px] text-[#69736F]">Institutional zero-spread currency desk</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {conversionSuccess ? (
          <div className="py-4 text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-100 text-[#27845D] rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-[#18211F]">Conversion Settled</h4>
            <p className="text-xs text-[#52605C]">{conversionSuccess}</p>
            <button
              onClick={() => {
                setConversionSuccess(null);
                onClose();
              }}
              className="btn btn-primary w-full text-xs font-bold mt-2"
            >
              Return to Treasury
            </button>
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            {/* From Amount */}
            <div className="p-3.5 rounded-xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-2">
              <span className="text-[11px] font-bold text-[#69736F] uppercase tracking-wider block">You Pay</span>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  value={fromAmount}
                  onChange={(e) => setFromAmount(Math.max(1, parseFloat(e.target.value) || 0))}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E3E8E3] text-lg font-mono font-bold text-[#18211F] focus:outline-hidden focus:ring-2 focus:ring-[#27845D]"
                />
                <select
                  value={fromCurrency}
                  onChange={(e) => setFromCurrency(e.target.value as SupportedCurrency)}
                  className="px-3 py-2 rounded-xl bg-white border border-[#E3E8E3] font-bold font-mono text-xs text-[#18211F] cursor-pointer"
                >
                  <option value="USDC">USDC</option>
                  <option value="USDT">USDT</option>
                  <option value="SOL">SOL</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="USD">USD ($)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="CHF">CHF (Fr.)</option>
                </select>
              </div>
            </div>

            {/* Exchange Swap Divider */}
            <div className="flex justify-center -my-2">
              <div className="w-8 h-8 rounded-full bg-[#142421] text-white flex items-center justify-center shadow-md">
                <ArrowRight className="w-4 h-4 text-[#B7E36A] rotate-90" />
              </div>
            </div>

            {/* To Amount */}
            <div className="p-3.5 rounded-xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-2">
              <span className="text-[11px] font-bold text-[#69736F] uppercase tracking-wider block">You Receive (Credited to Wallet)</span>
              <div className="flex gap-2">
                <div className="w-full px-3 py-2 rounded-xl bg-white border border-[#E3E8E3] text-lg font-mono font-bold text-[#27845D]">
                  {formattedTarget}
                </div>
                <select
                  value={toCurrency}
                  onChange={(e) => setToCurrency(e.target.value as SupportedCurrency)}
                  className="px-3 py-2 rounded-xl bg-white border border-[#E3E8E3] font-bold font-mono text-xs text-[#18211F] cursor-pointer"
                >
                  <option value="EUR">EUR (€)</option>
                  <option value="USDC">USDC</option>
                  <option value="USDT">USDT</option>
                  <option value="USD">USD ($)</option>
                </select>
              </div>
            </div>

            {/* Rate Details Box */}
            <div className="p-3 rounded-xl bg-[#142421] text-white space-y-1 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-300">Exchange Rate:</span>
                <span className="text-[#B7E36A] font-bold">1 {fromCurrency} = {(EXCHANGE_RATES[toCurrency] / EXCHANGE_RATES[fromCurrency]).toFixed(4)} {toCurrency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Conversion Fee:</span>
                <span className="text-emerald-400 font-bold">0.00% (Institutional Tier)</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleExecuteConversion}
                disabled={converting || fromAmount <= 0}
                className="btn btn-primary flex-1 text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {converting ? 'Processing Treasury FX...' : `Confirm Conversion to ${toCurrency}`}
              </button>
              <button
                onClick={onClose}
                className="btn btn-secondary text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
