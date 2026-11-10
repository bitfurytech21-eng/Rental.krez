import { useState } from 'react';
import { LagenceLogo } from '../common/LagenceLogo';
import { ArrowRight } from 'lucide-react';

interface FooterProps {
  onNavigate: (path: string) => void;
}

const EXPLORE_LINKS = [
  { to: '/properties', label: 'Properties' },
  { to: '/how-it-works', label: 'How It Works' },
  { to: '/portfolio', label: 'Portfolio' },
  { to: '/club', label: 'Club Privé & Memberships' },
  { to: '/team', label: 'Team' },
  { to: '/blog', label: 'Blog & Academy' },
  { to: '/journal', label: 'Journal' },
  { to: '/contact', label: 'Contact' },
];

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail || !newsletterEmail.includes('@')) {
      setNewsletterStatus('error');
      return;
    }
    try {
      await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newsletterEmail }),
      });
      setNewsletterStatus('success');
      setNewsletterEmail('');
    } catch {
      setNewsletterStatus('error');
    }
  };

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
              <LagenceLogo className="h-8 w-8 text-[#b68a48] shrink-0" />
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

          <div>
            <h2 className="text-xs font-semibold tracking-widest uppercase text-white/50">
              Market Brief
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-white/70">
              Monthly insights on tokenized real estate, yield performance, and new SPV offerings.
            </p>
            <form onSubmit={handleNewsletterSubmit} className="mt-4 flex flex-wrap gap-2">
              <input
                type="email"
                placeholder="Your email"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                required
                className="flex-1 min-w-[150px] px-3 py-2 rounded-full border border-white/20 bg-white/5 text-white placeholder-white/40 focus:border-accent focus:outline-none text-sm"
              />
              <button
                type="submit"
                disabled={newsletterStatus === 'success'}
                className="px-4 py-2 rounded-full bg-[#c59b4c] text-[#0B1B30] text-xs font-bold uppercase tracking-wider hover:bg-[#b88f3f] transition-colors cursor-pointer disabled:opacity-60"
              >
                Subscribe
              </button>
            </form>
            {newsletterStatus === 'success' && (
              <p className="mt-2 text-xs text-emerald-400">Thanks for subscribing.</p>
            )}
            {newsletterStatus === 'error' && (
              <p className="mt-2 text-xs text-rose-400">Please enter a valid email.</p>
            )}
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
