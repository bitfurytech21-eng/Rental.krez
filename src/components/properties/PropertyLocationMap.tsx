import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Property } from '../../types/property';
import { MapPin, Compass, ExternalLink, LocateFixed, Info } from 'lucide-react';

interface PropertyLocationMapProps {
  property: Property;
}

const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'roquebrune cap martin': { lat: 43.7656, lng: 7.4727 },
  monaco: { lat: 43.7384, lng: 7.4246 },
  'monte carlo': { lat: 43.7398, lng: 7.4273 },
  paris: { lat: 48.8566, lng: 2.3522 },
  cannes: { lat: 43.5528, lng: 7.0174 },
  'saint-tropez': { lat: 43.2677, lng: 6.6407 },
  'st. tropez': { lat: 43.2677, lng: 6.6407 },
  ibiza: { lat: 38.9067, lng: 1.4206 },
  courchevel: { lat: 45.415, lng: 6.6341 },
  dubai: { lat: 25.2048, lng: 55.2708 },
  london: { lat: 51.5074, lng: -0.1278 },
  miami: { lat: 25.7617, lng: -80.1918 },
  lisbon: { lat: 38.7223, lng: -9.1397 },
  madrid: { lat: 40.4168, lng: -3.7038 },
  barcelona: { lat: 41.3851, lng: 2.1734 },
  geneva: { lat: 46.2044, lng: 6.1432 },
  zurich: { lat: 47.3769, lng: 8.5417 },
  nice: { lat: 43.7102, lng: 7.262 },
};

function resolveCoordinates(property: Property): { lat: number; lng: number; exact: boolean } | null {
  if (Number.isFinite(property.latitude) && Number.isFinite(property.longitude)) {
    return { lat: property.latitude as number, lng: property.longitude as number, exact: true };
  }
  const searchText = `${property.city || ''} ${property.location || ''}`.toLowerCase();
  const match = Object.entries(CITY_COORDINATES).find(([city]) => searchText.includes(city));
  return match ? { ...match[1], exact: false } : null;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char] || char));
}

export const PropertyLocationMap: React.FC<PropertyLocationMapProps> = ({ property }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const coordinates = useMemo(() => resolveCoordinates(property), [
    property.latitude, property.longitude, property.city, property.location,
  ]);
  const mapSearch = encodeURIComponent([property.title, property.location, property.city, property.country].filter(Boolean).join(', '));
  const externalMapUrl = `https://www.openstreetmap.org/search?query=${mapSearch}`;

  useEffect(() => {
    if (!mapContainerRef.current || !coordinates) {
      setMapReady(false);
      return;
    }

    const map = L.map(mapContainerRef.current, {
      center: [coordinates.lat, coordinates.lng],
      zoom: coordinates.exact ? 15 : 12,
      zoomControl: false,
      scrollWheelZoom: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
      subdomains: 'abc',
      maxZoom: 19,
      updateWhenIdle: true,
      keepBuffer: 2,
    }).addTo(map);

    const marker = L.divIcon({
      className: 'kretz-property-map-pin',
      html: '<div style="width:38px;height:38px;border-radius:50%;background:#183d32;border:3px solid #d6b878;display:grid;place-items:center;box-shadow:0 5px 18px #0004;color:#fff;font-size:18px">⌂</div>',
      iconSize: [38, 38],
      iconAnchor: [19, 19],
    });
    L.marker([coordinates.lat, coordinates.lng], { icon: marker })
      .addTo(map)
      .bindPopup(`<strong>${escapeHtml(property.title)}</strong><br/>${escapeHtml(property.city || property.location)}`);

    L.control.zoom({ position: 'topright' }).addTo(map);
    mapInstanceRef.current = map;
    setMapReady(true);

    const resizeObserver = new ResizeObserver(() => map.invalidateSize());
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [coordinates?.lat, coordinates?.lng, coordinates?.exact, property.id, property.title, property.city, property.location]);

  const centerMap = () => {
    if (mapInstanceRef.current && coordinates) {
      mapInstanceRef.current.setView([coordinates.lat, coordinates.lng], coordinates.exact ? 15 : 12, { animate: true });
    }
  };

  return (
    <section className="overflow-hidden rounded-3xl border border-[#dfe7e2] bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-[#e5ebe7] bg-[#f7faf8] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[#183d32]">
            <MapPin className="h-5 w-5" />
            <h3 className="text-base font-bold">Property location</h3>
          </div>
          <p className="mt-1 text-xs text-[#6c7771]">{[property.location, property.city, property.country].filter(Boolean).join(' · ')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={centerMap} disabled={!coordinates || !mapReady} className="inline-flex items-center gap-2 rounded-xl border border-[#d9e3dd] bg-white px-3 py-2 text-xs font-semibold text-[#244b3d] disabled:opacity-50">
            <LocateFixed className="h-4 w-4" /> Centre map
          </button>
          <a href={externalMapUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-[#183d32] px-3 py-2 text-xs font-semibold text-white">
            Open map <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {coordinates ? (
        <>
          <div ref={mapContainerRef} className="h-[340px] w-full bg-[#eef2ef] sm:h-[440px]" aria-label={`Map showing ${property.title}`} />
          <div className="flex items-start gap-2 border-t border-[#e5ebe7] bg-[#fbfcfb] px-5 py-3 text-xs text-[#66716b]">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#477a63]" />
            <span>{coordinates.exact ? 'Pin uses the property coordinates supplied in its record.' : 'Approximate city-centre location. Add verified latitude and longitude to the property record for an exact pin.'} Map data © OpenStreetMap contributors.</span>
          </div>
        </>
      ) : (
        <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 bg-[#f7faf8] px-6 py-10 text-center">
          <Compass className="h-9 w-9 text-[#477a63]" />
          <p className="max-w-md text-sm font-semibold text-[#26332d]">Map coordinates are not available for this property yet.</p>
          <p className="max-w-md text-xs text-[#6c7771]">The location search can still be opened in OpenStreetMap. Add verified coordinates to display an accurate map pin.</p>
          <a href={externalMapUrl} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-[#183d32] px-4 py-2.5 text-xs font-bold text-white">Search this location</a>
        </div>
      )}
    </section>
  );
};
