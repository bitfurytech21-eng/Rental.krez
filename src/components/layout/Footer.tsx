import React from 'react';
import { FOOTER_LINKS } from '../../data/navigation';
import { COMPANY_REGISTRATION } from '../../data/institutionalConfig';
import { Mail, MapPin, ExternalLink } from 'lucide-react';

interface FooterProps {
  onNavigate: (path: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-[#0B1B30] text-[#D1E2F7] pt-16 pb-12 border-t border-[#1D3860] overflow-hidden max-w-full">
      <div className="container max-w-[1280px] mx-auto px-4 sm:px-6">
        {/* Main Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-[#1D3860]">
          {/* Brand & Corporate Registry */}
          <div className="space-y-4 text-left">
            <div className="flex items-center gap-2.5">
              <img
                src="/assets/aistudio/IMG_7234_bd44519a.jpeg"
                alt="L'Agence Logo"
                className="w-8 h-8 rounded object-cover border border-[#1D3860]"
              />
              <span className="font-serif text-xl font-bold tracking-tight text-white">
                L&apos;Agence<span className="text-[#BEE179]">.</span>
              </span>
            </div>

            <p className="text-xs sm:text-sm text-[#D1E2F7] leading-relaxed font-medium">
              Institutional-grade tokenized European luxury real estate. Ring-fenced SPV custody, independent RICS appraisals, and Solana SPL / USDC settlement infrastructure.
            </p>
          </div>

          {/* Platform Links */}
          <div className="text-left">
            <h4 className="text-[11px] uppercase tracking-[0.15em] text-[#BEE179] font-extrabold mb-4">
              Platform &amp; Offerings
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              {FOOTER_LINKS.platform.map((item) => (
                <li key={`plat-${item.label}-${item.path}`}>
                  <button
                    type="button"
                    onClick={() => onNavigate(item.path)}
                    className="text-slate-200 hover:text-[#BEE179] font-semibold transition-colors text-left cursor-pointer"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal & Regulatory Links */}
          <div className="text-left">
            <h4 className="text-[11px] uppercase tracking-[0.15em] text-[#BEE179] font-extrabold mb-4">
              Legal &amp; Documentation
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              {FOOTER_LINKS.legal.map((item) => (
                <li key={`leg-${item.label}-${item.path}`}>
                  <button
                    type="button"
                    onClick={() => onNavigate(item.path)}
                    className="text-slate-200 hover:text-[#BEE179] font-semibold transition-colors text-left cursor-pointer"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Offices, On-Chain Explorer & Advisory */}
          <div className="text-left">
            <h4 className="text-[11px] uppercase tracking-[0.15em] text-[#BEE179] font-extrabold mb-4">
              Offices &amp; Governance
            </h4>
            <div className="space-y-2.5 text-xs sm:text-sm">
              {FOOTER_LINKS.support.map((item) => (
                <div key={`sup-${item.label}-${item.path}`}>
                  <button
                    type="button"
                    onClick={() => onNavigate(item.path)}
                    className="text-slate-200 hover:text-[#BEE179] font-semibold transition-colors text-left text-xs cursor-pointer"
                  >
                    {item.label}
                  </button>
                </div>
              ))}

              <div className="flex items-start gap-2.5 pt-2">
                <MapPin className="w-4 h-4 text-[#BEE179] shrink-0 mt-0.5 stroke-[2.5]" aria-hidden="true" />
                <div className="space-y-1 text-xs text-slate-200 leading-relaxed">
                  <div className="font-semibold">{COMPANY_REGISTRATION.parisOffice}</div>
                  <a
                    href="https://maps.google.com/maps/place//data=!4m2!3m1!1s0x12a4a3069490fcf7:0x3a4797b32e1a90ce?entry=s&sa=X&ved=2ahUKEwjuy4P6jcmXAxXyZkEAHSLXJk8Q4kB6BAgVEAA&hl=en"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#9EB5D4] hover:text-[#BEE179] transition-colors inline-flex items-center gap-1"
                  >
                    <span>{COMPANY_REGISTRATION.barcelonaOffice}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <Mail className="w-4 h-4 text-[#BEE179] shrink-0 stroke-[2.5]" aria-hidden="true" />
                <a
                  href={`mailto:${COMPANY_REGISTRATION.primaryEmail}`}
                  className="text-xs font-semibold text-slate-200 hover:text-[#BEE179]"
                >
                  {COMPANY_REGISTRATION.primaryEmail}
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Copyright & Footer Links */}
        <div className="pt-6 flex flex-col lg:flex-row items-start lg:items-center justify-between text-xs text-[#8EA7C7] font-medium gap-4">
          <div className="text-left">
            <p>© {new Date().getFullYear()} L&apos;Agence Real Estate. All rights reserved.</p>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <button
              type="button"
              onClick={() => onNavigate('/trust')}
              className="hover:text-[#BEE179] cursor-pointer transition-colors font-semibold"
            >
              Trust Centre
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/legal')}
              className="hover:text-[#BEE179] cursor-pointer transition-colors font-semibold"
            >
              Legal Centre
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/privacy')}
              className="hover:text-[#BEE179] cursor-pointer transition-colors font-semibold"
            >
              Privacy Policy
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/cookies')}
              className="hover:text-[#BEE179] cursor-pointer transition-colors font-semibold"
            >
              Cookie Policy
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/terms')}
              className="hover:text-[#BEE179] cursor-pointer transition-colors font-semibold"
            >
              Terms &amp; Conditions
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
