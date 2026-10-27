import React, { useEffect, useMemo } from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { Property } from '../../types/property';
import { ledger } from '../../lib/ledger';

export interface BreadcrumbItem {
  label: string;
  path: string;
  isCurrent?: boolean;
}

interface BreadcrumbProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  selectedProperty?: Property | null;
  customItems?: BreadcrumbItem[];
  className?: string;
}

const STATIC_ROUTE_LABELS: Record<string, string> = {
  '/': 'Home',
  '/properties': 'Properties',
  '/insights': 'Insights & Dossiers',
  '/wealth': 'Wealth Advisory',
  '/agency': 'The Agency',
  '/casos-de-exito': 'Success Stories',
  '/club': 'Club Privé',
  '/news': 'Company News',
  '/token': 'Token Model',
  '/investing': 'How It Works',
  '/faq': 'FAQ & Compliance',
  '/contact': 'Contact Desk',
  '/legal': 'Legal Framework',
  '/terms': 'Terms of Service',
  '/privacy': 'Privacy Policy',
  '/cookies': 'Cookie Policy',
  '/blog': 'Blog & Insights',
  '/guide': 'Investor Guide',
  '/login': 'Investor Sign In',
  '/register': 'Create Account',
  '/dashboard': 'Investor Portal',
  '/admin': 'Admin Panel',
};

export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  currentPath,
  onNavigate,
  selectedProperty,
  customItems,
  className = '',
}) => {
  const cleanPath = (currentPath.split('#')[0] || '/').split('?')[0].replace(/\/$/, '') || '/';

  // Compute breadcrumb trail items
  const items = useMemo<BreadcrumbItem[]>(() => {
    if (customItems && customItems.length > 0) {
      return customItems;
    }

    if (cleanPath === '/' || cleanPath === '') {
      return [];
    }

    const trail: BreadcrumbItem[] = [
      { label: 'Home', path: '/' }
    ];

    // Dynamic Property Detail: /property/:slug
    if (cleanPath.startsWith('/property/')) {
      trail.push({ label: 'Properties', path: '/properties' });
      
      const slug = cleanPath.replace('/property/', '');
      let propTitle = selectedProperty?.title;
      if (!propTitle) {
        const found = ledger.getProperties().find(p => p.slug === slug || p.id === slug);
        if (found) propTitle = found.title;
      }

      const displayTitle = propTitle || slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      trail.push({ label: displayTitle, path: cleanPath, isCurrent: true });
      return trail;
    }

    // Dynamic Insights Detail: /insights/:slug
    if (cleanPath.startsWith('/insights/') && cleanPath !== '/insights') {
      trail.push({ label: 'Insights & Dossiers', path: '/insights' });
      const slug = cleanPath.replace('/insights/', '');
      const displayTitle = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      trail.push({ label: displayTitle, path: cleanPath, isCurrent: true });
      return trail;
    }

    // Standard static routes
    const label = STATIC_ROUTE_LABELS[cleanPath] || cleanPath.replace('/', '').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    trail.push({ label, path: cleanPath, isCurrent: true });

    return trail;
  }, [cleanPath, selectedProperty, customItems]);

  // Inject Schema.org BreadcrumbList JSON-LD into document.head for rich search snippets
  useEffect(() => {
    if (typeof document === 'undefined' || items.length <= 1) return;

    const scriptId = 'breadcrumb-jsonld-schema';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://kretz.site';
    const breadcrumbListSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': items.map((item, index) => ({
        '@type': 'ListItem',
        'position': index + 1,
        'name': item.label,
        'item': `${origin}${item.path === '/' ? '' : item.path}`
      }))
    };

    script.textContent = JSON.stringify(breadcrumbListSchema, null, 2);

    return () => {
      // Keep or clean on unmount
    };
  }, [items]);

  if (items.length <= 1) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb Navigation"
      className={`w-full max-w-[1240px] mx-auto px-4 sm:px-6 pt-4 pb-2 ${className}`}
    >
      <ol className="flex items-center gap-1.5 sm:gap-2 text-xs text-[#78716C] flex-wrap leading-normal font-sans">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={`crumb-${item.path}-${index}`} className="flex items-center gap-1.5 sm:gap-2">
              {index > 0 && (
                <ChevronRight className="w-3.5 h-3.5 text-[#A8A29E] shrink-0" aria-hidden="true" />
              )}

              {isLast ? (
                <span
                  aria-current="page"
                  className="font-semibold text-[#1C1917] truncate max-w-[240px] sm:max-w-[420px]"
                  title={item.label}
                >
                  {item.label}
                </span>
              ) : (
                <button
                  onClick={() => onNavigate(item.path)}
                  className="hover:text-[#1E3A34] hover:underline flex items-center gap-1 transition-colors cursor-pointer text-[#57534E] font-medium"
                >
                  {index === 0 && <Home className="w-3.5 h-3.5 text-[#1E3A34] shrink-0" aria-hidden="true" />}
                  <span>{item.label}</span>
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
