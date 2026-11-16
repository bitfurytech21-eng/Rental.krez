import React, { useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  ShieldAlert,
  X,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { usePortal } from '../state/PortalContext';
import { formatEuro, formatNumber, formatTime } from '../utils/format';
import { PropertyCard } from '../components/PropertyCard';
import { EmptyState } from '../components/EmptyState';
import { LoadingSkeleton, ErrorBanner } from '../components/LoadingSkeleton';

const DISMISS_STORAGE_KEY = 'portal_action_banner_dismissed';

export const OverviewPage: React.FC = () => {
  const toast = useToast();
  const {
    loading,
    error,
    lastSyncedAt,
    portalConfig,
    summary,
    portfolio,
    balance,
    properties,
    transactions,
    unreadCount,
    profile,
    sampleDataEnabled,
    navigatePortal,
    refreshAll,
  } = usePortal();

  const [dismissedTaskKey, setDismissedTaskKey] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      return window.sessionStorage.getItem(DISMISS_STORAGE_KEY);
    } catch {
      return null;
    }
  });

  const nextTask = useMemo(() => {
    if (profile && profile.kycStatus !== 'verified') {
      return {
        key: 'verify-identity',
        title:
          profile.kycStatus === 'rejected'
            ? 'Identity verification needs attention'
            : 'Verify your identity to unlock funding & payouts',
        description:
          'Complete identity verification, proof of address, and the investor questionnaire in the Compliance Vault.',
        cta: 'Complete verification',
        route: 'compliance' as const,
      };
    }
    if (profile && !profile.bankIban?.trim()) {
      return {
        key: 'link-bank',
        title: 'Link your SEPA bank account',
        description:
          'Register your personal IBAN in Profile & Banking so withdrawals settle directly to your account.',
        cta: 'Add bank IBAN',
        route: 'profile' as const,
      };
    }
    if (balance <= 0 && (portfolio?.holdings?.length || 0) === 0) {
      return {
        key: 'first-deposit',
        title: 'Fund your EUR wallet',
        description: `Initiate a SEPA bank transfer or card deposit from ${formatEuro(
          portalConfig.limits.minDepositEur
        )} to subscribe to tokenized property SPVs.`,
        cta: 'Start a deposit',
        route: 'deposit' as const,
      };
    }
    return null;
  }, [profile, balance, portfolio?.holdings?.length, portalConfig.limits.minDepositEur]);

  if (loading && !sampleDataEnabled) {
    return <LoadingSkeleton rows={4} />;
  }

  const firstName =
    profile?.fullName?.trim().split(/\s+/)[0] ||
    profile?.email?.split('@')[0] ||
    'Investor';

  const totalPortfolioValue =
    summary?.totalPortfolioValue ?? balance + (portfolio?.totalPortfolioValue || 0);
  const holdings = portfolio?.holdings || [];
  const investedCapital = summary?.investedCapital ?? portfolio?.totalHoldingsValue ?? 0;
  const projectedMonthly = summary?.projectedMonthlyIncome ?? 0;
  const monthlyChangePct =
    investedCapital > 0
      ? (projectedMonthly / investedCapital) * 100
      : totalPortfolioValue > 0 && projectedMonthly > 0
      ? (projectedMonthly / totalPortfolioValue) * 100
      : 0;

  const openProperties = properties
    .filter((p) => p.status === 'funding' || p.status === 'active')
    .slice(0, 2);

  const handleDismissBanner = (key: string) => {
    setDismissedTaskKey(key);
    try {
      window.sessionStorage.setItem(DISMISS_STORAGE_KEY, key);
    } catch {
      // Ignore storage failures in restricted contexts
    }
  };

  const handleManualSync = async () => {
    await refreshAll();
    toast.success('Portfolio synchronized.');
  };

  return (
    <div className="space-y-6">
      {error && !sampleDataEnabled && <ErrorBanner message={error} onRetry={refreshAll} />}

      {/* Greeting + Sync status */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-heading font-bold text-[#F2F5F4] tracking-tight">
            Good morning, {firstName}
          </h2>
          <div className="mt-1 flex items-center gap-2 text-xs text-[#8FA1A8] portal-tabular">
            <span className="inline-flex items-center gap-1 font-medium text-[#6FD8B0]">
              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Synced</span>
            </span>
            <span aria-hidden="true">·</span>
            <span>Updated {formatTime(lastSyncedAt)}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleManualSync()}
          aria-label="Refresh portfolio"
          className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-[14px] border border-[#1F2C33] bg-[#121A1F] text-[#8FA1A8] hover:text-[#F2F5F4] hover:border-[#6FD8B0] flex items-center justify-center transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Balance Hero Card */}
      <section className="portal-card flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-[#8FA1A8]">
            TOTAL PORTFOLIO VALUE
          </div>
          <div className="mt-2 text-3xl sm:text-4xl font-bold text-[#F2F5F4] portal-tabular tracking-tight">
            {formatEuro(totalPortfolioValue)}
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs portal-tabular">
            <span
              className={`font-semibold ${
                projectedMonthly > 0 ? 'text-[#6FD8B0]' : 'text-[#8FA1A8]'
              }`}
            >
              {projectedMonthly > 0
                ? `+${formatEuro(projectedMonthly)} (+${formatNumber(monthlyChangePct, 2)}%) est. monthly`
                : '+0.00% est. monthly'}
            </span>
            <span className="text-[#8FA1A8]" aria-hidden="true">
              ·
            </span>
            <span className="text-[#8FA1A8]">
              Available cash <span className="text-[#F2F5F4] font-semibold">{formatEuro(balance)}</span>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => navigatePortal('deposit')}
            className="portal-btn-primary flex-1 sm:flex-initial"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Deposit</span>
          </button>
          <button
            type="button"
            onClick={() => navigatePortal('withdraw')}
            className="portal-btn-secondary flex-1 sm:flex-initial"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Withdraw</span>
          </button>
        </div>
      </section>

      {/* Row of 3 Stat Tiles linking to their pages */}
      <section aria-label="Quick navigation metrics" className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <button
          type="button"
          onClick={() => navigatePortal('portfolio')}
          className="portal-card text-left hover:border-[#6FD8B0]/65 transition-colors flex flex-col justify-between gap-1.5 min-h-[88px]"
        >
          <div className="text-xs font-medium text-[#8FA1A8]">Holdings</div>
          <div className="text-xl sm:text-2xl font-bold text-[#F2F5F4] portal-tabular">
            {holdings.length}
          </div>
          <div className="text-xs text-[#6FD8B0] portal-tabular truncate">
            {formatEuro(investedCapital)}
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigatePortal('ledger')}
          className="portal-card text-left hover:border-[#6FD8B0]/65 transition-colors flex flex-col justify-between gap-1.5 min-h-[88px]"
        >
          <div className="text-xs font-medium text-[#8FA1A8]">Transactions</div>
          <div className="text-xl sm:text-2xl font-bold text-[#F2F5F4] portal-tabular">
            {transactions.length}
          </div>
          <div className="text-xs text-[#8FA1A8] truncate">View ledger</div>
        </button>

        <button
          type="button"
          onClick={() => navigatePortal('notifications')}
          className="portal-card text-left hover:border-[#6FD8B0]/65 transition-colors flex flex-col justify-between gap-1.5 min-h-[88px]"
        >
          <div className="text-xs font-medium text-[#8FA1A8]">Alerts</div>
          <div
            className={`text-xl sm:text-2xl font-bold portal-tabular ${
              unreadCount > 0 ? 'text-[#6FD8B0]' : 'text-[#F2F5F4]'
            }`}
          >
            {unreadCount}
          </div>
          <div className="text-xs text-[#8FA1A8] truncate">
            {unreadCount > 0 ? 'Unread' : 'All caught up'}
          </div>
        </button>
      </section>

      {/* One Dismissible Action Banner */}
      {nextTask && dismissedTaskKey !== nextTask.key && (
        <section
          aria-label="Recommended next action"
          className="portal-card border-[#FCD34D]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-[14px] bg-[#FCD34D]/12 border border-[#FCD34D]/35 text-[#FCD34D] flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-[#F2F5F4]">{nextTask.title}</div>
              <p className="text-xs text-[#8FA1A8] mt-1 leading-relaxed">
                {nextTask.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => navigatePortal(nextTask.route)}
              className="portal-btn-primary"
            >
              <span>{nextTask.cta}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleDismissBanner(nextTask.key)}
              aria-label="Dismiss reminder"
              className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-[14px] border border-[#1F2C33] text-[#8FA1A8] hover:text-[#F2F5F4] hover:border-[#6FD8B0] flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </section>
      )}

      {/* New Investor Empty State OR Current Holdings Snapshot */}
      {holdings.length === 0 ? (
        <EmptyState
          icon={<Building2 className="w-5 h-5" />}
          title="Make your first investment"
          description="Explore curated European residential and commercial SPVs to build your fractional real estate portfolio."
          actionLabel="Explore"
          onAction={() => navigatePortal('explore')}
        />
      ) : (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-[#F2F5F4]">Your holdings</h3>
            <button
              type="button"
              onClick={() => navigatePortal('portfolio')}
              className="text-xs font-semibold text-[#6FD8B0] hover:text-[#83DFBC] flex items-center gap-1 min-h-[44px] px-2 rounded-[14px]"
            >
              <span>Manage portfolio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="portal-card-list divide-y divide-[#1F2C33]">
            {holdings.slice(0, 3).map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => navigatePortal('property-detail', { propertySlug: h.propertyId })}
                className="w-full min-h-[64px] p-4 flex items-center justify-between gap-4 text-left hover:bg-[#172228]/70 transition-colors"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[#F2F5F4] truncate">
                    {h.propertyTitle}
                  </div>
                  <div className="mt-0.5 text-xs text-[#8FA1A8] portal-tabular">
                    {h.tokensPurchased} shares · Earned {formatEuro(h.dividendsReceived)}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-[#F2F5F4] portal-tabular">
                    {formatEuro(h.currentValue)}
                  </div>
                  <div className="mt-0.5 text-xs text-[#6FD8B0] portal-tabular">
                    {formatEuro(h.projectedAnnualDividend)} / yr
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Open for investment preview of 2 properties */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-[#F2F5F4]">Open for investment</h3>
          <button
            type="button"
            onClick={() => navigatePortal('explore')}
            className="text-xs font-semibold text-[#6FD8B0] hover:text-[#83DFBC] flex items-center gap-1 min-h-[44px] px-2 rounded-[14px]"
          >
            <span>Explore all</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {openProperties.length === 0 ? (
          <EmptyState
            icon={<Building2 className="w-5 h-5" />}
            title="No offerings currently open"
            description="Browse all property SPVs to inspect funded estates and upcoming opportunities."
            actionLabel="Explore properties"
            onAction={() => navigatePortal('explore')}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {openProperties.map((prop) => (
              <PropertyCard
                key={prop.id}
                property={prop}
                onSelect={(selected) =>
                  navigatePortal('property-detail', { propertySlug: selected.slug || selected.id })
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
