import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../lib/auth';
import { treasuryApi } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { formatCurrency } from '../../lib/utils';
import { printTransactionReceipt } from '../../lib/printService';
import {
  X,
  RefreshCw,
  ArrowUpDown,
  CheckCircle2,
  Wallet,
  AlertCircle,
  Loader2,
  Plus,
  Clock,
  Printer,
} from 'lucide-react';

interface TreasuryConverterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessConversion?: () => void;
  onOpenDeposit?: () => void;
}

export type SupportedCurrency = 'EUR' | 'USD' | 'GBP' | 'CHF' | 'USDC' | 'USDT' | 'SOL';

const CURRENCY_LABELS: Record<SupportedCurrency, string> = {
  EUR: 'EUR (€)',
  USD: 'USD ($)',
  GBP: 'GBP (£)',
  CHF: 'CHF (Fr.)',
  USDC: 'USDC',
  USDT: 'USDT',
  SOL: 'SOL',
};

const ALL_CURRENCIES: SupportedCurrency[] = ['EUR', 'USDC', 'USDT', 'USD', 'GBP', 'CHF', 'SOL'];

interface LiveRateData {
  available: boolean;
  providerStatus: 'live' | 'unavailable';
  providerSource?: string;
  quoteId?: string;
  expiresAt?: string;
  ratesToEur?: Record<string, number>;
  feePercent: number;
  limits: { minEur: number; maxEur: number };
  networks?: Record<string, string>;
  updatedAt?: string;
}

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
  const [fromAmount, setFromAmount] = useState<number>(100);
  const [converting, setConverting] = useState<boolean>(false);
  const [loadingRates, setLoadingRates] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [rateError, setRateError] = useState<string | null>(null);

  const [balances, setBalances] = useState<Record<string, number>>({
    EUR: 0,
    USD: 0,
    GBP: 0,
    CHF: 0,
    USDC: 0,
    USDT: 0,
    SOL: 0,
  });
  const [rateData, setRateData] = useState<LiveRateData | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const [conversionReceipt, setConversionReceipt] = useState<{
    reference: string;
    fromCurrency: string;
    toCurrency: string;
    fromAmount: number;
    toAmount: number;
    crossRate?: number;
    feeEur: number;
    feePercent?: number;
    providerSource?: string;
    eurBalanceAfter: number;
    settledAt: string;
  } | null>(null);

  const loadTreasuryState = useCallback(async () => {
    setLoadingRates(true);
    setRateError(null);

    try {
      const [balRes, ratesRes] = await Promise.all([
        treasuryApi.getBalances().catch((err) => {
          throw err;
        }),
        treasuryApi.getRates().catch((err) => {
          return { unavailableErr: err } as any;
        }),
      ]);

      const nextBalances = balRes?.data?.balances;
      if (nextBalances) {
        setBalances({
          EUR: Number(nextBalances.EUR || 0),
          USD: Number(nextBalances.USD || 0),
          GBP: Number(nextBalances.GBP || 0),
          CHF: Number(nextBalances.CHF || 0),
          USDC: Number(nextBalances.USDC || 0),
          USDT: Number(nextBalances.USDT || 0),
          SOL: Number(nextBalances.SOL || 0),
        });
      }

      if (ratesRes && !ratesRes.unavailableErr && ratesRes.data?.available && ratesRes.data?.ratesToEur) {
        setRateData(ratesRes.data);
      } else {
        const msg =
          ratesRes?.unavailableErr?.message ||
          ratesRes?.unavailableErr?.details?.error ||
          'Live FX rate provider is currently unavailable. Conversions are paused to avoid misleading quotes.';
        setRateData({
          available: false,
          providerStatus: 'unavailable',
          feePercent: 0.15,
          limits: { minEur: 10, maxEur: 250000 },
        });
        setRateError(msg);
      }
    } catch (err: any) {
      setRateError(err?.message || 'Unable to load treasury balances and exchange rates.');
    } finally {
      setLoadingRates(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setConversionReceipt(null);
    void loadTreasuryState();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !converting) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, converting, onClose, loadTreasuryState]);

  // Quote countdown timer
  useEffect(() => {
    if (!isOpen || !rateData?.expiresAt) {
      setSecondsLeft(null);
      return;
    }
    const updateRemaining = () => {
      const diff = Math.max(0, Math.floor((new Date(rateData.expiresAt!).getTime() - Date.now()) / 1000));
      setSecondsLeft(diff);
    };
    updateRemaining();
    const timer = setInterval(updateRemaining, 1000);
    return () => clearInterval(timer);
  }, [isOpen, rateData?.expiresAt]);

  if (!isOpen || !user) return null;

  const availableFrom = balances[fromCurrency] ?? 0;
  const availableTo = balances[toCurrency] ?? 0;

  const ratesMap = rateData?.ratesToEur;
  const ratesAvailable = Boolean(rateData?.available && ratesMap && ratesMap[fromCurrency] && ratesMap[toCurrency]);
  const isQuoteExpired = secondsLeft !== null && secondsLeft <= 0;

  const rateFromEur = ratesAvailable ? ratesMap![fromCurrency] : 0;
  const rateToEur = ratesAvailable ? ratesMap![toCurrency] : 0;
  const unitCrossRate = ratesAvailable && rateToEur > 0 ? rateFromEur / rateToEur : 0;

  const feePercent = rateData?.feePercent ?? 0.15;
  const minEur = rateData?.limits?.minEur ?? 10;
  const maxEur = rateData?.limits?.maxEur ?? 250000;

  const grossEurValue = ratesAvailable ? Math.max(0, fromAmount || 0) * rateFromEur : 0;
  const feeEur = ratesAvailable ? Number((grossEurValue * (feePercent / 100)).toFixed(2)) : 0;
  const netEurValue = Math.max(0, grossEurValue - feeEur);
  const targetDecimals = toCurrency === 'SOL' ? 6 : 2;
  const sourceDecimals = fromCurrency === 'SOL' ? 6 : 2;
  const formattedTarget = ratesAvailable && rateToEur > 0 ? Number((netEurValue / rateToEur).toFixed(targetDecimals)) : 0;

  const isInsufficient = fromAmount > availableFrom || availableFrom <= 0;
  const isOutOfLimits = ratesAvailable && fromAmount > 0 && (grossEurValue < minEur || grossEurValue > maxEur);

  const handleSwapCurrencies = () => {
    setError(null);
    const prevFrom = fromCurrency;
    const prevTo = toCurrency;
    setFromCurrency(prevTo);
    setToCurrency(prevFrom);
    const nextAvail = balances[prevTo] ?? 0;
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

    if (!ratesAvailable) {
      setError('Live conversion rates are unavailable. Refresh rates before executing.');
      return;
    }
    if (isQuoteExpired) {
      setError('Your FX quote has expired. Refresh live rates to continue.');
      return;
    }
    if (!fromAmount || fromAmount <= 0) {
      setError('Please enter a valid positive conversion amount.');
      return;
    }
    if (grossEurValue < minEur || grossEurValue > maxEur) {
      setError(`Transaction value (€${grossEurValue.toFixed(2)}) must be between €${minEur} and €${maxEur.toLocaleString()}.`);
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
      const response = await treasuryApi.convert({
        fromCurrency,
        toCurrency,
        amount: fromAmount,
        quoteId: rateData?.quoteId,
      });

      const resData = response?.data;
      if (!resData) {
        throw new Error('Unexpected empty response from treasury execution desk.');
      }

      if (resData.balances) {
        setBalances(resData.balances);
      }

      await refreshUser();

      setConversionReceipt({
        reference: resData.reference,
        fromCurrency: resData.fromCurrency,
        toCurrency: resData.toCurrency,
        fromAmount: resData.fromAmount,
        toAmount: resData.toAmount,
        crossRate: resData.crossRate,
        feeEur: resData.feeEur,
        feePercent: resData.feePercent ?? feePercent,
        providerSource: resData.providerSource ?? rateData?.providerSource,
        eurBalanceAfter: resData.balances?.EUR ?? balances.EUR,
        settledAt: new Date().toISOString(),
      });

      showToast(
        `Converted ${resData.fromAmount} ${resData.fromCurrency} → ${resData.toAmount} ${resData.toCurrency}`,
        'success'
      );

      if (onSuccessConversion) {
        onSuccessConversion();
      }
    } catch (err: any) {
      setError(err?.message || 'Treasury conversion failed on the server. No funds were moved.');
      if (err?.code === 'QUOTE_EXPIRED') {
        void loadTreasuryState();
      }
    } finally {
      setConverting(false);
    }
  };

  const handlePrintReceipt = () => {
    if (!conversionReceipt) return;
    printTransactionReceipt({
      receiptId: conversionReceipt.reference,
      transactionHash: conversionReceipt.reference,
      date: new Date(conversionReceipt.settledAt).toLocaleString('en-GB'),
      userName: user.fullName || 'Investor',
      userEmail: user.email,
      propertyTitle: `Treasury FX Conversion (${conversionReceipt.fromAmount} ${conversionReceipt.fromCurrency} → ${conversionReceipt.toAmount} ${conversionReceipt.toCurrency})`,
      tokensPurchased: 1,
      tokenPrice: conversionReceipt.fromAmount,
      totalPaid: Number((conversionReceipt.fromAmount * (ratesMap?.[conversionReceipt.fromCurrency] || 1)).toFixed(2)),
      paymentMethod: `Treasury FX Desk (${conversionReceipt.providerSource || 'Live Feed'})`,
      status: 'Completed',
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="treasury-converter-title"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !converting) onClose();
      }}
    >
      <div
        className="bg-[#0B0F10] rounded-[22px] max-w-md w-full p-5 sm:p-6 shadow-2xl border border-[#1F2C33] space-y-4 max-h-[92vh] overflow-y-auto text-[#F2F5F4]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b border-[#1F2C33] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#121A1F] text-[#6FD8B0] border border-[#1F2C33]">
              <RefreshCw className={`w-4 h-4 ${loadingRates ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h3 id="treasury-converter-title" className="text-base font-bold text-white">
                Treasury FX &amp; Crypto Converter
              </h3>
              <p className="text-[11px] text-[#8FA1A8]">
                {ratesAvailable
                  ? `Live feed (${rateData?.providerSource || 'Market'}) · ${feePercent}% spread`
                  : 'Treasury rate desk'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {!conversionReceipt && (
              <button
                type="button"
                onClick={() => void loadTreasuryState()}
                disabled={loadingRates || converting}
                title="Refresh live rates"
                aria-label="Refresh live rates"
                className="p-1.5 rounded-lg border border-[#1F2C33] bg-[#121A1F] text-[#8FA1A8] hover:text-white cursor-pointer disabled:opacity-40"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingRates ? 'animate-spin' : ''}`} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              disabled={converting}
              aria-label="Close converter"
              className="text-[#8FA1A8] hover:text-white p-1.5 rounded-lg border border-[#1F2C33] cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {conversionReceipt ? (
          <div className="py-2 text-center space-y-3.5">
            <div className="w-12 h-12 bg-[#6FD8B0]/15 text-[#6FD8B0] border border-[#6FD8B0]/40 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white">Conversion Settled</h4>
              <p className="text-xs text-[#A5B3B8] mt-1">
                Exchanged{' '}
                <strong className="font-mono text-white">
                  {conversionReceipt.fromAmount} {conversionReceipt.fromCurrency}
                </strong>{' '}
                into{' '}
                <strong className="font-mono text-[#6FD8B0]">
                  {conversionReceipt.toAmount} {conversionReceipt.toCurrency}
                </strong>
                .
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#121A1F] border border-[#1F2C33] text-left text-xs space-y-1.5 font-mono">
              <div className="flex justify-between gap-2">
                <span className="text-[#8FA1A8] font-sans">FX Reference:</span>
                <span className="font-bold text-white">{conversionReceipt.reference}</span>
              </div>
              {conversionReceipt.crossRate && (
                <div className="flex justify-between gap-2">
                  <span className="text-[#8FA1A8] font-sans">Execution Rate:</span>
                  <span className="text-white">
                    1 {conversionReceipt.fromCurrency} = {conversionReceipt.crossRate.toFixed(4)} {conversionReceipt.toCurrency}
                  </span>
                </div>
              )}
              <div className="flex justify-between gap-2">
                <span className="text-[#8FA1A8] font-sans">Desk Spread ({conversionReceipt.feePercent}%):</span>
                <span className="font-semibold text-[#D0D0D0]">{formatCurrency(conversionReceipt.feeEur)}</span>
              </div>
              <div className="flex justify-between gap-2 pt-1.5 border-t border-[#1F2C33]">
                <span className="text-[#8FA1A8] font-sans">Updated EUR Balance:</span>
                <span className="font-bold text-[#6FD8B0]">{formatCurrency(conversionReceipt.eurBalanceAfter)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handlePrintReceipt}
                className="py-2.5 rounded-xl bg-[#121A1F] hover:bg-[#192329] border border-[#1F2C33] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-[#6FD8B0]" />
                <span>Print Receipt</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setConversionReceipt(null);
                  void loadTreasuryState();
                }}
                className="py-2.5 rounded-xl bg-[#121A1F] hover:bg-[#192329] border border-[#1F2C33] text-white text-xs font-bold cursor-pointer"
              >
                New Conversion
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                setConversionReceipt(null);
                onClose();
              }}
              className="w-full py-2.5 rounded-xl bg-[#6FD8B0] hover:brightness-105 text-[#07231A] text-xs font-bold cursor-pointer"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-3.5 text-xs">
            {/* Quote Status & Expiry Strip */}
            {ratesAvailable && secondsLeft !== null && (
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#121A1F] border border-[#1F2C33] text-[11px]">
                <span className="flex items-center gap-1.5 font-mono text-[#8FA1A8]">
                  <Clock className="w-3.5 h-3.5 text-[#6FD8B0]" />
                  Quote <strong className="text-white">{rateData?.quoteId}</strong>
                </span>
                {isQuoteExpired ? (
                  <button
                    type="button"
                    onClick={() => void loadTreasuryState()}
                    className="font-bold text-amber-300 hover:underline cursor-pointer"
                  >
                    Expired — Refresh Rate
                  </button>
                ) : (
                  <span className="font-mono font-semibold text-[#6FD8B0]">Valid {secondsLeft}s</span>
                )}
              </div>
            )}

            {/* Unavailable Provider Alert */}
            {rateError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Conversion Temporarily Unavailable</p>
                    <p className="text-[11px] opacity-90 mt-0.5">{rateError}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void loadTreasuryState()}
                  disabled={loadingRates}
                  className="px-3 py-1.5 rounded-lg bg-rose-500 text-white text-[11px] font-bold cursor-pointer"
                >
                  {loadingRates ? 'Refreshing...' : 'Retry Live Feed'}
                </button>
              </div>
            )}

            {/* Active Multi-Currency Sub-Balances Strip */}
            <div className="p-2.5 rounded-xl bg-[#121A1F] border border-[#1F2C33] space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#8FA1A8]">
                <span className="flex items-center gap-1 text-white">
                  <Wallet className="w-3 h-3 text-[#6FD8B0]" /> Treasury Sub-Balances
                </span>
                <span>Select source asset</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ALL_CURRENCIES.map((cur) => {
                  const bal = balances[cur] ?? 0;
                  const isActive = fromCurrency === cur;
                  return (
                    <button
                      key={cur}
                      type="button"
                      onClick={() => handleSelectFrom(cur)}
                      className={`px-2 py-1 rounded-lg text-[10.5px] font-mono font-bold border transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-[#6FD8B0] text-[#07231A] border-[#6FD8B0]'
                          : bal > 0
                          ? 'bg-[#0B0F10] text-white border-[#1F2C33] hover:border-[#6FD8B0]'
                          : 'bg-[#0B0F10]/60 text-[#8FA1A8] border-[#1F2C33]/60'
                      }`}
                    >
                      {cur}: {bal.toFixed(cur === 'SOL' ? 4 : 2)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* From Amount */}
            <div className="p-3.5 rounded-xl bg-[#121A1F] border border-[#1F2C33] space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="fx-from-amount" className="text-[11px] font-bold text-white uppercase tracking-wider">
                  You Convert
                </label>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="text-[#8FA1A8] font-mono">
                    Avail: <strong className="text-white">{availableFrom.toFixed(sourceDecimals)} {fromCurrency}</strong>
                  </span>
                  {availableFrom > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setFromAmount(availableFrom);
                      }}
                      className="px-1.5 py-0.5 rounded bg-[#6FD8B0] text-[#07231A] text-[9.5px] font-extrabold uppercase cursor-pointer"
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
                  className="w-full px-3 py-2 rounded-xl bg-[#0B0F10] border border-[#1F2C33] text-lg font-mono font-bold text-white focus:outline-none focus:border-[#6FD8B0]"
                />
                <select
                  aria-label="Source currency"
                  value={fromCurrency}
                  onChange={(e) => handleSelectFrom(e.target.value as SupportedCurrency)}
                  className="px-3 py-2 rounded-xl bg-[#0B0F10] border border-[#1F2C33] font-bold font-mono text-xs text-white cursor-pointer focus:outline-none focus:border-[#6FD8B0]"
                >
                  {ALL_CURRENCIES.map((c) => (
                    <option key={c} value={c} className="bg-[#0B0F10] text-white">
                      {CURRENCY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>
              {rateData?.networks?.[fromCurrency] && (
                <p className="text-[10px] text-[#8FA1A8]">Rail: {rateData.networks[fromCurrency]}</p>
              )}
            </div>

            {/* Swap Currencies Button */}
            <div className="flex justify-center -my-2">
              <button
                type="button"
                onClick={handleSwapCurrencies}
                title="Swap source and target currencies"
                aria-label="Swap source and target currencies"
                className="w-8 h-8 rounded-full bg-[#6FD8B0] hover:brightness-105 text-[#07231A] flex items-center justify-center shadow-md cursor-pointer transition-transform active:scale-95"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* To Amount */}
            <div className="p-3.5 rounded-xl bg-[#121A1F] border border-[#1F2C33] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                  Estimated Net Receive
                </span>
                <span className="text-[11px] font-mono text-[#8FA1A8]">
                  Bal: {availableTo.toFixed(targetDecimals)} {toCurrency}
                </span>
              </div>
              <div className="flex gap-2">
                <div className="w-full px-3 py-2 rounded-xl bg-[#0B0F10] border border-[#1F2C33] text-lg font-mono font-bold text-[#6FD8B0] tabular-nums">
                  {ratesAvailable ? formattedTarget : 'Unavailable'}
                </div>
                <select
                  aria-label="Target currency"
                  value={toCurrency}
                  onChange={(e) => handleSelectTo(e.target.value as SupportedCurrency)}
                  className="px-3 py-2 rounded-xl bg-[#0B0F10] border border-[#1F2C33] font-bold font-mono text-xs text-white cursor-pointer focus:outline-none focus:border-[#6FD8B0]"
                >
                  {ALL_CURRENCIES.map((c) => (
                    <option key={c} value={c} className="bg-[#0B0F10] text-white">
                      {CURRENCY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>
              {rateData?.networks?.[toCurrency] && (
                <p className="text-[10px] text-[#8FA1A8]">Settlement rail: {rateData.networks[toCurrency]}</p>
              )}
            </div>

            {/* Disclosed Rate & Limits Box */}
            <div className="p-3 rounded-xl bg-[#121A1F] border border-[#1F2C33] text-white space-y-1 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-[#8FA1A8] font-sans">Live Cross Rate:</span>
                <span className="text-[#6FD8B0] font-bold">
                  {ratesAvailable ? `1 ${fromCurrency} = ${unitCrossRate.toFixed(4)} ${toCurrency}` : 'Unavailable'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8FA1A8] font-sans">Disclosed Spread ({feePercent}%):</span>
                <span className="text-[#D0D0D0] font-bold">{ratesAvailable ? formatCurrency(feeEur) : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8FA1A8] font-sans">Order Limits:</span>
                <span className="text-[#8FA1A8]">€{minEur} – €{maxEur.toLocaleString()}</span>
              </div>
            </div>

            {isOutOfLimits && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  Conversion value (€{grossEurValue.toFixed(2)}) must fall between €{minEur} and €{maxEur.toLocaleString()}.
                </span>
              </div>
            )}

            {/* Honest Insufficient Balance Warning */}
            {isInsufficient && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-white space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-snug text-[#D0D0D0]">
                    You have <strong className="font-mono text-white">{availableFrom.toFixed(sourceDecimals)} {fromCurrency}</strong>{' '}
                    available in this sub-account. Fund your wallet first or choose a funded currency above.
                  </p>
                </div>
                {onOpenDeposit && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenDeposit();
                    }}
                    className="w-full py-1.5 px-3 rounded-lg bg-[#6FD8B0] hover:brightness-105 text-[#07231A] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Deposit Funds</span>
                  </button>
                )}
              </div>
            )}

            {error && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleExecuteConversion}
                disabled={converting || loadingRates || !ratesAvailable || isQuoteExpired || fromAmount <= 0 || isInsufficient || isOutOfLimits}
                className="py-2.5 rounded-xl bg-[#6FD8B0] hover:brightness-105 text-[#07231A] flex-1 text-xs font-bold cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 transition-all"
              >
                {converting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Executing...</span>
                  </>
                ) : (
                  `Convert ${fromCurrency} → ${toCurrency}`
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={converting}
                className="py-2.5 rounded-xl bg-[#121A1F] hover:bg-[#1A242B] border border-[#1F2C33] text-white flex-1 text-xs font-bold cursor-pointer transition-colors"
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
