import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './lib/auth';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { NavigationProvider, useNavigation } from './context/NavigationContext';
import { ToastProvider } from './context/ToastContext';
import { ConfigProvider } from './context/ConfigContext';
import { ledger } from './lib/ledger';
import { Property } from './types/property';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { SmartsuppWidget } from './components/support/SmartsuppWidget';

// Krez Template Pages
import { KrezHomePage } from './components/krez/KrezHomePage';
import { KrezPropertiesPage } from './components/krez/KrezPropertiesPage';
import { KrezPropertyDetailPage } from './components/krez/KrezPropertyDetailPage';
import { KrezHowItWorksPage } from './components/krez/KrezHowItWorksPage';
import { KrezPortfolioPage } from './components/krez/KrezPortfolioPage';
import { KrezJournalPage } from './components/krez/KrezJournalPage';
import { KrezContactPage } from './components/krez/KrezContactPage';
import { KrezAccountPage } from './components/krez/KrezAccountPage';

// Dedicated Institutional & Platform Pages
import { PropertyDetailView } from './components/properties/PropertyDetailView';
import { TokenPage } from './components/pages/TokenPage';
import { FAQPage } from './components/pages/FAQPage';
import { LegalPage } from './components/pages/LegalPage';
import { TrustCenterPage } from './components/pages/TrustCenterPage';
import { TeamPage } from './components/pages/TeamPage';
import { WealthPage } from './components/pages/WealthPage';
import { MembershipPage } from './components/pages/MembershipPage';
import { SuccessStoriesPage } from './components/pages/SuccessStoriesPage';
import { BlogPage } from './components/pages/BlogPage';
import { CompanyNewsPage } from './components/pages/CompanyNewsPage';
import { AuthPages } from './components/pages/AuthPages';
import { DashboardPage } from './components/pages/DashboardPage';
import { AdminPanel } from './components/admin/AdminPanel';
import { AdminLoginPortal } from './components/admin/AdminLoginPortal';
import { InvestmentGuidePage } from './components/pages/InvestmentGuidePage';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { CookieConsentBanner } from './components/cookies/CookieConsentBanner';
import { updatePageSeo } from './lib/seo';
import { InsightsEditorialHome } from './components/insights/InsightsEditorialHome';
import { InsightArticleDetail } from './components/insights/InsightArticleDetail';
import { ViewportDesktopMonitor } from './components/common/ViewportDesktopMonitor';
import { SchemaJsonLd } from './components/seo/schema';
import { Breadcrumb } from './components/common/Breadcrumb';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { isPassGateUnlocked, subscribePassGate } from './lib/passGate';
import { InitialPlatformLoader } from './components/visuals/InitialPlatformLoader';

import { ArrowLeft, ShieldCheck } from 'lucide-react';

function MainApp() {
  const { user } = useAuth();
  const { currentPath, navigateTo } = useNavigation();
  const { currentLanguage } = useLanguage();
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [pendingInvestmentProperty, setPendingInvestmentProperty] = useState<Property | null>(null);
  const [returnDestination, setReturnDestination] = useState<string | null>(null);
  const [properties, setProperties] = useState<Property[]>(ledger.getProperties());
  const [, setPassGateUnlocked] = useState(isPassGateUnlocked);

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
        const matched = updatedList.find((p) => p.id === prev.id || p.slug === prev.slug);
        if (!matched) return prev;
        if (
          matched.id === prev.id &&
          matched.fundedAmount === prev.fundedAmount &&
          matched.status === prev.status &&
          matched.tokenPrice === prev.tokenPrice &&
          matched.availableTokens === prev.availableTokens
        ) {
          return prev;
        }
        return matched;
      });
    });
  }, []);

  // Synchronize selectedProperty whenever route changes to a property page
  useEffect(() => {
    const clean = currentPath.split('#')[0].split('?')[0];
    if (clean.startsWith('/property/') || clean.startsWith('/properties/')) {
      const slug = clean.replace(/^\/propert(?:y|ies)\//, '');
      const currentList = ledger.getProperties();
      const found = currentList.find((prop) => prop.slug === slug || prop.id === slug);
      if (found) {
        setSelectedProperty((prev) => {
          if (prev && (prev.id === found.id || prev.slug === found.slug)) return prev;
          return found;
        });
      }
    }
  }, [currentPath]);


  // Update dynamic SEO metadata, canonical tags, localized descriptions, and OpenGraph/Twitter cards
  useEffect(() => {
    const clean = currentPath.split('#')[0].split('?')[0];
    if ((clean.startsWith('/property/') || clean.startsWith('/properties/')) && selectedProperty) {
      updatePageSeo({
        path: currentPath,
        lang: currentLanguage,
        title: `${selectedProperty.title} – Fractional Investment | L'Agence`,
        description: `Invest in ${selectedProperty.title} located in ${selectedProperty.location}. Projected net yield ${selectedProperty.estimatedAnnualYield}% p.a.`,
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
    navigateTo(`/property/${property.slug}?dossier=full`);
  };

  const handleAuthSuccess = () => {
    if (pendingInvestmentProperty) {
      const target = pendingInvestmentProperty;
      setPendingInvestmentProperty(null);
      setSelectedProperty(target);
      navigateTo(`/property/${target.slug}?dossier=full`);
    } else if (returnDestination) {
      const dest = returnDestination;
      setReturnDestination(null);
      navigateTo(dest);
    } else {
      navigateTo('/dashboard');
    }
  };

  const handleInvestmentSuccess = () => {
    setProperties(ledger.getProperties());
  };

  const queryString = currentPath.includes('?')
    ? currentPath.substring(currentPath.indexOf('?'))
    : typeof window !== 'undefined'
    ? window.location.search
    : '';
  const searchParams = new URLSearchParams(queryString);
  const wantsFullDossier = searchParams.get('dossier') === 'full';

  // Render appropriate view based on currentPath
  const renderContent = () => {
    const rawPath = currentPath.split('#')[0].split('?')[0] || '/';
    const basePath = rawPath.length > 1 ? rawPath.replace(/\/$/, '') : rawPath;

    // Property detail routes (/properties/:id and /property/:slug)
    if (basePath.startsWith('/properties/') || basePath.startsWith('/property/')) {
      const slug = basePath.replace(/^\/propert(?:y|ies)\//, '');
      const found =
        selectedProperty && (selectedProperty.slug === slug || selectedProperty.id === slug)
          ? selectedProperty
          : properties.find((p) => p.slug === slug || p.id === slug);

      if (found) {
        const isHidden =
          found.status === 'hidden' ||
          found.status === 'pending_approval' ||
          found.approvedForFrontend === false ||
          !found.assignedFunction;

        // Invariant: Non-admin users cannot access hidden properties on the frontend
        if (isHidden && user?.role !== 'admin') {
          return (
            <main className="min-h-[75vh] bg-background pt-header-offset pb-section-sm flex items-center justify-center px-gutter">
              <div className="max-w-md w-full rounded-card border border-border bg-secondary/55 p-card-pad text-center">
                <div className="w-12 h-12 rounded-pill bg-background border border-border text-accent flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <p className="text-xs font-semibold tracking-widest uppercase text-accent mb-2">
                  Off-Market Asset · Admin Custody
                </p>
                <h2 className="text-xl font-heading font-bold uppercase text-foreground mb-2">
                  {found.title}
                </h2>
                <p className="text-sm text-muted leading-relaxed mb-6">
                  This property is currently held in off-market administrative custody and has not yet been approved to appear on the public register.
                </p>
                <button
                  type="button"
                  onClick={() => navigateTo('/properties')}
                  className="w-full py-3.5 px-6 rounded-pill bg-primary text-white font-semibold uppercase tracking-widest text-xs cursor-pointer"
                >
                  Return to Properties
                </button>
              </div>
            </main>
          );
        }

        if (wantsFullDossier) {
          return (
            <div className="pt-16">
              {isHidden && user?.role === 'admin' && (
                <div className="bg-amber-600 text-white px-4 py-2.5 text-center text-xs font-bold flex items-center justify-center gap-2">
                  <span>
                    Administrator Preview Mode: This property is HIDDEN from visitors (Function:{' '}
                    {found.assignedFunction || 'Unassigned'} · Approved: No).
                  </span>
                  <button
                    type="button"
                    onClick={() => navigateTo('/admin')}
                    className="underline bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded text-[11px] cursor-pointer"
                  >
                    Manage in Admin Panel &rarr;
                  </button>
                </div>
              )}
              <PropertyDetailView
                property={found}
                onBack={() => navigateTo(`/properties/${found.slug}`)}
                onNavigateDeposit={() => navigateTo('/dashboard')}
                onNavigateAuthForInvestment={(prop) => {
                  setPendingInvestmentProperty(prop);
                  setReturnDestination(`/property/${prop.slug}?dossier=full`);
                  navigateTo('/login');
                }}
                onInvestmentSuccess={handleInvestmentSuccess}
              />
            </div>
          );
        }
      }

      return (
        <KrezPropertyDetailPage
          buildingId={slug}
          properties={properties}
          onNavigate={navigateTo}
          onOpenFullDossier={(prop) => {
            setSelectedProperty(prop);
            navigateTo(`/property/${prop.slug}?dossier=full`);
          }}
        />
      );
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

    if (basePath.startsWith('/blog/')) {
      const slug = basePath.replace('/blog/', '');
      return (
        <BlogPage
          initialSlug={slug}
          onExploreProperties={() => navigateTo('/properties')}
          onNavigateContact={() => navigateTo('/contact')}
        />
      );
    }

    // Authoritative Admin Portal Routes with strict role enforcement
    const ADMIN_TAB_PREFIXES = [
      '/admin',
      '/admin-login',
      '/users',
      '/deposits',
      '/withdrawals',
      '/deposit-system',
      '/spv',
      '/kyc',
      '/proofs',
      '/wallets',
      '/ledger',
      '/reconciliation',
      '/audit',
      '/logs',
      '/security',
      '/admin-security',
      '/dividends',
      '/issuance',
      '/restore',
      '/manage-referral',
      '/plan-manage',
      '/support-ticket',
      '/report',
      '/promotional-tool',
      '/subscribers',
      '/language',
      '/active-template',
      '/manage-pages',
      '/section-manage',
      '/settings',
      '/logo-icon-setting',
      '/plugins',
      '/seo',
      '/email-manager',
      '/sms-manager',
      '/holiday-setting',
      '/gdpr-cookie',
      '/system-information',
      '/custom-css',
      '/clear-cache',
      '/manual-payment'
    ];

    const isAdminRoute =
      basePath.startsWith('/admin') ||
      basePath === '/admin-login' ||
      ADMIN_TAB_PREFIXES.some(
        (prefix) =>
          basePath === prefix ||
          basePath.startsWith(`${prefix}-`) ||
          basePath.startsWith(`${prefix}/`)
      );

    if (isAdminRoute) {
      if (basePath === '/admin/login' || basePath === '/admin-login') {
        return (
          <AdminLoginPortal
            onLoginSuccess={(openSecurityTab) =>
              navigateTo(openSecurityTab ? '/admin#admin-security' : '/admin')
            }
            onNavigateCustomerLogin={() => navigateTo('/login')}
            onNavigateHome={() => navigateTo('/')}
          />
        );
      }
      return (
        <ProtectedRoute
          requireAdmin
          onNavigateLogin={() => navigateTo('/admin/login')}
        >
          <AdminPanel />
        </ProtectedRoute>
      );
    }

    switch (basePath) {
      case '/':
      case '':
      case '/home':
        return <KrezHomePage onNavigate={navigateTo} />;

      case '/properties':
        return <KrezPropertiesPage properties={properties} onNavigate={navigateTo} />;

      case '/how-it-works':
      case '/investing':
        return <KrezHowItWorksPage onNavigate={navigateTo} />;

      case '/portfolio':
        if (user) {
          return (
            <DashboardPage
              defaultTab="portfolio"
              onSelectProperty={(id) => {
                const p = properties.find((prop) => prop.id === id);
                if (p) handleSelectProperty(p);
              }}
              onExploreProperties={() => navigateTo('/properties')}
              onNavigateProfile={() => navigateTo('/profile')}
              onNavigateTransactions={() => navigateTo('/transactions')}
              onNavigatePortfolio={() => navigateTo('/portfolio')}
              onNavigateHome={() => navigateTo('/')}
            />
          );
        }
        return <KrezPortfolioPage onNavigate={navigateTo} />;

      case '/journal':
        return <KrezJournalPage onNavigate={navigateTo} />;

      case '/contact':
        return <KrezContactPage />;

      case '/account':
        if (user) {
          return (
            <DashboardPage
              defaultTab="overview"
              onSelectProperty={(id) => {
                const p = properties.find((prop) => prop.id === id);
                if (p) handleSelectProperty(p);
              }}
              onExploreProperties={() => navigateTo('/properties')}
              onNavigateProfile={() => navigateTo('/profile')}
              onNavigateTransactions={() => navigateTo('/transactions')}
              onNavigatePortfolio={() => navigateTo('/portfolio')}
              onNavigateHome={() => navigateTo('/')}
            />
          );
        }
        return <KrezAccountPage onNavigate={navigateTo} />;

      case '/insights':
      case '/insights/dossiers': {
        const initialCategory = searchParams.get('category') || 'all';
        const initialType =
          basePath === '/insights/dossiers' || searchParams.get('type') === 'dossiers'
            ? 'dossiers'
            : undefined;
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

      case '/token':
        return <TokenPage onExplore={() => navigateTo('/properties')} />;

      case '/faq':
        return <FAQPage onContact={() => navigateTo('/contact')} />;

      case '/guide':
      case '/security-guide':
        return (
          <InvestmentGuidePage
            onNavigateHome={() => navigateTo('/')}
            onNavigateLogin={() => navigateTo('/login')}
          />
        );

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
        const docSlug = searchParams.get('doc') || undefined;
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
        const requestedTab = searchParams.get('tab');
        const tab = requestedTab || tabMap[basePath] || 'overview';
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
                const p = properties.find((prop) => prop.id === id);
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


      default:
        return (
          <main className="min-h-[75vh] bg-background pt-header-offset pb-section-sm text-foreground">
            <div className="mx-auto max-w-container px-gutter md:px-gutter-md lg:px-gutter-lg">
              <p className="text-xs font-semibold tracking-widest uppercase text-accent">
                404
              </p>
              <h1 className="mt-3 text-4xl font-heading font-bold tracking-tight uppercase text-foreground md:text-5xl">
                Page not found
              </h1>
              <p className="mt-4 max-w-md text-base leading-relaxed text-muted">
                The page you requested does not exist or has moved.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => navigateTo('/')}
                  className="inline-flex items-center gap-2 rounded-pill bg-primary px-6 py-3.5 text-xs font-semibold tracking-widest uppercase text-white cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to home</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigateTo('/properties')}
                  className="rounded-pill border border-border bg-secondary px-6 py-3.5 text-xs font-semibold tracking-widest uppercase text-foreground cursor-pointer"
                >
                  Browse properties
                </button>
              </div>
            </div>
          </main>
        );
    }
  };

  const rawBasePath = (currentPath.split('#')[0] || '/').split('?')[0];
  const currentBasePath = rawBasePath.length > 1 ? rawBasePath.replace(/\/$/, '') : rawBasePath;

  const isDashboardView =
    [
      '/dashboard',
      '/analytics',
      '/transactions',
      '/distributions',
      '/wallet',
      '/deposit',
      '/withdraw',
      '/documents',
      '/referrals',
      '/notifications',
      '/profile',
      '/support',
    ].includes(currentBasePath) || currentBasePath.startsWith('/dashboard');

  const isAdminView = currentBasePath === '/admin' || currentBasePath.startsWith('/admin');
  const isAdminLoginPage = currentBasePath === '/admin/login' || currentBasePath === '/admin-login';
  const isIsolatedAdminEnvironment = isAdminView || isAdminLoginPage;

  const isKrezTemplatePage =
    currentBasePath === '/' ||
    currentBasePath === '' ||
    currentBasePath === '/home' ||
    currentBasePath === '/properties' ||
    currentBasePath.startsWith('/properties/') ||
    (currentBasePath.startsWith('/property/') && !wantsFullDossier) ||
    currentBasePath === '/how-it-works' ||
    currentBasePath === '/investing' ||
    currentBasePath === '/portfolio' ||
    currentBasePath === '/journal' ||
    currentBasePath === '/contact' ||
    currentBasePath === '/account';

  return (
    <div
      className={`flex flex-col ${
        isDashboardView
          ? 'bg-[#090e17] text-[#f1f5f9] h-screen overflow-hidden'
          : 'bg-background text-foreground font-sans min-h-screen'
      }`}
    >
      {/* Keyboard Accessibility Skip Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-pill focus:bg-primary focus:text-white focus:font-semibold focus:text-xs focus:shadow-lg"
      >
        Skip to main content
      </a>

      {!isDashboardView && !isIsolatedAdminEnvironment && (
        <Header currentPath={currentPath} onNavigate={navigateTo} />
      )}

      {/* Hierarchical Breadcrumb on deep institutional pages */}
      {!isDashboardView && !isIsolatedAdminEnvironment && !isKrezTemplatePage && (
        <div className="pt-16">
          <Breadcrumb
            currentPath={currentPath}
            onNavigate={navigateTo}
            selectedProperty={selectedProperty}
          />
        </div>
      )}

      <div id="main-content" className={`flex-1 flex flex-col ${isDashboardView ? 'overflow-hidden' : ''}`}>
        {renderContent()}
      </div>

      {!isDashboardView && !isIsolatedAdminEnvironment && (
        <Footer onNavigate={navigateTo} />
      )}

      {!isIsolatedAdminEnvironment && (
        <CookieConsentBanner onNavigatePrivacy={() => navigateTo('/privacy')} />
      )}

      <InitialPlatformLoader />

      <ViewportDesktopMonitor />

      <SchemaJsonLd property={selectedProperty} />
      <SmartsuppWidget />
    </div>
  );
}


export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <LanguageProvider>
          <NavigationProvider enableInitialLoader={false}>
            <ToastProvider>
              <ConfigProvider>
                <MainApp />
              </ConfigProvider>
            </ToastProvider>
          </NavigationProvider>
        </LanguageProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
