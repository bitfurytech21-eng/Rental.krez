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
    sampleDataEnabled,
    ledgerFilter,
    setLedgerFilter,
    navigatePortal,
    refreshAll,
  } = usePortal();

  const [query, setQuery] = useState('');
  const filterOptions = ['All', 'Deposits', 'Withdrawals', 'Investments'];
  const activeFilter = filterOptions.includes(ledgerFilter) ? ledgerFilter : 'All';

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions.filter((t) => {
      const type = t.type.toLowerCase();
      if (activeFilter === 'Deposits' && type !== 'deposit') return false;
      if (activeFilter === 'Withdrawals' && type !== 'withdrawal') return false;
      if (activeFilter === 'Investments' && type !== 'investment' && type !== 'purchase') return false;
      if (q) {
        const hay = `${t.reference} ${t.type} ${t.propertyTitle || ''} ${t.description || ''} ${t.paymentMethod || ''} ${t.status}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [transactions, activeFilter, query]);

  if (loading && !sampleDataEnabled && transactions.length === 0) {
    return <LoadingSkeleton rows={5} />;
  }

  return (
    <div className="space-y-6">
      {error && <ErrorBanner message={error} onRetry={refreshAll} />}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-heading font-bold text-[#F2F5F4]">Ledger</h2>
          <p className="text-sm text-[#8FA1A8] mt-0.5">
            Deposits, withdrawals, investments, and settlement statuses.
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-[#8FA1A8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by description or reference..."
            aria-label="Search ledger transactions"
            className="portal-input !pl-10"
          />
        </div>
      </div>

      <FilterChips
        options={filterOptions}
        value={activeFilter}
        onChange={setLedgerFilter}
        ariaLabel="Filter ledger by transaction type"
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={<History className="w-5 h-5" />}
          title="No transactions yet"
          description="Your deposits, withdrawals, and property investments will appear here."
          actionLabel={activeFilter !== 'All' || query ? 'Show all entries' : 'Make a deposit'}
          onAction={() => {
            if (activeFilter !== 'All' || query) {
              setLedgerFilter('All');
              setQuery('');
            } else {
              navigatePortal('deposit');
            }
          }}
        />
      ) : (
        <div className="portal-card-list divide-y divide-[#1F2C33]">
          {filtered.map((tx) => (
            <TransactionRow key={tx.id} transaction={tx} />
          ))}
        </div>
      )}
    </div>
  );
};
