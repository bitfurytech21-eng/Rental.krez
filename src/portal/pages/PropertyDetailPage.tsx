import React, { useEffect, useState } from 'react';
import { Building2, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { usePortal } from '../state/PortalContext';
import { portalApi } from '../services/portalApi';
import { PortalProperty } from '../types';
import { formatEuro } from '../utils/format';
import { LoadingSkeleton, ErrorBanner } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';

export const PropertyDetailPage: React.FC = () => {
  const toast = useToast();
  const { selectedPropertySlug, properties, balance, navigatePortal, refreshAll } = usePortal();

  const [property, setProperty] = useState<PortalProperty | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);

  const [tokensCount, setTokensCount] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const [otpStep, setOtpStep] = useState<{ maskedEmail?: string } | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [txSuccess, setTxSuccess] = useState<{ certificateId?: string; totalCost: number; count: number } | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!selectedPropertySlug) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const detail = await portalApi.getPropertyDetail(selectedPropertySlug);
        if (active) {
          setProperty(detail);
          const minTokens = Math.max(
            1,
            Math.ceil((detail.minimumInvestment || detail.tokenPrice || 100) / Math.max(1, detail.tokenPrice || 100))
          );
          setTokensCount(minTokens);
        }
      } catch (err: any) {
        const fallback = properties.find(
          (p) => p.id === selectedPropertySlug || p.slug === selectedPropertySlug
        );
        if (active) {
          if (fallback) {
            setProperty(fallback);
          } else {
            setError(err?.message || 'Unable to load property offering details.');
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [selectedPropertySlug, properties]);

  if (loading && !property) {
    return <LoadingSkeleton rows={3} />;
  }

  if (!property) {
    return (
      <EmptyState
        icon={<Building2 className="w-5 h-5" />}
        title="Property offering not found"
        description={error || 'Select an active property from the marketplace to inspect its investment terms.'}
        actionLabel="Browse properties"
        onAction={() => navigatePortal('explore')}
      />
    );
  }

  const progress =
    property.targetAmount > 0
      ? Math.min(100, Math.round((property.fundedAmount / property.targetAmount) * 100))
      : 0;
  const totalCost = Math.round(tokensCount * property.tokenPrice * 100) / 100;
  const estAnnualIncome = Math.round(totalCost * (property.projectedYield / 100) * 100) / 100;
  const isOpen = property.status === 'funding' || property.status === 'active';
  const minTokens = Math.max(
    1,
    Math.ceil((property.minimumInvestment || property.tokenPrice) / Math.max(1, property.tokenPrice))
  );

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    if (!isOpen || property.availableTokens <= 0) {
      setError('This property offering is not currently accepting new subscriptions.');
      return;
    }
    if (tokensCount < minTokens) {
      setError(`Minimum subscription is ${minTokens} shares (${formatEuro(minTokens * property.tokenPrice)}).`);
      return;
    }
    if (tokensCount > property.availableTokens) {
      setError(`Only ${property.availableTokens} shares remain available.`);
      return;
    }
    if (totalCost > balance) {
      setError(`Insufficient wallet balance (${formatEuro(balance)}). Deposit funds before subscribing.`);
      return;
    }

    setSubmitting(true);
    try {
      let grantId: string | undefined;
      if (otpStep) {
        if (otpCode.trim().length !== 6) {
          setError('Enter the 6-digit security verification code.');
          setSubmitting(false);
          return;
        }
        grantId = await portalApi.verifyActionCode('investor.investment.create', otpCode.trim());
      } else {
        const reqRes = await portalApi.requestActionVerification('investor.investment.create');
        if (reqRes.otpRequired) {
          setOtpStep({ maskedEmail: reqRes.maskedEmail });
          setSubmitting(false);
          toast.info(`Security code sent to ${reqRes.maskedEmail || 'your email'}.`);
          return;
        }
        grantId = reqRes.grantId;
      }

      const result = await portalApi.executeInvestment({
        propertyId: property.id,
        tokensCount,
        paymentMethod: 'Platform Balance',
        grantId,
      });

      setOtpStep(null);
      setOtpCode('');
      setTxSuccess({
        certificateId: result?.investment?.certificateId,
        totalCost,
        count: tokensCount,
      });
      toast.success(`Subscribed to ${tokensCount} shares in ${property.title}.`);
      await refreshAll();
    } catch (err: any) {
      const msg = err?.message || 'Unable to execute property subscription.';
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && <ErrorBanner message={error} />}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Property Overview */}
        <div className="lg:col-span-7 space-y-5">
          <div className="portal-card overflow-hidden">
            <div className="h-56 sm:h-72 w-full bg-[#152E54]">
              {property.images?.[0] && !imgFailed ? (
                <img
                  src={property.images[0]}
                  alt={property.title}
                  referrerPolicy="no-referrer"
                  onError={() => setImgFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-[#C5A880]">
                  <Building2 className="w-10 h-10" />
                  <span className="text-xs text-[#8EA7C7]">{property.location}</span>
                </div>
              )}
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              <div>
                <div className="text-xs text-[#8EA7C7] flex items-center gap-2 flex-wrap">
                  <span>{property.location}</span>
                  <span aria-hidden="true">·</span>
                  <span>{property.type}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#C5A880]">
                    {property.distributionFrequency || 'Monthly'} distributions
                  </span>
                </div>
                <h2 className="mt-1.5 text-2xl font-heading font-bold text-white">
                  {property.title}
                </h2>
                {property.description && (
                  <p className="mt-2 text-sm text-[#8EA7C7] leading-relaxed">
                    {property.description}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-[#1D3860]">
                <div>
                  <div className="text-xs text-[#8EA7C7]">Target yield</div>
                  <div className="mt-1 text-lg font-bold text-[#C5A880] portal-tabular">
                    {property.projectedYield.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[#8EA7C7]">Share price</div>
                  <div className="mt-1 text-lg font-bold text-white portal-tabular">
                    {formatEuro(property.tokenPrice)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[#8EA7C7]">Available shares</div>
                  <div className="mt-1 text-lg font-bold text-white portal-tabular">
                    {property.availableTokens.toLocaleString('en-IE')}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[#8EA7C7]">Target raise</div>
                  <div className="mt-1 text-lg font-bold text-white portal-tabular">
                    {formatEuro(property.targetAmount)}
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#8EA7C7]">
                    Funded {formatEuro(property.fundedAmount)} of {formatEuro(property.targetAmount)}
                  </span>
                  <span className="font-semibold text-white portal-tabular">{progress}%</span>
                </div>
                <div className="portal-progress-track">
                  <div className="portal-progress-fill" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Execution Card */}
        <div className="lg:col-span-5">
          {txSuccess ? (
            <div className="portal-card p-6 space-y-4">
              <div className="w-11 h-11 rounded-xl bg-[#34D399]/15 border border-[#34D399]/40 text-[#34D399] flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-white">Subscription confirmed</h3>
              <p className="text-sm text-[#8EA7C7] leading-relaxed">
                You acquired <span className="text-white font-semibold portal-tabular">{txSuccess.count} shares</span> in{' '}
                {property.title} for <span className="text-white font-semibold portal-tabular">{formatEuro(txSuccess.totalCost)}</span>.
              </p>
              {txSuccess.certificateId && (
                <div className="portal-surface-elevated p-3 text-xs">
                  <span className="text-[#8EA7C7]">SPV Certificate ID · </span>
                  <span className="font-mono text-[#C5A880]">{txSuccess.certificateId}</span>
                </div>
              )}
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigatePortal('portfolio')}
                  className="portal-btn-primary flex-1"
                >
                  View portfolio
                </button>
                <button
                  type="button"
                  onClick={() => setTxSuccess(null)}
                  className="portal-btn-secondary flex-1"
                >
                  Subscribe more
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="portal-card p-5 sm:p-6 space-y-5">
              <div>
                <h3 className="text-lg font-semibold text-white">Subscribe to SPV shares</h3>
                <p className="text-xs text-[#8EA7C7] mt-1 portal-tabular">
                  Available wallet balance · {formatEuro(balance)}
                </p>
              </div>

              <div>
                <label htmlFor="portal-share-count" className="block text-xs font-semibold text-[#C5A880] mb-2">
                  Number of shares (Min {minTokens})
                </label>
                <input
                  id="portal-share-count"
                  type="number"
                  min={minTokens}
                  max={Math.max(minTokens, property.availableTokens)}
                  value={tokensCount}
                  onChange={(e) => setTokensCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="portal-input portal-tabular"
                />
              </div>

              <div className="portal-surface-elevated p-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#8EA7C7]">Share price</span>
                  <span className="text-white font-semibold portal-tabular">{formatEuro(property.tokenPrice)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#8EA7C7]">Estimated annual rent</span>
                  <span className="text-[#34D399] font-semibold portal-tabular">+{formatEuro(estAnnualIncome)} / yr</span>
                </div>
                <div className="pt-2 border-t border-[#1D3860] flex items-center justify-between text-sm">
                  <span className="font-semibold text-white">Total subscription</span>
                  <span className="font-bold text-[#C5A880] portal-tabular">{formatEuro(totalCost)}</span>
                </div>
              </div>

              {otpStep && (
                <div className="portal-surface-elevated p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#C5A880]">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Email security code ({otpStep.maskedEmail})</span>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit code"
                    className="portal-input tracking-[0.3em] font-mono"
                  />
                </div>
              )}

              <div className="space-y-2.5">
                <button
                  type="submit"
                  disabled={submitting || !isOpen || totalCost > balance}
                  className="portal-btn-primary w-full"
                >
                  {submitting
                    ? 'Processing subscription...'
                    : otpStep
                    ? 'Verify & complete subscription'
                    : `Subscribe for ${formatEuro(totalCost)}`}
                </button>

                {totalCost > balance && (
                  <button
                    type="button"
                    onClick={() => navigatePortal('deposit')}
                    className="portal-btn-secondary w-full"
                  >
                    Deposit funds to cover {formatEuro(totalCost - balance)}
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
