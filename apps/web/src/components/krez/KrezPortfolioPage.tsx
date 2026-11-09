import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import {
  KREZ_ILLUSTRATIVE_HOLDINGS,
  KREZ_ILLUSTRATIVE_LEDGER,
  KREZ_IMAGES,
} from '../../data/krezTemplateData';
import { useAuth } from '../../lib/auth';
import { ledger } from '../../lib/ledger';
import { Investment } from '../../types/investment';
import { Transaction } from '../../types/transaction';
import { openKrezAuthModal } from './KrezAuthModal';
import { KrezImage, KrezReveal } from './KrezReveal';

interface KrezPortfolioPageProps {
  onNavigate: (path: string) => void;
}

export const KrezPortfolioPage: React.FC<KrezPortfolioPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    if (!user?.id) {
      setInvestments([]);
      setTransactions([]);
      return;
    }

    const sync = () => {
      setInvestments(ledger.getInvestments(user.id));
      setTransactions(ledger.getTransactions(user.id));
    };

    sync();
    return ledger.subscribe(sync);
  }, [user?.id]);

  const liveMetrics = useMemo(() => {
    const totalValuation = investments.reduce(
      (sum, inv) => sum + (inv.currentValuation || inv.totalAmountInvested || 0),
      0
    );
    const totalShares = investments.reduce(
      (sum, inv) => sum + (inv.tokensPurchased || 0),
      0
    );
    const buildingsSet = new Set(investments.map((inv) => inv.propertyId));
    const payoutsReceived =
      investments.reduce((sum, inv) => sum + (inv.totalDividendsReceived || 0), 0) ||
      user?.totalEarned ||
      0;

    return {
      totalValuation,
      totalShares,
      buildingsCount: buildingsSet.size,
      payoutsReceived,
    };
  }, [investments, user?.totalEarned]);

  if (user) {
    return (
      <main className="bg-background text-foreground">
        <section className="pt-header-offset pb-section-sm md:pb-section-spacing">
          <div className="mx-auto max-w-container px-gutter md:px-gutter-md lg:px-gutter-lg">
            <KrezReveal>
              <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
                <div className="max-w-2xl">
                  <p className="text-xs font-semibold tracking-widest uppercase text-accent">
                    Portfolio · {user.fullName}
                  </p>
                  <h1 className="mt-3 text-4xl font-heading font-bold tracking-tight uppercase text-foreground md:text-5xl">
                    Your building
                    <br />
                    holdings
                  </h1>
                  <p className="mt-4 text-base leading-relaxed text-muted">
                    Live shares recorded to {user.email}, along with settled distributions and ledger entries.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onNavigate('/analytics')}
                    className="inline-flex items-center gap-2 rounded-pill bg-primary px-6 py-3.5 text-xs font-semibold tracking-widest uppercase text-white transition-transform duration-fast hover:scale-hover active:scale-active cursor-pointer"
                  >
                    <span>Open full analytics dashboard</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('/properties')}
                    className="rounded-pill border border-border bg-secondary px-5 py-3.5 text-xs font-semibold tracking-widest uppercase text-foreground transition-colors duration-fast hover:border-foreground cursor-pointer"
                  >
                    Add shares
                  </button>
                </div>
              </div>
            </KrezReveal>

            {/* 4 Live KPI Cards */}
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-card bg-secondary p-card-pad">
                <p className="text-xs font-medium tracking-wider uppercase text-muted">
                  Value of holdings
                </p>
                <p className="mt-2 text-3xl font-heading font-bold tabular-nums text-foreground">
                  €{liveMetrics.totalValuation.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="rounded-card bg-secondary p-card-pad">
                <p className="text-xs font-medium tracking-wider uppercase text-muted">
                  Shares held
                </p>
                <p className="mt-2 text-3xl font-heading font-bold tabular-nums text-foreground">
                  {liveMetrics.totalShares.toLocaleString('en-US')}
                </p>
              </div>
              <div className="rounded-card bg-secondary p-card-pad">
                <p className="text-xs font-medium tracking-wider uppercase text-muted">
                  Buildings held
                </p>
                <p className="mt-2 text-3xl font-heading font-bold tabular-nums text-foreground">
                  {liveMetrics.buildingsCount}
                </p>
              </div>
              <div className="rounded-card bg-secondary p-card-pad">
                <p className="text-xs font-medium tracking-wider uppercase text-muted">
                  Payouts received
                </p>
                <p className="mt-2 text-3xl font-heading font-bold tabular-nums text-foreground">
                  €{liveMetrics.payoutsReceived.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* Holdings List */}
            <div className="mt-12 grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:items-start">
              <div className="rounded-card border border-border bg-background p-card-pad">
                <h2 className="text-xl font-heading font-bold uppercase text-foreground">
                  Holdings
                </h2>

                {investments.length === 0 ? (
                  <div className="mt-6 space-y-4">
                    <p className="text-sm leading-relaxed text-muted">
                      You do not hold shares in any buildings yet. Browse listed properties to review running costs and subscribe to your first shares.
                    </p>
                    <button
                      type="button"
                      onClick={() => onNavigate('/properties')}
                      className="inline-flex items-center gap-2 rounded-pill bg-primary px-6 py-3 text-xs font-semibold tracking-widest uppercase text-white cursor-pointer"
                    >
                      <span>Browse properties</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="mt-6 divide-y divide-border">
                    {investments.map((inv) => {
                      const val = inv.currentValuation || inv.totalAmountInvested || 0;
                      const weight =
                        liveMetrics.totalValuation > 0
                          ? Math.round((val / liveMetrics.totalValuation) * 100)
                          : 0;
                      return (
                        <div key={inv.id} className="py-4 first:pt-0 last:pb-0">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="font-heading font-semibold text-foreground">
                                {inv.propertyTitle}
                              </p>
                              <p className="mt-0.5 text-xs text-muted tabular-nums">
                                {inv.tokensPurchased.toLocaleString('en-US')} shares · {inv.estimatedAnnualYield}% target yield
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold tabular-nums text-foreground">
                                €{val.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                              </p>
                              <p className="text-xs text-muted tabular-nums">{weight}%</p>
                            </div>
                          </div>
                          <progress
                            className="krez-progress mt-3"
                            value={weight}
                            max={100}
                            aria-label={`${inv.propertyTitle} ${weight}% of portfolio`}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="overflow-hidden rounded-card border border-border bg-secondary">
                <div className="aspect-[4/3] overflow-hidden">
                  <KrezImage
                    src={KREZ_IMAGES.portfolioOverview}
                    alt="Portfolio architectural interior"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="p-card-pad">
                  <p className="text-xs font-semibold tracking-widest uppercase text-accent">
                    Available cash balance
                  </p>
                  <p className="mt-2 text-2xl font-heading font-bold tabular-nums text-foreground">
                    €{(user.walletBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-muted">
                    Manage multi-currency deposits, SEPA wires, USDC payouts, and tax certificates inside your full investor dashboard.
                  </p>
                  <button
                    type="button"
                    onClick={() => onNavigate('/dashboard')}
                    className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase text-foreground hover:text-accent cursor-pointer"
                  >
                    <span>Manage wallet &amp; documents</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Dark Payout & Ledger History */}
        <section
          data-nav-dark="true"
          className="border-b border-white/10 bg-ink py-section-sm text-white md:py-section-spacing"
        >
          <div className="mx-auto max-w-container px-gutter md:px-gutter-md lg:px-gutter-lg">
            <p className="text-xs font-semibold tracking-widest uppercase text-accent">
              Ledger
            </p>
            <h2 className="mt-2 text-2xl font-heading font-bold uppercase text-white md:text-3xl">
              Payout &amp; settlement history
            </h2>

            {transactions.length === 0 ? (
              <p className="mt-6 text-sm text-white/65">
                No ledger entries recorded yet for this account.
              </p>
            ) : (
              <div className="mt-8 overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/15 text-xs tracking-widest uppercase text-white/50">
                      <th className="py-3 pr-4 font-semibold">Date</th>
                      <th className="py-3 pr-4 font-semibold">Description</th>
                      <th className="py-3 pr-4 font-semibold">Type</th>
                      <th className="py-3 text-right font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {transactions.slice(0, 10).map((tx) => (
                      <tr key={tx.id}>
                        <td className="py-4 pr-4 whitespace-nowrap text-white/65 tabular-nums">
                          {new Date(tx.createdAt).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </td>
                        <td className="py-4 pr-4 text-white">{tx.description}</td>
                        <td className="py-4 pr-4 capitalize text-white/70">{tx.type}</td>
                        <td className="py-4 text-right font-semibold whitespace-nowrap tabular-nums text-white">
                          {tx.type === 'withdrawal' || tx.type === 'investment' ? '−' : '+'}
                          {tx.currency === 'USD' ? '$' : '€'}
                          {tx.amount.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>
    );
  }

  // Signed-out Illustrative Portfolio View
  return (
    <main className="bg-background text-foreground">
      <section className="pt-header-offset pb-section-sm md:pb-section-spacing">
        <div className="mx-auto max-w-container px-gutter md:px-gutter-md lg:px-gutter-lg">
          <KrezReveal>
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold tracking-widest uppercase text-accent">
                  Illustrative portfolio
                </p>
                <h1 className="mt-3 text-4xl font-heading font-bold tracking-tight uppercase text-foreground md:text-5xl">
                  Every share,
                  <br />
                  every payout
                </h1>
                <p className="mt-4 text-base leading-relaxed text-muted">
                  A sample account holding 182 shares across four prime French residences, showing how valuations and monthly rent payouts appear on one screen.
                </p>
              </div>

              <button
                type="button"
                onClick={() => openKrezAuthModal('login', '/portfolio')}
                className="inline-flex items-center gap-2 self-start rounded-pill bg-primary px-6 py-3.5 text-xs font-semibold tracking-widest uppercase text-white transition-transform duration-fast hover:scale-hover active:scale-active lg:self-auto cursor-pointer"
              >
                <span>Sign in to view your account</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </KrezReveal>

          {/* 4 Illustrative KPI Cards */}
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-card bg-secondary p-card-pad">
              <p className="text-xs font-medium tracking-wider uppercase text-muted">
                Value of holdings
              </p>
              <p className="mt-2 text-3xl font-heading font-bold tabular-nums text-foreground">
                €18,240
              </p>
            </div>
            <div className="rounded-card bg-secondary p-card-pad">
              <p className="text-xs font-medium tracking-wider uppercase text-muted">
                Last monthly payout
              </p>
              <p className="mt-2 text-3xl font-heading font-bold tabular-nums text-foreground">
                €147.16
              </p>
            </div>
            <div className="rounded-card bg-secondary p-card-pad">
              <p className="text-xs font-medium tracking-wider uppercase text-muted">
                Buildings held
              </p>
              <p className="mt-2 text-3xl font-heading font-bold tabular-nums text-foreground">
                4
              </p>
            </div>
            <div className="rounded-card bg-secondary p-card-pad">
              <p className="text-xs font-medium tracking-wider uppercase text-muted">
                Blended net yield
              </p>
              <p className="mt-2 text-3xl font-heading font-bold tabular-nums text-foreground">
                9.7%
              </p>
            </div>
          </div>

          {/* Holdings + Architectural Photo */}
          <div className="mt-12 grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:items-start">
            <KrezReveal>
              <div className="rounded-card border border-border bg-background p-card-pad">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-heading font-bold uppercase text-foreground">
                    Holdings
                  </h2>
                  <span className="text-xs text-muted">Sample allocation</span>
                </div>

                <div className="mt-6 divide-y divide-border">
                  {KREZ_ILLUSTRATIVE_HOLDINGS.map((holding) => (
                    <div key={holding.id} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <button
                            type="button"
                            onClick={() => onNavigate(`/properties/${holding.id}`)}
                            className="font-heading font-semibold text-foreground transition-colors duration-fast hover:text-accent cursor-pointer"
                          >
                            {holding.name}
                          </button>
                          <p className="mt-0.5 text-xs text-muted">{holding.shares}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold tabular-nums text-foreground">
                            {holding.value}
                          </p>
                          <p className="text-xs text-muted tabular-nums">
                            {holding.share}%
                          </p>
                        </div>
                      </div>
                      <progress
                        className="krez-progress mt-3"
                        value={holding.share}
                        max={100}
                        aria-label={`${holding.name} ${holding.share}% of portfolio`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </KrezReveal>

            <KrezReveal delay={0.08}>
              <div className="overflow-hidden rounded-card border border-border bg-secondary">
                <div className="aspect-[4/3] overflow-hidden">
                  <KrezImage
                    src={KREZ_IMAGES.portfolioOverview}
                    alt="Warm residential lounge interior"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="p-card-pad">
                  <p className="text-xs font-semibold tracking-widest uppercase text-accent">
                    Ready to start?
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    Start with a single share in any funding building and add across districts at your own pace.
                  </p>
                  <button
                    type="button"
                    onClick={() => onNavigate('/properties')}
                    className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase text-foreground hover:text-accent cursor-pointer"
                  >
                    <span>Browse listed buildings</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </KrezReveal>
          </div>
        </div>
      </section>

      {/* Dark Illustrative Ledger Table */}
      <section
        data-nav-dark="true"
        className="border-b border-white/10 bg-ink py-section-sm text-white md:py-section-spacing"
      >
        <div className="mx-auto max-w-container px-gutter md:px-gutter-md lg:px-gutter-lg">
          <KrezReveal>
            <p className="text-xs font-semibold tracking-widest uppercase text-accent">
              Ledger
            </p>
            <h2 className="mt-2 text-2xl font-heading font-bold uppercase text-white md:text-3xl">
              Recent account entries
            </h2>
          </KrezReveal>

          <div className="mt-8 overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/15 text-xs tracking-widest uppercase text-white/50">
                  <th className="py-3 pr-4 font-semibold">Date</th>
                  <th className="py-3 pr-4 font-semibold">Building</th>
                  <th className="py-3 pr-4 font-semibold">Entry</th>
                  <th className="py-3 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {KREZ_ILLUSTRATIVE_LEDGER.map((entry) => (
                  <tr key={entry.id}>
                    <td className="py-4 pr-4 whitespace-nowrap text-white/65 tabular-nums">
                      {entry.date}
                    </td>
                    <td className="py-4 pr-4 text-white">{entry.building}</td>
                    <td className="py-4 pr-4 text-white/70">{entry.type}</td>
                    <td className="py-4 text-right font-semibold whitespace-nowrap tabular-nums text-white">
                      {entry.amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
};
