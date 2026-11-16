import React from 'react';
import { User, Wallet, ShieldCheck, ExternalLink, LogOut } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { usePortal } from '../state/PortalContext';
import { formatEuro } from '../utils/format';

interface AccountMenuProps {
  onClose: () => void;
}

export const AccountMenu: React.FC<AccountMenuProps> = ({ onClose }) => {
  const { user, logout } = useAuth();
  const { balance, profile, navigatePortal, exitToPublicSite } = usePortal();

  const handleNav = (route: 'profile' | 'wallet' | 'compliance') => {
    onClose();
    navigatePortal(route);
  };

  const handleLogout = async () => {
    onClose();
    await logout();
    exitToPublicSite('/');
  };

  return (
    <div
      role="menu"
      aria-label="Account menu"
      className="absolute right-0 top-[52px] z-40 w-72 portal-card p-2 shadow-2xl"
    >
      <div className="px-3 py-2.5 border-b border-[#1D3860]">
        <div className="text-[11px] font-semibold text-[#8EA7C7]">Signed in investor</div>
        <div className="mt-1 text-sm font-semibold text-white truncate">
          {profile?.email || user?.email}
        </div>
        <div className="mt-1 text-xs text-[#C5A880] portal-tabular">
          Available wallet · {formatEuro(balance)}
        </div>
      </div>

      <div className="py-1.5 space-y-1">
        <button
          type="button"
          role="menuitem"
          onClick={() => handleNav('profile')}
          className="w-full min-h-[44px] px-3 rounded-lg text-sm text-white hover:bg-[#152E54] flex items-center gap-3 text-left transition-colors"
        >
          <User className="w-4 h-4 text-[#C5A880]" />
          <span>Profile &amp; Banking</span>
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={() => handleNav('wallet')}
          className="w-full min-h-[44px] px-3 rounded-lg text-sm text-white hover:bg-[#152E54] flex items-center gap-3 text-left transition-colors"
        >
          <Wallet className="w-4 h-4 text-[#C5A880]" />
          <span>Wallet &amp; Deposits</span>
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={() => handleNav('compliance')}
          className="w-full min-h-[44px] px-3 rounded-lg text-sm text-white hover:bg-[#152E54] flex items-center gap-3 text-left transition-colors"
        >
          <ShieldCheck className="w-4 h-4 text-[#C5A880]" />
          <span>Compliance &amp; KYC</span>
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onClose();
            exitToPublicSite('/');
          }}
          className="w-full min-h-[44px] px-3 rounded-lg text-sm text-[#8EA7C7] hover:text-white hover:bg-[#152E54] flex items-center gap-3 text-left transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          <span>Public Site</span>
        </button>
      </div>

      <div className="pt-1.5 border-t border-[#1D3860]">
        <button
          type="button"
          role="menuitem"
          onClick={handleLogout}
          className="w-full min-h-[44px] px-3 rounded-lg text-sm font-semibold text-[#FB7185] hover:bg-[#FB7185]/10 flex items-center gap-3 text-left transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};
