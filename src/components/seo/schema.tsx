import React, { useEffect } from 'react';
import { Property } from '../../types/property';

export interface SchemaJsonLdProps {
  type?: 'all' | 'organization' | 'website' | 'property';
  property?: Property | null;
  pathname?: string;
  customSchema?: Record<string, any>;
}

const BASE_URL = 'https://kretzdespain.com';
const BRAND_LOGO = 'https://kretzdespain.com/assets/aistudio/IMG_7234_bd44519a.jpeg';

/**
 * 1. Generates Schema.org Organization (RealEstateAgent) structured data
 */
export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    '@id': `${BASE_URL}/#organization`,
    name: "L'Agence Real Estate",
    legalName: "L'Agence Real Estate (LLC)",
    taxID: '494 861 560',
    vatID: 'FR80494861560',
    iso6523Code: '0002:49486156000030',
    alternateName: [
      "L'Agence Real Estate & Tokenized Assets",
      "Kretz & De Spain Luxury Real Estate",
      "L'Agence Real Estate (Paris RCS 494 861 560)"
    ],
    url: BASE_URL,
    logo: {
      '@type': 'ImageObject',
      url: BRAND_LOGO,
      caption: "L'Agence Real Estate Official Crest"
    },
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&h=630&q=85',
    description: 'Institutional-grade tokenized luxury real estate and prime European property investments built around ring-fenced SPV custody and Solana blockchain settlement infrastructure.',
    telephone: '+34910849210',
    email: 'info@kretz.site',
    priceRange: '€€€€',
    address: [
      {
        '@type': 'PostalAddress',
        streetAddress: '24 Rue du Faubourg Saint-Honoré',
        addressLocality: 'Paris',
        postalCode: '75008',
        addressCountry: 'FR'
      },
      {
        '@type': 'PostalAddress',
        streetAddress: 'Carrer de Pau Claris, 139, Eixample',
        addressLocality: 'Barcelona',
        addressRegion: 'Catalonia',
        postalCode: '08009',
        addressCountry: 'ES'
      }
    ],
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 41.3934,
      longitude: 2.1648
    },
    sameAs: [
      'https://www.youtube.com/watch?v=dwmIqvREPz8',
      'https://maps.google.com/maps/place//data=!4m2!3m1!1s0x12a4a3069490fcf7:0x3a4797b32e1a90ce'
    ],
    contactPoint: [
      {
        '@type': 'ContactPoint',
        telephone: '+34910849210',
        contactType: 'customer service',
        email: 'info@kretz.site',
        areaServed: ['ES', 'FR', 'EU'],
        availableLanguage: ['English', 'Spanish', 'French', 'German']
      },
      {
        '@type': 'ContactPoint',
        telephone: '+34910849210',
        contactType: 'sales',
        email: 'invest@kretz.site',
        areaServed: ['ES', 'FR', 'EU', 'US', 'AE'],
        availableLanguage: ['English', 'Spanish', 'French', 'German']
      }
    ]
  };
}

/**
 * 2. Generates Schema.org WebSite structured data with SearchAction
 */
export function generateWebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${BASE_URL}/#website`,
    url: BASE_URL,
    name: "L'Agence Real Estate | Tokenized Luxury Real Estate Investment Platform",
    description: 'Institutional tokenized luxury real estate platform. Invest in high-yield European villas and prime apartments with monthly yields and verified SPV legal ownership.',
    publisher: {
      '@id': `${BASE_URL}/#organization`
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${BASE_URL}/properties?search={search_term_string}`
      },
      'query-input': 'required name=search_term_string'
    },
    inLanguage: ['en', 'es', 'fr', 'de']
  };
}

/**
 * 3. Generates Schema.org RealEstateListing / SingleFamilyResidence / Apartment structured data
 */
export function generatePropertySchema(property: Property) {
  const propertyUrl = `${BASE_URL}/property/${property.slug}`;
  const images = property.images && property.images.length > 0
    ? property.images
    : [property.bannerImage || BRAND_LOGO];

  const mapItemType = (type: string) => {
    switch (type) {
      case 'Villa':
      case 'House':
      case 'Estate / Property':
      case 'Château':
      case 'Private Mansion':
        return 'SingleFamilyResidence';
      case 'Apartment':
      case 'Coliving':
        return 'Apartment';
      default:
        return 'Accommodation';
    }
  };

  const schemaType = mapItemType(property.type);

  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    '@id': `${propertyUrl}/#listing`,
    name: property.title,
    headline: `${property.title} – Tokenized Fractional Investment`,
    description: property.description.substring(0, 300),
    url: propertyUrl,
    datePosted: property.createdAt || '2026-01-01',
    validFrom: property.createdAt || '2026-01-01',
    image: images,
    offers: {
      '@type': 'Offer',
      price: property.tokenPrice || 100,
      priceCurrency: 'EUR',
      availability: property.status === 'funded' ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
      url: propertyUrl,
      validFrom: property.createdAt || '2026-01-01',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: property.tokenPrice || 100,
        priceCurrency: 'EUR',
        unitText: 'SPV Share Token',
        billingIncrement: 1
      }
    },
    itemOffered: {
      '@type': schemaType,
      '@id': `${propertyUrl}/#property`,
      name: property.title,
      description: property.description.substring(0, 300),
      image: images,
      address: {
        '@type': 'PostalAddress',
        addressLocality: property.city || property.location,
        addressCountry: property.country === 'France' ? 'FR' : 'ES'
      },
      ...(property.surfaceAreaM2 && {
        floorSize: {
          '@type': 'QuantitativeValue',
          value: property.surfaceAreaM2,
          unitCode: 'MTK' // Square Metres
        }
      }),
      ...(property.bedrooms && { numberOfBedrooms: property.bedrooms }),
      ...(property.bathrooms && { numberOfBathroomsTotal: property.bathrooms }),
      ...(property.yearBuilt && { yearBuilt: property.yearBuilt })
    }
  };
}

/**
 * 4. Injects structured data directly into document head
 */
export function injectDocumentHeadSchema(schemas: Record<string, any> | Record<string, any>[]): void {
  if (typeof document === 'undefined') return;

  const scriptId = 'applet-jsonld-schema';
  let script = document.getElementById(scriptId) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.id = scriptId;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }

  const payload = Array.isArray(schemas)
    ? {
        '@context': 'https://schema.org',
        '@graph': schemas.map(s => {
          const { '@context': _, ...rest } = s;
          return rest;
        })
      }
    : schemas;

  script.textContent = JSON.stringify(payload, null, 2);
}

/**
 * 5. React Component for declarative Schema.org injection
 */
export const SchemaJsonLd: React.FC<SchemaJsonLdProps> = ({
  type = 'all',
  property,
  customSchema
}) => {
  useEffect(() => {
    if (customSchema) {
      injectDocumentHeadSchema(customSchema);
      return;
    }

    const schemas: Record<string, any>[] = [];

    // Always include Organization & WebSite schemas on all pages
    schemas.push(generateOrganizationSchema());
    schemas.push(generateWebsiteSchema());

    // If on a property page with a valid property entity, include Property schema
    if (property) {
      schemas.push(generatePropertySchema(property));
    }

    injectDocumentHeadSchema(schemas);
  }, [type, property, customSchema]);

  return null;
};
