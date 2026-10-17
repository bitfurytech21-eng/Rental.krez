import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { getAccountTypeBadge } from '../../types/user';
import { MAIN_NAV_LINKS, NavLink } from '../../data/navigation';
import { 
  Building2, Menu, X, User as UserIcon, Shield, LogOut, 
  Wallet, Crown, ChevronDown, ChevronRight, Coins, 
  BookOpen, HelpCircle, PhoneCall, Layers, Trophy, 
  TrendingUp, Compass, ArrowRight
} from 'lucide-react';
import { formatCurrency } from '../../lib/utils';

interface HeaderProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentPath, onNavigate }) => {
  const { user, logout, isAdmin } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const moreDropdownRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(e.target as Node)) {
        setMoreDropdownOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleNavClick = (path: string) => {
    onNavigate(path);
    setMobileMenuOpen(false);
    setMoreDropdownOpen(false);
    setUserDropdownOpen(false);
  };

  // Primary direct desktop navigation links
  const primaryDesktopLinks = [
    { label: 'Marketplace', path: '/properties', badge: 'Live', badgeColor: 'bg-emerald-100 text-emerald-800' },
    { label: 'Success Stories', path: '/casos-de-exito', badge: '15.4% IRR', badgeColor: 'bg-emerald-100 text-emerald-800' },
    { label: 'The Agency', path: '/agency' },
    { label: 'Membership Club', path: '/club', icon: Crown, iconColor: 'text-[#D4AF37]' },
    { label: 'Wealth Advisory', path: '/wealth' },
    { label: 'Blog', path: '/blog' },
  ];

  // Secondary items cleanly grouped in the "More" dropdown for standard screens
  const secondaryLinks = [
    { 
      label: 'How It Works', 
      path: '/investing', 
      description: 'Step-by-step tokenization process & legal SPV custody',
      icon: Layers
    },
    { 
      label: 'Tokenization', 
      path: '/token', 
      description: 'Polygon ERC-20 smart contracts & secondary liquidity',
      icon: Coins
    },
    { 
      label: 'FAQ & Disclosures', 
      path: '/faq', 
      description: 'Legal compliance, MiCA, KYC, and investor protection',
      icon: HelpCircle
    },
    { 
      label: 'Contact & Advisory', 
      path: '/contact', 
      description: 'Private concierge, Madrid & Paris family offices',
      icon: PhoneCall
    },
  ];

  // Check if any secondary link is currently active
  const isSecondaryActive = secondaryLinks.some(
    link => currentPath === link.path || (link.path !== '/' && currentPath.startsWith(link.path))
  );

  return (
    <header className="site-header">
      <div className="w-full max-w-[1680px] mx-auto px-3.5 sm:px-6 lg:px-8 flex items-center justify-between min-h-[74px] sm:min-h-[80px] gap-2 lg:gap-4 xl:gap-6">
        
        {/* Brand Zone */}
        <button
          onClick={() => handleNavClick('/')}
          className="brand hover:opacity-90 transition-opacity flex items-center gap-2.5 text-left cursor-pointer whitespace-nowrap shrink-0 group"
          style={{ background: 'none', border: 'none', padding: 0 }}
        >
          <div className="w-9 h-9 rounded-xl bg-[#0F172A] flex items-center justify-center text-[#10B981] shadow-xs border border-slate-700/60 group-hover:border-emerald-500/50 transition-colors">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tight text-[#0F172A] leading-none">
              Kretz<span className="text-[#059669]">.</span>
            </span>
            <span className="text-[9px] uppercase tracking-wider font-extrabold text-[#69736F] mt-0.5">
              Spain & International
            </span>
          </div>
        </button>

        {/* Desktop Navigation (Adaptive from lg up, with full breathing room and zero clipping) */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2.5 2xl:gap-3 flex-1 justify-center max-w-4xl px-2">
          
          {/* Primary Links */}
          {primaryDesktopLinks.map((link) => {
            const isActive = currentPath === link.path || (link.path !== '/' && currentPath.startsWith(link.path));
            const Icon = link.icon;
            return (
              <button
                key={link.path}
                onClick={() => handleNavClick(link.path)}
                className={`relative px-2.5 py-1.5 rounded-lg text-xs xl:text-[13px] 2xl:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  isActive
                    ? 'text-[#182D2A] bg-[#EEF2EC] font-bold shadow-xs'
                    : 'text-[#4A5551] hover:text-[#182D2A] hover:bg-[#F6F8F5]'
                }`}
              >
                {Icon && <Icon className={`w-3.5 h-3.5 ${link.iconColor || ''}`} />}
                <span>{link.label}</span>
                {link.badge && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full leading-tight hidden xl:inline-block ${link.badgeColor}`}>
                    {link.badge}
                  </span>
                )}
                {isActive && (
                  <span className="absolute bottom-0 left-2.5 right-2.5 h-[2px] bg-[#182D2A] rounded-full" />
                )}
              </button>
            );
          })}

          {/* Desktop "More" Dropdown Menu (Prevents any navbar overflow or missing links) */}
          <div className="relative" ref={moreDropdownRef}>
            <button
              onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
              className={`px-2.5 py-1.5 rounded-lg text-xs xl:text-[13px] 2xl:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                isSecondaryActive || moreDropdownOpen
                  ? 'text-[#182D2A] bg-[#EEF2EC] font-bold'
                  : 'text-[#4A5551] hover:text-[#182D2A] hover:bg-[#F6F8F5]'
              }`}
            >
              <span>Platform & Legal</span>
              <ChevronDown className={`w-3.5 h-3.5 text-[#69736F] transition-transform duration-200 ${moreDropdownOpen ? 'rotate-180' : ''}`} />
              {isSecondaryActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 ml-0.5"></span>
              )}
            </button>

            {moreDropdownOpen && (
              <div 
                className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150 text-left"
              >
                <div className="px-3 py-1.5 border-b border-slate-100 mb-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Institutional Resources</p>
                </div>
                {secondaryLinks.map((item) => {
                  const isActive = currentPath === item.path || (item.path !== '/' && currentPath.startsWith(item.path));
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.path}
                      onClick={() => handleNavClick(item.path)}
                      className={`w-full text-left px-3.5 py-2.5 flex items-start gap-3 hover:bg-[#F6F8F5] transition-colors cursor-pointer group ${
                        isActive ? 'bg-[#F2F6F1]' : ''
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg mt-0.5 ${isActive ? 'bg-[#182D2A] text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-[#182D2A] group-hover:text-white transition-colors'}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-bold leading-tight ${isActive ? 'text-[#182D2A]' : 'text-slate-800'}`}>
                          {item.label}
                        </p>
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 leading-snug">
                          {item.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

        </nav>

        {/* Actions Zone */}
        <div className="header-actions flex items-center gap-2 sm:gap-3 shrink-0">
          {user ? (
            <div className="relative" ref={userDropdownRef}>
              <div className="flex items-center gap-2">
                {/* Wallet Balance Chip */}
                <button
                  onClick={() => handleNavClick('/dashboard')}
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#EEF1EC] text-[#182D2A] text-xs font-bold hover:bg-[#E3E8E3] transition-colors cursor-pointer border border-[#Dce3db]"
                  title="View Investor Dashboard"
                >
                  <Wallet className="w-3.5 h-3.5 text-[#27845D]" />
                  <span>{formatCurrency(user.walletBalance)}</span>
                </button>

                {/* User menu trigger */}
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#DDE3DD] hover:border-[#182D2A] bg-white text-xs font-bold text-[#182D2A] transition-all cursor-pointer shadow-2xs"
                >
                  <div className="w-5 h-5 rounded-full bg-[#182D2A] text-[#B7E36A] flex items-center justify-center text-[10px] font-black">
                    {user.fullName.charAt(0)}
                  </div>
                  <span className="max-w-[100px] truncate hidden md:inline">{user.fullName.split(' ')[0]}</span>
                  {user.role === 'admin' && (
                    <span className="bg-[#182D2A] text-[#B7E36A] text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">
                      Admin
                    </span>
                  )}
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
              </div>

              {/* User Dropdown */}
              {userDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-60 bg-white border border-[#E3E8E3] rounded-2xl shadow-2xl py-2 z-50 text-left animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="px-4 py-2.5 border-b border-[#E3E8E3] mb-1">
                    <p className="text-[10px] uppercase font-bold text-[#69736F]">Signed in as</p>
                    <p className="text-xs font-bold text-[#182D2A] truncate">{user.email}</p>
                    <div className="flex items-center justify-between mt-2 text-[11px]">
                      <span className="text-[10px] font-bold text-[#27845D] bg-[#27845D]/10 px-2 py-0.5 rounded-full">
                        {getAccountTypeBadge(user.accountType, user.role)}
                      </span>
                      <span className="text-[#69736F] text-[10px]">KYC: <strong className="capitalize text-[#27845D]">{user.kycStatus}</strong></span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      handleNavClick('/dashboard');
                      setUserDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-[#18211F] hover:bg-[#F6F7F4] flex items-center gap-2 cursor-pointer"
                  >
                    <Wallet className="w-4 h-4 text-[#27845D]" />
                    Investor Dashboard
                  </button>

                  <button
                    onClick={() => {
                      handleNavClick('/portfolio');
                      setUserDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-[#18211F] hover:bg-[#F6F7F4] flex items-center gap-2 cursor-pointer"
                  >
                    <Building2 className="w-4 h-4 text-[#69736F]" />
                    My Portfolio
                  </button>

                  <button
                    onClick={() => {
                      handleNavClick('/transactions');
                      setUserDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-[#18211F] hover:bg-[#F6F7F4] flex items-center gap-2 cursor-pointer"
                  >
                    <TrendingUp className="w-4 h-4 text-[#69736F]" />
                    Transactions & Ledger
                  </button>

                  <button
                    onClick={() => {
                      handleNavClick('/club');
                      setUserDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-[#18211F] hover:bg-[#F6F7F4] flex items-center gap-2 cursor-pointer"
                  >
                    <Crown className="w-4 h-4 text-[#D4AF37]" />
                    Club Privé Membership
                  </button>

                  {isAdmin && (
                    <button
                      onClick={() => {
                        handleNavClick('/admin');
                        setUserDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-bold text-[#182D2A] bg-emerald-50 hover:bg-emerald-100 flex items-center gap-2 cursor-pointer"
                    >
                      <Shield className="w-4 h-4 text-[#27845D]" />
                      Admin Control Panel
                    </button>
                  )}

                  <div className="border-t border-[#E3E8E3] my-1" />

                  <button
                    onClick={async () => {
                      await logout();
                      setUserDropdownOpen(false);
                      onNavigate('/');
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-bold text-[#C24141] hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => handleNavClick('/login')}
                className="hidden sm:inline-flex px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-bold text-[#182D2A] hover:bg-[#F6F8F5] rounded-full transition-all cursor-pointer whitespace-nowrap"
              >
                Log In
              </button>
              <button
                onClick={() => handleNavClick('/register')}
                className="px-3.5 py-1.5 sm:px-4 sm:py-2 text-[11px] sm:text-xs font-bold bg-[#182D2A] text-white hover:bg-[#24423C] rounded-full shadow-xs transition-all cursor-pointer whitespace-nowrap shrink-0"
              >
                Get Started
              </button>
            </div>
          )}

          {/* Mobile/Tablet Menu Button (Visible on screens < lg) */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-[#182D2A] rounded-xl hover:bg-[#F6F7F4] border border-slate-200 cursor-pointer shrink-0 ml-1 sm:ml-2"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer (Compact, sleek single-column list format matching IMG_7053.jpeg) */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-[#E3E8E3] px-4 sm:px-6 py-3 flex flex-col shadow-2xl animate-in slide-in-from-top duration-200 max-h-[85vh] overflow-y-auto text-left">
          
          <div className="flex flex-col">
            {/* 1. Home */}
            <button
              onClick={() => handleNavClick('/')}
              className={`py-2 sm:py-2.5 px-2 text-xs sm:text-sm font-medium transition-colors text-left border-b border-slate-100/90 flex items-center justify-between cursor-pointer ${
                currentPath === '/' ? 'text-[#182D2A] font-bold bg-slate-50/60' : 'text-[#2C3734] hover:text-[#182D2A]'
              }`}
            >
              <span>Home</span>
            </button>

            {/* 2. Marketplace */}
            <button
              onClick={() => handleNavClick('/properties')}
              className={`py-2 sm:py-2.5 px-2 text-xs sm:text-sm font-medium transition-colors text-left border-b border-slate-100/90 flex items-center justify-between cursor-pointer ${
                currentPath === '/properties' ? 'text-[#182D2A] font-bold bg-slate-50/60' : 'text-[#2C3734] hover:text-[#182D2A]'
              }`}
            >
              <span>Marketplace</span>
            </button>

            {/* 3. Success Stories */}
            <button
              onClick={() => handleNavClick('/casos-de-exito')}
              className={`py-2 sm:py-2.5 px-2 text-xs sm:text-sm font-medium transition-colors text-left border-b border-slate-100/90 flex items-center justify-between cursor-pointer ${
                currentPath === '/casos-de-exito' ? 'text-[#182D2A] font-bold bg-slate-50/60' : 'text-[#2C3734] hover:text-[#182D2A]'
              }`}
            >
              <span>Success Stories</span>
            </button>

            {/* 4. The Agency */}
            <button
              onClick={() => handleNavClick('/agency')}
              className={`py-2 sm:py-2.5 px-2 text-xs sm:text-sm font-medium transition-colors text-left border-b border-slate-100/90 flex items-center justify-between cursor-pointer ${
                currentPath === '/agency' || currentPath === '/team' ? 'text-[#182D2A] font-bold bg-slate-50/60' : 'text-[#2C3734] hover:text-[#182D2A]'
              }`}
            >
              <span>The Agency</span>
            </button>

            {/* 5. Membership Club */}
            <button
              onClick={() => handleNavClick('/club')}
              className={`py-2 sm:py-2.5 px-2 text-xs sm:text-sm font-medium transition-colors text-left border-b border-slate-100/90 flex items-center justify-between cursor-pointer ${
                currentPath === '/club' ? 'text-[#182D2A] font-bold bg-slate-50/60' : 'text-[#2C3734] hover:text-[#182D2A]'
              }`}
            >
              <span>Membership Club</span>
            </button>

            {/* 6. Wealth Advisory */}
            <button
              onClick={() => handleNavClick('/wealth')}
              className={`py-2 sm:py-2.5 px-2 text-xs sm:text-sm font-medium transition-colors text-left border-b border-slate-100/90 flex items-center justify-between cursor-pointer ${
                currentPath === '/wealth' ? 'text-[#182D2A] font-bold bg-slate-50/60' : 'text-[#2C3734] hover:text-[#182D2A]'
              }`}
            >
              <span>Wealth Advisory</span>
            </button>

            {/* 7. How It Works */}
            <button
              onClick={() => handleNavClick('/investing')}
              className={`py-2 sm:py-2.5 px-2 text-xs sm:text-sm font-medium transition-colors text-left border-b border-slate-100/90 flex items-center justify-between cursor-pointer ${
                currentPath === '/investing' ? 'text-[#182D2A] font-bold bg-slate-50/60' : 'text-[#2C3734] hover:text-[#182D2A]'
              }`}
            >
              <span>How It Works</span>
            </button>

            {/* 8. Security Guide */}
            <button
              onClick={() => handleNavClick('/guide')}
              className={`py-2 sm:py-2.5 px-2 text-xs sm:text-sm font-medium transition-colors text-left border-b border-slate-100/90 flex items-center justify-between cursor-pointer ${
                currentPath === '/guide' ? 'text-[#182D2A] font-bold bg-slate-50/60' : 'text-[#2C3734] hover:text-[#182D2A]'
              }`}
            >
              <span>Security Guide</span>
            </button>

            {/* 9. Tokenization */}
            <button
              onClick={() => handleNavClick('/token')}
              className={`py-2 sm:py-2.5 px-2 text-xs sm:text-sm font-medium transition-colors text-left border-b border-slate-100/90 flex items-center justify-between cursor-pointer ${
                currentPath === '/token' ? 'text-[#182D2A] font-bold bg-slate-50/60' : 'text-[#2C3734] hover:text-[#182D2A]'
              }`}
            >
              <span>Tokenization</span>
            </button>

            {/* 10. FAQ */}
            <button
              onClick={() => handleNavClick('/faq')}
              className={`py-2 sm:py-2.5 px-2 text-xs sm:text-sm font-medium transition-colors text-left border-b border-slate-100/90 flex items-center justify-between cursor-pointer ${
                currentPath === '/faq' ? 'text-[#182D2A] font-bold bg-slate-50/60' : 'text-[#2C3734] hover:text-[#182D2A]'
              }`}
            >
              <span>FAQ</span>
            </button>

            {/* 11. Contact */}
            <button
              onClick={() => handleNavClick('/contact')}
              className={`py-2 sm:py-2.5 px-2 text-xs sm:text-sm font-medium transition-colors text-left border-b border-slate-100/90 flex items-center justify-between cursor-pointer ${
                currentPath === '/contact' ? 'text-[#182D2A] font-bold bg-slate-50/60' : 'text-[#2C3734] hover:text-[#182D2A]'
              }`}
            >
              <span>Contact</span>
            </button>
          </div>

          {/* User Auth Bottom Action Bar */}
          {user ? (
            <div className="pt-3 flex flex-col gap-2">
              <button
                onClick={() => handleNavClick('/dashboard')}
                className="w-full py-2.5 px-4 rounded-full bg-[#182D2A] hover:bg-[#24423C] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Wallet className="w-3.5 h-3.5 text-[#B7E36A]" />
                <span>Investor Dashboard ({formatCurrency(user.walletBalance)})</span>
              </button>
              {isAdmin && (
                <button
                  onClick={() => handleNavClick('/admin')}
                  className="w-full py-2 px-4 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Admin Control Panel</span>
                </button>
              )}
              <button
                onClick={async () => {
                  await logout();
                  setMobileMenuOpen(false);
                  onNavigate('/');
                }}
                className="text-xs text-red-600 font-bold py-1.5 text-center cursor-pointer hover:underline"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="pt-3 flex flex-col items-center gap-2">
              <button
                onClick={() => handleNavClick('/login')}
                className="w-full py-2.5 px-4 rounded-full border border-slate-300 hover:border-slate-400 bg-white text-[#18211F] text-xs sm:text-sm font-bold transition-all text-center shadow-2xs cursor-pointer"
              >
                Log In
              </button>
              <button
                onClick={() => handleNavClick('/register')}
                className="text-xs text-emerald-800 font-bold py-1 hover:underline cursor-pointer"
              >
                Create Free Account
              </button>
            </div>
          )}

        </div>
      )}
    </header>
  );
};
