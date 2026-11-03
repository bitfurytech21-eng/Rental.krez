import React from 'react';
import { KREZ_IMAGES } from '../../data/krezTemplateData';

interface FooterProps {
  onNavigate: (path: string) => void;
}

const EXPLORE_LINKS = [
  { to: '/properties', label: 'Properties' },
  { to: '/how-it-works', label: 'How It Works' },
  { to: '/team', label: 'Our Team & Leadership' },
  { to: '/portfolio', label: 'Portfolio' },
  { to: '/journal', label: 'Journal' },
  { to: '/contact', label: 'Contact' },
];

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer data-nav-dark="true" className="bg-ink text-white">
      <div className="mx-auto max-w-container px-gutter py-section-sm md:px-gutter-md md:py-section-spacing lg:px-gutter-lg">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr]">
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => onNavigate('/')}
              className="flex items-center gap-3 text-xl font-heading font-semibold tracking-tight text-white cursor-pointer"
            >
              <img
                src={KREZ_IMAGES.logo}
                alt="L'Agence"
                className="h-9 w-9 rounded-lg bg-black object-contain border border-white/25"
              />
              <span>L&apos;Agence</span>
            </button>
            <p className="max-w-sm text-sm leading-relaxed text-white/70">
              Fractional shares in income-producing buildings, with the rent and the costs shown on one ledger.
            </p>
          </div>

          <div>
            <h2 className="text-xs font-semibold tracking-widest uppercase text-white/50">
              Explore
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm text-white/80">
              {EXPLORE_LINKS.map((item) => (
                <li key={item.to}>
                  <button
                    type="button"
                    onClick={() => onNavigate(item.to)}
                    className="transition-colors duration-fast hover:text-white cursor-pointer"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-xs font-semibold tracking-widest uppercase text-white/50">
              Talk to us
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-white/70">
              Questions about a building, how shares are held or how payouts work.
            </p>
            <a
              href="mailto:info@kretzdespain.com"
              className="mt-4 inline-block text-sm font-medium text-white underline underline-offset-4 transition-colors duration-fast hover:text-accent"
            >
              info@kretzdespain.com
            </a>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-8 text-xs text-white/50 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl space-y-1.5">
            <p>
              Figures shown across listings are illustrative projections, not a guarantee of future returns. Capital is at risk.
            </p>
            <p className="font-mono text-[11px] text-white/40">
              SIREN 494 861 560 · RCS Paris · VAT FR80494861560
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <button
              type="button"
              onClick={() => onNavigate('/trust')}
              className="transition-colors duration-fast hover:text-white cursor-pointer"
            >
              Trust Centre
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/legal')}
              className="transition-colors duration-fast hover:text-white cursor-pointer"
            >
              Legal
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/privacy')}
              className="transition-colors duration-fast hover:text-white cursor-pointer"
            >
              Privacy
            </button>
            <p>© 2026 L&apos;Agence. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};
