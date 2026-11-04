import React, { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Property } from '../../types/property';
import { SOLANA_INFRASTRUCTURE_REGISTRY } from '../../data/institutionalConfig';
import {
  verifyInfrastructureAccountsOnMainnet,
  SolanaAccountVerificationResult,
} from '../../lib/solanaService';
import { formatCurrency, formatPercent } from '../../lib/utils';
import {
  Building2,
  Coins,
  Users,
  Landmark,
  Calculator,
  Wallet,
  PieChart,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';

interface SolanaInfrastructureSectionProps {
  properties: Property[];
  onNavigateToken: () => void;
  onNavigateTrust: () => void;
  onSelectProperty?: (property: Property) => void;
}

export const SolanaInfrastructureSection: React.FC<SolanaInfrastructureSectionProps> = ({
  properties,
  onNavigateToken,
  onNavigateTrust,
  onSelectProperty,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const [copiedAddr, setCopiedAddr] = useState<string | null>(null);
  const [activeStageIdx, setActiveStageIdx] = useState<number>(0);
  const [subscriptionEur, setSubscriptionEur] = useState<number>(5000);
  const [isVerifyingRpc, setIsVerifyingRpc] = useState<boolean>(false);
  const [rpcVerifications, setRpcVerifications] = useState<
    Record<string, SolanaAccountVerificationResult>
  >({});

  const liveOfferings = useMemo(
    () =>
      properties.filter(
        (p) =>
          p.status !== 'hidden' &&
          p.status !== 'pending_approval' &&
          p.approvedForFrontend !== false &&
          Boolean(p.assignedFunction)
      ),
    [properties]
  );

  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const activeProperty = useMemo(() => {
    if (liveOfferings.length === 0) return null;
    return liveOfferings.find((p) => p.id === selectedPropertyId) || liveOfferings[0];
  }, [liveOfferings, selectedPropertyId]);

  // Compute pipeline numbers from actual selected offering underwriting data (or clearly labeled illustrative fallback)
  const pipelineMetrics = useMemo(() => {
    if (activeProperty) {
      const fb = activeProperty.financialBreakdown;
      const targetCap = activeProperty.targetAmount || fb?.totalProjectCost || 1000000;
      const tokenPrice = activeProperty.tokenPrice || 100;
      const totalTokens = activeProperty.totalTokens || Math.round(targetCap / tokenPrice);
      const grossAnnualRent =
        fb?.projectedAnnualGrossRent ||
        Math.round((targetCap * (activeProperty.estimatedAnnualYield + 2.2)) / 100);
      const annualExpenses =
        fb?.estimatedOperatingExpenses || Math.round(grossAnnualRent * 0.18);
      const netAnnualRent =
        fb?.projectedAnnualNetRent || Math.max(0, grossAnnualRent - annualExpenses);
      const unitsSubscribed = Math.max(1, Math.floor(subscriptionEur / tokenPrice));
      const effectiveSubscription = unitsSubscribed * tokenPrice;
      const ownershipShare = Math.min(1, effectiveSubscription / (targetCap || 1));
      const investorAnnualDistribution = netAnnualRent * ownershipShare;
      const investorMonthlyDistribution = investorAnnualDistribution / 12;

      return {
        isLiveOfferingData: true,
        assetTitle: activeProperty.title,
        assetLocation: activeProperty.location,
        targetCap,
        tokenPrice,
        totalTokens,
        fundedAmount: activeProperty.fundedAmount || 0,
        grossAnnualRent,
        annualExpenses,
        netAnnualRent,
        netYieldPercent: activeProperty.estimatedAnnualYield,
        unitsSubscribed,
        effectiveSubscription,
        ownershipBasisPoints: Number((ownershipShare * 10000).toFixed(2)),
        investorAnnualDistribution,
        investorMonthlyDistribution,
      };
    }

    // Fallback illustrative model when catalog is empty
    const targetCap = 1250000;
    const tokenPrice = 250;
    const totalTokens = 5000;
    const grossAnnualRent = 132500;
    const annualExpenses = 22500;
    const netAnnualRent = 110000;
    const unitsSubscribed = Math.max(1, Math.floor(subscriptionEur / tokenPrice));
    const effectiveSubscription = unitsSubscribed * tokenPrice;
    const ownershipShare = effectiveSubscription / targetCap;

    return {
      isLiveOfferingData: false,
      assetTitle: 'Illustrative Prime European SPV',
      assetLocation: 'Paris / Barcelona Benchmark',
      targetCap,
      tokenPrice,
      totalTokens,
      fundedAmount: 875000,
      grossAnnualRent,
      annualExpenses,
      netAnnualRent,
      netYieldPercent: 8.8,
      unitsSubscribed,
      effectiveSubscription,
      ownershipBasisPoints: Number((ownershipShare * 10000).toFixed(2)),
      investorAnnualDistribution: netAnnualRent * ownershipShare,
      investorMonthlyDistribution: (netAnnualRent * ownershipShare) / 12,
    };
  }, [activeProperty, subscriptionEur]);

  const stages = [
    {
      step: '01',
      title: 'Property Acquisition',
      metric: formatCurrency(pipelineMetrics.targetCap),
      metricSub: 'Total SPV Capitalization',
      icon: Building2,
      detail:
        'Independent RICS valuation, architectural due diligence, and ring-fenced corporate SPV deed acquisition recorded in the national land registry.',
    },
    {
      step: '02',
      title: 'Token Issuance',
      metric: `${pipelineMetrics.totalTokens.toLocaleString()} Units`,
      metricSub: `${formatCurrency(pipelineMetrics.tokenPrice)} per SPV Unit`,
      icon: Coins,
      detail:
        'SPV participatory capital is denominated into standardized units structured for Solana SPL and Token-2022 compliance extensions.',
    },
    {
      step: '03',
      title: 'Investor Subscriptions',
      metric: formatCurrency(pipelineMetrics.effectiveSubscription),
      metricSub: `${pipelineMetrics.unitsSubscribed} Units (${pipelineMetrics.ownershipBasisPoints} bps)`,
      icon: Users,
      detail:
        'KYC/AML-verified investors subscribe via EUR SEPA wire or Solana Mainnet USDC stablecoin settlement.',
    },
    {
      step: '04',
      title: 'Rental Collection',
      metric: `${formatCurrency(pipelineMetrics.grossAnnualRent)}/yr`,
      metricSub: `${formatCurrency(pipelineMetrics.grossAnnualRent / 12)}/mo Gross Inflow`,
      icon: Landmark,
      detail:
        'Contractual tenant lease payments are collected directly into the segregated SPV operating bank account.',
    },
    {
      step: '05',
      title: 'Expense Deductions',
      metric: `-${formatCurrency(pipelineMetrics.annualExpenses)}/yr`,
      metricSub: 'Management, Taxes & Reserve',
      icon: Calculator,
      detail:
        'Property management fees, municipal taxes, comprehensive building insurance, and maintenance reserves are reconciled before payout.',
    },
    {
      step: '06',
      title: 'USDC Distributions',
      metric: `${formatCurrency(pipelineMetrics.netAnnualRent)}/yr`,
      metricSub: `${formatPercent(pipelineMetrics.netYieldPercent)} Net Distributable Pool`,
      icon: Wallet,
      detail:
        'Net rental surplus is distributed pro-rata on the 1st business day in EUR or Circle USDC (EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v).',
    },
    {
      step: '07',
      title: 'Portfolio Allocation',
      metric: `${formatCurrency(pipelineMetrics.investorMonthlyDistribution)}/mo`,
      metricSub: `${formatCurrency(pipelineMetrics.investorAnnualDistribution)}/yr Projected Share`,
      icon: PieChart,
      detail:
        'Distributions credit directly to your verified investor ledger for instant withdrawal or compounding into additional offerings.',
    },
  ];

  const handleCopy = (address: string) => {
    navigator.clipboard.writeText(address).catch(() => {});
    setCopiedAddr(address);
    setTimeout(() => setCopiedAddr(null), 2000);
  };

  const handleVerifyMainnet = async () => {
    if (isVerifyingRpc) return;
    setIsVerifyingRpc(true);
    try {
      const results = await verifyInfrastructureAccountsOnMainnet();
      setRpcVerifications(results);
    } catch {
      // Keep graceful static Mainnet state if RPC is temporarily unreachable
    } finally {
      setIsVerifyingRpc(false);
    }
  };

  const activeStage = stages[activeStageIdx] || stages[0];

  return (
    <section
      aria-labelledby="solana-infrastructure-heading"
      className="py-16 sm:py-24 bg-[#0B1B30] text-white border-y border-[#1D3860] relative overflow-hidden"
    >
      <div className="container max-w-[1320px] mx-auto px-4 sm:px-6 relative z-10 space-y-14">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-[#1D3860]">
          <div className="max-w-3xl space-y-3 text-left">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#BEE179] block">
              Solana Mainnet Settlement &amp; Financial Cashflow Architecture
            </span>
            <h2
              id="solana-infrastructure-heading"
              className="font-serif text-3xl sm:text-4xl lg:text-[2.65rem] font-bold tracking-tight text-white leading-[1.12]"
            >
              Institutional Real Estate Backed by Verifiable Solana Infrastructure
            </h2>
            <p className="text-sm sm:text-base text-[#9EB5D4] leading-relaxed">
              Every offering combines notarized European Special Purpose Vehicle (SPV) custody with canonical Solana Mainnet token programs and Circle USDC stablecoin settlement rails.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleVerifyMainnet}
              disabled={isVerifyingRpc}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#13294B] hover:bg-[#193560] border border-[#274B7A] text-xs font-bold text-[#BEE179] transition-colors cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isVerifyingRpc ? 'animate-spin' : ''}`} />
              <span>{isVerifyingRpc ? 'Querying Solana Mainnet…' : 'Verify Live Mainnet Accounts'}</span>
            </button>
            <button
              type="button"
              onClick={onNavigateTrust}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#BEE179] hover:bg-[#cde994] text-[#0B1B30] text-xs font-extrabold transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Open Trust Centre</span>
            </button>
          </div>
        </div>

        {/* Part 1: Interactive 7-Stage Financial Cashflow & Tokenisation Pipeline */}
        <div className="bg-[#102442] border border-[#1D3860] rounded-2xl p-5 sm:p-7 space-y-6">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-5 border-b border-[#1D3860]">
            <div className="text-left space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  End-to-End Property &amp; USDC Cashflow Pipeline
                </h3>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-[#0B1B30] border border-[#274B7A] text-[#BEE179]">
                  {pipelineMetrics.isLiveOfferingData
                    ? 'Underwritten Offering Data + Interactive Subscription Model'
                    : 'Illustrative Cashflow Model'}
                </span>
              </div>
              <p className="text-xs text-[#9EB5D4]">
                Select any live marketplace property and subscription amount to inspect capital formation, expense deductions, and net USDC/EUR distributions.
              </p>
            </div>

            {/* Interactive Controls: Property Picker + Subscription Amount Slider */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {liveOfferings.length > 0 && (
                <div className="text-left">
                  <label
                    htmlFor="pipeline-offering-select"
                    className="block text-[10px] font-bold uppercase tracking-wider text-[#8EA7C7] mb-1"
                  >
                    Reference Offering
                  </label>
                  <select
                    id="pipeline-offering-select"
                    value={activeProperty?.id || ''}
                    onChange={(e) => setSelectedPropertyId(e.target.value)}
                    className="w-full sm:w-64 bg-[#0B1B30] border border-[#274B7A] rounded-lg px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-[#BEE179]"
                  >
                    {liveOfferings.slice(0, 18).map((prop) => (
                      <option key={prop.id} value={prop.id}>
                        {prop.title} ({formatPercent(prop.estimatedAnnualYield)} Net)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="text-left min-w-[210px]">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#8EA7C7] mb-1">
                  <label htmlFor="pipeline-sub-slider">Illustrative Allocation</label>
                  <span className="font-mono tabular-nums text-[#BEE179]">
                    {formatCurrency(subscriptionEur)}
                  </span>
                </div>
                <input
                  id="pipeline-sub-slider"
                  type="range"
                  min={1000}
                  max={50000}
                  step={500}
                  value={subscriptionEur}
                  onChange={(e) => setSubscriptionEur(Number(e.target.value))}
                  className="w-full accent-[#BEE179] cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* 7-Stage Interactive Pipeline Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2.5">
            {stages.map((st, idx) => {
              const Icon = st.icon;
              const isSelected = idx === activeStageIdx;
              return (
                <motion.button
                  key={st.step}
                  type="button"
                  onClick={() => setActiveStageIdx(idx)}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{
                    duration: prefersReducedMotion ? 0 : 0.3,
                    delay: prefersReducedMotion ? 0 : idx * 0.04,
                  }}
                  className={`text-left p-3.5 rounded-xl border transition-colors cursor-pointer flex flex-col justify-between min-h-[148px] ${
                    isSelected
                      ? 'bg-[#0B1B30] border-[#BEE179] shadow-md'
                      : 'bg-[#0B1B30]/55 border-[#1D3860] hover:border-[#355A8F]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-mono font-bold text-[#8EA7C7]">
                      STAGE {st.step}
                    </span>
                    <Icon
                      className={`w-4 h-4 ${
                        isSelected ? 'text-[#BEE179]' : 'text-[#8EA7C7]'
                      }`}
                    />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white leading-snug mb-1.5">
                      {st.title}
                    </div>
                    <div className="text-sm font-mono tabular-nums font-extrabold text-[#BEE179]">
                      {st.metric}
                    </div>
                    <div className="text-[10px] text-[#8EA7C7] mt-0.5 leading-tight">
                      {st.metricSub}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Active Stage Detail Bar */}
          <div className="p-4 rounded-xl bg-[#0B1B30] border border-[#1D3860] flex flex-col md:flex-row md:items-center justify-between gap-4 text-left">
            <div className="space-y-1">
              <div className="text-xs font-bold text-[#BEE179]">
                Stage {activeStage.step}: {activeStage.title} — {activeStage.metric}
              </div>
              <p className="text-xs text-[#D1E2F7] leading-relaxed max-w-3xl">
                {activeStage.detail}
              </p>
            </div>
            {activeProperty && onSelectProperty && (
              <button
                type="button"
                onClick={() => onSelectProperty(activeProperty)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#BEE179] hover:underline shrink-0 cursor-pointer"
              >
                <span>Inspect {activeProperty.title} Dossier</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Part 2: Canonical Solana Mainnet Infrastructure Registry */}
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 text-left">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white">
                Verified Solana Mainnet Program &amp; Mint Registry
              </h3>
              <p className="text-xs sm:text-sm text-[#9EB5D4] mt-0.5">
                On-chain protocol programs and Circle USDC stablecoin infrastructure integrated into the platform
              </p>
            </div>
            <button
              type="button"
              onClick={onNavigateToken}
              className="text-xs font-bold text-[#BEE179] hover:underline inline-flex items-center gap-1 cursor-pointer self-start sm:self-auto"
            >
              <span>View Full Token Architecture</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {SOLANA_INFRASTRUCTURE_REGISTRY.map((item) => {
              const rpcInfo = rpcVerifications[item.address];
              return (
                <div
                  key={item.id}
                  className="bg-[#102442] border border-[#1D3860] rounded-2xl p-5 flex flex-col justify-between space-y-4 text-left"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-[#BEE179] block">
                          {item.category}
                        </span>
                        <h4 className="text-sm sm:text-base font-bold text-white mt-0.5">
                          {item.name}
                        </h4>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-400/30 text-[10px] font-mono font-bold text-emerald-300 shrink-0">
                        {rpcInfo
                          ? rpcInfo.exists
                            ? 'RPC LIVE'
                            : 'UNREACHABLE'
                          : 'MAINNET-BETA'}
                      </span>
                    </div>

                    {/* Address Copy Box */}
                    <div className="p-2.5 rounded-xl bg-[#0B1B30] border border-[#1D3860] flex items-center justify-between gap-2">
                      <code className="text-[11px] font-mono text-[#D1E2F7] break-all">
                        {item.address}
                      </code>
                      <button
                        type="button"
                        onClick={() => handleCopy(item.address)}
                        aria-label={`Copy ${item.shortLabel} address`}
                        className="p-1.5 rounded-lg bg-[#13294B] hover:bg-[#1D3860] text-[#BEE179] shrink-0 cursor-pointer transition-colors"
                      >
                        {copiedAddr === item.address ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <ul className="space-y-1.5 text-xs text-[#9EB5D4]">
                      {item.statedPurposes.map((purpose) => (
                        <li key={purpose} className="flex items-start gap-2">
                          <span className="text-[#BEE179] font-bold">·</span>
                          <span>{purpose}</span>
                        </li>
                      ))}
                    </ul>

                    {rpcInfo && rpcInfo.exists && (
                      <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-[10.5px] font-mono text-emerald-300">
                        Verified on Mainnet RPC · Executable: {rpcInfo.executable ? 'Yes' : 'No (Mint Account)'}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-[#1D3860] flex items-center justify-between gap-2 text-xs">
                    <a
                      href={item.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-[#BEE179] hover:underline"
                    >
                      <span>Solana Explorer</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <a
                      href={item.solscanUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-[#9EB5D4] hover:text-white"
                    >
                      <span>Solscan</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mandatory Architectural Distinction Notice */}
          <div className="p-4 rounded-xl bg-[#0E203B] border border-amber-400/30 flex items-start gap-3 text-left">
            <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
            <p className="text-xs text-[#D1E2F7] leading-relaxed">
              <strong className="text-white">Architectural Disclosure:</strong>{' '}
              The USDC Mint (<code className="font-mono text-[#BEE179]">EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v</code>) is Circle&apos;s canonical USD Coin stablecoin mint on Solana Mainnet used for subscription settlement and rental distribution payments. It is not a property-share token mint or an automated rental distribution smart contract; individual property SPV cap-tables are maintained in the notarized SPV registry and mapped to dedicated per-asset token mints as they are deployed.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
