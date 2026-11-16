import React, { useEffect, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, RefreshCw } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { usePortal } from '../state/PortalContext';
import { portalApi } from '../services/portalApi';
import { formatEuro } from '../utils/format';
import { StatTile } from '../components/StatTile';
import { TransactionRow } from '../components/TransactionRow';
import { EmptyState } from '../components/EmptyState';

export const WalletPage: React.FC = () => {
  const toast = useToast();
  const { balance, subBalances, transactions, navigatePortal, refreshAll } = usePortal();

  const [rates, setRates] = useState<Record<string, number>>({ EUR: 1, USD: 0.92, GBP: 1.17, CHF: 1.04 });
  const [feePercent, setFeePercent] = useState<number>(0.35);
  const [fromCurrency, setFromCurrency] = useState<string>('EUR');
  const [toCurrency, setToCurrency] = useState<string>('USD');
  const [convertAmount, setConvertAmount] = useState<string>('500');
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    portalApi
      .getTreasuryRates()
      .then((res) => {
        if (res?.ratesToEur) setRates(res.ratesToEur);
        if (typeof res?.feePercent === 'number') setFeePercent(res.feePercent);
      })
      .catch(() => {});
  }, []);

  const cashTxs = transactions.filter((t) =>
    ['deposit', 'withdrawal', 'conversion'].includes(t.type.toLowerCase())
  );

  const currencies = Object.keys(rates).length > 0 ? Object.keys(rates) : ['EUR', 'USD', 'GBP'];
  const parsedAmount = Number(convertAmount) || 0;
  const fromRate = rates[fromCurrency] || 1;
  const toRate = rates[toCurrency] || 1;
  const grossEur = parsedAmount * fromRate;
  const netEur = grossEur * (1 - feePercent / 100);
  const estimatedOutput = toRate > 0 ? netEur / toRate : 0;

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (converting) return;
    if (fromCurrency === toCurrency) {
      toast.error('Select two different currencies to convert.');
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error('Enter a valid amount to convert.');
      return;
    }

    setConverting(true);
    try {
      const res = await portalApi.convertTreasury({
        fromCurrency,
        toCurrency,
        amount: parsedAmount,
      });
      toast.success(`Converted ${parsedAmount} ${fromCurrency} to ${Number(res.toAmount || estimatedOutput).toFixed(2)} ${toCurrency}.`);
      await refreshAll();
    } catch (err: any) {
      toast.error(err?.message || 'Unable to execute FX conversion.');
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="portal-card p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-[#8EA7C7]">Available EUR wallet balance</div>
          <div className="mt-1.5 text-3xl font-bold text-white portal-tabular">
            {formatEuro(balance)}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => navigatePortal('deposit')} className="portal-btn-primary">
            <ArrowDownLeft className="w-4 h-4" />
            <span>Deposit</span>
          </button>
          <button type="button" onClick={() => navigatePortal('withdraw')} className="portal-btn-secondary">
            <ArrowUpRight className="w-4 h-4" />
            <span>Withdraw</span>
          </button>
        </div>
      </div>

      {/* Sub-currency balances */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {Object.entries(subBalances).map(([code, val]) => (
          <StatTile
            key={code}
            label={`${code} Treasury`}
            value={new Intl.NumberFormat('en-IE', {
              style: 'currency',
              currency: code.length === 3 ? code : 'EUR',
            }).format(Number(val || 0))}
          />
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Live FX Desk */}
        <form onSubmit={handleConvert} className="lg:col-span-5 portal-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-white">Treasury FX conversion</h3>
            <span className="text-xs text-[#8EA7C7] portal-tabular">Fee {feePercent}%</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="fx-from" className="block text-xs font-medium text-[#8EA7C7] mb-1.5">
                From
              </label>
              <select
                id="fx-from"
                value={fromCurrency}
                onChange={(e) => setFromCurrency(e.target.value)}
                className="portal-input"
              >
                {currencies.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="fx-to" className="block text-xs font-medium text-[#8EA7C7] mb-1.5">
                To
              </label>
              <select
                id="fx-to"
                value={toCurrency}
                onChange={(e) => setToCurrency(e.target.value)}
                className="portal-input"
              >
                {currencies.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="fx-amount" className="block text-xs font-medium text-[#8EA7C7] mb-1.5">
              Amount ({fromCurrency})
            </label>
            <input
              id="fx-amount"
              type="number"
              min="1"
              step="0.01"
              value={convertAmount}
              onChange={(e) => setConvertAmount(e.target.value)}
              className="portal-input portal-tabular"
            />
          </div>

          <div className="portal-surface-elevated p-3.5 flex items-center justify-between text-xs">
            <span className="text-[#8EA7C7]">Estimated receive</span>
            <span className="text-sm font-bold text-[#C5A880] portal-tabular">
              {estimatedOutput.toFixed(2)} {toCurrency}
            </span>
          </div>

          <button type="submit" disabled={converting} className="portal-btn-primary w-full">
            <RefreshCw className={`w-4 h-4 ${converting ? 'animate-spin' : ''}`} />
            <span>{converting ? 'Converting...' : 'Execute conversion'}</span>
          </button>
        </form>

        {/* Cashflow History */}
        <div className="lg:col-span-7 space-y-3">
          <h3 className="text-base font-semibold text-white">Wallet cashflows</h3>
          {cashTxs.length === 0 ? (
            <EmptyState
              title="No wallet transfers yet"
              description="Submitted deposits, treasury conversions, and withdrawals appear here."
              actionLabel="Start a deposit"
              onAction={() => navigatePortal('deposit')}
            />
          ) : (
            <div className="portal-card divide-y divide-[#1D3860]">
              {cashTxs.slice(0, 8).map((tx) => (
                <TransactionRow key={tx.id} transaction={tx} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
