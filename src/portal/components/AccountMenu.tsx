import React from 'react';
import { User, Wallet, ShieldCheck, ExternalLink, LogOut, Database } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../context/ToastContext';
import { usePortal } from '../state/PortalContext';
import { formatEuro } from '../utils/format';

interface AccountMenuProps {
  onClose: () => void;
}

export const AccountMenu: React.FC<AccountMenuProps> = ({ onClose }) => {
  const toast = useToast();
  const { user, logout } = useAuth();
  const {
    balance,
    profile,
    sampleDataEnabled,
    setSampleDataEnabled,
    navigatePortal,
    exitToPublicSite,
  } = usePortal();

  const handleNav = (route: 'profile' | 'wallet' | 'compliance') => {
    onClose();
    navigatePortal(route);
  };

  const handleToggleSample = () => {
    const next = !sampleDataEnabled;
    setSampleDataEnabled(next);
    toast.info(
      next
        ? 'Sample data enabled for previewing populated states.'
        : 'Sample data disabled. Showing live account data.'
    );
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
      className="absolute right-0 top-[52px] z-40 w-72 portal-card shadow-2xl space-y-2"
    >
      <div className="pb-3 border-b border-[#1F2C33]">
        <div className="text-xs font-medium text-[#8FA1A8]">Signed in as</div>
        <div className="mt-1 text-sm font-semibold text-[#F2F5F4] truncate">
          {profile?.email || user?.email}
        </div>
        <div className="mt-1.5 flex items-center justify-between text-xs">
          <span className="text-[#8FA1A8]">Wallet balance</span>
          <span className="font-bold text-[#6FD8B0] portal-tabular">
            {formatEuro(balance)}
          </span>
        </div>
      </div>

      <div className="py-1 space-y-1">
        <button
          type="button"
          role="menuitem"
          onClick={() => handleNav('profile')}
          className="w-full min-h-[44px] px-3 rounded-[14px] text-sm font-medium text-[#F2F5F4] hover:bg-[#172228] flex items-center gap-3 text-left transition-colors"
        >
          <User className="w-4 h-4 text-[#6FD8B0]" />
          <span>Profile &amp; Banking</span>
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={() => handleNav('wallet')}
          className="w-full min-h-[44px] px-3 rounded-[14px] text-sm font-medium text-[#F2F5F4] hover:bg-[#172228] flex items-center gap-3 text-left transition-colors"
        >
          <Wallet className="w-4 h-4 text-[#6FD8B0]" />
          <span>Wallet &amp; Deposits</span>
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={() => handleNav('compliance')}
          className="w-full min-h-[44px] px-3 rounded-[14px] text-sm font-medium text-[#F2F5F4] hover:bg-[#172228] flex items-center gap-3 text-left transition-colors"
        >
          <ShieldCheck className="w-4 h-4 text-[#6FD8B0]" />
          <span>Compliance &amp; KYC</span>
        </button>
        <button
          type="button"
          role="switch"
          aria-checked={sampleDataEnabled}
          onClick={handleToggleSample}
          className="w-full min-h-[44px] px-3 rounded-[14px] text-sm font-medium text-[#F2F5F4] hover:bg-[#172228] flex items-center justify-between gap-3 text-left transition-colors"
        >
          <span className="flex items-center gap-3">
            <Database className="w-4 h-4 text-[#6FD8B0]" />
            <span>Sample data</span>
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
              sampleDataEnabled
                ? 'bg-[#6FD8B0] text-[#07231A]'
                : 'bg-[#0B0F10] border border-[#1F2C33] text-[#8FA1A8]'
            }`}
          >
            {sampleDataEnabled ? 'On' : 'Off'}
          </span>
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onClose();
            exitToPublicSite('/');
          }}
          className="w-full min-h-[44px] px-3 rounded-[14px] text-sm font-medium text-[#8FA1A8] hover:text-[#F2F5F4] hover:bg-[#172228] flex items-center gap-3 text-left transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          <span>Public Site</span>
        </button>
      </div>

      <div className="pt-2 border-t border-[#1F2C33]">
        <button
          type="button"
          role="menuitem"
          onClick={handleLogout}
          className="w-full min-h-[44px] px-3 rounded-[14px] text-sm font-semibold text-[#FB7185] hover:bg-[#FB7185]/12 flex items-center gap-3 text-left transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};
