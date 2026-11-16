import React, { useEffect, useRef, useState } from 'react';
import { Building2, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { usePortal } from '../state/PortalContext';
import { portalApi } from '../services/portalApi';
import { PortalProperty } from '../types';
import { formatEuro, formatNumber } from '../utils/format';
import { LoadingSkeleton, ErrorBanner } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import { StatusBadge } from '../components/StatusBadge';

export const PropertyDetailPage: React.FC = () => {
  const toast = useToast();
  const {
    selectedPropertySlug,
    properties,
    portfolio,
    balance,
    portalConfig,
    sampleDataEnabled,
    navigatePortal,
    refreshAll,
  } = usePortal();

  const [property, setProperty] = useState<PortalProperty | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);

  const [tokensCount, setTokensCount] = useState<number>(1);
  const [sharesError, setSharesError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [otpStep, setOtpStep] = useState<{ maskedEmail?: string } | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [txSuccess, setTxSuccess] = useState<{
    certificateId?: string;
    totalCost: number;
    count: number;
  } | null>(null);
  const sharesInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!selectedPropertySlug) {
        setLoading(false);
        return;
      }
      if (sampleDataEnabled) {
        const sampleMatch = properties.find(
          (p) => p.id === selectedPropertySlug || p.slug === selectedPropertySlug
        );
        if (active) {
          setProperty(sampleMatch || null);
          if (sampleMatch) {
            const minT = Math.max(
              1,
              Math.ceil(
                (sampleMatch.minimumInvestment || sampleMatch.tokenPrice || 100) /
                  Math.max(1, sampleMatch.tokenPrice || 100)
              )
            );
            setTokensCount(minT);
          }
          setLoading(false);
        }
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
            Math.ceil(
              (detail.minimumInvestment || detail.tokenPrice || 100) /
                Math.max(1, detail.tokenPrice || 100)
            )
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
  }, [selectedPropertySlug, properties, sampleDataEnabled]);

  if (loading && !property) {
    return <LoadingSkeleton rows={3} />;
  }

  if (!property) {
    return (
      <EmptyState
        icon={<Building2 className="w-5 h-5" />}
        title="Property offering not found"
        description={
          error || 'Select an active property from Explore to inspect its investment terms.'
        }
        actionLabel="Explore properties"
        onAction={() => navigatePortal('explore')}
      />
    );
  }

  const progress =
    property.targetAmount > 0
      ? Math.min(100, Math.round((property.fundedAmount / property.targetAmount) * 100))
      : 0;
  const principalCost = Math.round(tokensCount * property.tokenPrice * 100) / 100;
  const feePct = portalConfig.fees.investmentFeePercent;
  const feeAmount = Math.round(principalCost * (feePct / 100) * 100) / 100;
  const totalCost = Math.round((principalCost + feeAmount) * 100) / 100;
  const estAnnualIncome =
    Math.round(principalCost * (property.projectedYield / 100) * 100) / 100;
  const isOpen = property.status === 'funding' || property.status === 'active';
  const minTokens = Math.max(
    1,
    Math.ceil(
      (property.minimumInvestment || property.tokenPrice) / Math.max(1, property.tokenPrice)
    )
  );
  const minimumEntryEuro = Math.max(
    property.minimumInvestment || 0,
    minTokens * property.tokenPrice
  );

  const targetIrr =
    property.financials?.totalIrr ??
    Number((property.projectedYield + (property.capitalAppreciation || 0)).toFixed(1));
  const termMonths = property.holdingPeriodMonths || 36;
  const termDisplay =
    termMonths >= 12 && termMonths % 12 === 0
      ? `${termMonths / 12} years`
      : `${termMonths} months`;

  const descriptionText =
    property.description ||
    `${property.type} located in ${property.location}, structured through a segregated real estate SPV offering fractional share ownership and ${String(
      property.distributionFrequency || 'monthly'
    ).toLowerCase()} rental distributions.`;

  const userHolding = (portfolio?.holdings || []).find(
    (h) => h.propertyId === property.id || h.propertyTitle === property.title
  );

  const badgeStatus =
    property.status === 'funded' || property.status === 'active' || property.status === 'funding'
      ? 'completed'
      : 'pending';
  const badgeLabel =
    property.status === 'funded'
      ? 'Completed'
      : property.status === 'upcoming'
      ? 'Pending'
      : 'Open';

  const validateShares = (nextCount: number): string | null => {
    if (!Number.isInteger(nextCount) || nextCount < minTokens) {
      return `Minimum subscription is ${minTokens} shares (${formatEuro(minTokens * property.tokenPrice)}).`;
    }
    if (nextCount > property.availableTokens) {
      return `Only ${property.availableTokens.toLocaleString('en-IE')} shares remain available.`;
    }
    const nextPrincipal = Math.round(nextCount * property.tokenPrice * 100) / 100;
    const nextTotal = Math.round((nextPrincipal + nextPrincipal * (feePct / 100)) * 100) / 100;
    if (nextTotal > balance) {
      return `Insufficient wallet balance (${formatEuro(balance)}). Deposit funds before subscribing.`;
    }
    return null;
  };

  const handleSharesChange = (rawVal: string) => {
    const parsed = parseInt(rawVal, 10);
    const safeCount = Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
    setTokensCount(safeCount);
    setSharesError(validateShares(safeCount));
  };

  const focusSubscribeForm = () => {
    setTxSuccess(null);
    sharesInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => sharesInputRef.current?.focus(), 200);
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    if (!isOpen || property.availableTokens <= 0) {
      setError('This property offering is not currently accepting new subscriptions.');
      return;
    }

    const validationMsg = validateShares(tokensCount);
    if (validationMsg) {
      setSharesError(validationMsg);
      return;
    }
    setSharesError(null);

    if (sampleDataEnabled) {
      setTxSuccess({
        certificateId: 'SAMPLE-CERT-PREVIEW',
        totalCost,
        count: tokensCount,
      });
      toast.info(`Sample subscription previewed (${tokensCount} shares).`);
      return;
    }

    if (otpStep && otpCode.trim().length !== 6) {
      setOtpError('Enter the 6-digit email security code.');
      return;
    }
    setOtpError(null);

    setSubmitting(true);
    try {
      let grantId: string | undefined;
      if (otpStep) {
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
          <div className="portal-card space-y-5">
            <div className="h-56 sm:h-72 w-full rounded-[12px] overflow-hidden bg-[#172228] border border-[#1F2C33]">
              {property.images?.[0] && !imgFailed ? (
                <img
                  src={property.images[0]}
                  alt={property.title}
                  referrerPolicy="no-referrer"
                  onError={() => setImgFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-[#6FD8B0]">
                  <Building2 className="w-10 h-10" />
                  <span className="text-xs text-[#8FA1A8]">{property.location}</span>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="text-xs text-[#8FA1A8] flex items-center gap-2 flex-wrap">
                    <span>{property.location}</span>
                    <span aria-hidden="true">·</span>
                    <span>{property.type}</span>
                  </div>
                  <StatusBadge status={badgeStatus} label={badgeLabel} />
                </div>
                <h2 className="mt-2 text-2xl font-heading font-bold text-[#F2F5F4]">
                  {property.title}
                </h2>
                <p className="mt-2 text-sm text-[#8FA1A8] leading-relaxed">{descriptionText}</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-[#1F2C33]">
                <div>
                  <div className="text-xs font-medium text-[#8FA1A8]">Target yield</div>
                  <div className="mt-1 text-lg font-bold text-[#6FD8B0] portal-tabular">
                    {formatNumber(property.projectedYield, 1)}%
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-[#8FA1A8]">Target IRR</div>
                  <div className="mt-1 text-lg font-bold text-[#F2F5F4] portal-tabular">
                    {formatNumber(targetIrr, 1)}%
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-[#8FA1A8]">Term</div>
                  <div className="mt-1 text-lg font-bold text-[#F2F5F4] portal-tabular">
                    {termDisplay}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-[#8FA1A8]">Share price</div>
                  <div className="mt-1 text-lg font-bold text-[#F2F5F4] portal-tabular">
                    {formatEuro(property.tokenPrice)}
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#8FA1A8] portal-tabular">
                    Funding progress · {formatEuro(property.fundedAmount)} of{' '}
                    {formatEuro(property.targetAmount)}
                  </span>
                  <span className="font-semibold text-[#F2F5F4] portal-tabular">{progress}%</span>
                </div>
                <div className="portal-progress-track">
                  <div className="portal-progress-fill" style={{ width: `${progress}%` }} />
                </div>
              </div>

              {isOpen && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={focusSubscribeForm}
                    className="portal-btn-primary w-full sm:w-auto"
                  >
                    Invest from {formatEuro(minimumEntryEuro)}
                  </button>
                </div>
              )}
            </div>
          </div>

          {userHolding && (
            <section className="portal-card space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-[#F2F5F4]">
                  Your holding in this property
                </h3>
                <StatusBadge status="completed" label="Active" />
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs pt-1">
                <div>
                  <div className="text-[#8FA1A8]">Shares</div>
                  <div className="mt-0.5 text-sm font-bold text-[#F2F5F4] portal-tabular">
                    {formatNumber(userHolding.tokensPurchased)}
                  </div>
                </div>
                <div>
                  <div className="text-[#8FA1A8]">Current value</div>
                  <div className="mt-0.5 text-sm font-bold text-[#F2F5F4] portal-tabular">
                    {formatEuro(userHolding.currentValue)}
                  </div>
                </div>
                <div>
                  <div className="text-[#8FA1A8]">Rent earned</div>
                  <div className="mt-0.5 text-sm font-bold text-[#6FD8B0] portal-tabular">
                    {formatEuro(userHolding.dividendsReceived)}
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Subscription Execution Card */}
        <div className="lg:col-span-5">
          {txSuccess ? (
            <div className="portal-card space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="w-11 h-11 rounded-[14px] bg-[#6FD8B0]/12 border border-[#6FD8B0]/35 text-[#6FD8B0] flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <StatusBadge status="completed" />
              </div>
              <h3 className="text-lg font-semibold text-[#F2F5F4]">Subscription confirmed</h3>
              <p className="text-sm text-[#8FA1A8] leading-relaxed">
                You acquired{' '}
                <span className="text-[#F2F5F4] font-semibold portal-tabular">
                  {txSuccess.count} shares
                </span>{' '}
                in {property.title} for{' '}
                <span className="text-[#F2F5F4] font-semibold portal-tabular">
                  {formatEuro(txSuccess.totalCost)}
                </span>
                .
              </p>
              {txSuccess.certificateId && (
                <div className="portal-surface-elevated p-3 text-xs">
                  <span className="text-[#8FA1A8]">SPV Certificate ID · </span>
                  <span className="font-mono text-[#6FD8B0]">{txSuccess.certificateId}</span>
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
            <form onSubmit={handleSubscribe} noValidate className="portal-card space-y-5">
              <div>
                <h3 className="text-lg font-semibold text-[#F2F5F4]">Subscribe to SPV shares</h3>
                <p className="text-xs text-[#8FA1A8] mt-1 portal-tabular">
                  Available wallet balance · {formatEuro(balance)} ·{' '}
                  {formatNumber(property.availableTokens)} shares left
                </p>
              </div>

              <div>
                <label
                  htmlFor="portal-share-count"
                  className="block text-sm font-medium text-[#F2F5F4] mb-2"
                >
                  Number of shares <span className="text-xs text-[#8FA1A8]">(Min {minTokens})</span>
                </label>
                <input
                  ref={sharesInputRef}
                  id="portal-share-count"
                  type="number"
                  min={minTokens}
                  max={Math.max(minTokens, property.availableTokens)}
                  value={tokensCount || ''}
                  onChange={(e) => handleSharesChange(e.target.value)}
                  aria-invalid={Boolean(sharesError)}
                  aria-describedby={sharesError ? 'portal-share-count-error' : undefined}
                  className={`portal-input portal-tabular ${sharesError ? '!border-[#FB7185]' : ''}`}
                />
                {sharesError && (
                  <p id="portal-share-count-error" role="alert" className="mt-1.5 text-xs text-[#FB7185]">
                    {sharesError}
                  </p>
                )}
              </div>

              <div className="portal-surface-elevated p-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#8FA1A8]">Share price</span>
                  <span className="text-[#F2F5F4] font-semibold portal-tabular">
                    {formatEuro(property.tokenPrice)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#8FA1A8]">
                    Settlement fee ({formatNumber(feePct, 2)}%)
                  </span>
                  <span className="text-[#F2F5F4] font-semibold portal-tabular">
                    {formatEuro(feeAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#8FA1A8]">Estimated annual rent</span>
                  <span className="text-[#6FD8B0] font-semibold portal-tabular">
                    +{formatEuro(estAnnualIncome)} / yr
                  </span>
                </div>
                <div className="pt-2 border-t border-[#1F2C33] flex items-center justify-between text-sm">
                  <span className="font-semibold text-[#F2F5F4]">Total subscription</span>
                  <span className="font-bold text-[#6FD8B0] portal-tabular">
                    {formatEuro(totalCost)}
                  </span>
                </div>
              </div>

              {otpStep && (
                <div className="portal-surface-elevated p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#6FD8B0]">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Email security code ({otpStep.maskedEmail})</span>
                  </div>
                  <input
                    id="property-otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setOtpCode(val);
                      if (otpError && val.length === 6) setOtpError(null);
                    }}
                    aria-invalid={Boolean(otpError)}
                    aria-describedby={otpError ? 'property-otp-error' : undefined}
                    placeholder="Enter 6-digit code"
                    className={`portal-input tracking-[0.3em] font-mono ${
                      otpError ? '!border-[#FB7185]' : ''
                    }`}
                  />
                  {otpError && (
                    <p id="property-otp-error" role="alert" className="text-xs text-[#FB7185]">
                      {otpError}
                    </p>
                  )}
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
                    : `Invest from ${formatEuro(totalCost)}`}
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

              <p className="text-xs text-[#8FA1A8] text-center leading-relaxed pt-1 border-t border-[#1F2C33]">
                Capital at risk. Target figures are not guaranteed.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
