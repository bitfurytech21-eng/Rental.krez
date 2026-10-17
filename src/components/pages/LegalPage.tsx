import React from 'react';
import { ShieldCheck, AlertTriangle } from 'lucide-react';

interface LegalPageProps {
  mode: 'terms' | 'privacy';
}

export const LegalPage: React.FC<LegalPageProps> = ({ mode }) => {
  return (
    <div className="bg-[#F6F7F4] min-h-screen py-12">
      <div className="container max-w-4xl bg-white p-8 sm:p-12 rounded-3xl border border-[#E3E8E3] shadow-sm space-y-8">
        {mode === 'terms' ? (
          <div className="space-y-6 text-xs text-[#69736F] leading-relaxed">
            <div>
              <span className="text-xs font-bold text-[#27845D] uppercase tracking-wider block mb-1">
                Legal & Regulatory Framework
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-[#18211F]">
                General Terms of Service & Investment Disclosures
              </h1>
              <p className="text-xs text-[#828D89] mt-1">Last Updated: March 2026 · Kretz Real Estate S.L.</p>
            </div>

            <section className="space-y-2">
              <h3 className="text-sm font-bold text-[#18211F]">1. Scope of the Platform</h3>
              <p>
                Kretz provides a technology infrastructure enabling registered and identity-verified individuals and entities to subscribe to participatory debt and equity tokens issued by independent Special Purpose Vehicles (SPVs). Each SPV is legally incorporated under Spanish law (Sociedad Limitada) exclusively dedicated to the acquisition, refurbishment, leasing, and eventual liquidation of a specific real estate property.
              </p>
            </section>

            <section id="risks" className="space-y-2 p-4 rounded-2xl bg-amber-50/70 border border-amber-200">
              <div className="flex items-center gap-2 text-[#B7791F] font-bold text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Statutory Risk Warning & Limitation of Liability</span>
              </div>
              <p className="text-[#69736F]">
                Fractional real estate investment involves a high degree of risk. There is no guarantee of returns, and investors risk partial or total loss of invested capital. Real estate markets can experience cyclical fluctuations, tenancy default, property damage, and legislative revisions (including residential tenancy rent indexing caps). Tokenized assets are not covered by standard investor compensation funds (such as FOGAIN) applicable to stock brokerage products.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-bold text-[#18211F]">2. Investor Eligibility & KYC Compliance</h3>
              <p>
                Access to investment funding is strictly restricted to individuals of legal age (18+) who have completed mandatory Know Your Customer (KYC) and Anti-Money Laundering (AML) checks in accordance with European Directive (EU) 2018/843. Citizens or tax residents of sanctioned jurisdictions are strictly prohibited from participating.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-bold text-[#18211F]">3. Rental Distributions</h3>
              <p>
                Dividends represent net rental receipts after deductions for property taxes (IBI), municipal waste duties, homeowners association fees (Comunidad de Propietarios), property management retainers, and statutory maintenance reserve allocations. Distributions are credited in Euros or 1:1 pegged stablecoins to the investor’s internal wallet.
              </p>
            </section>

            <section id="protection" className="space-y-2">
              <h3 className="text-sm font-bold text-[#18211F]">4. Asset Ring-Fencing & Bankruptcy Remoteness</h3>
              <p>
                Because title deeds are held directly by dedicated SPVs rather than the platform operator, any insolvency or corporate restructuring of Kretz Real Estate S.L. does not impact the ownership rights of the property or the SPV assets. A court-appointed administrator would continue distributions in accordance with the underlying SPV articles of association.
              </p>
            </section>
          </div>
        ) : (
          <div className="space-y-6 text-xs text-[#69736F] leading-relaxed">
            <div>
              <span className="text-xs font-bold text-[#27845D] uppercase tracking-wider block mb-1">
                Data Protection & GDPR
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-[#18211F]">
                Privacy Policy
              </h1>
              <p className="text-xs text-[#828D89] mt-1">Compliance: Regulation (EU) 2016/679 (GDPR)</p>
            </div>

            <section className="space-y-2">
              <h3 className="text-sm font-bold text-[#18211F]">1. Data Controller</h3>
              <p>
                Kretz Real Estate S.L., with registered address at Paseo de la Castellana 95, 28046 Madrid, Spain, is the data controller responsible for the processing of your personal data.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-bold text-[#18211F]">2. Data Collected</h3>
              <p>
                We collect personal identification data (full name, government ID/passport number, date of birth, proof of address, nationality) strictly for AML/KYC regulatory verification, and financial records (bank IBAN, wallet address, investment audit history) for transaction execution.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-bold text-[#18211F]">3. Your Rights</h3>
              <p>
                You maintain the legal right to access, rectify, delete, or port your personal data under GDPR Articles 15–22. Requests can be submitted to privacy@kretz.com with proof of identity.
              </p>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};
