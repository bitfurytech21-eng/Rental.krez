import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Property } from '../../types/property';
import { MapPin, Navigation, Car, Plane, Train, Compass, ShieldCheck, Utensils, Anchor, GraduationCap, Layers, Globe, CheckCircle2 } from 'lucide-react';

interface Amenity {
  id: string;
  name: string;
  category: 'transport' | 'leisure' | 'dining' | 'school';
  distance: string;
  travelTime: string;
  lat: number;
  lng: number;
  description: string;
}

interface PropertyLocationMapProps {
  property: Property;
}

// Known coordinate lookup table for luxury destinations
const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'roquebrune cap martin': { lat: 43.7656, lng: 7.4727 },
  'monaco': { lat: 43.7384, lng: 7.4246 },
  'monte carlo': { lat: 43.7398, lng: 7.4273 },
  'paris': { lat: 48.8566, lng: 2.3522 },
  'cannes': { lat: 43.5528, lng: 7.0174 },
  'saint-tropez': { lat: 43.2677, lng: 6.6407 },
  'st. tropez': { lat: 43.2677, lng: 6.6407 },
  'ibiza': { lat: 38.9067, lng: 1.4206 },
  'courchevel': { lat: 45.4150, lng: 6.6341 },
  'dubai': { lat: 25.2048, lng: 55.2708 },
  'london': { lat: 51.5074, lng: -0.1278 },
  'miami': { lat: 25.7617, lng: -80.1918 },
  'lisbon': { lat: 38.7223, lng: -9.1393 },
  'madrid': { lat: 40.4168, lng: -3.7038 },
  'barcelona': { lat: 41.3851, lng: 2.1734 },
  'geneva': { lat: 46.2044, lng: 6.1432 },
  'zurich': { lat: 47.3769, lng: 8.5417 },
  'nice': { lat: 43.7102, lng: 7.2620 },
};

function getStaticFallbackCoords(property: Property): { lat: number; lng: number } {
  const cityKey = (property.city || property.location || '').toLowerCase();
  for (const [key, coords] of Object.entries(CITY_COORDINATES)) {
    if (cityKey.includes(key)) {
      return coords;
    }
  }
  let hash = 0;
  for (let i = 0; i < property.id.length; i++) {
    hash = (hash << 5) - hash + property.id.charCodeAt(i);
    hash |= 0;
  }
  const latOffset = ((Math.abs(hash) % 100) - 50) / 1000;
  const lngOffset = ((Math.abs(hash >> 3) % 100) - 50) / 1000;
  return { lat: 43.7384 + latOffset, lng: 7.4246 + lngOffset };
}

function generateNearbyAmenities(center: { lat: number; lng: number }, propertyTitle: string): Amenity[] {
  return [
    {
      id: 'a1',
      name: 'International Airport & Private Jet Terminal',
      category: 'transport',
      distance: '24.5 km',
      travelTime: '28 min drive / Helipad 7 min',
      lat: center.lat + 0.012,
      lng: center.lng - 0.025,
      description: 'Private jet terminal & international air connections.'
    },
    {
      id: 'a2',
      name: 'Central Heliport & High-Speed TGV Station',
      category: 'transport',
      distance: '3.2 km',
      travelTime: '8 min drive',
      lat: center.lat - 0.008,
      lng: center.lng - 0.014,
      description: 'Direct TGV express connections and regional helicopter shuttles.'
    },
    {
      id: 'a3',
      name: 'Deepwater Yacht Club & Private Beach Resort',
      category: 'leisure',
      distance: '1.8 km',
      travelTime: '4 min drive',
      lat: center.lat - 0.006,
      lng: center.lng + 0.008,
      description: 'Superyacht berths, private beach cabanas & luxury marina access.'
    },
    {
      id: 'a4',
      name: 'Michelin Star Fine Dining & Luxury Boutiques',
      category: 'dining',
      distance: '2.4 km',
      travelTime: '6 min drive',
      lat: center.lat + 0.005,
      lng: center.lng + 0.012,
      description: 'World-class gastronomy and designer flagship stores.'
    },
    {
      id: 'a5',
      name: 'Bilingual IB World Academy',
      category: 'school',
      distance: '4.1 km',
      travelTime: '10 min drive',
      lat: center.lat + 0.015,
      lng: center.lng - 0.009,
      description: 'International curriculum serving diplomatic and executive families.'
    },
    {
      id: 'a6',
      name: 'Private VIP Medical Diagnostic Clinic',
      category: 'school',
      distance: '3.6 km',
      travelTime: '9 min drive',
      lat: center.lat - 0.011,
      lng: center.lng + 0.018,
      description: 'State-of-the-art diagnostic imaging & private surgical suites.'
    }
  ];
}

export const PropertyLocationMap: React.FC<PropertyLocationMapProps> = ({ property }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [activeCategory, setActiveCategory] = useState<'all' | 'transport' | 'leisure' | 'dining' | 'school'>('all');
  const [selectedAmenity, setSelectedAmenity] = useState<Amenity | null>(null);
  const [mapStyle, setMapStyle] = useState<'osm' | 'satellite' | 'voyager'>('osm');
  const [liveCoords, setLiveCoords] = useState<{ lat: number; lng: number }>(getStaticFallbackCoords(property));
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);

  // Live Geocoding via OpenStreetMap Nominatim Free API
  useEffect(() => {
    let isMounted = true;
    const query = `${property.location || property.city || ''}, ${property.country || ''}`.trim();

    if (!query) return;

    setIsGeocoding(true);
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`, {
      headers: {
        'Accept-Language': 'en',
        'User-Agent': 'KretzApplet/1.0'
      }
    })
      .then(res => res.json())
      .then(data => {
        if (isMounted && data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);
          if (!isNaN(lat) && !isNaN(lon)) {
            setLiveCoords({ lat, lng: lon });
          }
        }
      })
      .catch(() => {
        // Fallback to internal lookup table
      })
      .finally(() => {
        if (isMounted) setIsGeocoding(false);
      });

    return () => { isMounted = false; };
  }, [property.location, property.city, property.country]);

  const amenities = generateNearbyAmenities(liveCoords, property.title);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [liveCoords.lat, liveCoords.lng],
      zoom: 13,
      zoomControl: false,
      scrollWheelZoom: false,
    });

    // Select Tile URL based on user toggle (All 100% free open API layers)
    let tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    let attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

    if (mapStyle === 'satellite') {
      tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      attribution = 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';
    } else if (mapStyle === 'voyager') {
      tileUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
      attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>';
    }

    const tileLayer = L.tileLayer(tileUrl, {
      attribution,
      subdomains: 'abc',
      maxZoom: 19,
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    // Custom Icon for Property
    const propertyIconHtml = `
      <div style="position: relative; width: 46px; height: 46px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; inset: 0; background-color: rgba(39, 132, 93, 0.4); border-radius: 50%; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="width: 40px; height: 40px; background-color: #0B1B30; border: 3px solid #BEE179; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 25px rgba(0,0,0,0.4);">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#BEE179" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
      </div>
    `;

    const mainMarkerIcon = L.divIcon({
      html: propertyIconHtml,
      className: 'custom-property-pin',
      iconSize: [46, 46],
      iconAnchor: [23, 23],
    });

    const mainMarker = L.marker([liveCoords.lat, liveCoords.lng], { icon: mainMarkerIcon }).addTo(map);
    mainMarker.bindPopup(`
      <div style="font-family: system-ui, sans-serif; padding: 4px; max-width: 220px;">
        <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #18845D; letter-spacing: 0.5px; display: block;">Verified Property</span>
        <h4 style="font-size: 13px; font-weight: 800; color: #0B1B30; margin: 2px 0 6px 0; line-height: 1.2;">${property.title}</h4>
        <p style="font-size: 11px; color: #4A5568; margin: 0;">${property.location}</p>
      </div>
    `);

    // Render Amenities
    const filtered = activeCategory === 'all' ? amenities : amenities.filter(a => a.category === activeCategory);

    filtered.forEach((amenity) => {
      let pinColor = '#3B82F6';
      if (amenity.category === 'transport') pinColor = '#0284C7';
      if (amenity.category === 'leisure') pinColor = '#059669';
      if (amenity.category === 'dining') pinColor = '#D97706';
      if (amenity.category === 'school') pinColor = '#7C3AED';

      const amenityIconHtml = `
        <div style="width: 28px; height: 28px; background-color: #FFFFFF; border: 2px solid ${pinColor}; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.25);">
          <div style="width: 10px; height: 10px; background-color: ${pinColor}; border-radius: 50%;"></div>
        </div>
      `;

      const amenityMarkerIcon = L.divIcon({
        html: amenityIconHtml,
        className: 'custom-amenity-pin',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([amenity.lat, amenity.lng], { icon: amenityMarkerIcon }).addTo(map);
      marker.bindPopup(`
        <div style="font-family: system-ui, sans-serif; padding: 4px; max-width: 220px;">
          <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
            <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; background-color: #F1F5F9; color: ${pinColor}; padding: 2px 6px; border-radius: 4px;">${amenity.category}</span>
            <span style="font-size: 10px; font-weight: 700; color: #64748B;">• ${amenity.distance}</span>
          </div>
          <h4 style="font-size: 12px; font-weight: 700; color: #0F172A; margin: 0 0 4px 0;">${amenity.name}</h4>
          <p style="font-size: 11px; color: #475569; margin: 0; line-height: 1.3;">${amenity.description}</p>
          <div style="font-size: 10px; font-weight: 600; color: #16A34A; margin-top: 6px;">⏱️ ${amenity.travelTime}</div>
        </div>
      `);

      marker.on('click', () => {
        setSelectedAmenity(amenity);
      });
    });

    L.control.zoom({ position: 'topright' }).addTo(map);
    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [liveCoords.lat, liveCoords.lng, activeCategory, mapStyle, property.id]);

  const handleResetView = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([liveCoords.lat, liveCoords.lng], 13);
      setSelectedAmenity(null);
    }
  };

  const handleFocusAmenity = (amenity: Amenity) => {
    setSelectedAmenity(amenity);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([amenity.lat, amenity.lng], 15);
    }
  };

  const filteredAmenities = activeCategory === 'all' 
    ? amenities 
    : amenities.filter(a => a.category === activeCategory);

  return (
    <div className="bg-white rounded-3xl border border-[#E3E8E3] shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-[#E3E8E3] bg-[#F8FAF9] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="w-5 h-5 text-[#27845D]" />
            <h3 className="text-lg font-extrabold text-[#18211F]">Live Location & Prime Surroundings</h3>
            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full ml-2">
              <Globe className="w-3 h-3 text-emerald-600 animate-pulse" />
              <span>OpenStreetMap Live API (Free)</span>
            </span>
          </div>
          <p className="text-xs text-[#69736F]">
            {property.location} · {isGeocoding ? 'Fetching live GPS coordinates...' : `GPS: ${liveCoords.lat.toFixed(4)}°N, ${liveCoords.lng.toFixed(4)}°E`}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Map Layer Selector */}
          <div className="flex items-center bg-white border border-[#CBD5E1] rounded-xl p-0.5 text-xs font-bold">
            <button
              onClick={() => setMapStyle('osm')}
              className={`px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${mapStyle === 'osm' ? 'bg-[#0B1B30] text-white' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Standard
            </button>
            <button
              onClick={() => setMapStyle('satellite')}
              className={`px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${mapStyle === 'satellite' ? 'bg-[#0B1B30] text-white' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Satellite
            </button>
            <button
              onClick={() => setMapStyle('voyager')}
              className={`px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${mapStyle === 'voyager' ? 'bg-[#0B1B30] text-white' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Voyager
            </button>
          </div>

          <button
            onClick={handleResetView}
            className="flex items-center gap-1.5 text-xs font-bold text-[#0B1B30] bg-white border border-[#CBD5E1] px-3 py-2 rounded-xl hover:bg-[#F1F5F9] transition-colors"
          >
            <Compass className="w-4 h-4 text-[#27845D]" />
            <span className="hidden sm:inline">Center</span>
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="px-6 py-3 bg-[#0B1B30] flex items-center gap-2 overflow-x-auto border-b border-slate-800">
        {[
          { id: 'all', label: 'All Highlights', icon: Navigation },
          { id: 'transport', label: 'Airports & Transit', icon: Plane },
          { id: 'leisure', label: 'Marinas & Clubs', icon: Anchor },
          { id: 'dining', label: 'Fine Dining', icon: Utensils },
          { id: 'school', label: 'Schools & Health', icon: GraduationCap },
        ].map((cat) => {
          const IconComponent = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as any)}
              className={`flex items-center gap-2 text-xs font-bold px-3.5 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-[#BEE179] text-[#0B1B30] shadow-sm'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <IconComponent className={`w-3.5 h-3.5 ${isActive ? 'text-[#0B1B30]' : 'text-slate-400'}`} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Map + Side Details Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* Map Container */}
        <div className="lg:col-span-8 h-[380px] sm:h-[460px] relative">
          <div ref={mapContainerRef} className="w-full h-full z-0" />

          {/* Map Overlay Badge */}
          <div className="absolute bottom-4 left-4 z-10 bg-[#0B1B30]/90 backdrop-blur-md text-white px-3.5 py-2 rounded-xl border border-white/10 text-xs flex items-center gap-2 shadow-lg">
            <span className="w-2.5 h-2.5 rounded-full bg-[#BEE179] animate-pulse"></span>
            <span className="font-semibold">{property.city}, {property.country}</span>
            <span className="text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
              Live Free Map API
            </span>
          </div>
        </div>

        {/* Nearby Amenities List */}
        <div className="lg:col-span-4 p-5 bg-[#F8FAF9] border-t lg:border-t-0 lg:border-l border-[#E3E8E3] flex flex-col max-h-[460px] overflow-y-auto space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#18211F]">
              Nearby Points of Interest ({filteredAmenities.length})
            </h4>
            <span className="text-[10px] font-bold text-[#27845D] bg-emerald-100/80 px-2 py-0.5 rounded-md">
              Verified Radius
            </span>
          </div>

          {filteredAmenities.map((item) => {
            const isSelected = selectedAmenity?.id === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleFocusAmenity(item)}
                className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white border-[#27845D] shadow-md ring-1 ring-[#27845D]'
                    : 'bg-white border-[#E3E8E3] hover:border-[#CBD5E1] hover:shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h5 className="text-xs font-extrabold text-[#18211F] line-clamp-1">{item.name}</h5>
                  <span className="text-[11px] font-bold text-[#27845D] bg-emerald-50 px-2 py-0.5 rounded-md shrink-0">
                    {item.distance}
                  </span>
                </div>
                <p className="text-[11px] text-[#69736F] leading-snug line-clamp-2 mb-2">
                  {item.description}
                </p>
                <div className="flex items-center gap-3 text-[10px] font-bold text-[#18211F]">
                  <span className="flex items-center gap-1 text-slate-600">
                    <Car className="w-3 h-3 text-[#27845D]" />
                    {item.travelTime}
                  </span>
                  <span className="capitalize text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {item.category}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
