import React, { useState, useEffect } from 'react';
import { Investment } from '../../types/investment';
import { Property } from '../../types/property';
import { User } from '../../types/user';
import { 
  X, Printer, Download, ShieldCheck, CheckCircle2, 
  FileText, ExternalLink, Award, Building2, Coins, ArrowRight, Loader2
} from 'lucide-react';
import { 
  buildInvestmentAgreementData, 
  downloadAgreementPdf, 
  printAgreementDocument, 
  InvestmentAgreementData 
} from '../../lib/investmentAgreementService';
import { formatCurrency } from '../../lib/utils';

export interface InvestmentAgreementModalProps {
  isOpen: boolean;
  onClose: () => void;
  investment: Investment | null;
  property?: Property | null;
  user?: User | null;
}

export const InvestmentAgreementModal: React.FC<InvestmentAgreementModalProps> = ({
  isOpen,
  onClose,
  investment,
  property,
  user,
}) => {
  const [agreementData, setAgreementData] = useState<InvestmentAgreementData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'articles' | 'signatures'>('preview');

  useEffect(() => {
    let isMounted = true;
    if (isOpen && investment) {
      setLoading(true);
      buildInvestmentAgreementData(investment, property, user)
        .then((data) => {
          if (isMounted) {
            setAgreementData(data);
            setLoading(false);
          }
        })
        .catch((err) => {
          console.error('Error generating agreement data:', err);
          if (isMounted) setLoading(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen, investment, property, user]);

  if (!isOpen || !investment) return null;

  const handleDownload = async () => {
    if (!agreementData) return;
    try {
      setIsGeneratingPdf(true);
      await downloadAgreementPdf(agreementData);
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    if (!agreementData) return;
    try {
      setIsPrinting(true);
      printAgreementDocument(agreementData);
    } catch (err) {
      console.error('Print failed:', err);
    } finally {
      setTimeout(() => setIsPrinting(false), 1200);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 md:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[92vh]">
        
        {/* Top Header Bar */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 bg-[#142421] text-white flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#27845D] to-[#124233] text-white flex items-center justify-center shrink-0 shadow-md">
              <Award className="w-5 h-5 text-[#B7E36A]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#27845D]/40 text-[#B7E36A] border border-[#B7E36A]/30">
                  Legally Signed & Notarized
                </span>
                <span className="text-[10px] font-mono text-emerald-200/80 hidden sm:inline">
                  {agreementData?.agreementNumber || 'SPV Agreement'}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white leading-tight mt-0.5">
                European Real Estate SPV Investment Agreement
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Action: Direct Print */}
            <button
              onClick={handlePrint}
              disabled={loading || isPrinting}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              title="Print official legal agreement"
            >
              <Printer className="w-3.5 h-3.5 text-[#B7E36A]" />
              <span>{isPrinting ? 'Preparing...' : 'Print Agreement'}</span>
            </button>

            {/* Quick Action: Download PDF */}
            <button
              onClick={handleDownload}
              disabled={loading || isGeneratingPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#27845D] hover:bg-[#1E6849] text-white text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
              title="Download signed legal PDF"
            >
              {isGeneratingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>{isGeneratingPdf ? 'Generating...' : 'Download PDF'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-[#F6F7F4] border-b border-[#E3E8E3] px-5 sm:px-6 flex items-center justify-between text-xs font-bold shrink-0">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => setActiveTab('preview')}
              className={`py-3 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'preview'
                  ? 'border-[#142421] text-[#142421]'
                  : 'border-transparent text-[#69736F] hover:text-[#142421]'
              }`}
            >
              Executive Summary & Parties
            </button>
            <button
              onClick={() => setActiveTab('articles')}
              className={`py-3 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'articles'
                  ? 'border-[#142421] text-[#142421]'
                  : 'border-transparent text-[#69736F] hover:text-[#142421]'
              }`}
            >
              Legal Articles & Clauses
            </button>
            <button
              onClick={() => setActiveTab('signatures')}
              className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'signatures'
                  ? 'border-[#142421] text-[#142421]'
                  : 'border-transparent text-[#69736F] hover:text-[#142421]'
              }`}
            >
              <span>Signatures & Notary</span>
              <span className="w-2 h-2 rounded-full bg-[#27845D]"></span>
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2 text-[11px] text-[#69736F]">
            <ShieldCheck className="w-4 h-4 text-[#27845D]" />
            <span>eIDAS QES & Spanish SOCIMI Law 11/2009 Compliant</span>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 p-5 sm:p-7 overflow-y-auto space-y-6">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#27845D] animate-spin mx-auto" />
              <p className="text-sm font-semibold text-[#142421]">Generating legally executed agreement...</p>
            </div>
          ) : agreementData ? (
            <>
              {/* Tab 1: Executive Summary & Parties */}
              {activeTab === 'preview' && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  {/* Top Key Metrics Banner */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#142421] text-white shadow-md">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                      <div className="border-r border-white/10 pr-2">
                        <span className="text-[10px] uppercase font-bold text-[#B7E36A] block">Execution Date</span>
                        <span className="text-sm sm:text-base font-black text-white">{agreementData.formattedDate}</span>
                      </div>
                      <div className="border-r border-white/10 pr-2">
                        <span className="text-[10px] uppercase font-bold text-[#B7E36A] block">Units Allocated</span>
                        <span className="text-sm sm:text-base font-black text-white">
                          {agreementData.investment.tokensPurchased.toLocaleString()} Shares
                        </span>
                      </div>
                      <div className="border-r border-white/10 pr-2">
                        <span className="text-[10px] uppercase font-bold text-[#B7E36A] block">Total Principal</span>
                        <span className="text-sm sm:text-base font-black text-[#B7E36A]">
                          {formatCurrency(agreementData.investment.totalAmountInvested)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#B7E36A] block">Monthly Yield</span>
                        <span className="text-sm sm:text-base font-black text-emerald-300">
                          +{formatCurrency(agreementData.investment.projectedMonthlyIncome)}/mo
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Contracting Parties Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Party A: The Issuer */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-[#E3E8E3]">
                        <span className="text-xs font-black uppercase text-[#142421] flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-[#27845D]" />
                          Party A: The Issuer & SPV Manager
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          Manager
                        </span>
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-[#69736F] block">Entity Name</span>
                          <span className="font-extrabold text-[#142421]">{agreementData.issuer.companyName}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase text-[#69736F] block">Registered Office</span>
                          <span className="font-medium text-[#142421]">{agreementData.issuer.address}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase text-[#69736F] block">Tax ID & Commercial Registry</span>
                          <span className="font-mono font-semibold text-[#142421]">{agreementData.issuer.cif} · Barcelona Vol. 48210</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase text-[#69736F] block">Managing Signatory</span>
                          <span className="font-bold text-[#142421]">{agreementData.issuer.signatoryName} ({agreementData.issuer.signatoryTitle})</span>
                        </div>
                      </div>
                    </div>

                    {/* Party B: The Investor */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-[#E3E8E3]">
                        <span className="text-xs font-black uppercase text-[#142421] flex items-center gap-1.5">
                          <Coins className="w-3.5 h-3.5 text-[#27845D]" />
                          Party B: The Qualified Investor
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#142421] text-[#B7E36A]">
                          KYC Verified
                        </span>
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-[#69736F] block">Investor Legal Name</span>
                          <span className="font-extrabold text-[#142421]">{agreementData.investor.name}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase text-[#69736F] block">Account Reference & Email</span>
                          <span className="font-medium text-[#142421]">{agreementData.investor.email} (ID: {agreementData.investor.id})</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase text-[#69736F] block">EVM Custody / Ledger Wallet</span>
                          <span className="font-mono text-[11px] font-semibold text-[#27845D] break-all">{agreementData.investor.walletAddress}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase text-[#69736F] block">Digital Acceptance Hash</span>
                          <span className="font-mono text-[10px] text-[#69736F] break-all">{agreementData.investor.signatureHash}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Underlying Property & SPV Specification */}
                  <div className="p-4 sm:p-5 rounded-2xl border border-[#E3E8E3] bg-white space-y-3">
                    <h3 className="text-xs font-black uppercase text-[#142421] pb-2 border-b border-[#E3E8E3]">
                      Underlying Real Estate Asset & SPV Ring-Fencing
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-[#69736F] block">Asset Title</span>
                        <span className="font-extrabold text-[#142421]">{agreementData.property.title}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-[#69736F] block">Location</span>
                        <span className="font-medium text-[#142421]">{agreementData.property.location}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-[#69736F] block">Cadastral Ref</span>
                        <span className="font-mono text-emerald-800 font-bold">{agreementData.property.cadastralRef}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-[#69736F] block">Dedicated SPV Entity</span>
                        <span className="font-bold text-[#142421]">{agreementData.property.spvEntity}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-[#69736F] block">SPV Tax Code (CIF)</span>
                        <span className="font-mono font-bold text-[#142421]">{agreementData.property.spvCif}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-[#69736F] block">Audited Asset Valuation</span>
                        <span className="font-bold text-[#27845D]">{formatCurrency(agreementData.property.totalValuation)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Legal Articles & Clauses */}
              {activeTab === 'articles' && (
                <div className="space-y-4 animate-in fade-in duration-150 text-xs">
                  <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-950 space-y-1">
                    <h4 className="font-bold flex items-center gap-1.5 text-amber-900">
                      <ShieldCheck className="w-4 h-4 text-amber-700" />
                      Binding European Commercial Law Articles
                    </h4>
                    <p className="text-[11px] leading-relaxed text-amber-900/90">
                      These articles form an irrevocable commercial contract under Spanish SOCIMI Act 11/2009 and European Union MiCA Regulation (EU) 2023/1114.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-1.5">
                    <h4 className="font-black text-[#142421]">ARTICLE I: OBJECT & FRACTIONAL SPV BENEFICIAL TITLE</h4>
                    <p className="text-[#384642] leading-relaxed">
                      1.1. The Issuer confirms the subscription and irreversible issuance to the Investor of the designated Fractional Participatory Notes. Each Note embodies an indefeasible proportional beneficial interest in the rental yields, commercial operations, and net liquidation proceeds of the dedicated Special Purpose Vehicle (SPV) holding legal title to the Underlying Real Estate Asset.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-1.5">
                    <h4 className="font-black text-[#142421]">ARTICLE II: MONTHLY YIELD DISTRIBUTION & ESCROW PROTOCOL</h4>
                    <p className="text-[#384642] leading-relaxed">
                      2.1. Net rental distributions are calculated calendar-monthly and credited automatically to the Investor verified liquid wallet on the first business day following month-end close. All rental proceeds are segregated and collected into an independent escrow depository account, free from company operational commingling.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-1.5">
                    <h4 className="font-black text-[#142421]">ARTICLE III: BANKRUPTCY-REMOTENESS & RING-FENCED ASSET INSULATION</h4>
                    <p className="text-[#384642] leading-relaxed">
                      3.1. The Underlying Real Estate Asset is held within an autonomous, ring-fenced European SPV. Pursuant to Spanish Commercial Jurisprudence, neither the property deed nor the investor fractional rights may be attached, encumbered, or liquidated to satisfy any liabilities, debts, or claims of L'Agence Real Estate S.L. or associated platform entities.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-1.5">
                    <h4 className="font-black text-[#142421]">ARTICLE IV: SECONDARY MARKETPLACE & LIQUIDITY RIGHTS</h4>
                    <p className="text-[#384642] leading-relaxed">
                      4.1. The Investor maintains the right to hold the Participatory Notes until scheduled SPV asset divestment or list the Notes for secondary peer-to-peer transfer via the L'Agence Marketplace in accordance with regulatory transfer requirements and MiCA guidelines.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-1.5">
                    <h4 className="font-black text-[#142421]">ARTICLE V: APPLICABLE LAW & ARBITRAL JURISDICTION</h4>
                    <p className="text-[#384642] leading-relaxed">
                      5.1. This Agreement is governed by and construed in accordance with the substantive laws of the Kingdom of Spain and European Union Real Estate Directives. Any controversy arising hereunder shall be submitted to the exclusive jurisdiction of the Commercial Courts of Barcelona, Spain.
                    </p>
                  </div>
                </div>
              )}

              {/* Tab 3: Signatures & Notary */}
              {activeTab === 'signatures' && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Issuer Signature Card */}
                    <div className="p-5 rounded-2xl border-2 border-[#142421] bg-white space-y-3 relative overflow-hidden shadow-sm">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <span className="text-[11px] font-black uppercase text-[#142421]">Issuer Qualified Signature</span>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-[#27845D]">
                          eIDAS QES
                        </span>
                      </div>

                      <div className="py-2">
                        <p className="text-[10px] text-[#69736F] font-semibold">Authorized Legal Signatory:</p>
                        <div className="font-serif italic text-2xl text-[#142421] my-1 font-bold">
                          Valentin Kretz
                        </div>
                        <p className="text-xs font-black text-[#142421]">{agreementData.issuer.signatoryName}</p>
                        <p className="text-[11px] text-[#52605C]">{agreementData.issuer.signatoryTitle}</p>
                        <p className="text-[10px] text-[#69736F] mt-1">Entity: {agreementData.issuer.companyName}</p>
                      </div>

                      <div className="p-2.5 rounded-xl bg-[#EEF2EC] border border-[#27845D]/20 text-[10px] space-y-0.5">
                        <span className="font-black text-[#27845D] block">✓ Cryptographically Notarized</span>
                        <span className="font-mono text-[9px] text-[#142421] block">
                          Timestamp: {agreementData.executionDate.slice(0, 19).replace('T', ' ')} UTC
                        </span>
                      </div>
                    </div>

                    {/* Investor Signature Card */}
                    <div className="p-5 rounded-2xl border-2 border-[#27845D] bg-white space-y-3 relative overflow-hidden shadow-sm">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <span className="text-[11px] font-black uppercase text-[#27845D]">Investor Digital Consent</span>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#142421] text-[#B7E36A]">
                          Accepted
                        </span>
                      </div>

                      <div className="py-2">
                        <p className="text-[10px] text-[#69736F] font-semibold">Subscribing Investor Signatory:</p>
                        <div className="font-serif italic text-2xl text-[#27845D] my-1 font-bold">
                          {agreementData.investor.name}
                        </div>
                        <p className="text-xs font-black text-[#142421]">{agreementData.investor.name}</p>
                        <p className="text-[11px] text-[#52605C]">ID: {agreementData.investor.id}</p>
                        <p className="text-[10px] text-[#69736F] mt-1 truncate">Wallet: {agreementData.investor.walletAddress}</p>
                      </div>

                      <div className="p-2.5 rounded-xl bg-[#EEF2EC] border border-[#27845D]/20 text-[10px] space-y-0.5">
                        <span className="font-black text-[#27845D] block">✓ Direct Order Settlement Confirmed</span>
                        <span className="font-mono text-[9px] text-[#142421] block truncate">
                          Sig Hash: {agreementData.investor.signatureHash}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Notary Chamber & Blockchain Attestation Strip */}
                  <div className="p-5 rounded-2xl bg-[#142421] text-white flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-[#B7E36A]" />
                        <h4 className="text-xs font-black text-[#B7E36A] uppercase tracking-wider">
                          Official Notarial Protocol Registration
                        </h4>
                      </div>
                      <p className="text-xs text-slate-200">
                        {agreementData.notary.chamber} · {agreementData.notary.protocolNumber}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Governing Law: {agreementData.notary.governingLaw}
                      </p>
                      <div className="pt-1">
                        <span className="text-[10px] font-bold uppercase text-[#B7E36A] block">Blockchain Transaction Ledger:</span>
                        <span className="font-mono text-[10px] text-emerald-300 break-all">
                          {agreementData.investment.transactionHash}
                        </span>
                      </div>
                    </div>

                    {agreementData.qrCodeUrl && (
                      <div className="flex flex-col items-center bg-white p-2.5 rounded-2xl shrink-0 shadow-lg">
                        <img 
                          src={agreementData.qrCodeUrl} 
                          alt="Scan to verify official agreement deed" 
                          className="w-20 h-20"
                        />
                        <span className="text-[8px] font-black text-[#142421] uppercase tracking-tight mt-1">
                          Scan to Verify
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Modal Bottom Action Bar */}
        <div className="p-4 sm:px-6 sm:py-4 bg-[#F6F7F4] border-t border-[#E3E8E3] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-[#52605C]">
            <CheckCircle2 className="w-4 h-4 text-[#27845D]" />
            <span>Ready for instant printing & binding legal storage.</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handlePrint}
              disabled={loading || isPrinting}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-[#142421] text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5 text-[#27845D]" />
              <span>{isPrinting ? 'Preparing...' : 'Print Agreement'}</span>
            </button>

            <button
              onClick={handleDownload}
              disabled={loading || isGeneratingPdf}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-[#142421] hover:bg-[#1E332E] text-white text-xs font-black transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isGeneratingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 text-[#B7E36A]" />}
              <span>{isGeneratingPdf ? 'Generating...' : 'Download Signed PDF'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
