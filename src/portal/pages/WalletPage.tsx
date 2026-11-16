import React, { useEffect, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Landmark, RefreshCw } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { usePortal } from '../state/PortalContext';
import { portalApi } from '../services/portalApi';
import { PORTAL_PLACEHOLDER_TREASURY_RATES } from '../config/portalConfig';
import { formatCurrency, formatEuro, formatNumber, maskIban } from '../utils/format';
import { StatTile } from '../components/StatTile';
import { StatusBadge } from '../components/StatusBadge';
import { TransactionRow } from '../components/TransactionRow';
import { EmptyState } from '../components/EmptyState';
import { LoadingSkeleton } from '../components/LoadingSkeleton';

export const WalletPage: React.FC = () => {
  const toast = useToast();
  const {
    loading,
    balance,
    subBalances,
    profile,
    portalConfig,
    transactions,
    sampleDataEnabled,
    navigatePortal,
    refreshAll,
  } = usePortal();

  const [rates, setRates] = useState<Record<string, number>>(
    PORTAL_PLACEHOLDER_TREASURY_RATES.ratesToEur
  );
  const [feePercent, setFeePercent] = useState<number>(portalConfig.fees.treasuryFxFeePercent);
  const [loadingRates, setLoadingRates] = useState<boolean>(true);
  const [fromCurrency, setFromCurrency] = useState<string>('EUR');
  const [toCurrency, setToCurrency] = useState<string>('USD');
  const [convertAmount, setConvertAmount] = useState<string>('500');
  const [pairError, setPairError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    let active = true;
    setLoadingRates(true);
    portalApi
      .getTreasuryRates()
      .then((res) => {
        if (!active) return;
        if (res?.ratesToEur) setRates(res.ratesToEur);
        if (typeof res?.feePercent === 'number') setFeePercent(res.feePercent);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingRates(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading && !sampleDataEnabled) {
    return <LoadingSkeleton rows={4} />;
  }

  const cashTxs = transactions.filter((t) =>
    ['deposit', 'withdrawal', 'conversion'].includes(t.type.toLowerCase())
  );

  const hasLinkedBank = Boolean(profile?.bankIban?.trim());

  const currencies = Object.keys(rates);
  const parsedAmount = Number(convertAmount);
  const fromRate = rates[fromCurrency] || 0;
  const toRate = rates[toCurrency] || 0;
  const grossEur = Number.isFinite(parsedAmount) ? parsedAmount * fromRate : 0;
  const netEur = grossEur * (1 - feePercent / 100);
  const estimatedOutput = toRate > 0 ? netEur / toRate : 0;

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (converting) return;

    let hasErr = false;
    if (fromCurrency === toCurrency) {
      setPairError('Select two different currencies to convert.');
      hasErr = true;
    } else {
      setPairError(null);
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setAmountError('Enter a valid positive amount to convert.');
      hasErr = true;
    } else {
      setAmountError(null);
    }

    if (hasErr) return;

    if (sampleDataEnabled) {
      toast.info(
        `Sample conversion preview: ${formatCurrency(parsedAmount, fromCurrency)} → ${formatCurrency(
          estimatedOutput,
          toCurrency
        )}.`
      );
      return;
    }

    setConverting(true);
    try {
      const res = await portalApi.convertTreasury({
        fromCurrency,
        toCurrency,
        amount: parsedAmount,
      });
      toast.success(
        `Converted ${formatCurrency(parsedAmount, fromCurrency)} to ${formatCurrency(
          Number(res.toAmount || estimatedOutput),
          toCurrency
        )}.`
      );
      await refreshAll();
    } catch (err: any) {
      const msg = err?.message || 'Unable to execute FX conversion.';
      setAmountError(msg);
      toast.error(msg);
    } finally {
      setConverting(false);
    }
  };

  const subBalanceEntries = Object.entries(subBalances);

  return (
    <div className="space-y-6">
      {/* Wallet Balance Hero */}
      <section className="portal-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-[#8FA1A8]">
            Available Wallet Balance
          </div>
          <div className="mt-1.5 text-3xl font-bold text-[#F2F5F4] portal-tabular">
            {formatEuro(balance)}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => navigatePortal('deposit')}
            className="portal-btn-primary"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Deposit</span>
          </button>
          <button
            type="button"
            onClick={() => navigatePortal('withdraw')}
            className="portal-btn-secondary"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Withdraw</span>
          </button>
        </div>
      </section>

      {/* Linked Bank Account Card */}
      <section className="portal-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-[14px] bg-[#0B0F10] border border-[#1F2C33] text-[#6FD8B0] flex items-center justify-center shrink-0">
            <Landmark className="w-5 h-5" />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-sm font-semibold text-[#F2F5F4]">Linked bank account</h3>
              <StatusBadge
                status={hasLinkedBank ? 'completed' : 'not_started'}
                label={hasLinkedBank ? 'Linked' : 'Not linked'}
              />
            </div>
            {hasLinkedBank ? (
              <div className="text-xs text-[#8FA1A8] space-y-0.5">
                <div className="text-[#F2F5F4] font-medium truncate">
                  {profile?.fullName || 'Registered Investor'}
                </div>
                <div className="font-mono">{maskIban(profile?.bankIban)}</div>
              </div>
            ) : (
              <p className="text-xs text-[#8FA1A8]">
                Add your personal SEPA IBAN in Profile settings to enable withdrawals.
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigatePortal('profile')}
          className="portal-btn-secondary shrink-0"
        >
          {hasLinkedBank ? 'Manage banking' : 'Add bank account'}
        </button>
      </section>

      {/* Sub-currency treasury balances */}
      {subBalanceEntries.length === 0 ? (
        <EmptyState
          title="No currency sub-balances"
          description="EUR and converted treasury balances appear here once your wallet is active."
        />
      ) : (
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {subBalanceEntries.map(([code, val]) => (
            <StatTile
              key={code}
              label={`${code} Treasury`}
              value={formatCurrency(Number(val || 0), code)}
            />
          ))}
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Recent Activity */}
        <div className="lg:col-span-7 space-y-3">
          <h3 className="text-base font-semibold text-[#F2F5F4]">Recent activity</h3>
          {cashTxs.length === 0 ? (
            <EmptyState
              title="No wallet activity yet"
              description="Submitted deposits, treasury conversions, and withdrawals appear here."
              actionLabel="Make a deposit"
              onAction={() => navigatePortal('deposit')}
            />
          ) : (
            <div className="portal-card-list divide-y divide-[#1F2C33]">
              {cashTxs.slice(0, 8).map((tx) => (
                <TransactionRow key={tx.id} transaction={tx} />
              ))}
            </div>
          )}
        </div>

        {/* Live FX Desk */}
        <form onSubmit={handleConvert} noValidate className="lg:col-span-5 portal-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-[#F2F5F4]">Treasury FX conversion</h3>
            <span className="text-xs text-[#8FA1A8] portal-tabular">
              Fee {formatNumber(feePercent, 2)}%
            </span>
          </div>

          {loadingRates ? (
            <LoadingSkeleton rows={2} />
          ) : currencies.length === 0 ? (
            <EmptyState
              title="FX rates unavailable"
              description="Live treasury conversion rates could not be loaded from the server."
            />
          ) : (
            <>
              <div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="fx-from" className="block text-sm font-medium text-[#F2F5F4] mb-1.5">
                      From
                    </label>
                    <select
                      id="fx-from"
                      value={fromCurrency}
                      onChange={(e) => {
                        setFromCurrency(e.target.value);
                        if (e.target.value !== toCurrency) setPairError(null);
                      }}
                      aria-invalid={Boolean(pairError)}
                      className={`portal-input ${pairError ? '!border-[#FB7185]' : ''}`}
                    >
                      {currencies.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="fx-to" className="block text-sm font-medium text-[#F2F5F4] mb-1.5">
                      To
                    </label>
                    <select
                      id="fx-to"
                      value={toCurrency}
                      onChange={(e) => {
                        setToCurrency(e.target.value);
                        if (fromCurrency !== e.target.value) setPairError(null);
                      }}
                      aria-invalid={Boolean(pairError)}
                      className={`portal-input ${pairError ? '!border-[#FB7185]' : ''}`}
                    >
                      {currencies.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {pairError && (
                  <p role="alert" className="mt-1.5 text-xs text-[#FB7185]">
                    {pairError}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="fx-amount" className="block text-sm font-medium text-[#F2F5F4] mb-1.5">
                  Amount ({fromCurrency})
                </label>
                <input
                  id="fx-amount"
                  type="number"
                  min="1"
                  step="0.01"
                  value={convertAmount}
                  onChange={(e) => {
                    const v = e.target.value;
                    setConvertAmount(v);
                    const n = Number(v);
                    setAmountError(
                      !Number.isFinite(n) || n <= 0
                        ? 'Enter a valid positive amount to convert.'
                        : null
                    );
                  }}
                  aria-invalid={Boolean(amountError)}
                  aria-describedby={amountError ? 'fx-amount-error' : undefined}
                  className={`portal-input portal-tabular ${amountError ? '!border-[#FB7185]' : ''}`}
                />
                {amountError && (
                  <p id="fx-amount-error" role="alert" className="mt-1.5 text-xs text-[#FB7185]">
                    {amountError}
                  </p>
                )}
              </div>

              <div className="portal-surface-elevated p-3.5 flex items-center justify-between text-xs">
                <span className="text-[#8FA1A8]">Estimated receive</span>
                <span className="text-sm font-bold text-[#6FD8B0] portal-tabular">
                  {formatCurrency(estimatedOutput, toCurrency)}
                </span>
              </div>

              <button type="submit" disabled={converting} className="portal-btn-primary w-full">
                <RefreshCw className="w-4 h-4" />
                <span>{converting ? 'Converting...' : 'Execute conversion'}</span>
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
};
