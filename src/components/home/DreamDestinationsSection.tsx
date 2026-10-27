import React, { useState } from 'react';
import { 
  Compass, MapPin, ArrowRight, Building, 
  Waves, Mountain, Palmtree, Sun, Eye, ChevronRight
} from 'lucide-react';

interface DreamDestinationsSectionProps {
  onExploreProperties: () => void;
  onContactAgency: () => void;
}

interface DestinationItem {
  id: string;
  country: string;
  tagline: string;
  image: string;
  icon: React.ElementType;
  description: string;
  highlights: string[];
  propertyTypes: string;
  keyCities: string;
}

export const DreamDestinationsSection: React.FC<DreamDestinationsSectionProps> = ({
  onExploreProperties,
  onContactAgency,
}) => {
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [selectedDestination, setSelectedDestination] = useState<DestinationItem | null>(null);

  const destinations: DestinationItem[] = [
    {
      id: 'france',
      country: 'France',
      tagline: 'Lofts above Parisian rooftops & historic Loire castles',
      image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=85',
      icon: Building,
      description: 'Push the gates of a private castle in the countryside or live in a triplex loft perched above the zinc rooftops of Paris with direct views of the Eiffel Tower.',
      highlights: [
        'Haussmann triplex lofts & private mansions',
        'Historic châteaux in Loire & Bordeaux',
        'Cap d’Antibes & Saint-Tropez waterfront villas',
      ],
      propertyTypes: 'Hôtels Particuliers, Penthouses, Vineyard Châteaux',
      keyCities: 'Paris, Côte d’Azur, Saint-Tropez, Megève, Bordeaux',
    },
    {
      id: 'spain',
      country: 'Spain',
      tagline: 'Lunch in the shade of a secluded Mediterranean secret garden',
      image: 'https://images.unsplash.com/photo-1543783207-ec64e4d95325?auto=format&fit=crop&w=1200&q=85',
      icon: Sun,
      description: 'Discover sun-drenched courtyards framed by centuries-old stone walls, serene Balearic fincas, and grand residential palaces in the golden heart of Madrid.',
      highlights: [
        'Restored stone fincas with olive groves',
        'Madrid Salamanca luxury architectural apartments',
        'Costa del Sol beachfront architectural villas',
      ],
      propertyTypes: 'Balearic Fincas, Seafront Mansions, Salamanca Palaces',
      keyCities: 'Madrid, Barcelona, Ibiza, Mallorca, Marbella',
    },
    {
      id: 'morocco',
      country: 'Morocco',
      tagline: 'Terracotta kasbahs & tranquil fountain courtyards',
      image: 'https://images.unsplash.com/photo-1539020140153-e479b8c22e70?auto=format&fit=crop&w=1200&q=85',
      icon: Mountain,
      description: 'Step behind heavy cedar doors into peaceful orange-blossom riads, or gaze across the Palmeraie toward the snow-capped ridges of the Atlas Mountains.',
      highlights: [
        'Palmeraie oasis estates with swimming sanctuaries',
        'Architectural luxury riads in the Medina',
        'Atlas mountain foothills retreat residences',
      ],
      propertyTypes: 'Private Riads, Palmeraie Estates, Kasbah Sanctuaries',
      keyCities: 'Marrakech, Essaouira, Tangier, Taghazout',
    },
    {
      id: 'reunion-island',
      country: 'Reunion Island',
      tagline: 'Volcanic tropical waterfalls & Indian Ocean sanctuaries',
      image: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=1200&q=85',
      icon: Waves,
      description: 'L’Île Intense invites you to tropical cliffside villas overlooking emerald lagoons and majestic waterfalls tumbling through lush volcanic forests.',
      highlights: [
        'Secluded clifftop ocean-view architectural villas',
        'Tropical gardens with endemic botanical palms',
        'Indian Ocean sunset terraces & private pools',
      ],
      propertyTypes: 'Volcanic Cliff Villas, Lagoon Front Estates',
      keyCities: 'Saint-Gilles-les-Bains, Saint-Leu, Boucan Canot',
    },
    {
      id: 'united-states',
      country: 'United States',
      tagline: 'Manhattan skyline lofts & Florida sunshine waterfronts',
      image: 'https://images.unsplash.com/photo-1485738422979-f5c462d49f74?auto=format&fit=crop&w=1200&q=85',
      icon: Building,
      description: 'High-floor penthouses framed by iconic New York skyscrapers, alongside Biscayne Bay deepwater estates designed for the ultimate yachting lifestyle.',
      highlights: [
        'Full-floor Manhattan panoramic sky residences',
        'Miami deepwater waterfronts with private yacht slips',
        'Bespoke transatlantic advisory & acquisition',
      ],
      propertyTypes: 'Skyline Penthouses, Deepwater Dock Mansions',
      keyCities: 'New York City, Miami Beach, Palm Beach, Aspen',
    },
    {
      id: 'st-barthelemy',
      country: 'St. Barthélemy',
      tagline: 'Crystal-clear turquoise Caribbean bays & red-roofed villas',
      image: 'https://images.unsplash.com/photo-1548574505-5e239809ee19?auto=format&fit=crop&w=1200&q=85',
      icon: Palmtree,
      description: 'The pinnacle of French Caribbean elegance. Unwind in secluded hillside retreats overlooking crystalline coral bays and white-sand beaches.',
      highlights: [
        'Private hillside sanctuaries over Saint-Jean Bay',
        'Direct sandy cove beach access with mooring',
        'Confidential off-market vacation acquisitions',
      ],
      propertyTypes: 'Hillside Caribbean Estates, Beachfront Sanctuaries',
      keyCities: 'Gustavia, Saint-Jean, Flamands, Gouverneur',
    },
    {
      id: 'monaco',
      country: 'Monaco',
      tagline: 'Port de Fontvieille superyacht berths & Mediterranean glamour',
      image: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=85',
      icon: Waves,
      description: 'The international crown jewel of the Riviera. Exclusive high-rise residences with panoramic yacht harbor vistas, utmost security, and tax residency prestige.',
      highlights: [
        'Fontvieille marina & Port Hercule front residences',
        'Carré d’Or luxury full-floor penthouses',
        'Bespoke Monegasque residency & family office support',
      ],
      propertyTypes: 'Waterfront Penthouses, Port-View Residences',
      keyCities: 'Monte-Carlo, Fontvieille, Port Hercule, Larvotto',
    },
  ];

  const filtered = activeFilter === 'all' 
    ? destinations 
    : destinations.filter(d => d.country.toLowerCase() === activeFilter.toLowerCase());

  return (
    <section className="py-20 sm:py-28 bg-[#0B1B30] text-white border-b border-[#1D3860] relative overflow-hidden">
      <div className="container max-w-[1240px] mx-auto px-4 sm:px-6 relative z-10">
        
        {/* Editorial Heading */}
        <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16 space-y-4">
          <p className="text-[11px] font-bold text-[#BEE179] tracking-[0.2em] uppercase">
            Signature Collection · Global Territories
          </p>

          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-black text-[#BEE179] tracking-tight">
            Our Dream Destinations
          </h2>

          <p className="text-base sm:text-lg text-[#D1E2F7] leading-relaxed max-w-2xl mx-auto font-normal">
            From loft residences above the zinc rooftops of Paris to secluded Balearic fincas and Caribbean hillside sanctuaries. Every property is selected for architectural significance and enduring value.
          </p>
        </div>

        {/* Filter Navigation */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition-all cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-[#BEE179] text-[#0B1B30] shadow-xs'
                : 'bg-[#102442] text-[#D1E2F7] hover:text-white border border-[#1D3860]'
            }`}
          >
            All Destinations (7)
          </button>
          {destinations.map((d) => (
            <button
              key={d.id}
              onClick={() => setActiveFilter(d.country)}
              className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition-all cursor-pointer ${
                activeFilter.toLowerCase() === d.country.toLowerCase()
                  ? 'bg-[#BEE179] text-[#0B1B30] shadow-xs'
                  : 'bg-[#102442] text-[#D1E2F7] hover:text-white border border-[#1D3860]'
              }`}
            >
              {d.country}
            </button>
          ))}
        </div>

        {/* Destination Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-16">
          {filtered.map((dest) => {
            const Icon = dest.icon;
            return (
              <div 
                key={dest.id}
                className="bg-[#102442] rounded-xl border border-[#1D3860] overflow-hidden hover:border-[#BEE179]/60 hover:shadow-lg transition-all duration-300 flex flex-col group"
              >
                {/* Visual Image Header */}
                <div className="relative aspect-[16/10] overflow-hidden bg-[#0B1B30]">
                  <img 
                    src={dest.image} 
                    alt={dest.country}
                    className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-700 ease-out" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  
                  {/* Country Badge */}
                  <div className="absolute top-3 left-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-black/60 backdrop-blur-md text-white text-[11px] font-medium tracking-wide border border-white/15">
                      <MapPin className="w-3 h-3 text-[#BEE179]" />
                      {dest.country}
                    </span>
                  </div>

                  {/* Tagline over image bottom */}
                  <div className="absolute bottom-3 left-3 right-3 text-left">
                    <p className="text-xs text-white/95 font-serif italic drop-shadow-sm">
                      "{dest.tagline}"
                    </p>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-6 flex-1 flex flex-col justify-between text-left space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-serif text-xl font-bold text-white group-hover:text-[#BEE179] transition-colors">
                        {dest.country}
                      </h3>
                      <div className="w-8 h-8 rounded-lg bg-[#0B1B30] border border-[#1D3860] flex items-center justify-center text-[#BEE179]">
                        <Icon className="w-4 h-4" />
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-[#D1E2F7] leading-relaxed">
                      {dest.description}
                    </p>

                    {/* Key Highlights */}
                    <div className="pt-3 border-t border-[#1D3860] space-y-1.5">
                      <p className="text-[10px] font-bold text-[#BEE179] uppercase tracking-wider">
                        Signature Formats
                      </p>
                      {dest.highlights.map((h, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-[#D1E2F7]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#BEE179] shrink-0" />
                          <span>{h}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Footer Action Buttons */}
                  <div className="pt-4 border-t border-[#1D3860] flex items-center justify-between gap-3">
                    <button
                      onClick={() => setSelectedDestination(dest)}
                      className="text-xs font-bold text-[#BEE179] hover:underline flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Details & Portfolio</span>
                    </button>

                    <button
                      onClick={onContactAgency}
                      className="px-3.5 py-1.5 rounded-lg bg-[#BEE179] hover:bg-[#AEDB5B] text-[#0B1B30] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                    >
                      <span>Inquire</span>
                      <ArrowRight className="w-3 h-3 text-[#0B1B30]" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Global Concierge Bottom Banner */}
        <div className="bg-[#102442] text-white rounded-xl p-8 sm:p-10 border border-[#1D3860] text-left flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-md">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-bold text-[#BEE179] uppercase tracking-wider">
              <Compass className="w-4 h-4" />
              <span>Bespoke International Mandates</span>
            </div>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-white">
              Seeking confidential acquisition in one of these territories?
            </h3>
            <p className="text-xs sm:text-sm text-[#D1E2F7] leading-relaxed font-normal">
              L'Agence operates a private advisory desk with discreet access to unlisted châteaux, waterfront fincas, and penthouses across all 7 prime regions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto shrink-0">
            <button
              onClick={onContactAgency}
              className="py-3 px-5 text-xs font-bold bg-[#BEE179] text-[#0B1B30] hover:bg-[#AEDB5B] rounded-lg flex items-center gap-2 cursor-pointer transition-all shadow-xs"
            >
              <span>Speak with a Private Broker</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onExploreProperties}
              className="py-3 px-4 text-xs font-bold bg-[#0B1B30] text-white hover:bg-[#132745] border border-[#1D3860] rounded-lg flex items-center gap-2 cursor-pointer transition-all"
            >
              <span>Active Assets</span>
            </button>
          </div>
        </div>

      </div>

      {/* Destination Detail Modal */}
      {selectedDestination && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[#f0f8fe] rounded-xl max-w-lg w-full overflow-hidden shadow-2xl border border-[#d4e5f5]">
            <div className="relative aspect-[16/9] overflow-hidden">
              <img 
                src={selectedDestination.image} 
                alt={selectedDestination.country} 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <button
                onClick={() => setSelectedDestination(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black transition-colors cursor-pointer"
              >
                ✕
              </button>
              <div className="absolute bottom-4 left-4 right-4 text-left">
                <span className="text-[10px] font-semibold text-[#A3C7B6] uppercase tracking-widest">Dream Destination</span>
                <h3 className="font-serif text-2xl font-bold text-white">{selectedDestination.country}</h3>
              </div>
            </div>

            <div className="p-6 text-left space-y-4">
              <p className="text-xs sm:text-sm text-[#57534E] leading-relaxed">
                {selectedDestination.description}
              </p>

              <div className="bg-white p-4 rounded-lg border border-[#d4e5f5] space-y-2 text-xs">
                <div>
                  <span className="font-semibold text-[#1C1917]">Signature Formats: </span>
                  <span className="text-[#78716C]">{selectedDestination.propertyTypes}</span>
                </div>
                <div>
                  <span className="font-semibold text-[#1C1917]">Key Locales: </span>
                  <span className="text-[#78716C]">{selectedDestination.keyCities}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => {
                    setSelectedDestination(null);
                    onContactAgency();
                  }}
                  className="flex-1 py-2.5 text-xs font-semibold bg-[#1E3A34] text-white hover:bg-[#14221F] rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <span>Request Private Catalog</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    setSelectedDestination(null);
                    onExploreProperties();
                  }}
                  className="flex-1 py-2.5 text-xs font-medium border border-[#d4e5f5] text-[#1C1917] hover:bg-white rounded-lg cursor-pointer transition-colors"
                >
                  <span>Explore Assets</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </section>
  );
};
