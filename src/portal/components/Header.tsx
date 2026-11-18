import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Bell } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { usePortal } from '../state/PortalContext';
import { PortalRoute } from '../types';
import { getInitials } from '../utils/format';
import { AccountMenu } from './AccountMenu';
import { LagenceLogo } from '../../components/common/LagenceLogo';
import { PWAInstallButton } from '../../components/pwa/PWAInstallButton';

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
  const { route, isPrimaryRoute, goBack, navigatePortal, unreadCount, profile } = usePortal();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const initials = getInitials(profile?.fullName || user?.fullName || user?.email);

  return (
    <header
      className="sticky top-0 z-30 border-b border-[#1F2C33] bg-[#0B0F10]/95 backdrop-blur-md shrink-0 portal-safe-top"
      style={{
        paddingLeft: 'max(16px, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(16px, env(safe-area-inset-right, 0px))',
      }}
    >
      <div className="h-14 sm:h-16 flex items-center justify-between gap-3">
        {/* Left region: Logo + L'Agence / INVESTOR PORTAL on primary tabs, or Back button + page title on sub-pages */}
        {isPrimaryRoute ? (
          <button
            type="button"
            onClick={() => navigatePortal('overview')}
            aria-label="L'Agence Investor Portal home"
            className="min-h-[44px] flex items-center gap-2.5 min-w-0 rounded-[14px] px-1 -ml-1 text-left"
          >
            <LagenceLogo variant="green" className="w-7 h-7 shrink-0" />
            <div className="flex items-baseline gap-1.5 min-w-0 truncate">
              <span className="font-serif text-base sm:text-lg font-bold tracking-tight text-[#F2F5F4] shrink-0">
                L’Agence
              </span>
              <span className="text-[#8FA1A8] text-xs font-medium shrink-0" aria-hidden="true">
                /
              </span>
              <span className="text-[10px] sm:text-xs font-semibold tracking-[0.14em] uppercase text-[#6FD8B0] truncate">
                INVESTOR PORTAL
              </span>
            </div>
          </button>
        ) : (
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={goBack}
              aria-label="Go back"
              className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-[14px] border border-[#1F2C33] bg-[#121A1F] text-[#F2F5F4] flex items-center justify-center hover:border-[#6FD8B0] transition-colors shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-base sm:text-lg font-heading font-bold text-[#F2F5F4] truncate">
              {ROUTE_TITLES[route]}
            </h1>
          </div>
        )}

        {/* Right region: Install + Notification bell with unread dot + Avatar account menu trigger */}
        <div className="flex items-center gap-2.5 shrink-0" ref={menuContainerRef}>
          <PWAInstallButton variant="portal" />
          <button
            type="button"
            onClick={() => navigatePortal('notifications')}
            aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
            className="relative w-11 h-11 min-w-[44px] min-h-[44px] rounded-[14px] border border-[#1F2C33] bg-[#121A1F] text-[#8FA1A8] hover:text-[#F2F5F4] hover:border-[#6FD8B0] flex items-center justify-center transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-[#6FD8B0] ring-2 ring-[#121A1F]"
              />
            )}
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Account menu"
              aria-expanded={menuOpen}
              className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-[14px] border border-[#6FD8B0]/50 bg-[#121A1F] text-[#6FD8B0] font-bold text-sm flex items-center justify-center hover:border-[#6FD8B0] transition-colors"
            >
              {initials}
            </button>
            {menuOpen && <AccountMenu onClose={() => setMenuOpen(false)} />}
          </div>
        </div>
      </div>
    </header>
  );
};
