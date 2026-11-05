import React, { useEffect, useState } from 'react';
import { User as UserIcon } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { KREZ_IMAGES } from '../../data/krezTemplateData';
import { KrezAuthModal, openKrezAuthModal } from '../krez/KrezAuthModal';
import { HeaderLanguageButton } from './HeaderLanguageButton';
import { LagenceLogo } from '../common/LagenceLogo';

interface HeaderProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

const PRIMARY_NAV_ITEMS = [
  { to: '/properties', label: 'Properties' },
  { to: '/how-it-works', label: 'How It Works' },
  { to: '/portfolio', label: 'Portfolio' },
  { to: '/news', label: 'Company News' },
  { to: '/team', label: 'The Team' },
  { to: '/journal', label: 'Journal' },
  { to: '/insights', label: 'Insights' },
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
          useDarkPalette ? 'krez-header-dark backdrop-blur-md bg-black/30' : 'krez-header-light backdrop-blur-md bg-white/60'
        }`}
      >
        <div className="mx-auto flex max-w-container items-center justify-between px-gutter py-nav-y md:px-gutter-md md:py-nav-y-md lg:px-gutter-lg">
          {/* Company Brand Logo & Monogram */}
          <button
            type="button"
            onClick={() => handleNav('/')}
            className="flex items-center gap-3 text-xl font-heading font-bold tracking-tight transition-opacity duration-fast hover:opacity-85 cursor-pointer shrink-0"
            aria-label="L'Agence Krez Home"
          >
            <LagenceLogo className="h-7 w-7 text-[#c59b4c] shrink-0" />
            <div className="flex flex-col text-left leading-none">
              <span className="font-heading font-extrabold text-lg sm:text-xl tracking-tight">L&apos;Agence</span>
              <span className="text-[9px] font-mono tracking-widest text-[#c59b4c] uppercase font-bold opacity-90">KREZ REAL ESTATE</span>
            </div>
          </button>

          {/* Complete Desktop Horizontal Navigation Bar */}
          <nav aria-label="Desktop primary navigation" className="hidden lg:flex items-center gap-4.5 xl:gap-6">
            {PRIMARY_NAV_ITEMS.map((item) => {
              const isActive =
                cleanPath === item.to ||
                (item.to !== '/' && cleanPath.startsWith(item.to));
              return (
                <button
                  key={item.to}
                  type="button"
                  onClick={() => handleNav(item.to)}
                  className={`text-xs uppercase font-heading font-bold tracking-widest transition-all cursor-pointer relative py-1.5 ${
                    isActive
                      ? 'text-[#c59b4c]'
                      : 'hover:text-[#c59b4c] opacity-90 hover:opacity-100'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#c59b4c] rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Action Controls: Language, Auth, Menu Drawer Toggle */}
          <div className="flex items-center gap-3 sm:gap-5">
            {/* Language Switcher */}
            <div className="hidden sm:block">
              <HeaderLanguageButton />
            </div>

            {/* Auth Buttons */}
            {user ? (
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => handleNav('/dashboard')}
                  className="px-4 py-2 rounded-full bg-[#213138] text-[#f5f0ea] text-xs font-bold uppercase tracking-wider hover:bg-[#18252b] transition-all cursor-pointer shadow-xs"
                >
                  Dashboard
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleNav('/admin')}
                    className="hidden sm:inline text-xs font-bold tracking-wider uppercase hover:opacity-75 transition-opacity cursor-pointer text-[#c59b4c]"
                  >
                    Admin
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleNav('/account')}
                  className="text-xs font-semibold tracking-wider uppercase transition-opacity hover:opacity-75 cursor-pointer hidden sm:inline"
                >
                  Account
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => openKrezAuthModal('login')}
                className="flex items-center gap-2 text-xs sm:text-sm font-heading font-semibold tracking-wider uppercase transition-all duration-fast hover:opacity-85 cursor-pointer text-current px-3.5 py-1.5 rounded-full border border-current/25 hover:border-[#c59b4c] hover:text-[#c59b4c]"
              >
                <UserIcon className="w-4 h-4 stroke-[2]" />
                <span>SIGN IN</span>
              </button>
            )}

            {/* Mobile / Full Menu Toggle */}
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={menuOpen}
              className="flex flex-col justify-center gap-[6px] p-2 cursor-pointer transition-opacity hover:opacity-75"
            >
              <span
                className={`block h-[2px] w-7 bg-current transition-all duration-300 ${
                  menuOpen ? 'translate-y-[4px] rotate-45' : ''
                }`}
              />
              <span
                className={`block h-[2px] w-7 bg-current transition-all duration-300 ${
                  menuOpen ? '-translate-y-[4px] -rotate-45' : ''
                }`}
              />
            </button>
          </div>
        </div>
      </header>

      {/* Expanded Full-Screen Overlay Navigation Drawer */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 flex flex-col justify-between bg-background px-gutter pt-28 pb-10 md:px-gutter-md lg:px-gutter-lg"
          role="dialog"
          aria-modal="true"
          aria-label="Site navigation"
        >
          <nav
            className="flex flex-1 flex-col items-center justify-center gap-6"
            aria-label="Primary navigation drawer"
          >
            {PRIMARY_NAV_ITEMS.map((item) => {
              const isActive =
                cleanPath === item.to ||
                (item.to !== '/' && cleanPath.startsWith(item.to));
              return (
                <button
                  key={item.to}
                  type="button"
                  onClick={() => handleNav(item.to)}
                  className={`text-3xl sm:text-4xl font-heading font-light tracking-widest uppercase transition-colors duration-fast cursor-pointer ${
                    isActive
                      ? 'text-accent font-normal'
                      : 'text-foreground hover:text-accent'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="mx-auto flex w-full max-w-container flex-wrap items-center justify-between gap-4 border-t border-border pt-6 text-xs text-muted">
            <div className="flex flex-wrap items-center gap-5">
              {user && (
                <button
                  type="button"
                  onClick={() => handleNav('/dashboard')}
                  className="font-medium uppercase tracking-widest text-foreground hover:text-accent transition-colors duration-fast cursor-pointer"
                >
                  Investor Dashboard
                </button>
              )}
              <button
                type="button"
                onClick={() => handleNav('/insights')}
                className="uppercase tracking-widest hover:text-foreground transition-colors duration-fast cursor-pointer"
              >
                Insights
              </button>
              <button
                type="button"
                onClick={() => handleNav('/trust')}
                className="uppercase tracking-widest hover:text-foreground transition-colors duration-fast cursor-pointer"
              >
                Trust Centre
              </button>
              <button
                type="button"
                onClick={() => handleNav('/legal')}
                className="uppercase tracking-widest hover:text-foreground transition-colors duration-fast cursor-pointer"
              >
                Legal
              </button>
              <button
                type="button"
                onClick={() => handleNav('/token')}
                className="uppercase tracking-widest hover:text-foreground transition-colors duration-fast cursor-pointer"
              >
                Solana Infrastructure
              </button>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleNav('/admin')}
                  className="font-semibold uppercase tracking-widest text-accent hover:text-foreground transition-colors duration-fast cursor-pointer"
                >
                  Admin Console
                </button>
              )}
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
