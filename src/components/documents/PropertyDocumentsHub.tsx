import React, { useState } from 'react';
import { Property } from '../../types/property';
import { PropertyDocumentType } from '../../types/document';
import { PropertyDocumentEngine } from '../../lib/documentGenerator';
import { PropertyDocumentGenerator } from './PropertyDocumentGenerator';
import { formatCurrency } from '../../lib/utils';
import {
  FileText,
  Search,
  RefreshCw,
  AlertTriangle,
  Eye,
  CheckCircle2,
  Filter,
} from 'lucide-react';

interface PropertyDocumentsHubProps {
  properties: Property[];
  readOnly?: boolean;
  onSelectProperty?: (property: Property) => void;
}

export const PropertyDocumentsHub: React.FC<PropertyDocumentsHubProps> = ({
  properties,
  readOnly = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [selectedDocProperty, setSelectedDocProperty] = useState<Property | null>(null);
  const [selectedDocType, setSelectedDocType] = useState<PropertyDocumentType>('brochure');
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [, setRefreshTick] = useState(0);

  const filteredProperties = properties.filter((p) => {
    const ref = (p.ref || p.tokenTicker || '').toLowerCase();
    const title = p.title.toLowerCase();
    const city = (p.city || p.location || '').toLowerCase();
    const query = searchTerm.toLowerCase();
    return (title.includes(query) || ref.includes(query) || city.includes(query)) &&
      (selectedTypeFilter === 'all' || p.type === selectedTypeFilter);
  });

  const handleOpenDoc = (property: Property, type: PropertyDocumentType = 'brochure') => {
    setSelectedDocProperty(property);
    setSelectedDocType(type);
    setIsViewerOpen(true);
  };

  const handleRegenerateProperty = (property: Property, e: React.MouseEvent) => {
    e.stopPropagation();
    if (readOnly) return;
    PropertyDocumentEngine.updateDocument(property, 'brochure', {
      actionType: 'regenerated',
      notes: 'Quick regeneration from Property Documents Registry.',
    });
    setRefreshTick((t) => t + 1);
  };

  const propertyTypes = Array.from(new Set(properties.map((p) => p.type))).filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#121A1F] border border-[#1F2C33]">
          <span className="text-[11px] font-semibold text-[#8FA1A8] uppercase tracking-wider block mb-1">
            Property SPVs
          </span>
          <span className="text-2xl font-bold text-[#F2F5F4] tabular-nums">{properties.length}</span>
          <span className="text-[11px] text-[#6FD8B0] block mt-0.5 font-medium">
            Document registry indexed
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-[#121A1F] border border-[#1F2C33]">
          <span className="text-[11px] font-semibold text-[#8FA1A8] uppercase tracking-wider block mb-1">
            Document Classes
          </span>
          <span className="text-2xl font-bold text-[#F2F5F4]">7 Types</span>
          <span className="text-[11px] text-[#8FA1A8] block mt-0.5">
            Brochures, Agreements &amp; Schedules
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-[#121A1F] border border-[#1F2C33]">
          <span className="text-[11px] font-semibold text-[#8FA1A8] uppercase tracking-wider block mb-1">
            Reconciliation Check
          </span>
          <span className="text-2xl font-bold text-[#6FD8B0]">Verified</span>
          <span className="text-[11px] text-[#8FA1A8] block mt-0.5">
            Synced with live offering terms
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-[#121A1F] border border-[#1F2C33]">
          <span className="text-[11px] font-semibold text-[#8FA1A8] uppercase tracking-wider block mb-1">
            Export Format
          </span>
          <span className="text-2xl font-bold text-[#F2F5F4]">Print &amp; PDF</span>
          <span className="text-[11px] text-[#6FD8B0] block mt-0.5 font-medium">
            High-resolution institutional dossier
          </span>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-[#121A1F] border border-[#1F2C33] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#8FA1A8] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by title, ticker, or city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#1F2C33] text-xs bg-[#0B0F10] text-[#F2F5F4] placeholder-[#52646C] focus:outline-none focus:border-[#6FD8B0]"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-[#8FA1A8]">
            <Filter className="w-3.5 h-3.5" />
            <span>Class:</span>
          </div>
          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className="text-xs font-semibold p-2.5 rounded-xl border border-[#1F2C33] bg-[#0B0F10] text-[#F2F5F4] focus:outline-none focus:border-[#6FD8B0]"
          >
            <option value="all">All Property Classes</option>
            {propertyTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-[#121A1F] rounded-2xl border border-[#1F2C33] overflow-hidden">
        <div className="p-5 border-b border-[#1F2C33] flex flex-wrap justify-between items-center gap-3">
          <div>
            <h3 className="text-base font-bold text-[#F2F5F4]">
              Property SPV Document Registry
            </h3>
            <p className="text-xs text-[#8FA1A8]">
              {readOnly
                ? 'Read-only access: inspect official property brochures, legal drafts, and payment schedules.'
                : 'Select any property to preview, update, or print its institutional 7-document pack.'}
            </p>
          </div>
          <span className="text-xs font-semibold text-[#6FD8B0] tabular-nums">
            {filteredProperties.length} Properties
          </span>
        </div>

        <div className="divide-y divide-[#1F2C33]">
          {filteredProperties.map((property) => {
            const propertyRef = property.ref || property.tokenTicker || `REF-${property.id.slice(-6).toUpperCase()}`;
            const existingDocs = PropertyDocumentEngine.getDocumentsForProperty(property.id);
            const isOutdated = existingDocs.some((d) => d.isOutdated);
            const latestDoc = existingDocs[0];
            const version = latestDoc ? latestDoc.version : 'Ready';

            return (
              <div
                key={property.id}
                className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-[#162026] transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-[#0B0F10] shrink-0 border border-[#1F2C33]">
                    <img
                      src={property.images[0] || property.bannerImage}
                      alt={property.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono font-semibold text-[#6FD8B0]">{propertyRef}</span>
                      <span className="text-[#52646C]">·</span>
                      <span className="text-[#8FA1A8]">{property.type}</span>
                      <span className="text-[#52646C]">·</span>
                      {isOutdated ? (
                        <span className="font-semibold text-amber-400 inline-flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Needs Sync
                        </span>
                      ) : (
                        <span className="font-semibold text-[#6FD8B0] inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> {version}
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-[#F2F5F4] line-clamp-1">
                      {property.title}
                    </h4>

                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-[#8FA1A8]">
                      <span>{property.city}, {property.country}</span>
                      <span>·</span>
                      <span className="font-semibold text-[#F2F5F4] tabular-nums">{formatCurrency(property.targetAmount)}</span>
                      {property.surfaceAreaM2 && (
                        <>
                          <span>·</span>
                          <span>{property.surfaceAreaM2} m²</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenDoc(property, 'brochure')}
                    className="rounded-xl bg-[#6FD8B0] hover:bg-[#5ec8a0] text-[#0B0F10] text-xs font-bold px-3.5 py-2 flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{readOnly ? 'View Brochure' : 'Preview & Edit'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenDoc(property, 'reservation-agreement')}
                    className="rounded-xl border border-[#1F2C33] bg-[#0B0F10] hover:border-[#6FD8B0]/50 text-[#F2F5F4] text-xs font-semibold px-3 py-2 flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#6FD8B0]" />
                    <span>Agreement</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenDoc(property, 'payment-schedule')}
                    className="rounded-xl border border-[#1F2C33] bg-[#0B0F10] hover:border-[#6FD8B0]/50 text-[#F2F5F4] text-xs font-semibold px-3 py-2 cursor-pointer"
                  >
                    Payment Table
                  </button>

                  {!readOnly && (
                    <button
                      type="button"
                      onClick={(e) => handleRegenerateProperty(property, e)}
                      className="p-2 rounded-xl border border-[#1F2C33] bg-[#0B0F10] hover:border-[#6FD8B0]/50 text-[#8FA1A8] hover:text-[#F2F5F4] transition-colors cursor-pointer"
                      title="Regenerate Document Version"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {filteredProperties.length === 0 && (
            <div className="p-8 text-center text-xs text-[#8FA1A8]">No matching properties found.</div>
          )}
        </div>
      </div>

      {selectedDocProperty && (
        <PropertyDocumentGenerator
          property={selectedDocProperty}
          initialType={selectedDocType}
          isOpen={isViewerOpen}
          onClose={() => {
            setIsViewerOpen(false);
            setSelectedDocProperty(null);
          }}
          onDocumentUpdated={() => setRefreshTick((t) => t + 1)}
        />
      )}
    </div>
  );
};
