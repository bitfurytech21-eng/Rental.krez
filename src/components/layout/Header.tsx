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

          <div className="flex items-center gap-5">
            {user ? (
              <>
                <button
                  type="button"
                  onClick={() => handleNav('/dashboard')}
                  className="hidden sm:inline text-xs font-medium tracking-wider uppercase transition-opacity duration-fast hover:opacity-70 cursor-pointer"
                >
                  Dashboard
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleNav('/admin')}
                    className="hidden sm:inline text-xs font-medium tracking-wider uppercase transition-opacity duration-fast hover:opacity-70 cursor-pointer"
                  >
                    Admin
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleNav('/account')}
                  className="text-xs font-medium tracking-wider uppercase transition-opacity duration-fast hover:opacity-70 cursor-pointer"
                >
                  Account
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => openKrezAuthModal('login')}
                className="text-xs font-medium tracking-wider uppercase transition-opacity duration-fast hover:opacity-70 cursor-pointer"
              >
                Sign in
              </button>
            )}

            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={menuOpen}
              className="group flex flex-col justify-center gap-1.5 py-2 cursor-pointer"
            >
              <span
                className={`block h-px w-7 bg-current transition-all duration-base ${
                  menuOpen
                    ? 'translate-y-[3.5px] rotate-45'
                    : 'group-hover:w-5'
                }`}
              />
              <span
                className={`block h-px w-7 bg-current transition-all duration-base ${
                  menuOpen ? '-translate-y-[3.5px] -rotate-45' : ''
                }`}
              />
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div
          className="fixed inset-0 z-40 flex flex-col justify-between bg-background px-gutter pt-28 pb-10 md:px-gutter-md lg:px-gutter-lg"
          role="dialog"
          aria-modal="true"
          aria-label="Site navigation"
        >
          <nav
            className="flex flex-1 flex-col items-center justify-center gap-6"
            aria-label="Primary navigation"
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
                      ? 'text-accent'
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
