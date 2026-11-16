import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Bell } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { usePortal } from '../state/PortalContext';
import { PortalRoute } from '../types';
import { getInitials } from '../utils/format';
import { AccountMenu } from './AccountMenu';

const ROUTE_TITLES: Record<PortalRoute, string> = {
  overview: 'Overview',
  portfolio: 'Portfolio',
  explore: 'Explore Properties',
  'property-detail': 'Property Dossier',
  ledger: 'Transaction Ledger',
  more: 'Account & Tools',
  wallet: 'Wallet & FX',
  deposit: 'Deposit Funds',
  withdraw: 'Withdraw Funds',
  profile: 'Profile & Banking',
  compliance: 'Compliance & KYC',
  reports: 'Statements & Reports',
  analytics: 'Yield Analytics',
  notifications: 'Notifications',
  support: 'Investor Support',
};

export const Header: React.FC = () => {
  const { user } = useAuth();
  const { route, isPrimaryRoute, canGoBack, goBack, navigatePortal, unreadCount, profile } = usePortal();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const initials = getInitials(profile?.fullName || user?.fullName || user?.email);

  return (
    <header className="sticky top-0 z-30 h-14 sm:h-16 border-b border-[#1D3860] bg-[#0B1B30]/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        {!isPrimaryRoute && canGoBack && (
          <button
            type="button"
            onClick={goBack}
            aria-label="Go back"
            className="w-11 h-11 rounded-xl border border-[#1D3860] bg-[#102442] text-white flex items-center justify-center hover:border-[#C5A880] transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="min-w-0">
          {isPrimaryRoute && (
            <span className="lg:hidden block text-sm font-serif font-semibold text-[#C5A880] leading-none mb-0.5">
              L’Agence
            </span>
          )}
          <h1 className="text-base sm:text-lg font-heading font-bold text-white truncate">
            {ROUTE_TITLES[route]}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0" ref={menuContainerRef}>
        <button
          type="button"
          onClick={() => navigatePortal('notifications')}
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
          className="relative w-11 h-11 rounded-xl border border-[#1D3860] bg-[#102442] text-[#8EA7C7] hover:text-white hover:border-[#C5A880] flex items-center justify-center transition-colors"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#C5A880] text-[#0B1B30] text-[10px] font-bold portal-tabular flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Account menu"
            aria-expanded={menuOpen}
            className="w-11 h-11 rounded-xl border border-[#C5A880]/60 bg-[#152E54] text-[#C5A880] font-bold text-sm flex items-center justify-center hover:border-[#C5A880] transition-colors"
          >
            {initials}
          </button>
          {menuOpen && <AccountMenu onClose={() => setMenuOpen(false)} />}
        </div>
      </div>
    </header>
  );
};
