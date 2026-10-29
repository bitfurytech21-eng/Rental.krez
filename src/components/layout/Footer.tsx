import React from 'react';
import { FOOTER_LINKS } from '../../data/navigation';
import { ShieldCheck, Mail, MapPin, ExternalLink } from 'lucide-react';
import { HeaderLanguageButton } from './HeaderLanguageButton';

interface FooterProps {
  onNavigate: (path: string) => void;
}

/**
 * Footer component styled to match the exact Deep Navy (#0B1B30) and Lime Green (#BEE179)
 * color scheme and thickened typography of the header and hero section.
 */
export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-[#0B1B30] text-[#D1E2F7] pt-16 pb-12 border-t border-[#1D3860] overflow-hidden max-w-full">
      <div className="container max-w-[1240px] mx-auto px-4 sm:px-6">
        
        {/* Main Columns */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-[#1D3860]">
          
          {/* Brand & About */}
          <div className="space-y-4 text-left">
            <div className="flex items-center gap-2.5">
              <img 
                src="/assets/aistudio/IMG_7234_bd44519a.jpeg" 
                alt="L'Agence Logo" 
                className="w-8 h-8 rounded object-cover border border-[#1D3860]"
              />
              <span className="font-serif text-xl font-bold tracking-tight text-white">
                L'Agence<span className="text-[#BEE179]">.</span>
              </span>
            </div>
            
            <p className="text-xs sm:text-sm text-[#D1E2F7] leading-relaxed font-semibold">
              Institutional-grade tokenized real estate and luxury estates. Ring-fenced SPV custody, independent RICS appraisals, and automated monthly distributions.
            </p>
            
            <div className="flex items-center gap-2 text-xs text-[#BEE179] font-bold pt-1">
              <ShieldCheck className="w-4 h-4 text-[#BEE179] shrink-0 stroke-[2.5]" aria-hidden="true" />
              <span>EU Compliant SPV Asset Ring-Fencing</span>
            </div>
          </div>

          {/* Platform Links */}
          <div className="text-left">
            <h4 className="text-[11px] uppercase tracking-[0.15em] text-[#BEE179] font-extrabold mb-4">Platform</h4>
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

          {/* Legal Links */}
          <div className="text-left">
            <h4 className="text-[11px] uppercase tracking-[0.15em] text-[#BEE179] font-extrabold mb-4">Legal & Regulatory</h4>
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

          {/* Contact & Presence */}
          <div className="text-left">
            <h4 className="text-[11px] uppercase tracking-[0.15em] text-[#BEE179] font-extrabold mb-4">Offices & Advisory</h4>
            <div className="space-y-3 text-xs sm:text-sm">
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
                <a
                  href="https://maps.google.com/maps/place//data=!4m2!3m1!1s0x12a4a3069490fcf7:0x3a4797b32e1a90ce?entry=s&sa=X&ved=2ahUKEwjuy4P6jcmXAxXyZkEAHSLXJk8Q4kB6BAgVEAA&hl=en"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-200 hover:text-[#BEE179] transition-colors text-xs leading-relaxed group"
                  title="Open live location in Google Maps"
                >
                  <span className="hover:underline font-semibold">Carrer de Pau Claris, 139, Eixample, 08009 Barcelona, Spain</span>
                  <ExternalLink className="w-3 h-3 inline-block ml-1 text-[#8EA7C7] group-hover:text-[#BEE179]" aria-hidden="true" />
                </a>
              </div>

              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#BEE179] shrink-0 stroke-[2.5]" aria-hidden="true" />
                <span className="text-xs font-semibold text-slate-200">info@kretz.site</span>
              </div>
            </div>
          </div>

        </div>

        {/* Copyright & Regional Options */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-[#8EA7C7] font-medium gap-4">
          <div className="flex items-center gap-4">
            <p>© {new Date().getFullYear()} L'Agence Real Estate S.L. All rights reserved.</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-6">
            <button type="button" onClick={() => onNavigate('/privacy')} className="hover:text-[#BEE179] cursor-pointer transition-colors font-semibold">Privacy Policy</button>
            <button type="button" onClick={() => onNavigate('/terms')} className="hover:text-[#BEE179] cursor-pointer transition-colors font-semibold">Terms of Use</button>
            <button type="button" onClick={() => onNavigate('/contact')} className="hover:text-[#BEE179] cursor-pointer transition-colors font-semibold">Direct Support</button>
            <button type="button" onClick={() => onNavigate('/admin/login')} className="hover:text-[#BEE179] cursor-pointer transition-colors font-semibold">Admin Gateway</button>
          </div>
        </div>

      </div>
    </footer>
  );
};
