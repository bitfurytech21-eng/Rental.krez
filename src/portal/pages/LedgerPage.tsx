import React, { useMemo, useState } from 'react';
import { History, Search } from 'lucide-react';
import { usePortal } from '../state/PortalContext';
import { FilterChips } from '../components/FilterChips';
import { TransactionRow } from '../components/TransactionRow';
import { EmptyState } from '../components/EmptyState';
import { LoadingSkeleton } from '../components/LoadingSkeleton';

export const LedgerPage: React.FC = () => {
  const {
    loading,
    transactions,
    sampleDataEnabled,
    ledgerFilter,
    setLedgerFilter,
    navigatePortal,
  } = usePortal();

  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(20);
  const filterOptions = ['All', 'Deposits', 'Withdrawals', 'Investments', 'Distributions'];
  const activeFilter = filterOptions.includes(ledgerFilter) ? ledgerFilter : 'All';

  const handleFilterChange = (nextFilter: string) => {
    setLedgerFilter(nextFilter);
    setVisibleCount(20);
  };

  const handleQueryChange = (nextQuery: string) => {
    setQuery(nextQuery);
    setVisibleCount(20);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions
      .filter((t) => {
        const type = t.type.toLowerCase();
        if (activeFilter === 'Deposits' && type !== 'deposit') return false;
        if (activeFilter === 'Withdrawals' && type !== 'withdrawal') return false;
        if (activeFilter === 'Investments' && type !== 'investment' && type !== 'purchase') return false;
        if (
          activeFilter === 'Distributions' &&
          type !== 'dividend' &&
          type !== 'distribution' &&
          type !== 'payout'
        ) {
          return false;
        }
        if (q) {
          const hay = `${t.reference} ${t.type} ${t.propertyTitle || ''} ${t.description || ''} ${t.note || ''} ${t.paymentMethod || ''} ${t.status}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const timeA = Date.parse(a.createdAt || '') || 0;
        const timeB = Date.parse(b.createdAt || '') || 0;
        return timeB - timeA;
      });
  }, [transactions, activeFilter, query]);

  const visibleRows = filtered.slice(0, visibleCount);
  const remainingCount = Math.max(0, filtered.length - visibleRows.length);

  if (loading && !sampleDataEnabled && transactions.length === 0) {
    return <LoadingSkeleton rows={5} />;
  }

  return (
    <div className="space-y-6">

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-heading font-bold text-[#F2F5F4]">Ledger</h2>
          <p className="text-sm text-[#8FA1A8] mt-0.5">
            Deposits, withdrawals, investments, distributions, and settlement statuses.
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-[#8FA1A8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Filter by description or reference..."
            aria-label="Search ledger transactions"
            className="portal-input !pl-10 min-h-[44px]"
          />
        </div>
      </div>

      <FilterChips
        options={filterOptions}
        value={activeFilter}
        onChange={handleFilterChange}
        ariaLabel="Filter ledger by transaction type"
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={<History className="w-5 h-5" />}
          title="No transactions yet"
          description="Your deposits, withdrawals, investments, and distributions will appear here."
          actionLabel={activeFilter !== 'All' || query ? 'Show all entries' : 'Make a deposit'}
          onAction={() => {
            if (activeFilter !== 'All' || query) {
              handleFilterChange('All');
              handleQueryChange('');
            } else {
              navigatePortal('deposit');
            }
          }}
        />
      ) : (
        <div className="space-y-4">
          <div className="portal-card-list divide-y divide-[#1F2C33]">
            {visibleRows.map((tx) => (
              <TransactionRow key={tx.id} transaction={tx} />
            ))}
          </div>

          {remainingCount > 0 && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + 20)}
                className="portal-btn-secondary min-h-[44px] px-6"
              >
                Load more ({Math.min(20, remainingCount)} of {remainingCount} remaining)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
