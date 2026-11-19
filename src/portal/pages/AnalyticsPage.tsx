import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { safeErrorMessage } from '../../lib/safeErrorMessage';
import { BarChart3, PieChart, RefreshCw } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { usePortal } from '../state/PortalContext';
import { portalApi } from '../services/portalApi';
import { PortalPerformanceData } from '../types';
import { formatEuro, formatNumber } from '../utils/format';
import { StatTile } from '../components/StatTile';
import { EmptyState } from '../components/EmptyState';
import { ErrorBanner, LoadingSkeleton } from '../components/LoadingSkeleton';

const DONUT_PALETTE = ['#6FD8B0', '#FCD34D', '#60A5FA', '#A78BFA', '#FB7185', '#8FA1A8'];

export const AnalyticsPage: React.FC = () => {
  const toast = useToast();
  const { portfolio, summary, balance, transactions, sampleDataEnabled, sampleDataset, lastSyncedAt, navigatePortal } = usePortal();
  const [performance, setPerformance] = useState<PortalPerformanceData | null>(null);
  const [distributions, setDistributions] = useState<{
    totalPaymentsReceivedEUR?: number;
    totalPendingPaymentsEUR?: number;
    totalDailyEntitlementEUR?: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPointIdx, setSelectedPointIdx] = useState<number | null>(null);

  const loadAnalytics = useCallback(
    async (notify = false, silent = false) => {
      if (sampleDataEnabled) {
        setLoading(false);
        setError(null);
        if (notify) {
          toast.success('Sample analytics refreshed.');
        }
        return;
      }
      if (!silent) setLoading(true);
      setError(null);
      try {
        const [perfRes, distRes] = await Promise.all([
          portalApi.getPerformance(),
          portalApi.getDistributionsSummary(),
        ]);
        setPerformance(perfRes);
        setDistributions(distRes);
        if (notify) {
          toast.success('Analytics refreshed.');
        }
      } catch (err: any) {
        if (!silent) {
          setError(safeErrorMessage(err, 'Unable to load portfolio analytics.'));
        }
      } finally {
        setLoading(false);
      }
    },
    [sampleDataEnabled, toast]
  );

  useEffect(() => {
    void loadAnalytics(false, Boolean(performance || distributions));
  }, [loadAnalytics, lastSyncedAt]);

  const effectivePerformance =
    sampleDataEnabled && sampleDataset ? sampleDataset.performance : performance;
  const effectiveDistributions =
    sampleDataEnabled && sampleDataset
      ? {
          totalPaymentsReceivedEUR: sampleDataset.summary.totalEarnedDividends,
          totalDailyEntitlementEUR: Number((sampleDataset.summary.projectedMonthlyIncome / 30).toFixed(2)),
        }
      : distributions;

  const holdings = portfolio?.holdings || [];
  const totalHoldingsValue = holdings.reduce(
    (acc, h) => acc + (h.currentValueCents != null ? h.currentValueCents / 100 : Number(h.currentValue || 0)),
    0
  );
  const cashBalance = Math.max(0, Number(balance || 0));
  const totalAllocationValue = totalHoldingsValue + cashBalance;

  const allocationSegments = useMemo(() => {
    if (totalAllocationValue <= 0) return [];
    const radius = 72;
    const circumference = 2 * Math.PI * radius;
    let cumulativeOffset = 0;

    const items: Array<{ id: string; propertyId: string | null; title: string; value: number; color?: string }> =
      holdings.map((h, idx) => ({
        id: h.id,
        propertyId: h.propertyId,
        title: h.propertyTitle,
        value: h.currentValueCents != null ? h.currentValueCents / 100 : Number(h.currentValue || 0),
        color: DONUT_PALETTE[idx % DONUT_PALETTE.length],
      }));

    if (cashBalance > 0) {
      items.push({
        id: 'wallet-cash',
        propertyId: null,
        title: 'Cash Balance (EUR)',
        value: cashBalance,
        color: '#38BDF8',
      });
    }

    return items
      .filter((item) => item.value > 0)
      .map((item, idx) => {
        const ratio = item.value / totalAllocationValue;
        const dashLength = ratio * circumference;
        const offset = -cumulativeOffset;
        cumulativeOffset += dashLength;
        return {
          ...item,
          pct: ratio * 100,
          color: item.color || DONUT_PALETTE[idx % DONUT_PALETTE.length],
          dashArray: `${dashLength} ${circumference}`,
          dashOffset: offset,
        };
      });
  }, [holdings, cashBalance, totalAllocationValue]);

  const history = useMemo(() => {
    const serverHistory = effectivePerformance?.historicalPerformance || [];
    if (serverHistory.length > 0) return serverHistory;

    const completed = transactions
      .filter((t) => String(t.status || '').toLowerCase() === 'completed')
      .sort((a, b) => (Date.parse(a.createdAt || '') || 0) - (Date.parse(b.createdAt || '') || 0));
    if (completed.length === 0) return [];

    let runningCash = 0;
    let runningInvested = 0;
    const byMonth = new Map<string, { month: string; yield: number; totalValue: number }>();

    for (const tx of completed) {
      const type = String(tx.type || '').toLowerCase();
      const amount = Number(tx.amount || 0);
      if (type === 'deposit') runningCash += amount;
      else if (type === 'withdrawal') runningCash = Math.max(0, runningCash - amount);
      else if (type === 'investment' || type === 'purchase') {
        runningCash = Math.max(0, runningCash - amount);
        runningInvested += amount;
      } else if (type === 'dividend' || type === 'distribution' || type === 'payout') {
        runningCash += amount;
      }
      const dt = new Date(tx.createdAt || Date.now());
      const monthLabel = dt.toLocaleDateString('en-US', { month: 'short' });
      const prev = byMonth.get(monthLabel);
      const yieldAdd =
        type === 'dividend' || type === 'distribution' || type === 'payout' ? amount : 0;
      byMonth.set(monthLabel, {
        month: monthLabel,
        yield: Number(((prev?.yield || 0) + yieldAdd).toFixed(2)),
        totalValue: Number((runningCash + runningInvested).toFixed(2)),
      });
    }

    return Array.from(byMonth.values());
  }, [effectivePerformance?.historicalPerformance, transactions]);

  const lineGeometry = useMemo(() => {
    if (history.length === 0) return null;
    const width = 600;
    const height = 220;
    const padLeft = 16;
    const padRight = 16;
    const padTop = 20;
    const padBottom = 32;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    const values = history.map((h) => Number(h.totalValue || 0));
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const span = maxVal - minVal || Math.max(maxVal * 0.2, 100);
    const low = Math.max(0, minVal - span * 0.15);
    const high = maxVal + span * 0.15;

    const points = history.map((item, idx) => {
      const x =
        history.length === 1
          ? padLeft + plotW / 2
          : padLeft + (idx / (history.length - 1)) * plotW;
      const yRatio = high > low ? (Number(item.totalValue || 0) - low) / (high - low) : 0.5;
      const y = padTop + (1 - yRatio) * plotH;
      return {
        x,
        y,
        month: item.month,
        totalValue: Number(item.totalValue || 0),
        yieldValue: Number(item.yield || 0),
      };
    });

    const linePath = points
      .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
      .join(' ');
    const baselineY = padTop + plotH;
    const areaPath =
      points.length > 1
        ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${baselineY} L ${points[0].x.toFixed(1)} ${baselineY} Z`
        : '';

    return { width, height, padTop, baselineY, points, linePath, areaPath };
  }, [history]);

  if (loading && !sampleDataEnabled && !effectivePerformance && !effectiveDistributions) {
    return <LoadingSkeleton rows={4} />;
  }

  const totalPortfolioValue = summary?.totalPortfolioValue ?? portfolio?.totalPortfolioValue ?? 0;
  const annualizedReturn = effectivePerformance?.annualizedReturnPercent ?? 0;
  const totalDistributionsReceived =
    effectiveDistributions?.totalPaymentsReceivedEUR ??
    summary?.totalEarnedDividends ??
    portfolio?.totalDividendsReceived ??
    0;
  const dailyEntitlement = effectiveDistributions?.totalDailyEntitlementEUR ?? 0;

  const activePoint =
    lineGeometry && lineGeometry.points.length > 0
      ? lineGeometry.points[
          selectedPointIdx !== null && selectedPointIdx < lineGeometry.points.length
            ? selectedPointIdx
            : lineGeometry.points.length - 1
        ]
      : null;

  return (
    <div className="space-y-6">
      {error && !sampleDataEnabled && (
        <ErrorBanner message={error} onRetry={() => void loadAnalytics(false)} />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-heading font-bold text-[#F2F5F4]">Analytics</h2>
          <p className="text-sm text-[#8FA1A8] mt-0.5">
            Portfolio allocation breakdown and value over time.
          </p>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={() => void loadAnalytics(true)}
          className="portal-btn-secondary"
        >
          <RefreshCw className="w-4 h-4" />
          <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {loading && !sampleDataEnabled && !effectivePerformance ? (
        <LoadingSkeleton rows={4} />
      ) : (
        <>
          {/* KPI Summary */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatTile
              label="Portfolio value"
              value={formatEuro(totalPortfolioValue)}
              sublabel={`${portfolio?.activePropertiesCount ?? holdings.length} active positions`}
            />
            <StatTile
              label="Annualized return"
              value={`${formatNumber(annualizedReturn, 2)}%`}
              sublabel="Weighted SPV yield"
              tone="accent"
            />
            <StatTile
              label="Distributions paid"
              value={formatEuro(totalDistributionsReceived)}
              sublabel="Settled to wallet"
              tone="positive"
            />
            <StatTile
              label="Daily accrual"
              value={formatEuro(dailyEntitlement)}
              sublabel="Estimated daily rent"
            />
          </section>

          {/* Main Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Allocation Donut Chart */}
            <section className="lg:col-span-5 portal-card space-y-5">
              <div>
                <h3 className="text-base font-semibold text-[#F2F5F4]">Allocation breakdown</h3>
                <p className="text-xs text-[#8FA1A8]">Property holdings plus available cash</p>
              </div>

              {allocationSegments.length === 0 ? (
                <EmptyState
                  icon={<PieChart className="w-5 h-5" />}
                  title="No allocation data"
                  description="Deposit cash or subscribe to properties to visualize your portfolio allocation."
                  actionLabel="Explore properties"
                  onAction={() => navigatePortal('explore')}
                />
              ) : (
                <div className="space-y-5">
                  <div className="flex justify-center">
                    <div className="relative w-48 h-48 flex items-center justify-center">
                      <svg
                        viewBox="0 0 200 200"
                        className="w-full h-full -rotate-90"
                        role="img"
                        aria-label="Portfolio allocation donut chart"
                      >
                        <circle
                          cx="100"
                          cy="100"
                          r="72"
                          fill="none"
                          stroke="#1F2C33"
                          strokeWidth="22"
                        />
                        {allocationSegments.map((seg) => (
                          <circle
                            key={seg.id}
                            cx="100"
                            cy="100"
                            r="72"
                            fill="none"
                            stroke={seg.color}
                            strokeWidth="22"
                            strokeDasharray={seg.dashArray}
                            strokeDashoffset={seg.dashOffset}
                          />
                        ))}
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                        <span className="text-xs text-[#8FA1A8]">Total</span>
                        <span className="text-base font-bold text-[#F2F5F4] portal-tabular mt-0.5">
                          {formatEuro(totalAllocationValue)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="divide-y divide-[#1F2C33]">
                    {allocationSegments.map((seg) => (
                      <button
                        key={seg.id}
                        type="button"
                        onClick={() =>
                          seg.propertyId
                            ? navigatePortal('property-detail', { propertySlug: seg.propertyId })
                            : navigatePortal('wallet')
                        }
                        className="w-full min-h-[48px] py-2.5 flex items-center justify-between gap-3 text-left hover:text-[#6FD8B0] transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: seg.color }}
                            aria-hidden="true"
                          />
                          <span className="text-xs font-medium text-[#F2F5F4] truncate">
                            {seg.title}
                          </span>
                        </div>
                        <div className="text-right shrink-0 portal-tabular">
                          <div className="text-xs font-bold text-[#F2F5F4]">
                            {formatEuro(seg.value)}
                          </div>
                          <div className="text-xs text-[#8FA1A8]">{formatNumber(seg.pct, 1)}%</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Value-over-Time Line Chart */}
            <section className="lg:col-span-7 portal-card space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-[#F2F5F4]">Value over time</h3>
                  <p className="text-xs text-[#8FA1A8]">Valuation &amp; monthly rent progression</p>
                </div>
                {activePoint && (
                  <div className="text-right portal-tabular">
                    <div className="text-xs text-[#8FA1A8]">{activePoint.month}</div>
                    <div className="text-sm font-bold text-[#F2F5F4]">
                      {formatEuro(activePoint.totalValue)}
                    </div>
                    <div className="text-xs text-[#6FD8B0]">
                      +{formatEuro(activePoint.yieldValue)} yield
                    </div>
                  </div>
                )}
              </div>

              {!lineGeometry ? (
                <EmptyState
                  icon={<BarChart3 className="w-5 h-5" />}
                  title="No value history yet"
                  description="Your valuation curve updates as your property positions complete distribution cycles."
                  actionLabel="Explore properties"
                  onAction={() => navigatePortal('explore')}
                />
              ) : (
                <div className="space-y-3">
                  <div className="w-full overflow-hidden">
                    <svg
                      viewBox={`0 0 ${lineGeometry.width} ${lineGeometry.height}`}
                      className="w-full h-56"
                      role="img"
                      aria-label="Portfolio value over time line chart"
                    >
                      <defs>
                        <linearGradient id="portalAreaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6FD8B0" stopOpacity="0.28" />
                          <stop offset="100%" stopColor="#6FD8B0" stopOpacity="0" />
                        </linearGradient>
                      </defs>

                      {[0, 0.33, 0.66, 1].map((stepRatio) => {
                        const gy =
                          lineGeometry.padTop +
                          stepRatio * (lineGeometry.baselineY - lineGeometry.padTop);
                        return (
                          <line
                            key={stepRatio}
                            x1="16"
                            y1={gy}
                            x2={lineGeometry.width - 16}
                            y2={gy}
                            stroke="#1F2C33"
                            strokeDasharray="4 4"
                          />
                        );
                      })}

                      {lineGeometry.areaPath && (
                        <path d={lineGeometry.areaPath} fill="url(#portalAreaGrad)" />
                      )}

                      {lineGeometry.points.length > 1 && (
                        <path
                          d={lineGeometry.linePath}
                          fill="none"
                          stroke="#6FD8B0"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}

                      {lineGeometry.points.map((pt, idx) => {
                        const isActive =
                          activePoint?.month === pt.month &&
                          activePoint?.totalValue === pt.totalValue;
                        return (
                          <g key={`${pt.month}-${idx}`}>
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r={isActive ? 6 : 4}
                              fill={isActive ? '#6FD8B0' : '#121A1F'}
                              stroke="#6FD8B0"
                              strokeWidth="2.5"
                              className="cursor-pointer"
                              onClick={() => setSelectedPointIdx(idx)}
                            />
                            <text
                              x={pt.x}
                              y={lineGeometry.height - 8}
                              textAnchor="middle"
                              fill="#8FA1A8"
                              fontSize="11"
                            >
                              {pt.month}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {lineGeometry.points.map((pt, idx) => {
                      const isActive =
                        activePoint?.month === pt.month &&
                        activePoint?.totalValue === pt.totalValue;
                      return (
                        <button
                          key={`${pt.month}-${idx}`}
                          type="button"
                          onClick={() => setSelectedPointIdx(idx)}
                          className={`min-h-[44px] px-3 rounded-[14px] border text-xs font-medium portal-tabular transition-colors ${
                            isActive
                              ? 'bg-[#172228] border-[#6FD8B0] text-[#6FD8B0]'
                              : 'bg-[#0B0F10] border-[#1F2C33] text-[#8FA1A8] hover:text-[#F2F5F4]'
                          }`}
                        >
                          {pt.month} · {formatEuro(pt.totalValue)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
};
