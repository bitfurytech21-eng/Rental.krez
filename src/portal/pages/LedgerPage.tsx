import React, { useMemo, useState } from 'react';
import { History, Search } from 'lucide-react';
import { usePortal } from '../state/PortalContext';
import { FilterChips } from '../components/FilterChips';
import { TransactionRow } from '../components/TransactionRow';
import { EmptyState } from '../components/EmptyState';
import { LoadingSkeleton, ErrorBanner } from '../components/LoadingSkeleton';

export const LedgerPage: React.FC = () => {
  const {
    loading,
    error,
    transactions,
    ledgerFilter,
    setLedgerFilter,
    navigatePortal,
    refreshAll,
  } = usePortal();

  const [query, setQuery] = useState('');
  const filterOptions = ['All', 'Deposits', 'Withdrawals', 'Investments', 'Distributions'];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions.filter((t) => {
      const type = t.type.toLowerCase();
      if (ledgerFilter === 'Deposits' && type !== 'deposit') return false;
      if (ledgerFilter === 'Withdrawals' && type !== 'withdrawal') return false;
      if (ledgerFilter === 'Investments' && type !== 'investment' && type !== 'purchase') return false;
      if (
        ledgerFilter === 'Distributions' &&
        type !== 'dividend' &&
        type !== 'distribution' &&
        type !== 'payout'
      ) {
        return false;
      }
      if (q) {
        const hay = `${t.reference} ${t.type} ${t.propertyTitle || ''} ${t.paymentMethod || ''} ${t.status}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [transactions, ledgerFilter, query]);

  if (loading && transactions.length === 0) {
    return <LoadingSkeleton rows={5} />;
  }

  return (
    <div className="space-y-6">
      {error && <ErrorBanner message={error} onRetry={refreshAll} />}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-heading font-bold text-white">Transaction ledger</h2>
          <p className="text-sm text-[#8EA7C7] mt-0.5">
            Complete audit trail of wallet cashflows, subscriptions, and payouts.
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-[#8EA7C7] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by reference or asset..."
            aria-label="Search transactions"
            className="portal-input !pl-10"
          />
        </div>
      </div>

      <FilterChips
        options={filterOptions}
        value={ledgerFilter}
        onChange={setLedgerFilter}
        ariaLabel="Filter ledger by transaction type"
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={<History className="w-5 h-5" />}
          title="No transactions match this view"
          description="Deposits, share subscriptions, distributions, and withdrawals recorded on your account appear here."
          actionLabel={ledgerFilter !== 'All' || query ? 'Show all entries' : 'Make a deposit'}
          onAction={() => {
            if (ledgerFilter !== 'All' || query) {
              setLedgerFilter('All');
              setQuery('');
            } else {
              navigatePortal('deposit');
            }
          }}
        />
      ) : (
        <div className="portal-card divide-y divide-[#1D3860]">
          {filtered.map((tx) => (
            <TransactionRow key={tx.id} transaction={tx} />
          ))}
        </div>
      )}
    </div>
  );
};
