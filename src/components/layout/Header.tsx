import React, { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth';
import { KREZ_IMAGES } from '../../data/krezTemplateData';
import { KrezAuthModal, openKrezAuthModal } from '../krez/KrezAuthModal';
import { HeaderLanguageButton } from './HeaderLanguageButton';

interface HeaderProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

const PRIMARY_NAV_ITEMS = [
  { to: '/properties', label: 'Properties' },
  { to: '/how-it-works', label: 'How It Works' },
  { to: '/team', label: 'Our Team' },
  { to: '/portfolio', label: 'Portfolio' },
  { to: '/journal', label: 'Journal' },
  { to: '/contact', label: 'Contact' },
];

export const Header: React.FC<HeaderProps> = ({ currentPath, onNavigate }) => {
  const { user, isAdmin } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [navOnDark, setNavOnDark] = useState(false);

  const cleanPath = (currentPath.split('#')[0] || '/').split('?')[0];

  useEffect(() => {
    setMenuOpen(false);
  }, [currentPath]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const evaluateContrast = () => {
      const darkSections = document.querySelectorAll('[data-nav-dark]');
      let isOverDark = false;
      darkSections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= 48 && rect.bottom > 48) {
          isOverDark = true;
        }
      });
      setNavOnDark(isOverDark);
    };

    evaluateContrast();
    const rafId = window.requestAnimationFrame(evaluateContrast);
    window.addEventListener('scroll', evaluateContrast, { passive: true });
    window.addEventListener('resize', evaluateContrast);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', evaluateContrast);
      window.removeEventListener('resize', evaluateContrast);
    };
  }, [currentPath]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const handleNav = (path: string) => {
    setMenuOpen(false);
    onNavigate(path);
  };

  const useDarkPalette = menuOpen ? false : navOnDark;

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-colors duration-base ${
          useDarkPalette ? 'krez-header-dark' : 'krez-header-light'
        }`}
      >
        <div className="mx-auto flex max-w-container items-center justify-between px-gutter py-nav-y md:px-gutter-md md:py-nav-y-md lg:px-gutter-lg">
          <button
            type="button"
            onClick={() => handleNav('/')}
            className="flex items-center gap-2.5 text-lg font-heading font-semibold tracking-tight transition-opacity duration-fast hover:opacity-75 cursor-pointer"
            aria-label="L'Agence Home"
          >
            <img
              src={KREZ_IMAGES.logo}
              alt="L'Agence"
              className="h-8 w-8 rounded-lg bg-black object-contain border border-current/20"
            />
            <span>L&apos;Agence</span>
          </button>

          {/* Desktop Direct Nav Items */}
          <nav className="hidden xl:flex items-center gap-6 text-xs font-semibold tracking-widest uppercase" aria-label="Desktop primary navigation">
            {PRIMARY_NAV_ITEMS.map((item) => {
              const isActive = cleanPath === item.to || (item.to !== '/' && cleanPath.startsWith(item.to));
              return (
                <button
                  key={item.to}
                  type="button"
                  onClick={() => handleNav(item.to)}
                  className={`transition-colors duration-fast hover:opacity-75 cursor-pointer ${
                    isActive ? 'text-accent underline underline-offset-4' : ''
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-4 sm:gap-5">
            {user ? (
              <>
                <button
                  type="button"
                  onClick={() => handleNav('/dashboard')}
                  className="hidden sm:inline text-xs font-semibold tracking-wider uppercase transition-opacity duration-fast hover:opacity-70 cursor-pointer"
                >
                  Dashboard
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleNav('/admin')}
                    className="hidden sm:inline text-xs font-semibold tracking-wider uppercase transition-opacity duration-fast hover:opacity-70 text-accent cursor-pointer"
                  >
                    Admin
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleNav('/account')}
                  className="text-xs font-semibold tracking-wider uppercase transition-opacity duration-fast hover:opacity-70 cursor-pointer"
                >
                  Account
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => openKrezAuthModal('login')}
                className="text-xs font-semibold tracking-wider uppercase transition-opacity duration-fast hover:opacity-70 cursor-pointer"
              >
                Sign in
              </button>
            )}

            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={menuOpen}
              className="group flex items-center gap-2 py-2 px-2.5 rounded-full hover:bg-current/10 transition-colors cursor-pointer"
            >
              <span className="text-[11px] font-bold tracking-widest uppercase">
                {menuOpen ? 'Close' : 'Menu'}
              </span>
              <div className="flex flex-col justify-center gap-1.5">
                <span
                  className={`block h-px w-5 bg-current transition-all duration-base ${
                    menuOpen ? 'translate-y-[2.5px] rotate-45' : 'group-hover:w-4'
                  }`}
                />
                <span
                  className={`block h-px w-5 bg-current transition-all duration-base ${
                    menuOpen ? '-translate-y-[2.5px] -rotate-45' : ''
                  }`}
                />
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Full Directory Navigation Modal */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 flex flex-col justify-between bg-[#161616]/98 backdrop-blur-xl text-white px-gutter pt-24 pb-8 md:px-gutter-md lg:px-gutter-lg overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Complete site navigation directory"
        >
          <div className="mx-auto w-full max-w-container">
            {/* Header label in menu */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4 text-xs font-mono uppercase tracking-widest text-white/50">
              <span>L&apos;Agence · Navigation Directory</span>
              <span>18 Curated Sections</span>
            </div>

            {/* Categorized Directory Grid */}
            <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {/* Column 1: Core Platform */}
              <div className="space-y-4">
                <p className="text-[11px] font-bold tracking-widest uppercase text-[#BEE179]">
                  01 · Core Platform
                </p>
                <nav className="flex flex-col space-y-2.5" aria-label="Core Platform Navigation">
                  {[
                    { to: '/', label: 'Home' },
                    { to: '/properties', label: 'Landmark Properties' },
                    { to: '/how-it-works', label: 'How Tokenization Works' },
                    { to: '/team', label: 'Our Team & Leadership' },
                    { to: '/portfolio', label: 'Investor Portfolio' },
                    { to: '/journal', label: 'Investor Journal & Updates' },
                    { to: '/contact', label: 'Direct Advisory Contact' },
                  ].map((item) => (
                    <button
                      key={item.to}
                      type="button"
                      onClick={() => handleNav(item.to)}
                      className={`text-left text-lg sm:text-xl font-heading tracking-wide transition-colors duration-fast cursor-pointer ${
                        cleanPath === item.to
                          ? 'text-[#BEE179] font-bold'
                          : 'text-white hover:text-[#BEE179]'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Column 2: Advisory & Private Club */}
              <div className="space-y-4">
                <p className="text-[11px] font-bold tracking-widest uppercase text-[#BEE179]">
                  02 · Advisory &amp; Privé
                </p>
                <nav className="flex flex-col space-y-2.5" aria-label="Advisory Navigation">
                  {[
                    { to: '/club', label: 'Kretz Club Privé' },
                    { to: '/wealth', label: 'Wealth & Family Office' },
                    { to: '/casos-de-exito', label: 'Success Stories & Exits' },
                    { to: '/blog', label: 'Luxury Real Estate Blog' },
                    { to: '/insights', label: 'Real Estate Dossiers & Insights' },
                  ].map((item) => (
                    <button
                      key={item.to}
                      type="button"
                      onClick={() => handleNav(item.to)}
                      className={`text-left text-lg sm:text-xl font-heading tracking-wide transition-colors duration-fast cursor-pointer ${
                        cleanPath === item.to
                          ? 'text-[#BEE179] font-bold'
                          : 'text-white hover:text-[#BEE179]'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Column 3: Trust, Solana & Legal */}
              <div className="space-y-4">
                <p className="text-[11px] font-bold tracking-widest uppercase text-[#BEE179]">
                  03 · Trust &amp; Infrastructure
                </p>
                <nav className="flex flex-col space-y-2.5" aria-label="Trust and Legal Navigation">
                  {[
                    { to: '/trust', label: 'Institutional Trust Centre' },
                    { to: '/token', label: 'Solana Token-2022 Architecture' },
                    { to: '/news', label: 'Company News & Broadcasts' },
                    { to: '/guide', label: 'Passkeys & Security Guide' },
                    { to: '/faq', label: 'Help Center & FAQ' },
                    { to: '/legal', label: 'Legal & Compliance (12 Docs)' },
                  ].map((item) => (
                    <button
                      key={item.to}
                      type="button"
                      onClick={() => handleNav(item.to)}
                      className={`text-left text-lg sm:text-xl font-heading tracking-wide transition-colors duration-fast cursor-pointer ${
                        cleanPath === item.to
                          ? 'text-[#BEE179] font-bold'
                          : 'text-white hover:text-[#BEE179]'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          </div>

          {/* Bottom Bar in Nav Modal */}
          <div className="mx-auto mt-8 flex w-full max-w-container flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-white/60">
            <div className="flex flex-wrap items-center gap-5">
              {user && (
                <button
                  type="button"
                  onClick={() => handleNav('/dashboard')}
                  className="font-bold uppercase tracking-widest text-[#BEE179] hover:underline cursor-pointer"
                >
                  Investor Dashboard
                </button>
              )}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleNav('/admin')}
                  className="font-bold uppercase tracking-widest text-[#BEE179] hover:underline cursor-pointer"
                >
                  Admin Console
                </button>
              )}
              <button
                type="button"
                onClick={() => handleNav('/account')}
                className="uppercase tracking-widest hover:text-white cursor-pointer"
              >
                Account Settings
              </button>
              <button
                type="button"
                onClick={() => handleNav('/legal?doc=privacy-policy')}
                className="uppercase tracking-widest hover:text-white cursor-pointer"
              >
                Privacy
              </button>
              <button
                type="button"
                onClick={() => handleNav('/legal?doc=terms-and-conditions')}
                className="uppercase tracking-widest hover:text-white cursor-pointer"
              >
                Terms
              </button>
            </div>

            <div className="flex items-center gap-4">
              <HeaderLanguageButton />
            </div>
          </div>
        </div>
      )}

      <KrezAuthModal />
    </>
  );
};
