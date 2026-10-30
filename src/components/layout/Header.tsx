import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { 
  Menu, X, User as UserIcon, Shield, LogOut, 
  Wallet, Crown, ChevronDown, ChevronRight, 
  BookOpen, HelpCircle, PhoneCall, Layers, 
  TrendingUp, Compass, ArrowUpRight,
  Tv, Monitor, Building2, Globe, Table as TableIcon
} from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { isDesktopModeEnabled, toggleDesktopMode } from '../../lib/desktopMode';
import { HeaderLanguageButton } from './HeaderLanguageButton';

interface HeaderProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentPath, onNavigate }) => {
  const { user, logout, isAdmin } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const [insightsDropdownOpen, setInsightsDropdownOpen] = useState(false);
  const [isDesktopActive, setIsDesktopActive] = useState<boolean>(isDesktopModeEnabled);
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dashboard_mode');
      if (saved === 'dark') return true;
      if (saved === 'light') return false;
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return true;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('dashboard_mode')) {
        setIsDark(e.matches);
      }
    };
    mql.addEventListener('change', handleMediaChange);
    return () => mql.removeEventListener('change', handleMediaChange);
  }, []);

  const toggleDarkMode = () => {
    const next = !isDark;
    setIsDark(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dashboard_mode', next ? 'dark' : 'light');
      window.dispatchEvent(new CustomEvent('dashboard-mode-changed', { detail: { mode: next ? 'dark' : 'light' } }));
    }
  };

  const isHomePage = currentPath === '/' || currentPath === '' || currentPath === '/home';
  
  const moreDropdownRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const insightsDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(e.target as Node)) {
        setMoreDropdownOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
      if (insightsDropdownRef.current && !insightsDropdownRef.current.contains(e.target as Node)) {
        setInsightsDropdownOpen(false);
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
    setInsightsDropdownOpen(false);
  };

  // Primary navigation links adhering to strict 1-line Top Bar Contract
  const primaryNavLinks = [
    { label: 'Marketplace', path: '/properties' },
    { label: 'How It Works', path: '/investing' },
    { label: 'The Agency', path: '/agency' },
    { label: 'Club Privé', path: '/club' },
  ];

  const insightsLinks = [
    { label: 'All Dossiers & Investigations', path: '/insights', desc: 'In-depth market surveys & institutional research' },
    { label: 'Major Investigative Dossiers', path: '/insights?type=dossiers', desc: 'Long-form editorial surveys on trophy European assets' },
    { label: 'Market Barometer & Yields', path: '/insights?category=barometre-immobilier', desc: 'Quarterly price-per-m² indices & cap rate benchmarks' },
    { label: 'PropTech & Tokenization', path: '/insights?category=proptech-tokenization', desc: 'Smart contracts, fractional SPVs & digital title registry' },
    { label: 'Regulation & Tax Advisory', path: '/insights?category=reglementation-fiscalite', desc: 'MiCA compliance, post-Golden Visa laws & family office' },
  ];

  const secondaryMenuLinks = [
    { label: 'Institutional Trust Centre', path: '/trust', desc: 'Corporate registry (SIREN 494 861 560), Solana RPC & audits' },
    { label: 'Legal Documentation Centre', path: '/legal', desc: '12 official terms, SPV agreements, AML/KYC & risk disclosures' },
    { label: 'Token Model & Solana Rails', path: '/token', desc: 'Solana SPL, Token-2022 & Circle USDC settlement architecture' },
    { label: 'Success Stories', path: '/casos-de-exito', desc: 'Historical exits and 15.4% average realized IRR' },
    { label: 'Wealth Advisory', path: '/wealth', desc: 'Cross-border estate structuring & family office advisory' },
    { label: 'Company News & Media', path: '/news', desc: 'Official broadcasts, TV interviews and press releases' },
    { label: 'FAQ & Disclosures', path: '/faq', desc: 'Legal structuring, KYC and investor protection notice' },
    { label: 'Contact & Advisory Desk', path: '/contact', desc: 'Barcelona & Paris client desks for private consultations' },
  ];

  const isInsightsActive = currentPath === '/insights' || currentPath.startsWith('/insights/');
  const isMoreActive = secondaryMenuLinks.some(link => currentPath === link.path || currentPath.startsWith(`${link.path}?`));

  return (
    <header className={`sticky top-0 z-50 w-full backdrop-blur-md border-b transition-colors ${
      isDark ? 'bg-[#0B1412]/95 border-[#1E2B27] text-white' : 'bg-[#f0f8fe]/95 border-[#d4e5f5] text-[#1C1917]'
    }`}>
      <div className="w-full max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8 h-[74px] flex items-center justify-between gap-6 sm:gap-8">
        
        {/* Zone 1: Single-Element Brand Wordmark with subtle crest */}
        <button
          onClick={() => handleNavClick('/')}
          className="flex items-center gap-3 text-left cursor-pointer whitespace-nowrap shrink-0 group focus:outline-hidden"
          aria-label="L'Agence Home"
        >
          <img 
            src="/assets/aistudio/IMG_7234_bd44519a.jpeg" 
            alt="L'Agence Crest" 
            className={`w-8 h-8 rounded-md object-cover border shadow-2xs transition-colors ${
              isDark ? 'border-[#263531] group-hover:border-[#3BD4AE]' : 'border-[#DCD5C9] group-hover:border-[#1E3A34]'
            }`}
          />
          <div className="flex items-baseline gap-1.5">
            <span className={`font-serif text-xl sm:text-2xl font-bold tracking-tight leading-none ${
              isDark ? 'text-white' : 'text-[#1C1917]'
            }`}>
              L'Agence
            </span>
            <span className={`text-[10px] uppercase tracking-widest font-extrabold hidden sm:inline ${
              isDark ? 'text-[#8A9692]' : 'text-[#78736B]'
            }`}>
              Real Estate
            </span>
          </div>
        </button>

        {/* Zone 2: 4–5 Clean Single-Line Text Navigation Links */}
        <nav className="hidden lg:flex items-center gap-7 text-sm font-bold tracking-tight shrink-0" aria-label="Main Navigation">
          {primaryNavLinks.map((link) => {
            const isActive = currentPath === link.path || (link.path !== '/' && currentPath.startsWith(link.path));
            return (
              <button
                key={link.path}
                onClick={() => handleNavClick(link.path)}
                className={`transition-colors whitespace-nowrap cursor-pointer relative py-1 ${
                  isDark
                    ? (isActive ? 'text-[#BEE179] font-black' : 'text-[#8A9692] hover:text-white')
                    : (isActive ? 'text-[#1E3A34] font-black' : 'text-[#5E5A54] hover:text-[#1C1917]')
                }`}
              >
                <span>{link.label}</span>
                {isActive && (
                  <span className={`absolute bottom-0 left-0 right-0 h-[2px] rounded-full ${isDark ? 'bg-[#BEE179]' : 'bg-[#1E3A34]'}`} />
                )}
              </button>
            );
          })}

          {/* Insights Dropdown */}
          <div className="relative" ref={insightsDropdownRef}>
            <button
              type="button"
              onClick={() => setInsightsDropdownOpen(!insightsDropdownOpen)}
              aria-haspopup="true"
              aria-expanded={insightsDropdownOpen}
              aria-label="Insights & Intelligence menu"
              className={`flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer relative py-1 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#1E3A34] rounded ${
                isDark
                  ? (isInsightsActive || insightsDropdownOpen ? 'text-[#BEE179] font-black' : 'text-[#8A9692] hover:text-white')
                  : (isInsightsActive || insightsDropdownOpen ? 'text-[#1E3A34] font-black' : 'text-[#5E5A54] hover:text-[#1C1917]')
              }`}
            >
              <span>Insights</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${insightsDropdownOpen ? 'rotate-180' : ''} ${
                isDark ? 'text-[#8A9692]' : 'text-[#78736B]'
              }`} aria-hidden="true" />
              {isInsightsActive && (
                <span className={`absolute bottom-0 left-0 right-0 h-[2px] rounded-full ${isDark ? 'bg-[#BEE179]' : 'bg-[#1E3A34]'}`} />
              )}
            </button>

            {insightsDropdownOpen && (
              <div className={`absolute top-full left-0 mt-3 w-80 rounded-2xl shadow-xl border py-2 z-50 text-left animate-in fade-in zoom-in-95 duration-150 ${
                isDark ? 'bg-[#0E1A17] border-[#1E2B27] text-white' : 'bg-white border-[#E4EEEA] text-[#172B2A]'
              }`}>
                <div className={`px-4 py-2 border-b text-[10px] uppercase tracking-widest font-bold ${
                  isDark ? 'border-[#1E2B27] text-[#8A9692]' : 'border-[#E4EEEA] text-[#71817D]'
                }`}>
                  Research &amp; Intelligence
                </div>
                {insightsLinks.map((item) => (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => handleNavClick(item.path)}
                    className={`w-full text-left px-4 py-2.5 transition-colors cursor-pointer group ${
                      isDark ? 'hover:bg-[#152622]' : 'hover:bg-[#F6FAF8]'
                    }`}
                  >
                    <div className={`text-xs font-semibold ${isDark ? 'text-white group-hover:text-[#3BD4AE]' : 'text-[#172B2A] group-hover:text-[#087F5B]'}`}>
                      {item.label}
                    </div>
                    <div className={`text-[11px] line-clamp-1 mt-0.5 ${isDark ? 'text-[#8A9692]' : 'text-[#71817D]'}`}>
                      {item.desc}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* More Institutional Links Dropdown */}
          <div className="relative" ref={moreDropdownRef}>
            <button
              type="button"
              onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
              aria-haspopup="true"
              aria-expanded={moreDropdownOpen}
              aria-label="Advisory & Track Record menu"
              className={`flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer relative py-1 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#1E3A34] rounded ${
                isDark
                  ? (isMoreActive || moreDropdownOpen ? 'text-[#BEE179] font-black' : 'text-[#8A9692] hover:text-white')
                  : (isMoreActive || moreDropdownOpen ? 'text-[#1E3A34] font-black' : 'text-[#5E5A54] hover:text-[#1C1917]')
              }`}
            >
              <span>Advisory &amp; Track Record</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${moreDropdownOpen ? 'rotate-180' : ''} ${
                isDark ? 'text-[#8A9692]' : 'text-[#78736B]'
              }`} aria-hidden="true" />
              {isMoreActive && (
                <span className={`absolute bottom-0 left-0 right-0 h-[2px] rounded-full ${isDark ? 'bg-[#BEE179]' : 'bg-[#1E3A34]'}`} />
              )}
            </button>

            {moreDropdownOpen && (
              <div className={`absolute top-full left-0 mt-3 w-80 rounded-2xl shadow-xl border py-2 z-50 text-left animate-in fade-in zoom-in-95 duration-150 ${
                isDark ? 'bg-[#0E1A17] border-[#1E2B27] text-white' : 'bg-white border-[#E4EEEA] text-[#172B2A]'
              }`}>
                <div className={`px-4 py-2 border-b text-[10px] uppercase tracking-widest font-bold ${
                  isDark ? 'border-[#1E2B27] text-[#8A9692]' : 'border-[#E4EEEA] text-[#71817D]'
                }`}>
                  Private Advisory
                </div>
                {secondaryMenuLinks.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => handleNavClick(item.path)}
                    className={`w-full text-left px-4 py-2.5 transition-colors cursor-pointer group ${
                      isDark ? 'hover:bg-[#152622]' : 'hover:bg-[#F6FAF8]'
                    }`}
                  >
                    <div className={`text-xs font-semibold ${isDark ? 'text-white group-hover:text-[#3BD4AE]' : 'text-[#172B2A] group-hover:text-[#087F5B]'}`}>
                      {item.label}
                    </div>
                    <div className={`text-[11px] line-clamp-1 mt-0.5 ${isDark ? 'text-[#8A9692]' : 'text-[#71817D]'}`}>
                      {item.desc}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Zone 3: 1 Primary Action + Utility Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">

          {/* Language Switcher */}
          <HeaderLanguageButton />

          {/* User Account / Portal Access */}
          {user ? (
            <div className="relative" ref={userDropdownRef}>
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-lg border border-[#d4e5f5] bg-white hover:bg-[#f0f8fe] text-xs font-semibold text-[#1C1917] transition-colors cursor-pointer"
              >
                <div className="w-6 h-6 rounded-md bg-[#1E3A34] text-white flex items-center justify-center text-[10px] font-bold">
                  {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="hidden md:inline max-w-[120px] truncate">{user.fullName || 'Account'}</span>
                <ChevronDown className="w-3 h-3 text-[#78736B]" />
              </button>

              {userDropdownOpen && (
                <div className={`absolute right-0 mt-2 w-56 rounded-xl shadow-xl border py-2 z-50 text-left animate-in fade-in zoom-in-95 duration-150 ${
                  isDark ? 'bg-[#0E1A17] border-[#1E2B27] text-white' : 'bg-white border-[#d4e5f5] text-[#1C1917]'
                }`}>
                  <div className={`px-4 py-2 border-b ${isDark ? 'border-[#1E2B27]' : 'border-[#F0EBE1]'}`}>
                    <div className={`text-xs font-bold truncate ${isDark ? 'text-white' : 'text-[#1C1917]'}`}>{user.fullName}</div>
                    <div className={`text-[11px] truncate ${isDark ? 'text-[#8A9692]' : 'text-[#78736B]'}`}>{user.email}</div>
                  </div>
                  
                  <button
                    onClick={() => handleNavClick('/dashboard')}
                    className={`w-full text-left px-4 py-2 text-xs font-medium flex items-center gap-2 cursor-pointer ${
                      isDark ? 'text-slate-200 hover:bg-[#152622]' : 'text-[#1C1917] hover:bg-[#f0f8fe]'
                    }`}
                  >
                    <Wallet className={`w-3.5 h-3.5 ${isDark ? 'text-[#3BD4AE]' : 'text-[#1E3A34]'}`} />
                    <span>Portfolio Dashboard</span>
                  </button>



                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleNavClick('/admin')}
                      className={`w-full text-left px-4 py-2 text-xs font-medium flex items-center gap-2 cursor-pointer ${
                        isDark ? 'text-slate-200 hover:bg-[#152622]' : 'text-[#1C1917] hover:bg-[#f0f8fe]'
                      }`}
                    >
                      <Shield className="w-3.5 h-3.5 text-amber-500" />
                      <span>Admin Control Center</span>
                    </button>
                  )}

                  <div className={`my-1 border-t ${isDark ? 'border-[#1E2B27]' : 'border-[#F0EBE1]'}`} />

                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setUserDropdownOpen(false);
                      onNavigate('/');
                    }}
                    className={`w-full text-left px-4 py-2 text-xs font-medium text-rose-500 flex items-center gap-2 cursor-pointer ${
                      isDark ? 'hover:bg-rose-950/30' : 'hover:bg-rose-50'
                    }`}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => handleNavClick('/login')}
              className={`text-xs font-semibold px-2 py-1 transition-colors cursor-pointer hidden md:inline ${
                isDark ? 'text-[#8A9692] hover:text-white' : 'text-[#5E5A54] hover:text-[#1C1917]'
              }`}
            >
              Sign In
            </button>
          )}


          {/* Compact Mobile Menu Trigger with Accessible Attributes */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`p-2.5 min-h-[44px] min-w-[44px] rounded-lg border lg:hidden focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#1E3A34] transition-colors cursor-pointer flex items-center justify-center ${
              isDark 
                ? 'bg-[#121E1B] border-[#263531] text-white hover:bg-[#182925]' 
                : 'bg-white border-[#d4e5f5] text-[#1C1917] hover:bg-[#f0f8fe]'
            }`}
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation-drawer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Compact Mobile Menu Drawer with ID and Role */}
      {mobileMenuOpen && (
        <div 
          id="mobile-navigation-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation Drawer"
          className="lg:hidden fixed inset-x-0 top-[74px] bottom-0 bg-black/60 backdrop-blur-xs z-40 animate-in fade-in duration-200"
        >
          <div className={`${
            isDark 
              ? 'bg-[#0B1412] text-white border-[#1E2B27]' 
              : 'bg-[#EAF8F4] text-[#172B2A] border-[#E4EEEA]'
          } border-b shadow-2xl max-h-[85vh] overflow-y-auto p-4 sm:p-6 space-y-5 text-left`}>

            {/* Primary Mobile Links */}
            <div className="space-y-1">
              <p className={`text-[10px] uppercase font-bold tracking-widest mb-2 ${isDark ? 'text-[#8A9692]' : 'text-[#78736B]'}`}>
                Main Navigation
              </p>
              <button
                onClick={() => handleNavClick('/properties')}
                className={`w-full text-left py-2.5 text-base font-semibold border-b flex items-center justify-between ${
                  isDark ? 'text-white border-[#1A2623]' : 'text-[#1C1917] border-[#EFEAE1]'
                }`}
              >
                <span>Marketplace</span>
                <ChevronRight className="w-4 h-4 text-[#8E8A83]" />
              </button>
              <button
                onClick={() => handleNavClick('/investing')}
                className={`w-full text-left py-2.5 text-base font-semibold border-b flex items-center justify-between ${
                  isDark ? 'text-white border-[#1A2623]' : 'text-[#1C1917] border-[#EFEAE1]'
                }`}
              >
                <span>How It Works</span>
                <ChevronRight className="w-4 h-4 text-[#8E8A83]" />
              </button>
              <button
                onClick={() => handleNavClick('/insights')}
                className={`w-full text-left py-2.5 text-base font-semibold border-b flex items-center justify-between ${
                  isDark ? 'text-white border-[#1A2623]' : 'text-[#1C1917] border-[#EFEAE1]'
                }`}
              >
                <span>Insights &amp; Dossiers</span>
                <ChevronRight className="w-4 h-4 text-[#8E8A83]" />
              </button>
              <button
                onClick={() => handleNavClick('/agency')}
                className={`w-full text-left py-2.5 text-base font-semibold border-b flex items-center justify-between ${
                  isDark ? 'text-white border-[#1A2623]' : 'text-[#1C1917] border-[#EFEAE1]'
                }`}
              >
                <span>The Agency</span>
                <ChevronRight className="w-4 h-4 text-[#8E8A83]" />
              </button>
              <button
                onClick={() => handleNavClick('/club')}
                className={`w-full text-left py-2.5 text-base font-semibold border-b flex items-center justify-between ${
                  isDark ? 'text-white border-[#1A2623]' : 'text-[#1C1917] border-[#EFEAE1]'
                }`}
              >
                <span>Club Privé</span>
                <ChevronRight className="w-4 h-4 text-[#8E8A83]" />
              </button>
            </div>

            {/* Secondary Mobile Links */}
            <div className={`space-y-2 pt-2 border-t ${isDark ? 'border-[#1E2B27]' : 'border-[#d4e5f5]'}`}>
              <p className={`text-[10px] uppercase font-bold tracking-widest mb-2 ${isDark ? 'text-[#8A9692]' : 'text-[#78736B]'}`}>
                Advisory &amp; Governance
              </p>
              <div className={`grid grid-cols-2 gap-2 text-xs font-medium ${isDark ? 'text-slate-300' : 'text-[#5E5A54]'}`}>
                <button onClick={() => handleNavClick('/trust')} className={`text-left py-1.5 font-bold ${isDark ? 'text-[#BEE179] hover:text-white' : 'text-[#1E3A34] hover:text-[#1C1917]'}`}>Trust Centre</button>
                <button onClick={() => handleNavClick('/legal')} className={`text-left py-1.5 font-bold ${isDark ? 'text-[#BEE179] hover:text-white' : 'text-[#1E3A34] hover:text-[#1C1917]'}`}>Legal Centre (12)</button>
                <button onClick={() => handleNavClick('/token')} className={`text-left py-1.5 ${isDark ? 'hover:text-white' : 'hover:text-[#1C1917]'}`}>Solana Token Model</button>
                <button onClick={() => handleNavClick('/casos-de-exito')} className={`text-left py-1.5 ${isDark ? 'hover:text-white' : 'hover:text-[#1C1917]'}`}>Success Stories</button>
                <button onClick={() => handleNavClick('/wealth')} className={`text-left py-1.5 ${isDark ? 'hover:text-white' : 'hover:text-[#1C1917]'}`}>Wealth Advisory</button>
                <button onClick={() => handleNavClick('/news')} className={`text-left py-1.5 ${isDark ? 'hover:text-white' : 'hover:text-[#1C1917]'}`}>Company News</button>
                <button onClick={() => handleNavClick('/faq')} className={`text-left py-1.5 ${isDark ? 'hover:text-white' : 'hover:text-[#1C1917]'}`}>FAQ &amp; Disclosures</button>
                <button onClick={() => handleNavClick('/contact')} className={`text-left py-1.5 ${isDark ? 'hover:text-white' : 'hover:text-[#1C1917]'}`}>Contact Desk</button>
              </div>
            </div>



            {/* Account CTA on Mobile */}
            <div className={`pt-4 border-t space-y-3 ${isDark ? 'border-[#1E2B27]' : 'border-[#d4e5f5]'}`}>
              {user ? (
                <div className={`flex items-center justify-between p-3.5 rounded-xl border ${
                  isDark ? 'bg-[#121E1B] border-[#263531]' : 'bg-white border-[#d4e5f5]'
                }`}>
                  <div>
                    <div className="text-xs font-bold truncate max-w-[180px]">{user.fullName}</div>
                    <div className={`text-[11px] truncate max-w-[180px] ${isDark ? 'text-[#8A9692]' : 'text-[#78736B]'}`}>{user.email}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleNavClick(isAdmin ? '/admin' : '/dashboard')}
                    className="px-3 py-1.5 rounded-md bg-[#1E3A34] text-white text-xs font-semibold cursor-pointer"
                  >
                    {isAdmin ? 'Admin Console' : 'Portal'}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleNavClick('/login')}
                    className={`py-2.5 rounded-lg border text-xs font-semibold text-center cursor-pointer ${
                      isDark ? 'bg-[#121E1B] border-[#263531] text-white' : 'bg-white border-[#D8D1C5] text-[#1C1917]'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNavClick('/register')}
                    className="py-2.5 rounded-lg bg-[#1E3A34] text-xs font-semibold text-white text-center cursor-pointer hover:bg-[#254A42]"
                  >
                    Create Account
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </header>
  );
};
