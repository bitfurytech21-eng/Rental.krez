import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Property } from '../../types/property';
import {
  KREZ_INVESTMENT_RANGES,
  KrezBuilding,
  getUnifiedKrezBuildings,
} from '../../data/krezTemplateData';
import { useAuth } from '../../lib/auth';
import { contactApi } from '../../lib/api';
import { TurnstileWidget } from '../security/TurnstileWidget';
import { KrezImage, KrezReveal } from './KrezReveal';

interface KrezPropertiesPageProps {
  properties: Property[];
  onNavigate: (path: string) => void;
}

const STATUS_FILTERS = ['All', 'Funding', 'Fully funded', 'Income paying'] as const;

export const KrezPropertiesPage: React.FC<KrezPropertiesPageProps> = ({
  properties,
  onNavigate,
}) => {
  const { user } = useAuth();
  const buildings = useMemo(() => getUnifiedKrezBuildings(properties), [properties]);

  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('All');

  // Calculator state
  const [calcBuildingId, setCalcBuildingId] = useState<string>(
    buildings[0]?.id || 'kp1-102-roquebrune-cap-martin'
  );
  const [calcAmount, setCalcAmount] = useState<number>(2500);
  const [calcYears, setCalcYears] = useState<number>(5);

  // Register interest state
  const [regName, setRegName] = useState(user?.fullName || '');
  const [regEmail, setRegEmail] = useState(user?.email || '');
  const [regBuildingId, setRegBuildingId] = useState<string>(
    buildings[0]?.id || 'kp1-102-roquebrune-cap-martin'
  );
  const [regRange, setRegRange] = useState<string>(KREZ_INVESTMENT_RANGES[1].label);
  const [regNotes, setRegNotes] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedTicket, setSubmittedTicket] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const requested = params.get('building');
    if (requested && buildings.some((b) => b.id === requested)) {
      setRegBuildingId(requested);
      setCalcBuildingId(requested);
    }
  }, [buildings]);

  const filteredBuildings = useMemo(() => {
    if (statusFilter === 'All') return buildings;
    return buildings.filter((b) => b.status.toLowerCase() === statusFilter.toLowerCase());
  }, [buildings, statusFilter]);

  const selectedCalcBuilding: KrezBuilding =
    buildings.find((b) => b.id === calcBuildingId) || buildings[0];

  const calcMetrics = useMemo(() => {
    const cleanAmount = Math.max(0, Number.isFinite(calcAmount) ? calcAmount : 0);
    const sharePrice = Math.max(1, selectedCalcBuilding?.sharePriceNumeric || 250);
    const yieldPct = Math.max(0, selectedCalcBuilding?.projectedYieldNumeric || 6.0);
    const shares = Math.floor(cleanAmount / sharePrice);
    const investedCapital = shares * sharePrice;
    const annualIncome = (investedCapital * yieldPct) / 100;
    const monthlyIncome = annualIncome / 12;
    const totalHorizonIncome = annualIncome * calcYears;
    return {
      shares,
      investedCapital,
      unallocated: Math.max(0, cleanAmount - investedCapital),
      monthlyIncome,
      annualIncome,
      totalHorizonIncome,
    };
  }, [calcAmount, calcYears, selectedCalcBuilding]);

  const handleSelectBuildingForInterest = (buildingId: string) => {
    setRegBuildingId(buildingId);
    setSubmittedTicket(null);
    if (typeof document !== 'undefined') {
      const target = document.getElementById('register');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
    onNavigate('/properties#register');
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitError(null);

    const trimmedName = regName.trim();
    const trimmedEmail = regEmail.trim();
    if (trimmedName.length < 2) {
      setSubmitError('Please enter your full name.');
      return;
    }
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setSubmitError('Please enter a valid email address.');
      return;
    }

    const chosenBuilding =
      buildings.find((b) => b.id === regBuildingId)?.name || regBuildingId;

    setSubmitting(true);
    try {
      const response = await contactApi.submit({
        fullName: trimmedName,
        email: trimmedEmail,
        topic: `Share Allocation Interest — ${chosenBuilding}`,
        investmentCapacity: regRange,
        message:
          regNotes.trim() ||
          `Registered investor interest for ${chosenBuilding} (${regRange}). Please send the offering memorandum and share subscription schedule.`,
        turnstileToken: turnstileToken || undefined,
      });
      setSubmittedTicket(response.data?.ticketId || 'REGISTERED');
      setRegNotes('');
    } catch (err: any) {
      setSubmitError(
        err?.message || 'Unable to register interest right now. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="bg-background text-foreground">
      {/* Header & Building Grid */}
      <section className="pt-header-offset pb-section-sm md:pb-section-spacing">
        <div className="mx-auto max-w-container px-gutter md:px-gutter-md lg:px-gutter-lg">
          <KrezReveal>
            <div className="max-w-2xl">
              <p className="text-xs font-semibold tracking-widest uppercase text-accent">
                Listings
              </p>
              <h1 className="mt-3 text-4xl font-heading font-bold tracking-tight uppercase text-foreground md:text-5xl">
                Shares in buildings
                <br />
                that already work
              </h1>
              <p className="mt-4 text-base leading-relaxed text-muted">
                Every building below is held in its own structure, let to paying tenants, and divided into fixed-price shares with running costs shown on the page.
              </p>
            </div>
          </KrezReveal>

          {/* Status Filter Tabs */}
          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
            <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Filter buildings by status">
              {STATUS_FILTERS.map((tab) => {
                const active = statusFilter === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setStatusFilter(tab)}
                    className={`rounded-pill px-4 py-2 text-xs font-medium tracking-wider uppercase transition-colors duration-fast cursor-pointer ${
                      active
                        ? 'bg-primary text-white'
                        : 'bg-secondary text-foreground hover:bg-border'
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            <a
              href="#calculator"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('calculator')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="text-xs font-semibold tracking-widest uppercase text-accent hover:text-foreground transition-colors duration-fast"
            >
              Returns calculator &darr;
            </a>
          </div>

          {/* 3-Column Building Cards */}
          <div className="mt-10 grid gap-gutter md:grid-cols-2 md:gap-gutter-md lg:grid-cols-3">
            {filteredBuildings.map((building, index) => (
              <KrezReveal key={building.id} delay={(index % 3) * 0.05}>
                <article className="group flex h-full flex-col overflow-hidden rounded-card border border-border bg-background transition-transform duration-base hover:-translate-y-hover-lift">
                  <button
                    type="button"
                    onClick={() => onNavigate(`/properties/${building.id}`)}
                    className="relative aspect-[4/3] w-full overflow-hidden bg-secondary text-left cursor-pointer"
                  >
                    <KrezImage
                      src={building.image}
                      alt={building.name}
                      className="h-full w-full object-cover transition-transform duration-base group-hover:scale-hover"
                    />
                    <span className="absolute top-3 left-3 rounded-pill bg-background/90 px-3 py-1 text-xs font-medium text-foreground backdrop-blur-xs">
                      {building.status}
                    </span>
                  </button>

                  <div className="flex flex-1 flex-col p-card-pad">
                    <p className="text-xs font-medium tracking-wider uppercase text-muted">
                      {building.location}
                    </p>
                    <h2 className="mt-1 text-lg font-heading font-semibold text-foreground">
                      <button
                        type="button"
                        onClick={() => onNavigate(`/properties/${building.id}`)}
                        className="text-left transition-colors duration-fast hover:text-accent cursor-pointer"
                      >
                        {building.name}
                      </button>
                    </h2>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
                      {building.summary}
                    </p>

                    <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-4 text-sm">
                      <div>
                        <dt className="text-xs text-muted">Share price</dt>
                        <dd className="mt-0.5 font-semibold tabular-nums text-foreground">
                          {building.sharePrice}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted">Projected yield</dt>
                        <dd className="mt-0.5 font-semibold tabular-nums text-foreground">
                          {building.projectedYield}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs text-muted tabular-nums">
                        <span>{building.funded}% funded</span>
                        <span>{building.totalShares}</span>
                      </div>
                      <progress
                        className="krez-progress mt-2"
                        value={building.funded}
                        max={100}
                        aria-label={`${building.name} ${building.funded}% funded`}
                      />
                    </div>

                    <div className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-4">
                      <button
                        type="button"
                        onClick={() => onNavigate(`/properties/${building.id}`)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase text-foreground transition-colors duration-fast hover:text-accent cursor-pointer"
                      >
                        <span>View building</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectBuildingForInterest(building.id)}
                        className="text-xs font-medium text-muted underline underline-offset-4 transition-colors duration-fast hover:text-foreground cursor-pointer"
                      >
                        Register interest
                      </button>
                    </div>
                  </div>
                </article>
              </KrezReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Returns Calculator Section */}
      <section
        id="calculator"
        className="bg-secondary py-section-sm md:py-section-spacing"
      >
        <div className="mx-auto max-w-container px-gutter md:px-gutter-md lg:px-gutter-lg">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-start">
            <KrezReveal>
              <div>
                <p className="text-xs font-semibold tracking-widest uppercase text-accent">
                  Returns calculator
                </p>
                <h2 className="mt-3 text-3xl font-heading font-bold tracking-tight uppercase text-foreground md:text-4xl">
                  See what your amount could earn
                </h2>
                <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted">
                  Choose a listed building and enter an amount to see how many whole shares it buys and the projected net rent at its current yield.
                </p>

                <div className="mt-8 space-y-6">
                  <div>
                    <label
                      htmlFor="krez-calc-building"
                      className="block text-xs font-semibold tracking-widest uppercase text-muted"
                    >
                      Building
                    </label>
                    <select
                      id="krez-calc-building"
                      value={selectedCalcBuilding?.id || ''}
                      onChange={(e) => setCalcBuildingId(e.target.value)}
                      className="mt-2 w-full rounded-input border border-border bg-background px-4 py-3 text-sm font-medium text-foreground focus:border-primary focus:outline-none"
                    >
                      {buildings.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} — {b.sharePrice}/share ({b.projectedYield} net yield)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="krez-calc-amount"
                        className="block text-xs font-semibold tracking-widest uppercase text-muted"
                      >
                        Amount (EUR)
                      </label>
                      <input
                        id="krez-calc-amount"
                        type="number"
                        min={100}
                        max={1000000}
                        step={50}
                        value={calcAmount}
                        onChange={(e) =>
                          setCalcAmount(Math.max(0, Number(e.target.value) || 0))
                        }
                        className="mt-2 w-full rounded-input border border-border bg-background px-4 py-3 text-sm font-semibold tabular-nums text-foreground focus:border-primary focus:outline-none"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="krez-calc-years"
                          className="block text-xs font-semibold tracking-widest uppercase text-muted"
                        >
                          Holding period
                        </label>
                        <span className="text-xs font-semibold tabular-nums text-foreground">
                          {calcYears} {calcYears === 1 ? 'year' : 'years'}
                        </span>
                      </div>
                      <input
                        id="krez-calc-years"
                        type="range"
                        min={1}
                        max={15}
                        value={calcYears}
                        onChange={(e) => setCalcYears(Number(e.target.value))}
                        className="mt-4 w-full accent-[#213138] cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </KrezReveal>

            <KrezReveal delay={0.08}>
              <div className="rounded-card border border-border bg-background p-card-pad">
                <p className="text-xs font-semibold tracking-widest uppercase text-muted">
                  Illustrative readout · {selectedCalcBuilding?.name}
                </p>

                <dl className="mt-6 grid grid-cols-2 gap-6 border-b border-border pb-6">
                  <div>
                    <dt className="text-xs text-muted">Whole shares</dt>
                    <dd className="mt-1 text-3xl font-heading font-bold tabular-nums text-foreground">
                      {calcMetrics.shares.toLocaleString('en-US')}
                    </dd>
                    <p className="mt-1 text-xs text-muted tabular-nums">
                      €{calcMetrics.investedCapital.toLocaleString('en-US')} allocated
                    </p>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Projected monthly rent</dt>
                    <dd className="mt-1 text-3xl font-heading font-bold tabular-nums text-foreground">
                      €{calcMetrics.monthlyIncome.toFixed(2)}
                    </dd>
                    <p className="mt-1 text-xs text-muted tabular-nums">
                      At {selectedCalcBuilding?.projectedYield} net yield
                    </p>
                  </div>
                </dl>

                <dl className="mt-6 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-muted">Projected annual rent</dt>
                    <dd className="font-semibold tabular-nums text-foreground">
                      €{calcMetrics.annualIncome.toFixed(2)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted">
                      Cumulative rent over {calcYears} {calcYears === 1 ? 'year' : 'years'}
                    </dt>
                    <dd className="font-semibold tabular-nums text-foreground">
                      €{calcMetrics.totalHorizonIncome.toFixed(2)}
                    </dd>
                  </div>
                  {calcMetrics.unallocated > 0 && (
                    <div className="flex items-center justify-between text-xs text-muted">
                      <dt>Unallocated cash remainder</dt>
                      <dd className="tabular-nums">€{calcMetrics.unallocated.toFixed(2)}</dd>
                    </div>
                  )}
                </dl>

                <p className="mt-6 text-xs leading-relaxed text-muted">
                  Figures assume constant rent and running costs and exclude capital value movement. Yields are projections, not guarantees.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    handleSelectBuildingForInterest(
                      selectedCalcBuilding?.id || 'kp1-102-roquebrune-cap-martin'
                    )
                  }
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-pill bg-primary px-6 py-3.5 text-xs font-semibold tracking-widest uppercase text-white transition-transform duration-fast hover:scale-hover active:scale-active cursor-pointer"
                >
                  <span>Register interest in {selectedCalcBuilding?.name}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </KrezReveal>
          </div>
        </div>
      </section>

      {/* Register Interest Form */}
      <section
        id="register"
        className="bg-background py-section-sm md:py-section-spacing"
      >
        <div className="mx-auto max-w-container px-gutter md:px-gutter-md lg:px-gutter-lg">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr]">
            <KrezReveal>
              <div>
                <p className="text-xs font-semibold tracking-widest uppercase text-accent">
                  Register interest
                </p>
                <h2 className="mt-3 text-3xl font-heading font-bold tracking-tight uppercase text-foreground md:text-4xl">
                  Tell us which building caught your eye
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-muted">
                  Leave your details and the building you are considering. We send the full lease schedule, running-cost breakdown, and share subscription instructions directly.
                </p>
              </div>
            </KrezReveal>

            <KrezReveal delay={0.08}>
              <div className="rounded-card border border-border bg-secondary/45 p-card-pad">
                {submittedTicket ? (
                  <div className="space-y-4 py-4">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-pill bg-primary text-white">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <h3 className="text-xl font-heading font-bold uppercase text-foreground">
                      Interest recorded
                    </h3>
                    <p className="text-sm leading-relaxed text-muted">
                      Thank you. Your enquiry (ref. <span className="font-mono text-foreground">{submittedTicket}</span>) has been sent to our investor desk and we will reply by email shortly.
                    </p>
                    <button
                      type="button"
                      onClick={() => setSubmittedTicket(null)}
                      className="text-xs font-semibold tracking-widest uppercase text-accent hover:text-foreground cursor-pointer"
                    >
                      Submit another enquiry
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleRegisterSubmit} className="space-y-5">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="krez-reg-name"
                          className="block text-xs font-semibold tracking-widest uppercase text-muted"
                        >
                          Full name
                        </label>
                        <input
                          id="krez-reg-name"
                          type="text"
                          required
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          placeholder="Alex Morgan"
                          className="mt-2 w-full rounded-input border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="krez-reg-email"
                          className="block text-xs font-semibold tracking-widest uppercase text-muted"
                        >
                          Email
                        </label>
                        <input
                          id="krez-reg-email"
                          type="email"
                          required
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="you@domain.com"
                          className="mt-2 w-full rounded-input border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="krez-reg-building"
                          className="block text-xs font-semibold tracking-widest uppercase text-muted"
                        >
                          Building
                        </label>
                        <select
                          id="krez-reg-building"
                          value={regBuildingId}
                          onChange={(e) => setRegBuildingId(e.target.value)}
                          className="mt-2 w-full rounded-input border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none"
                        >
                          {buildings.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name} ({b.status})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="krez-reg-range"
                          className="block text-xs font-semibold tracking-widest uppercase text-muted"
                        >
                          Indicative amount
                        </label>
                        <select
                          id="krez-reg-range"
                          value={regRange}
                          onChange={(e) => setRegRange(e.target.value)}
                          className="mt-2 w-full rounded-input border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none"
                        >
                          {KREZ_INVESTMENT_RANGES.map((r) => (
                            <option key={r.id} value={r.label}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="krez-reg-notes"
                        className="block text-xs font-semibold tracking-widest uppercase text-muted"
                      >
                        Notes (optional)
                      </label>
                      <textarea
                        id="krez-reg-notes"
                        rows={3}
                        value={regNotes}
                        onChange={(e) => setRegNotes(e.target.value)}
                        placeholder="Any questions on leases, structure, or share settlement..."
                        className="mt-2 w-full rounded-input border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none"
                      />
                    </div>

                    {!user && (
                      <TurnstileWidget
                        theme="light"
                        action="register_interest"
                        onVerify={(tok) => setTurnstileToken(tok)}
                      />
                    )}

                    {submitError && (
                      <p className="rounded-input border border-red-300 bg-red-50 px-3.5 py-2.5 text-xs text-red-800" role="alert">
                        {submitError}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center gap-2 rounded-pill bg-primary px-7 py-3.5 text-xs font-semibold tracking-widest uppercase text-white transition-transform duration-fast hover:scale-hover active:scale-active disabled:opacity-50 cursor-pointer"
                    >
                      <span>{submitting ? 'Sending...' : 'Register interest'}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </form>
                )}
              </div>
            </KrezReveal>
          </div>
        </div>
      </section>

      {/* Dark Bottom CTA Band */}
      <section data-nav-dark="true" className="border-b border-white/10 bg-ink py-section-sm text-white md:py-section-spacing">
        <div className="mx-auto flex max-w-container flex-col justify-between gap-8 px-gutter md:flex-row md:items-center md:px-gutter-md lg:px-gutter-lg">
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase text-accent">
              Questions first?
            </p>
            <h2 className="mt-2 text-2xl font-heading font-bold tracking-tight uppercase text-white md:text-3xl">
              Not sure which building fits?
            </h2>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-white/70">
              Speak directly with our team about how shares are held, how rent is itemized, or how secondary exits work.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => onNavigate('/contact')}
              className="rounded-pill bg-white px-6 py-3.5 text-xs font-semibold tracking-widest uppercase text-ink transition-transform duration-fast hover:scale-hover active:scale-active cursor-pointer"
            >
              Talk to us
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/how-it-works')}
              className="rounded-pill border border-white/25 px-6 py-3.5 text-xs font-semibold tracking-widest uppercase text-white transition-colors duration-fast hover:border-white cursor-pointer"
            >
              How It Works
            </button>
          </div>
        </div>
      </section>
    </main>
  );
};
