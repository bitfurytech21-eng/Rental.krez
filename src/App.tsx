import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './lib/auth';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { NavigationProvider, useNavigation } from './context/NavigationContext';
import { ToastProvider } from './context/ToastContext';
import { ledger } from './lib/ledger';
import { Property } from './types/property';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';

// Home Components
import { Hero } from './components/home/Hero';
import { PlatformStats } from './components/home/PlatformStats';
import { FeaturedPropertiesCarousel } from './components/home/FeaturedPropertiesCarousel';
import { HowItWorks } from './components/home/HowItWorks';
import { Benefits } from './components/home/Benefits';
import { FAQSection } from './components/home/FAQSection';
import { FinalCTA } from './components/home/FinalCTA';
import { AgencyDisciplineSection } from './components/home/AgencyDisciplineSection';
import { DreamDestinationsSection } from './components/home/DreamDestinationsSection';
import { ClubTeaserSection } from './components/home/ClubTeaserSection';
import { CasosDeExitoTeaser } from './components/home/CasosDeExitoTeaser';
import { InsightsTeaserSection } from './components/home/InsightsTeaserSection';
import { TrustedByInvestorsSection } from './components/home/TrustedByInvestorsSection';
import { SolanaInfrastructureSection } from './components/home/SolanaInfrastructureSection';
import { TrustCenterPreviewSection } from './components/home/TrustCenterPreviewSection';

// Dedicated Pages
import { PropertiesPage } from './components/pages/PropertiesPage';
import { PropertyDetailView } from './components/properties/PropertyDetailView';
import { HowItWorksPage } from './components/pages/HowItWorksPage';
import { TokenPage } from './components/pages/TokenPage';
import { FAQPage } from './components/pages/FAQPage';
import { ContactPage } from './components/pages/ContactPage';
import { LegalPage } from './components/pages/LegalPage';
import { TrustCenterPage } from './components/pages/TrustCenterPage';
import { TeamPage } from './components/pages/TeamPage';
import { WealthPage } from './components/pages/WealthPage';
import { MembershipPage } from './components/pages/MembershipPage';
import { SuccessStoriesPage } from './components/pages/SuccessStoriesPage';
import { BlogPage } from './components/pages/BlogPage';
import { CompanyNewsPage } from './components/pages/CompanyNewsPage';
import { ProfilePage } from './components/pages/ProfilePage';
import { AuthPages } from './components/pages/AuthPages';
import { DashboardPage } from './components/pages/DashboardPage';
import { PortfolioOverview } from './components/dashboard/PortfolioOverview';
import { TransactionTable } from './components/dashboard/TransactionTable';
import { AdminPanel } from './components/admin/AdminPanel';
import { AdminLoginPortal } from './components/admin/AdminLoginPortal';
import { InvestmentGuidePage } from './components/pages/InvestmentGuidePage';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { SmartsuppWidget } from './components/support/SmartsuppWidget';
import { CookieConsentBanner } from './components/cookies/CookieConsentBanner';
import { updatePageSeo } from './lib/seo';
import { InsightsEditorialHome } from './components/insights/InsightsEditorialHome';
import { InsightArticleDetail } from './components/insights/InsightArticleDetail';
import { ViewportDesktopMonitor } from './components/common/ViewportDesktopMonitor';
import { SchemaJsonLd } from './components/seo/schema';
import { Breadcrumb } from './components/common/Breadcrumb';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { isPassGateUnlocked, subscribePassGate } from './lib/passGate';

import { ArrowRight, ShieldCheck, UserCheck, Plus } from 'lucide-react';

function MainApp() {
  const { user, isConfigured } = useAuth();
  const { currentPath, navigateTo } = useNavigation();
  const { currentLanguage } = useLanguage();
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [pendingInvestmentProperty, setPendingInvestmentProperty] = useState<Property | null>(null);
  const [returnDestination, setReturnDestination] = useState<string | null>(null);
  const [properties, setProperties] = useState<Property[]>(ledger.getProperties());
  const [passGateUnlocked, setPassGateUnlocked] = useState(isPassGateUnlocked);

  useEffect(() => {
    return subscribePassGate(setPassGateUnlocked);
  }, []);

  // Keep properties and selectedProperty synchronized with ledger mutations
  useEffect(() => {
    return ledger.subscribe(() => {
      const updatedList = ledger.getProperties();
      setProperties(updatedList);
      setSelectedProperty((prev) => {
        if (!prev) return prev;
        return updatedList.find((p) => p.id === prev.id || p.slug === prev.slug) || prev;
      });
    });
  }, []);

  // Synchronize selectedProperty whenever route changes to a property page
  useEffect(() => {
    if (currentPath.startsWith('/property/')) {
      const slug = currentPath.replace('/property/', '');
      const currentList = ledger.getProperties();
      const found = currentList.find(prop => prop.slug === slug || prop.id === slug);
      if (found) setSelectedProperty(found);
    }
  }, [currentPath]);

  // Update dynamic SEO metadata, canonical tags, localized descriptions, and OpenGraph/Twitter cards
  useEffect(() => {
    if (currentPath.startsWith('/property/') && selectedProperty) {
      updatePageSeo({
        path: currentPath,
        lang: currentLanguage,
        title: `${selectedProperty.title} – Fractional Investment | L'Agence Real Estate`,
        description: `Invest in ${selectedProperty.title} located in ${selectedProperty.location}. Projected net yield ${selectedProperty.estimatedAnnualYield}% p.a. Tokenized shares from €750 with segregated SPV legal ownership.`,
        image: selectedProperty.images[0],
        type: 'article',
        schemaType: 'RealEstateAgent',
      });
    } else {
      updatePageSeo({
        path: currentPath,
        lang: currentLanguage,
      });
    }
  }, [currentPath, selectedProperty, currentLanguage]);

  const handleSelectProperty = (property: Property) => {
    setSelectedProperty(property);
    navigateTo(`/property/${property.slug}`);
  };

  // Requirement 10: Preserve selected property when visitor signs in before continuing an investment
  const handleInvestProperty = (property: Property) => {
    if (!user) {
      setPendingInvestmentProperty(property);
      setSelectedProperty(property);
      setReturnDestination(`/property/${property.slug}`);
      navigateTo('/login');
    } else {
      setSelectedProperty(property);
      navigateTo(`/property/${property.slug}`);
    }
  };

  const handleAuthSuccess = () => {
    if (pendingInvestmentProperty) {
      const target = pendingInvestmentProperty;
      setPendingInvestmentProperty(null);
      setSelectedProperty(target);
      navigateTo(`/property/${target.slug}`);
    } else if (returnDestination) {
      const dest = returnDestination;
      setReturnDestination(null);
      navigateTo(dest);
    } else {
      navigateTo('/dashboard');
    }
  };

  // Synchronize properties state whenever an investment occurs
  const handleInvestmentSuccess = () => {
    setProperties(ledger.getProperties());
  };

  // Render appropriate view based on currentPath
  const renderContent = () => {
    const rawPath = currentPath.split('#')[0].split('?')[0] || '/';
    const basePath = rawPath.length > 1 ? rawPath.replace(/\/$/, '') : rawPath;

    // Property detail view
    if (basePath.startsWith('/property/')) {
      const slug = basePath.replace('/property/', '');
      const currentList = properties;
      const found = (selectedProperty && (selectedProperty.slug === slug || selectedProperty.id === slug))
        ? selectedProperty
        : currentList.find(p => p.slug === slug || p.id === slug);

      if (found) {
        const isHidden = found.status === 'hidden' || found.status === 'pending_approval' || found.approvedForFrontend === false || !found.assignedFunction;

        // Invariant: Non-admin users cannot access hidden properties on the frontend
        if (isHidden && user?.role !== 'admin') {
          return (
            <div className="min-h-[70vh] bg-[#F6F7F4] flex items-center justify-center py-20 px-4">
              <div className="max-w-md w-full bg-white rounded-3xl border border-[#E3E8E3] p-8 text-center shadow-lg">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <div className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold mb-3">
                  Off-Market Asset · Admin Custody
                </div>
                <h2 className="text-xl font-bold text-[#18211F] mb-2">{found.title}</h2>
                <p className="text-sm text-[#69736F] leading-relaxed mb-6">
                  This property is currently held in off-market administrative custody and has not yet been approved to appear on the public frontend.
                </p>
                <button
                  onClick={() => navigateTo('/properties')}
                  className="w-full py-3 px-6 rounded-2xl bg-[#182D2A] text-white font-bold text-sm hover:bg-[#27845D] transition-colors cursor-pointer"
                >
                  Return to Active Marketplace
                </button>
              </div>
            </div>
          );
        }

        return (
          <div>
            {isHidden && user?.role === 'admin' && (
              <div className="bg-amber-600 text-white px-4 py-2.5 text-center text-xs font-bold flex items-center justify-center gap-2">
                <span>🔒 Administrator Preview Mode: This property is HIDDEN from visitors (Function: {found.assignedFunction || 'Unassigned'} · Approved: No).</span>
                <button
                  onClick={() => navigateTo('/admin')}
                  className="underline bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded text-[11px] cursor-pointer"
                >
                  Manage in Admin Panel &rarr;
                </button>
              </div>
            )}
            <PropertyDetailView
              property={found}
              onBack={() => navigateTo('/properties')}
              onNavigateDeposit={() => navigateTo('/dashboard')}
              onNavigateAuthForInvestment={(prop) => {
                setPendingInvestmentProperty(prop);
                setReturnDestination(`/property/${prop.slug}`);
                navigateTo('/login');
              }}
              onInvestmentSuccess={handleInvestmentSuccess}
            />
          </div>
        );
      }
    }

    // Individual Insight Article / Dossier view
    if (basePath.startsWith('/insights/') && basePath !== '/insights/dossiers') {
      const articleSlug = basePath.replace('/insights/', '');
      return (
        <InsightArticleDetail
          slug={articleSlug}
          onNavigateBack={() => navigateTo('/insights')}
          onSelectArticle={(newSlug) => navigateTo(`/insights/${newSlug}`)}
          onSelectCategory={(catSlug) => navigateTo(`/insights?category=${catSlug}`)}
        />
      );
    }

    switch (basePath) {
      case '/properties':
        return (
          <PropertiesPage
            properties={properties}
            onSelectProperty={handleSelectProperty}
            onInvestProperty={handleInvestProperty}
          />
        );

      case '/insights':
      case '/insights/dossiers': {
        const queryParams = typeof window !== 'undefined' 
          ? new URLSearchParams(window.location.search || (currentPath.includes('?') ? currentPath.substring(currentPath.indexOf('?')) : ''))
          : new URLSearchParams();
        const initialCategory = queryParams.get('category') || 'all';
        const initialType = (basePath === '/insights/dossiers' || queryParams.get('type') === 'dossiers') ? 'dossiers' : undefined;
        return (
          <InsightsEditorialHome
            initialCategory={initialCategory}
            initialType={initialType}
            onSelectArticle={(slug) => navigateTo(`/insights/${slug}`)}
            onSelectCategory={(catSlug) => navigateTo(`/insights?category=${catSlug}`)}
          />
        );
      }

      case '/team':
      case '/agency':
        return (
          <TeamPage
            onExplore={() => navigateTo('/properties')}
            onContact={() => navigateTo('/contact')}
          />
        );

      case '/wealth':
        return (
          <WealthPage
            onExplore={() => navigateTo('/properties')}
            onContact={() => navigateTo('/contact')}
          />
        );

      case '/club':
      case '/membership':
      case '/club-prive':
        return (
          <MembershipPage
            onNavigateHome={() => navigateTo('/')}
            onNavigateContact={() => navigateTo('/contact')}
            onNavigateProperties={() => navigateTo('/properties')}
            onNavigateLogin={() => navigateTo('/login')}
          />
        );

      case '/casos-de-exito':
      case '/success-stories':
      case '/exito':
        return (
          <SuccessStoriesPage
            onExploreProperties={() => navigateTo('/properties')}
            onNavigateContact={() => navigateTo('/contact')}
          />
        );

      case '/blog':
      case '/en/blog':
      case '/es/blog':
        return (
          <BlogPage
            onExploreProperties={() => navigateTo('/properties')}
            onNavigateContact={() => navigateTo('/contact')}
          />
        );

      case '/news':
      case '/company-news':
      case '/noticias':
      case '/press':
        return (
          <CompanyNewsPage
            onExploreProperties={() => navigateTo('/properties')}
            onNavigateContact={() => navigateTo('/contact')}
          />
        );

      case '/investing':
        return (
          <HowItWorksPage
            onExplore={() => navigateTo('/properties')}
            onRegister={() => navigateTo('/register')}
          />
        );

      case '/token':
        return (
          <TokenPage
            onExplore={() => navigateTo('/properties')}
          />
        );

      case '/faq':
        return (
          <FAQPage
            onContact={() => navigateTo('/contact')}
          />
        );

      case '/guide':
      case '/security-guide':
        return (
          <InvestmentGuidePage
            onNavigateHome={() => navigateTo('/')}
            onNavigateLogin={() => navigateTo('/login')}
          />
        );

      case '/contact':
        return <ContactPage />;

      case '/trust':
      case '/trust-center':
      case '/trust-centre':
      case '/transparency':
        return <TrustCenterPage onNavigate={navigateTo} />;

      case '/legal':
      case '/compliance':
      case '/disclosures':
      case '/cookies':
      case '/terms':
      case '/privacy': {
        const queryStr = currentPath.includes('?')
          ? currentPath.substring(currentPath.indexOf('?'))
          : typeof window !== 'undefined'
          ? window.location.search
          : '';
        const params = new URLSearchParams(queryStr);
        const docSlug = params.get('doc') || undefined;
        const legalMode =
          basePath === '/privacy'
            ? 'privacy'
            : basePath === '/cookies'
            ? 'cookies'
            : basePath === '/disclosures'
            ? 'disclosures'
            : 'terms';
        return (
          <LegalPage
            mode={legalMode}
            initialDocSlug={docSlug}
            onNavigateTrust={() => navigateTo('/trust')}
          />
        );
      }

      case '/login':
      case '/signin':
        return (
          <AuthPages
            key="auth-page-login"
            initialMode="login"
            preservedProperty={pendingInvestmentProperty}
            onSuccess={handleAuthSuccess}
            onNavigateMode={(m) => navigateTo(`/${m}`)}
          />
        );

      case '/register':
      case '/signup':
      case '/join':
      case '/create-account':
        return (
          <AuthPages
            key="auth-page-register"
            initialMode="register"
            preservedProperty={pendingInvestmentProperty}
            onSuccess={handleAuthSuccess}
            onNavigateMode={(m) => navigateTo(`/${m}`)}
          />
        );

      case '/forgot-password':
        return (
          <AuthPages
            initialMode="forgot-password"
            onSuccess={() => navigateTo('/login')}
            onNavigateMode={(m) => navigateTo(`/${m}`)}
          />
        );

      case '/reset-password':
        return (
          <AuthPages
            initialMode="reset-password"
            onSuccess={() => navigateTo('/login')}
            onNavigateMode={(m) => navigateTo(`/${m}`)}
          />
        );

      case '/dashboard':
      case '/analytics':
      case '/portfolio':
      case '/transactions':
      case '/distributions':
      case '/wallet':
      case '/deposit':
      case '/withdraw':
      case '/documents':
      case '/referrals':
      case '/notifications':
      case '/profile':
      case '/support': {
        const tabMap: Record<string, string> = {
          '/dashboard': 'overview',
          '/analytics': 'analytics',
          '/portfolio': 'portfolio',
          '/transactions': 'transactions',
          '/distributions': 'distributions',
          '/wallet': 'wallet',
          '/deposit': 'deposit',
          '/withdraw': 'withdraw',
          '/documents': 'documents',
          '/referrals': 'referrals',
          '/notifications': 'notifications',
          '/profile': 'profile',
          '/support': 'support',
        };
        const tab = tabMap[basePath] || 'overview';
        return (
          <ProtectedRoute
            onNavigateLogin={() => {
              setReturnDestination(basePath);
              navigateTo('/login');
            }}
          >
            <DashboardPage
              defaultTab={tab}
              onSelectProperty={(id) => {
                const p = properties.find(prop => prop.id === id);
                if (p) handleSelectProperty(p);
              }}
              onExploreProperties={() => navigateTo('/properties')}
              onNavigateProfile={() => navigateTo('/profile')}
              onNavigateTransactions={() => navigateTo('/transactions')}
              onNavigatePortfolio={() => navigateTo('/portfolio')}
              onNavigateHome={() => navigateTo('/')}
            />
          </ProtectedRoute>
        );
      }

      case '/admin/login':
      case '/admin-login':
        return (
          <AdminLoginPortal
            onLoginSuccess={(openSecurityTab) =>
              navigateTo(openSecurityTab ? '/admin#admin-security' : '/admin')
            }
            onNavigateCustomerLogin={() => navigateTo('/login')}
            onNavigateHome={() => navigateTo('/')}
          />
        );

      case '/admin':
      case '/admin/deposits':
      case '/admin/withdrawals':
        return (
          <ProtectedRoute
            requireAdmin
            onNavigateLogin={() => navigateTo('/admin/login')}
          >
            <AdminPanel />
          </ProtectedRoute>
        );

      // Default: Homepage
      case '/':
      default: {
        const liveHomepageOfferingsCount = properties.filter(
          (p) =>
            p.status !== 'hidden' &&
            p.status !== 'pending_approval' &&
            p.approvedForFrontend !== false &&
            Boolean(p.assignedFunction)
        ).length;

        return (
          <main className="overflow-x-hidden">
            <Hero
              onExplore={() => navigateTo('/properties')}
              onHowItWorks={() => navigateTo('/investing')}
              properties={properties}
              onSelectProperty={handleSelectProperty}
            />

            <PlatformStats
              activeOfferingsCount={liveHomepageOfferingsCount}
              properties={properties}
            />

            <FeaturedPropertiesCarousel
              properties={properties}
              onSelectProperty={handleSelectProperty}
              onInvestProperty={handleInvestProperty}
              onExploreAll={() => navigateTo('/properties')}
              onHowItWorks={() => navigateTo('/investing')}
            />

            <DreamDestinationsSection
              onExploreProperties={() => navigateTo('/properties')}
              onContactAgency={() => navigateTo('/contact')}
            />

            <AgencyDisciplineSection
              onNavigateTeam={() => navigateTo('/team')}
              onNavigateContact={() => navigateTo('/contact')}
              onNavigateProperties={() => navigateTo('/properties')}
            />

            <HowItWorks
              onExploreMarketplace={() => navigateTo('/properties')}
              onLearnMore={() => navigateTo('/investing')}
            />

            <SolanaInfrastructureSection
              properties={properties}
              onNavigateToken={() => navigateTo('/token')}
              onNavigateTrust={() => navigateTo('/trust')}
              onSelectProperty={handleSelectProperty}
            />

            <CasosDeExitoTeaser
              onNavigateCasos={() => navigateTo('/casos-de-exito')}
              onNavigateBlog={() => navigateTo('/blog')}
              onNavigateProperties={() => navigateTo('/properties')}
            />

            <InsightsTeaserSection
              onNavigateInsights={() => navigateTo('/insights')}
              onNavigateDossier={(slug) => navigateTo(`/insights/${slug}`)}
              onNavigateCategory={(cat) => navigateTo(`/insights?category=${cat}`)}
            />

            <Benefits />

            <TrustCenterPreviewSection
              onNavigateTrust={() => navigateTo('/trust')}
              onNavigateLegalDoc={(docId) =>
                navigateTo(docId ? `/legal?doc=${docId}` : '/legal')
              }
            />

            <ClubTeaserSection
              onExploreClub={() => navigateTo('/club')}
              onContactDesk={() => navigateTo('/contact')}
            />

            <FAQSection
              onNavigateFAQ={() => navigateTo('/faq')}
              onNavigateContact={() => navigateTo('/contact')}
            />

            <FinalCTA
              onRegister={() => navigateTo('/register')}
              onExplore={() => navigateTo('/properties')}
            />

            <TrustedByInvestorsSection />
          </main>
        );
      }
    }
  };

  const rawBasePath = (currentPath.split('#')[0] || '/').split('?')[0];
  const currentBasePath = rawBasePath.length > 1 ? rawBasePath.replace(/\/$/, '') : rawBasePath;
  const isDashboardView = [
    '/dashboard', '/analytics', '/portfolio', '/transactions', '/distributions', 
    '/wallet', '/deposit', '/withdraw', '/documents', '/referrals', '/notifications', 
    '/profile', '/support'
  ].includes(currentBasePath) || currentBasePath.startsWith('/dashboard');

  const isAdminView = currentBasePath === '/admin' || currentBasePath.startsWith('/admin');
  const isAdminLoginPage = currentBasePath === '/admin/login' || currentBasePath === '/admin-login';
  const isIsolatedAdminEnvironment = isAdminView || isAdminLoginPage;
  const isHomePage = currentBasePath === '/' || currentBasePath === '';

  return (
    <div className={`flex flex-col ${isDashboardView ? 'bg-white h-screen overflow-hidden' : 'bg-[#f0f8fe] text-[#1C1917] font-sans min-h-screen'}`}>
      {/* Keyboard Accessibility Skip Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-[#0B1B30] focus:text-[#BEE179] focus:font-bold focus:text-xs focus:shadow-lg"
      >
        Skip to main content
      </a>

      {!isDashboardView && !isIsolatedAdminEnvironment && <Header currentPath={currentPath} onNavigate={navigateTo} />}

      {/* Dynamic Hierarchical Breadcrumb Navigation & Schema.org BreadcrumbList */}
      {!isDashboardView && !isIsolatedAdminEnvironment && !isHomePage && (
        <Breadcrumb
          currentPath={currentPath}
          onNavigate={navigateTo}
          selectedProperty={selectedProperty}
        />
      )}

      <div id="main-content" className={`flex-1 flex flex-col ${isDashboardView ? 'overflow-hidden' : ''}`}>
        {renderContent()}
      </div>

      {/* Standard Institutional Footer across all public pages */}
      {!isDashboardView && !isIsolatedAdminEnvironment && <Footer onNavigate={navigateTo} />}

      {/* Customer Support System (excluded from isolated admin routes) */}
      {!isIsolatedAdminEnvironment && <SmartsuppWidget />}

      {/* First-visit Cookie Consent Banner */}
      {!isIsolatedAdminEnvironment && <CookieConsentBanner onNavigatePrivacy={() => navigateTo('/privacy')} />}

      {/* Viewport Resize Monitor & Desktop Site Layout Trigger */}
      <ViewportDesktopMonitor />

      {/* Dynamic Schema.org JSON-LD Structured Data Engine */}
      <SchemaJsonLd property={selectedProperty} />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <LanguageProvider>
          <NavigationProvider>
            <ToastProvider>
              <MainApp />
            </ToastProvider>
          </NavigationProvider>
        </LanguageProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
