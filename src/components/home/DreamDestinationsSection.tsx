import React, { useState } from 'react';
import { 
  Compass, MapPin, ArrowRight, Building, 
  ExternalLink, Waves, Mountain, Palmtree, Sun, Eye, ChevronRight
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
      country: 'ST BARTHELEMY',
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
    <section className="py-20 sm:py-28 bg-[#F6F7F4] text-[#18211F] border-b border-[#E3E8E3] relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-100/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#B7E36A]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="container max-w-[1240px] mx-auto px-4 relative z-10">
        
        {/* Editorial Heading */}
        <div className="max-w-3xl mx-auto text-center mb-14 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-[#D5DDD5] text-emerald-900 text-xs font-semibold uppercase tracking-widest shadow-xs">
            <Compass className="w-3.5 h-3.5 text-emerald-700" />
            <span>Kretz Signature Collection</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#18211F] tracking-tight">
            Our Dream Destinations
          </h2>

          <div className="space-y-3 text-base sm:text-lg text-[#55625F] leading-relaxed">
            <p className="font-medium text-[#182D2A]">
              Join us to discover unforgettable homes. Open the doors of a family cottage, push the gates of a castle or those of a dream villa.
            </p>
            <p className="text-sm sm:text-base text-[#69736F]">
              Imagine living in a loft above the rooftops of Paris or having lunch in the shade of a secluded secret garden. Each of our dream destination properties is an encounter, the promise of a life adventure.
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-[#182D2A] text-white shadow-xs'
                : 'bg-white text-[#69736F] hover:text-[#18211F] border border-[#E3E8E3]'
            }`}
          >
            All Destinations (7)
          </button>
          {destinations.map((d) => (
            <button
              key={d.id}
              onClick={() => setActiveFilter(d.country)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeFilter.toLowerCase() === d.country.toLowerCase()
                  ? 'bg-[#182D2A] text-white shadow-xs'
                  : 'bg-white text-[#69736F] hover:text-[#18211F] border border-[#E3E8E3]'
              }`}
            >
              {d.country}
            </button>
          ))}
        </div>

        {/* Destination Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {filtered.map((dest) => {
            const Icon = dest.icon;
            return (
              <div 
                key={dest.id}
                className="bg-white rounded-3xl border border-[#E3E8E3] overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col group"
              >
                {/* Visual Image Header */}
                <div className="relative aspect-[16/10] overflow-hidden bg-slate-900">
                  <img 
                    src={dest.image} 
                    alt={dest.country}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                  
                  {/* Country Badge */}
                  <div className="absolute top-4 left-4">
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/20 text-xs font-bold tracking-wide">
                      <MapPin className="w-3.5 h-3.5 text-[#B7E36A]" />
                      {dest.country}
                    </span>
                  </div>

                  {/* Tagline over image bottom */}
                  <div className="absolute bottom-4 left-4 right-4 text-left">
                    <p className="text-xs text-white/90 font-medium italic drop-shadow-sm">
                      "{dest.tagline}"
                    </p>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between text-left space-y-5">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-extrabold text-[#18211F] group-hover:text-emerald-800 transition-colors">
                        {dest.country}
                      </h3>
                      <div className="w-8 h-8 rounded-full bg-[#EEF2ED] flex items-center justify-center text-emerald-800">
                        <Icon className="w-4 h-4" />
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-[#69736F] leading-relaxed">
                      {dest.description}
                    </p>

                    {/* Key Highlights */}
                    <div className="pt-2 border-t border-[#EEF2ED] space-y-1.5">
                      <p className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">
                        Dream Experiences:
                      </p>
                      {dest.highlights.map((h, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-[#525D5A]">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 flex-shrink-0" />
                          <span>{h}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Footer Action Buttons */}
                  <div className="pt-4 border-t border-[#EEF2ED] flex items-center justify-between gap-3">
                    <button
                      onClick={() => setSelectedDestination(dest)}
                      className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Details & Portfolio</span>
                    </button>

                    <button
                      onClick={onContactAgency}
                      className="px-3.5 py-1.5 rounded-xl bg-[#182D2A] hover:bg-[#25443F] text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                    >
                      <span>Inquire</span>
                      <ArrowRight className="w-3 h-3 text-[#B7E36A]" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Global Concierge Bottom Banner */}
        <div className="bg-[#182D2A] text-white rounded-3xl p-8 sm:p-10 border border-[#23423C] text-left flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-lg">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#B7E36A] uppercase tracking-wider">
              <Compass className="w-4 h-4" />
              <span>Bespoke International Mandates</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white">
              Looking for a confidential home in one of these dream destinations?
            </h3>
            <p className="text-xs sm:text-sm text-[#A8BEB9] leading-relaxed">
              Kretz Agency operates an off-market private desk with confidential access to unlisted châteaux, waterfront fincas, and penthouses across all 7 territories.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <button
              onClick={onContactAgency}
              className="btn btn-primary py-3.5 px-6 text-xs font-bold bg-[#B7E36A] text-[#182D2A] hover:bg-[#C9F07E] rounded-xl flex items-center gap-2 cursor-pointer transition-all shadow-sm flex-1 sm:flex-none justify-center"
            >
              <span>Speak with a Private Broker</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onExploreProperties}
              className="btn btn-secondary py-3.5 px-5 text-xs font-bold bg-[#24423C] text-white hover:bg-[#2E544D] border border-white/10 rounded-xl flex items-center gap-2 cursor-pointer transition-all flex-1 sm:flex-none justify-center"
            >
              <span>Browse Active Assets</span>
            </button>
          </div>
        </div>

      </div>

      {/* Destination Detail Modal */}
      {selectedDestination && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="relative aspect-[16/9] overflow-hidden">
              <img 
                src={selectedDestination.image} 
                alt={selectedDestination.country} 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <button
                onClick={() => setSelectedDestination(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black transition-colors cursor-pointer"
              >
                ✕
              </button>
              <div className="absolute bottom-4 left-4 right-4 text-left">
                <span className="text-xs font-bold text-[#B7E36A] uppercase tracking-wider">Dream Destination</span>
                <h3 className="text-2xl font-black text-white">{selectedDestination.country}</h3>
              </div>
            </div>

            <div className="p-6 text-left space-y-4">
              <p className="text-xs sm:text-sm text-[#4A5552] leading-relaxed">
                {selectedDestination.description}
              </p>

              <div className="bg-[#F6F7F4] p-4 rounded-2xl border border-[#E3E8E3] space-y-2 text-xs">
                <div>
                  <span className="font-bold text-[#18211F]">Signature Formats: </span>
                  <span className="text-[#69736F]">{selectedDestination.propertyTypes}</span>
                </div>
                <div>
                  <span className="font-bold text-[#18211F]">Key Locales: </span>
                  <span className="text-[#69736F]">{selectedDestination.keyCities}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => {
                    setSelectedDestination(null);
                    onContactAgency();
                  }}
                  className="btn btn-primary flex-1 py-3 text-xs font-bold bg-[#182D2A] text-white hover:bg-[#25443F] rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Request Private Catalog</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#B7E36A]" />
                </button>
                <button
                  onClick={() => {
                    setSelectedDestination(null);
                    onExploreProperties();
                  }}
                  className="btn btn-secondary flex-1 py-3 text-xs font-bold border border-[#D5DDD5] text-[#18211F] hover:bg-[#F6F7F4] rounded-xl cursor-pointer"
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
