import React from 'react';
import { FOOTER_LINKS } from '../../data/navigation';
import { ShieldCheck, Mail, MapPin, ExternalLink } from 'lucide-react';
import { HeaderLanguageButton } from './HeaderLanguageButton';

interface FooterProps {
  onNavigate: (path: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-[#DFF0FC] text-[#18211F] pt-16 pb-12 border-t border-[#C8E1F5] overflow-hidden max-w-full">
      <div className="container">
        {/* Main Columns */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-[#E3E8E3]">
          {/* Brand & About */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <img 
                src="/assets/aistudio/IMG_7234_bd44519a.jpeg" 
                alt="Kretz Logo" 
                className="w-9 h-9 rounded-lg object-cover shadow-xs border border-[#C8E1F5]"
                style={{ filter: 'brightness(1.35) contrast(1.22) saturate(1.1)' }}
              />
              <span className="text-xl font-black tracking-tight text-[#18211F]">
                Kretz<span className="text-emerald-700">.</span>
              </span>
            </div>
            <p className="text-sm text-[#69736F] leading-relaxed">
              Institutional-grade tokenized real estate and luxury properties. Ring-fenced SPV custody, independent RICS valuations, and automated monthly distributions.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-800 font-semibold pt-1">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>EU Compliant SPV Asset Ring-Fencing</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs uppercase tracking-wider text-[#18211F] font-bold mb-4">Platform</h4>
            <ul className="space-y-2.5 text-sm text-[#69736F]">
              {FOOTER_LINKS.platform.map((item) => (
                <li key={`plat-${item.label}-${item.path}`}>
                  <button
                    onClick={() => onNavigate(item.path)}
                    className="hover:text-[#18211F] transition-colors text-left"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="text-xs uppercase tracking-wider text-[#18211F] font-bold mb-4">Legal & Regulatory</h4>
            <ul className="space-y-2.5 text-sm text-[#69736F]">
              {FOOTER_LINKS.legal.map((item) => (
                <li key={`leg-${item.label}-${item.path}`}>
                  <button
                    onClick={() => onNavigate(item.path)}
                    className="hover:text-[#18211F] transition-colors text-left"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact & Support */}
          <div>
            <h4 className="text-xs uppercase tracking-wider text-[#18211F] font-bold mb-4">Contact & Presence</h4>
            <div className="space-y-3 text-sm text-[#69736F]">
              {FOOTER_LINKS.support.map((item) => (
                <div key={`sup-${item.label}-${item.path}`}>
                  <button
                    onClick={() => onNavigate(item.path)}
                    className="hover:text-[#18211F] transition-colors text-left text-xs"
                  >
                    {item.label}
                  </button>
                </div>
              ))}
              <div className="flex items-start gap-2.5 pt-2">
                <MapPin className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <a
                  href="https://maps.google.com/maps/place//data=!4m2!3m1!1s0x12a4a3069490fcf7:0x3a4797b32e1a90ce?entry=s&sa=X&ved=2ahUKEwjuy4P6jcmXAxXyZkEAHSLXJk8Q4kB6BAgVEAA&hl=en"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-emerald-700 transition-colors text-xs leading-relaxed group"
                  title="Open live location in Google Maps"
                >
                  <span className="hover:underline">Carrer de Pau Claris, 139, Eixample, 08009 Barcelona, Spain</span>
                  <ExternalLink className="w-3 h-3 inline-block ml-1 text-emerald-700 opacity-70 group-hover:opacity-100" />
                </a>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>info@kretz.site</span>
              </div>
            </div>
          </div>
        </div>


        {/* Copyright & Regional Options */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-[#69736F] gap-4">
          <div className="flex items-center gap-4">
            <p>© 2021 Kretz Real Estate S.L. All rights reserved.</p>
            <HeaderLanguageButton />
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => onNavigate('/privacy')} className="hover:text-[#18211F]">Privacy Policy</button>
            <button onClick={() => onNavigate('/terms')} className="hover:text-[#18211F]">Terms of Use</button>
            <button onClick={() => onNavigate('/contact')} className="hover:text-[#18211F]">Direct Support</button>
          </div>
        </div>
      </div>
    </footer>
  );
};
