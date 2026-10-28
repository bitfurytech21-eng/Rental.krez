import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../lib/auth';
import { ledger, LEDGER_FX_RATES_TO_EUR, LEDGER_FX_FEE_PERCENT } from '../../lib/ledger';
import { treasuryApi } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { formatCurrency } from '../../lib/utils';
import {
  X,
  RefreshCw,
  ArrowUpDown,
  CheckCircle2,
  Wallet,
  AlertCircle,
  Loader2,
  Plus,
} from 'lucide-react';

interface TreasuryConverterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessConversion?: () => void;
  onOpenDeposit?: () => void;
}

export type SupportedCurrency = 'EUR' | 'USD' | 'GBP' | 'CHF' | 'SOL' | 'USDC' | 'USDT';

const CURRENCY_LABELS: Record<SupportedCurrency, string> = {
  EUR: 'EUR (€)',
  USD: 'USD ($)',
  GBP: 'GBP (£)',
  CHF: 'CHF (Fr.)',
  USDC: 'USDC (SPL)',
  USDT: 'USDT (SPL)',
  SOL: 'SOL',
};

const ALL_CURRENCIES: SupportedCurrency[] = ['EUR', 'USDC', 'USDT', 'USD', 'GBP', 'CHF', 'SOL'];

export const TreasuryConverterModal: React.FC<TreasuryConverterModalProps> = ({
  isOpen,
  onClose,
  onSuccessConversion,
  onOpenDeposit,
}) => {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();

  const [fromCurrency, setFromCurrency] = useState<SupportedCurrency>('EUR');
  const [toCurrency, setToCurrency] = useState<SupportedCurrency>('USDC');
  const [fromAmount, setFromAmount] = useState<number>(500);
  const [converting, setConverting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [liveTick, setLiveTick] = useState<number>(0);
  const [conversionReceipt, setConversionReceipt] = useState<{
    reference: string;
    fromCurrency: string;
    toCurrency: string;
    fromAmount: number;
    toAmount: number;
    feeEur: number;
    eurBalanceAfter: number;
  } | null>(null);

  useEffect(() => {
    return ledger.subscribe(() => setLiveTick((t) => t + 1));
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setConversionReceipt(null);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !converting) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, converting, onClose]);

  const currencyBalances = useMemo(() => {
    void liveTick;
    if (!user) return { EUR: 0, USD: 0, GBP: 0, CHF: 0, USDC: 0, USDT: 0, SOL: 0 };
    return ledger.getUserCurrencyBalances(user.id);
  }, [user, liveTick]);

  if (!isOpen) return null;

  const availableFrom = currencyBalances[fromCurrency] ?? 0;
  const availableTo = currencyBalances[toCurrency] ?? 0;

  const rateFromEur = LEDGER_FX_RATES_TO_EUR[fromCurrency] || 1;
  const rateToEur = LEDGER_FX_RATES_TO_EUR[toCurrency] || 1;
  const unitCrossRate = rateFromEur / rateToEur;

  const grossEurValue = Math.max(0, fromAmount || 0) * rateFromEur;
  const feeEur = Number((grossEurValue * (LEDGER_FX_FEE_PERCENT / 100)).toFixed(2));
  const netEurValue = Math.max(0, grossEurValue - feeEur);
  const targetDecimals = toCurrency === 'SOL' ? 6 : 2;
  const sourceDecimals = fromCurrency === 'SOL' ? 6 : 2;
  const formattedTarget = Number((netEurValue / rateToEur).toFixed(targetDecimals));

  const isInsufficient = fromAmount > availableFrom || availableFrom <= 0;

  const handleSwapCurrencies = () => {
    setError(null);
    const prevFrom = fromCurrency;
    const prevTo = toCurrency;
    setFromCurrency(prevTo);
    setToCurrency(prevFrom);
    const nextAvail = currencyBalances[prevTo] ?? 0;
    if (nextAvail > 0) {
      setFromAmount(Number(Math.min(fromAmount || nextAvail, nextAvail).toFixed(prevTo === 'SOL' ? 4 : 2)));
    }
  };

  const handleSelectFrom = (nextFrom: SupportedCurrency) => {
    setError(null);
    if (nextFrom === toCurrency) {
      setToCurrency(fromCurrency);
    }
    setFromCurrency(nextFrom);
  };

  const handleSelectTo = (nextTo: SupportedCurrency) => {
    setError(null);
    if (nextTo === fromCurrency) {
      setFromCurrency(toCurrency);
    }
    setToCurrency(nextTo);
  };

  const handleExecuteConversion = async () => {
    if (converting || !user) return;
    setError(null);

    if (!fromAmount || fromAmount <= 0) {
      setError('Please enter a valid positive conversion amount.');
      return;
    }

    if (fromAmount > availableFrom) {
      setError(
        `Insufficient ${fromCurrency} balance. Available: ${availableFrom.toFixed(sourceDecimals)} ${fromCurrency}.`
      );
      return;
    }

    setConverting(true);
    try {
      const result = ledger.executeCurrencyConversion(user.id, fromCurrency, toCurrency, fromAmount);

      // Synchronize with backend treasury endpoint
      treasuryApi
        .convert({
          fromCurrency,
          toCurrency,
          amount: fromAmount,
          clientEurBalance: currencyBalances.EUR,
        })
        .catch(() => {
          // Local ledger is authoritative when server session sub-balances differ
        });

      if (refreshUser) {
        await refreshUser();
      }

      setConversionReceipt({
        reference: result.reference,
        fromCurrency: result.fromCurrency,
        toCurrency: result.toCurrency,
        fromAmount: result.fromAmount,
        toAmount: result.toAmount,
        feeEur: result.feeEur,
        eurBalanceAfter: result.balances.EUR ?? user.walletBalance,
      });

      showToast(
        `Converted ${result.fromAmount} ${result.fromCurrency} → ${result.toAmount} ${result.toCurrency}`,
        'success'
      );

      if (onSuccessConversion) {
        onSuccessConversion();
      }
    } catch (err: any) {
      setError(err.message || 'Treasury conversion failed. Please verify your available balance.');
    } finally {
      setConverting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="treasury-converter-title"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !converting) onClose();
      }}
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-[#E3E8E3] space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b border-[#E3E8E3] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-50 text-[#27845D]">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <h3 id="treasury-converter-title" className="text-base font-bold text-[#18211F]">
                Treasury FX &amp; Crypto Converter
              </h3>
              <p className="text-[11px] text-[#69736F]">Multi-currency sub-account desk · {LEDGER_FX_FEE_PERCENT}% spread</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={converting}
            aria-label="Close converter"
            className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {conversionReceipt ? (
          <div className="py-3 text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-100 text-[#27845D] rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-[#18211F]">Conversion Settled on Ledger</h4>
            <p className="text-xs text-[#52605C]">
              Exchanged{' '}
              <strong className="font-mono text-[#18211F]">
                {conversionReceipt.fromAmount} {conversionReceipt.fromCurrency}
              </strong>{' '}
              into{' '}
              <strong className="font-mono text-[#27845D]">
                {conversionReceipt.toAmount} {conversionReceipt.toCurrency}
              </strong>
              .
            </p>

            <div className="p-3 rounded-xl bg-[#F6F7F4] border border-[#E3E8E3] text-left text-xs space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-[#69736F] font-sans">FX Reference:</span>
                <span className="font-bold text-[#18211F]">{conversionReceipt.reference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#69736F] font-sans">Desk Spread ({LEDGER_FX_FEE_PERCENT}%):</span>
                <span className="font-semibold text-[#18211F]">{formatCurrency(conversionReceipt.feeEur)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#69736F] font-sans">Active EUR Cash Balance:</span>
                <span className="font-bold text-[#27845D]">{formatCurrency(conversionReceipt.eurBalanceAfter)}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConversionReceipt(null)}
                className="btn btn-secondary flex-1 text-xs font-bold"
              >
                Convert Again
              </button>
              <button
                type="button"
                onClick={() => {
                  setConversionReceipt(null);
                  onClose();
                }}
                className="btn btn-primary flex-1 text-xs font-bold"
              >
                Return to Wallet
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5 text-xs">
            {/* Active Multi-Currency Sub-Balances Strip */}
            <div className="p-2.5 rounded-xl bg-[#F6FAF8] border border-[#E4EEEA] space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#71817D]">
                <span className="flex items-center gap-1">
                  <Wallet className="w-3 h-3 text-[#087F5B]" /> Treasury Sub-Balances
                </span>
                <span>Click to select source</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ALL_CURRENCIES.map((cur) => {
                  const bal = currencyBalances[cur] ?? 0;
                  const isActive = fromCurrency === cur;
                  return (
                    <button
                      key={cur}
                      type="button"
                      onClick={() => handleSelectFrom(cur)}
                      className={`px-2 py-1 rounded-lg text-[10.5px] font-mono font-bold border transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-[#142421] text-white border-[#142421]'
                          : bal > 0
                          ? 'bg-white text-[#18211F] border-emerald-300 hover:border-[#27845D]'
                          : 'bg-white/70 text-[#69736F] border-[#E3E8E3]'
                      }`}
                    >
                      {cur}: {bal.toFixed(cur === 'SOL' ? 4 : 2)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* From Amount */}
            <div className="p-3.5 rounded-xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="fx-from-amount" className="text-[11px] font-bold text-[#69736F] uppercase tracking-wider">
                  You Convert
                </label>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="text-[#69736F] font-mono">
                    Avail: <strong className="text-[#18211F]">{availableFrom.toFixed(sourceDecimals)} {fromCurrency}</strong>
                  </span>
                  {availableFrom > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setFromAmount(availableFrom);
                      }}
                      className="px-1.5 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-[#087F5B] text-[9.5px] font-extrabold uppercase cursor-pointer"
                    >
                      Max
                    </button>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  id="fx-from-amount"
                  type="number"
                  min={0}
                  step="any"
                  value={fromAmount || ''}
                  onChange={(e) => {
                    setError(null);
                    setFromAmount(Math.max(0, parseFloat(e.target.value) || 0));
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E3E8E3] text-lg font-mono font-bold text-[#18211F] focus:outline-hidden focus:ring-2 focus:ring-[#27845D]"
                />
                <select
                  aria-label="Source currency"
                  value={fromCurrency}
                  onChange={(e) => handleSelectFrom(e.target.value as SupportedCurrency)}
                  className="px-3 py-2 rounded-xl bg-white border border-[#E3E8E3] font-bold font-mono text-xs text-[#18211F] cursor-pointer"
                >
                  {ALL_CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {CURRENCY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Interactive Swap Currencies Button */}
            <div className="flex justify-center -my-2">
              <button
                type="button"
                onClick={handleSwapCurrencies}
                title="Swap source and target currencies"
                aria-label="Swap source and target currencies"
                className="w-8 h-8 rounded-full bg-[#142421] hover:bg-[#1f3732] text-white flex items-center justify-center shadow-md cursor-pointer transition-transform active:scale-95"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-[#B7E36A]" />
              </button>
            </div>

            {/* To Amount */}
            <div className="p-3.5 rounded-xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#69736F] uppercase tracking-wider">
                  You Receive (Net After Spread)
                </span>
                <span className="text-[11px] font-mono text-[#69736F]">
                  Bal: {availableTo.toFixed(targetDecimals)} {toCurrency}
                </span>
              </div>
              <div className="flex gap-2">
                <div className="w-full px-3 py-2 rounded-xl bg-white border border-[#E3E8E3] text-lg font-mono font-bold text-[#27845D] tabular-nums">
                  {formattedTarget}
                </div>
                <select
                  aria-label="Target currency"
                  value={toCurrency}
                  onChange={(e) => handleSelectTo(e.target.value as SupportedCurrency)}
                  className="px-3 py-2 rounded-xl bg-white border border-[#E3E8E3] font-bold font-mono text-xs text-[#18211F] cursor-pointer"
                >
                  {ALL_CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {CURRENCY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Rate Details Box */}
            <div className="p-3 rounded-xl bg-[#142421] text-white space-y-1 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-300">Spot Rate:</span>
                <span className="text-[#B7E36A] font-bold">
                  1 {fromCurrency} = {unitCrossRate.toFixed(4)} {toCurrency}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Desk Clearing Spread ({LEDGER_FX_FEE_PERCENT}%):</span>
                <span className="text-emerald-300 font-bold">{formatCurrency(feeEur)}</span>
              </div>
            </div>

            {/* Honest Insufficient Balance Warning */}
            {isInsufficient && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-snug">
                    You have <strong className="font-mono">{availableFrom.toFixed(sourceDecimals)} {fromCurrency}</strong>{' '}
                    available. Fund your EUR wallet first (or select a currency with an active balance above) to convert.
                  </p>
                </div>
                {onOpenDeposit && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenDeposit();
                    }}
                    className="w-full py-1.5 px-3 rounded-lg bg-[#142421] hover:bg-[#1f3732] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#B7E36A]" />
                    <span>Deposit Funds to Wallet</span>
                  </button>
                )}
              </div>
            )}

            {error && (
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleExecuteConversion}
                disabled={converting || fromAmount <= 0 || isInsufficient}
                className="btn btn-primary flex-1 text-xs font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                {converting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Settling FX...</span>
                  </>
                ) : (
                  `Convert ${fromCurrency} → ${toCurrency}`
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={converting}
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
