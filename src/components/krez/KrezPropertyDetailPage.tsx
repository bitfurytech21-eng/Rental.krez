import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Property } from '../../types/property';
import {
  KREZ_INVESTMENT_RANGES,
  LEGACY_KREZ_SLUG_REDIRECTS,
  getUnifiedKrezBuildings,
} from '../../data/krezTemplateData';
import { useAuth } from '../../lib/auth';
import { contactApi } from '../../lib/api';
import { TurnstileWidget } from '../security/TurnstileWidget';
import { KrezImage, KrezReveal } from './KrezReveal';

interface KrezPropertyDetailPageProps {
  buildingId: string;
  properties: Property[];
  onNavigate: (path: string) => void;
  onOpenFullDossier?: (property: Property) => void;
}

export const KrezPropertyDetailPage: React.FC<KrezPropertyDetailPageProps> = ({
  buildingId,
  properties,
  onNavigate,
  onOpenFullDossier,
}) => {
  const { user } = useAuth();
  const buildings = useMemo(() => getUnifiedKrezBuildings(properties), [properties]);

  const building = useMemo(() => {
    const raw = decodeURIComponent(buildingId || '').trim().toLowerCase();
    const clean = LEGACY_KREZ_SLUG_REDIRECTS[raw] || raw;
    return buildings.find(
      (b) =>
        b.id.toLowerCase() === clean ||
        (b.linkedLedgerSlug && b.linkedLedgerSlug.toLowerCase() === clean) ||
        (b.linkedLedgerProperty && b.linkedLedgerProperty.id.toLowerCase() === clean)
    );
  }, [buildingId, buildings]);

  const [activeHeroPhoto, setActiveHeroPhoto] = useState<string | null>(null);
  const [showAllPhotos, setShowAllPhotos] = useState(false);

  React.useEffect(() => {
    setActiveHeroPhoto(null);
    setShowAllPhotos(false);
  }, [building?.id]);

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [range, setRange] = useState(KREZ_INVESTMENT_RANGES[1].label);
  const [notes, setNotes] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);

  if (!building) {
    return (
      <main className="min-h-[70vh] bg-background pt-header-offset pb-section-sm text-foreground">
        <div className="mx-auto max-w-container px-gutter md:px-gutter-md lg:px-gutter-lg">
          <p className="text-xs font-semibold tracking-widest uppercase text-accent">
            Listing not found
          </p>
          <h1 className="mt-3 text-3xl font-heading font-bold uppercase text-foreground md:text-4xl">
            That building is not on the register
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
            The listing may have closed or moved. Browse all currently listed buildings below.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('/properties')}
            className="mt-6 inline-flex items-center gap-2 rounded-pill bg-primary px-6 py-3 text-xs font-semibold tracking-widest uppercase text-white cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>All properties</span>
          </button>
        </div>
      </main>
    );
  }

  const handleEnquireSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    const cleanName = fullName.trim();
    const cleanEmail = email.trim();
    if (cleanName.length < 2) {
      setError('Please enter your full name.');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await contactApi.submit({
        fullName: cleanName,
        email: cleanEmail,
        topic: `Building Enquiry — ${building.name}`,
        investmentCapacity: range,
        message:
          notes.trim() ||
          `Enquiring about share availability and lease documentation for ${building.name} (${building.location}), indicative allocation ${range}.`,
        turnstileToken: turnstileToken || undefined,
      });
      setTicketId(res.data?.ticketId || 'RECORDED');
      setNotes('');
    } catch (err: any) {
      setError(err?.message || 'Unable to submit enquiry right now. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="bg-background text-foreground">
      {/* Header & Photo Triptych */}
      <section className="pt-header-offset pb-section-sm">
        <div className="mx-auto max-w-container px-gutter md:px-gutter-md lg:px-gutter-lg">
          <button
            type="button"
            onClick={() => onNavigate('/properties')}
            className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-muted transition-colors duration-fast hover:text-foreground cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>All properties</span>
          </button>

          <KrezReveal className="mt-8">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold tracking-widest uppercase text-accent">
                  {building.status} · {building.location}
                </p>
                <h1 className="mt-3 text-4xl font-heading font-bold tracking-tight uppercase text-foreground md:text-5xl">
                  {building.name}
                </h1>
                <p className="mt-4 text-base leading-relaxed text-muted">
                  {building.summary}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="#enquire"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('enquire')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-2 rounded-pill bg-primary px-6 py-3.5 text-xs font-semibold tracking-widest uppercase text-white transition-transform duration-fast hover:scale-hover active:scale-active"
                >
                  <span>Enquire about this building</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>

                {building.linkedLedgerProperty && onOpenFullDossier && (
                  <button
                    type="button"
                    onClick={() => onOpenFullDossier(building.linkedLedgerProperty!)}
                    className="rounded-pill border border-border bg-secondary px-5 py-3.5 text-xs font-semibold tracking-widest uppercase text-foreground transition-colors duration-fast hover:border-foreground cursor-pointer"
                  >
                    Live token subscription
                  </button>
                )}
              </div>
            </div>
          </KrezReveal>

          {/* 3-Photo Architectural Grid + Full Kretz Property Gallery */}
          <div className="mt-10 grid gap-4 md:grid-cols-[1.6fr_1fr]">
            <div className="aspect-[16/10] overflow-hidden rounded-card bg-secondary">
              <KrezImage
                src={activeHeroPhoto || building.image}
                alt={building.name}
                loading="eager"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-1">
              <button
                type="button"
                onClick={() => setActiveHeroPhoto(building.photos[0])}
                className="aspect-[4/3] overflow-hidden rounded-card bg-secondary text-left cursor-pointer"
                aria-label={`View ${building.name} interior photograph`}
              >
                <KrezImage
                  src={building.photos[0]}
                  alt={`${building.name} interior`}
                  className="h-full w-full object-cover transition-transform duration-base hover:scale-hover"
                />
              </button>
              <button
                type="button"
                onClick={() => setActiveHeroPhoto(building.photos[1])}
                className="aspect-[4/3] overflow-hidden rounded-card bg-secondary text-left cursor-pointer"
                aria-label={`View ${building.name} architectural detail`}
              >
                <KrezImage
                  src={building.photos[1]}
                  alt={`${building.name} architectural detail`}
                  className="h-full w-full object-cover transition-transform duration-base hover:scale-hover"
                />
              </button>
            </div>
          </div>

          {building.allPhotos.length > 3 && (
            <div className="mt-4">
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs font-medium tracking-wider uppercase text-muted">
                  Property photography ({building.allPhotos.length} verified plates)
                </p>
                {building.allPhotos.length > 8 && (
                  <button
                    type="button"
                    onClick={() => setShowAllPhotos((prev) => !prev)}
                    className="text-xs font-semibold tracking-widest uppercase text-accent hover:text-foreground cursor-pointer"
                  >
                    {showAllPhotos
                      ? 'Show fewer photographs'
                      : `View all ${building.allPhotos.length} photographs`}
                  </button>
                )}
              </div>
              <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8">
                {(showAllPhotos ? building.allPhotos : building.allPhotos.slice(0, 8)).map(
                  (photoUrl, idx) => {
                    const isSelected = (activeHeroPhoto || building.image) === photoUrl;
                    return (
                      <button
                        key={`${photoUrl}-${idx}`}
                        type="button"
                        onClick={() => setActiveHeroPhoto(photoUrl)}
                        aria-label={`Select photograph ${idx + 1} of ${building.name}`}
                        className={`aspect-[4/3] overflow-hidden rounded-input bg-secondary transition-opacity duration-fast cursor-pointer ${
                          isSelected
                            ? 'ring-2 ring-primary opacity-100'
                            : 'opacity-75 hover:opacity-100'
                        }`}
                      >
                        <KrezImage
                          src={photoUrl}
                          alt={`${building.name} — view ${idx + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          )}

          {/* 4-Column Key Figures */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-card bg-secondary p-card-pad">
              <p className="text-xs font-medium tracking-wider uppercase text-muted">
                Share price
              </p>
              <p className="mt-2 text-2xl font-heading font-bold tabular-nums text-foreground">
                {building.sharePrice}
              </p>
              <p className="mt-1 text-xs text-muted">{building.totalShares}</p>
            </div>

            <div className="rounded-card bg-secondary p-card-pad">
              <p className="text-xs font-medium tracking-wider uppercase text-muted">
                Projected yield
              </p>
              <p className="mt-2 text-2xl font-heading font-bold tabular-nums text-foreground">
                {building.projectedYield}
              </p>
              <p className="mt-1 text-xs text-muted">Net of running costs</p>
            </div>

            <div className="rounded-card bg-secondary p-card-pad">
              <p className="text-xs font-medium tracking-wider uppercase text-muted">
                Monthly rent
              </p>
              <p className="mt-2 text-2xl font-heading font-bold tabular-nums text-foreground">
                {building.monthlyRent}
              </p>
              <p className="mt-1 text-xs text-muted tabular-nums">
                {building.annualRent} a year
              </p>
            </div>

            <div className="rounded-card bg-secondary p-card-pad">
              <p className="text-xs font-medium tracking-wider uppercase text-muted">
                Occupancy
              </p>
              <p className="mt-2 text-2xl font-heading font-bold tabular-nums text-foreground">
                {building.occupancy}
              </p>
              <p className="mt-1 text-xs text-muted">Current let rate</p>
            </div>
          </div>
        </div>
      </section>

      {/* Where the Rent Goes & Funding History */}
      <section className="border-t border-border py-section-sm md:py-section-spacing">
        <div className="mx-auto max-w-container px-gutter md:px-gutter-md lg:px-gutter-lg">
          <div className="grid gap-12 lg:grid-cols-2">
            {/* Ledger Arithmetic */}
            <KrezReveal>
              <div className="rounded-card border border-border bg-background p-card-pad">
                <p className="text-xs font-semibold tracking-widest uppercase text-accent">
                  Annual ledger
                </p>
                <h2 className="mt-2 text-2xl font-heading font-bold uppercase text-foreground">
                  Where the rent goes
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Every deduction is itemized against {building.name} before net income is split across {building.totalShares}.
                </p>

                <dl className="mt-6 space-y-3 text-sm">
                  <div className="flex items-center justify-between border-b border-border pb-3 font-medium">
                    <dt className="text-foreground">Gross annual rent</dt>
                    <dd className="tabular-nums text-foreground">{building.annualRent}</dd>
                  </div>

                  {building.costs.map((cost) => (
                    <div
                      key={cost.id}
                      className="flex items-center justify-between text-muted"
                    >
                      <dt>{cost.label}</dt>
                      <dd className="tabular-nums">&minus;{cost.amount}</dd>
                    </div>
                  ))}

                  <div className="flex items-center justify-between border-t border-border pt-4 text-base font-semibold text-foreground">
                    <dt>Net distributable income</dt>
                    <dd className="tabular-nums text-primary">{building.netIncome}</dd>
                  </div>
                </dl>
              </div>
            </KrezReveal>

            {/* Funding History */}
            <KrezReveal delay={0.08}>
              <div className="rounded-card border border-border bg-secondary/45 p-card-pad">
                <p className="text-xs font-semibold tracking-widest uppercase text-accent">
                  Allocation progress
                </p>
                <h2 className="mt-2 text-2xl font-heading font-bold uppercase text-foreground">
                  Funding history
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Currently {building.funded}% funded across {building.totalShares}.
                </p>

                <progress
                  className="krez-progress krez-progress-lg mt-4"
                  value={building.funded}
                  max={100}
                  aria-label={`${building.funded}% funded`}
                />

                <ol className="mt-8 space-y-5">
                  {building.funding.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start justify-between gap-4 border-b border-border pb-4 last:border-b-0 last:pb-0"
                    >
                      <div>
                        <p className="text-xs font-semibold tracking-widest uppercase text-muted">
                          {item.date}
                        </p>
                        <p className="mt-1 text-sm font-medium text-foreground">
                          {item.label}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-pill bg-background px-3 py-1 text-xs font-semibold tabular-nums text-foreground">
                        {item.funded}%
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </KrezReveal>
          </div>
        </div>
      </section>

      {/* Enquire About This Building */}
      <section
        id="enquire"
        className="bg-secondary py-section-sm md:py-section-spacing"
      >
        <div className="mx-auto max-w-container px-gutter md:px-gutter-md lg:px-gutter-lg">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase text-accent">
                Enquire
              </p>
              <h2 className="mt-3 text-3xl font-heading font-bold uppercase text-foreground">
                Enquire about {building.name}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Request the lease schedule, independent valuation summary, and share purchase terms for {building.name}.
              </p>
            </div>

            <div className="rounded-card border border-border bg-background p-card-pad">
              {ticketId ? (
                <div className="space-y-4 py-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-pill bg-primary text-white">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-heading font-bold uppercase text-foreground">
                    Enquiry received
                  </h3>
                  <p className="text-sm leading-relaxed text-muted">
                    We have logged your request for {building.name} (ref.{' '}
                    <span className="font-mono text-foreground">{ticketId}</span>) and will send the building dossier to {email}.
                  </p>
                  <button
                    type="button"
                    onClick={() => setTicketId(null)}
                    className="text-xs font-semibold tracking-widest uppercase text-accent hover:text-foreground cursor-pointer"
                  >
                    Send another note
                  </button>
                </div>
              ) : (
                <form onSubmit={handleEnquireSubmit} className="space-y-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="krez-enq-name"
                        className="block text-xs font-semibold tracking-widest uppercase text-muted"
                      >
                        Full name
                      </label>
                      <input
                        id="krez-enq-name"
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Alex Morgan"
                        className="mt-2 w-full rounded-input border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="krez-enq-email"
                        className="block text-xs font-semibold tracking-widest uppercase text-muted"
                      >
                        Email
                      </label>
                      <input
                        id="krez-enq-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@domain.com"
                        className="mt-2 w-full rounded-input border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="krez-enq-range"
                      className="block text-xs font-semibold tracking-widest uppercase text-muted"
                    >
                      Indicative amount
                    </label>
                    <select
                      id="krez-enq-range"
                      value={range}
                      onChange={(e) => setRange(e.target.value)}
                      className="mt-2 w-full rounded-input border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none"
                    >
                      {KREZ_INVESTMENT_RANGES.map((r) => (
                        <option key={r.id} value={r.label}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="krez-enq-notes"
                      className="block text-xs font-semibold tracking-widest uppercase text-muted"
                    >
                      Questions (optional)
                    </label>
                    <textarea
                      id="krez-enq-notes"
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={`Any specific questions about ${building.name}...`}
                      className="mt-2 w-full rounded-input border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>

                  {!user && (
                    <TurnstileWidget
                      theme="light"
                      action="building_enquiry"
                      onVerify={(tok) => setTurnstileToken(tok)}
                    />
                  )}

                  {error && (
                    <p className="rounded-input border border-red-300 bg-red-50 px-3.5 py-2.5 text-xs text-red-800" role="alert">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 rounded-pill bg-primary px-7 py-3.5 text-xs font-semibold tracking-widest uppercase text-white transition-transform duration-fast hover:scale-hover active:scale-active disabled:opacity-50 cursor-pointer"
                  >
                    <span>{submitting ? 'Sending...' : 'Send enquiry'}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};
