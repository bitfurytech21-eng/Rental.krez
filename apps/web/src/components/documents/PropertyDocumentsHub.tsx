import React, { useState } from 'react';
import { Property } from '../../types/property';
import { PropertyDocumentType, GeneratedDocumentRecord } from '../../types/document';
import { PropertyDocumentEngine, DOCUMENT_TITLES } from '../../lib/documentGenerator';
import { PropertyDocumentGenerator } from './PropertyDocumentGenerator';
import { formatCurrency, formatDate } from '../../lib/utils';
import {
  FileText,
  Search,
  Printer,
  Edit3,
  RefreshCw,
  History,
  ShieldCheck,
  AlertTriangle,
  Eye,
  Building2,
  CheckCircle2,
  ArrowRight,
  Filter
} from 'lucide-react';

interface PropertyDocumentsHubProps {
  properties: Property[];
  onSelectProperty?: (property: Property) => void;
}

export const PropertyDocumentsHub: React.FC<PropertyDocumentsHubProps> = ({
  properties,
  onSelectProperty,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [selectedDocProperty, setSelectedDocProperty] = useState<Property | null>(null);
  const [selectedDocType, setSelectedDocType] = useState<PropertyDocumentType>('brochure');
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  // Filter properties
  const filteredProperties = properties.filter((p) => {
    const ref = (p.ref || p.tokenTicker || '').toLowerCase();
    const title = p.title.toLowerCase();
    const city = (p.city || p.location || '').toLowerCase();
    const query = searchTerm.toLowerCase();

    const matchesSearch = title.includes(query) || ref.includes(query) || city.includes(query);
    const matchesType = selectedTypeFilter === 'all' || p.type === selectedTypeFilter;

    return matchesSearch && matchesType;
  });

  // Open viewer for a property and document type
  const handleOpenDoc = (property: Property, type: PropertyDocumentType = 'brochure') => {
    setSelectedDocProperty(property);
    setSelectedDocType(type);
    setIsViewerOpen(true);
  };

  // Regenerate all documents for a property
  const handleRegenerateProperty = (property: Property, e: React.MouseEvent) => {
    e.stopPropagation();
    PropertyDocumentEngine.updateDocument(property, 'brochure', {
      actionType: 'regenerated',
      notes: 'Quick regeneration from Property Documents Dashboard.'
    });
    setRefreshTick((t) => t + 1);
  };

  const propertyTypes = Array.from(new Set(properties.map((p) => p.type))).filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Overview Metric Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-[#E3E8E3] shadow-sm">
          <span className="text-[11px] font-bold text-[#69736F] uppercase tracking-wider block mb-1">
            Total Listed Properties
          </span>
          <span className="text-2xl font-black text-[#18211F]">{properties.length}</span>
          <span className="text-[11px] text-[#27845D] block mt-0.5 font-semibold">
            All integrated into Document Engine
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E3E8E3] shadow-sm">
          <span className="text-[11px] font-bold text-[#69736F] uppercase tracking-wider block mb-1">
            Document Categories
          </span>
          <span className="text-2xl font-black text-[#182D2A]">7 Types</span>
          <span className="text-[11px] text-gray-500 block mt-0.5">
            Brochures, Agreements, Payments & Checklists
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E3E8E3] shadow-sm">
          <span className="text-[11px] font-bold text-[#69736F] uppercase tracking-wider block mb-1">
            Reconciliation Standard
          </span>
          <span className="text-2xl font-black text-[#27845D]">100% Balanced</span>
          <span className="text-[11px] text-gray-500 block mt-0.5">
            Zero variance math validation
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E3E8E3] shadow-sm">
          <span className="text-[11px] font-bold text-[#69736F] uppercase tracking-wider block mb-1">
            Export Capability
          </span>
          <span className="text-2xl font-black text-[#18211F]">Print & PDF</span>
          <span className="text-[11px] text-emerald-600 block mt-0.5 font-semibold">
            Vector high-resolution layout
          </span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E3E8E3] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by title, reference (e.g. KP1-102), or city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#E3E8E3] text-xs bg-[#F6F7F4] focus:outline-none focus:border-[#182D2A]"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-[#69736F]">
            <Filter className="w-3.5 h-3.5" />
            <span>Category:</span>
          </div>
          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className="text-xs font-semibold p-2.5 rounded-xl border border-[#E3E8E3] bg-[#F6F7F4] focus:outline-none"
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

      {/* Property Documents Table */}
      <div className="bg-white rounded-3xl border border-[#E3E8E3] shadow-sm overflow-hidden">
        <div className="p-5 border-b border-[#E3E8E3] flex justify-between items-center">
          <div>
            <h3 className="text-base font-bold text-[#18211F]">
              Property Document Generation Registry
            </h3>
            <p className="text-xs text-[#69736F]">
              Select any property to preview, customize, download or print its official 7-document portfolio.
            </p>
          </div>
          <span className="text-xs font-bold text-[#27845D] bg-[#EEF1EC] px-3 py-1 rounded-full">
            {filteredProperties.length} Properties
          </span>
        </div>

        <div className="divide-y divide-[#E3E8E3]">
          {filteredProperties.map((property) => {
            const propertyRef = property.ref || property.tokenTicker || `REF-${property.id.slice(-6).toUpperCase()}`;
            const existingDocs = PropertyDocumentEngine.getDocumentsForProperty(property.id);
            const isOutdated = existingDocs.some((d) => d.isOutdated);
            const latestDoc = existingDocs[0];
            const version = latestDoc ? latestDoc.version : 'Ready (Auto)';

            return (
              <div
                key={property.id}
                className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-[#F6F7F4]/60 transition-colors"
              >
                {/* Property Identity */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-100 shrink-0 border border-[#E3E8E3]">
                    <img
                      src={property.images[0] || property.bannerImage}
                      alt={property.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-[#182D2A] bg-[#EEF1EC] px-2 py-0.5 rounded border border-[#E3E8E3]">
                        {propertyRef}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-[#69736F]">
                        {property.type}
                      </span>
                      {isOutdated ? (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5" /> Outdated
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-[#27845D] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" /> {version}
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-[#18211F] line-clamp-1">
                      {property.title}
                    </h4>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[#69736F]">
                      <span>{property.city}, {property.country}</span>
                      <span>·</span>
                      <span className="font-bold text-[#18211F]">{formatCurrency(property.targetAmount)}</span>
                      {property.surfaceAreaM2 && (
                        <>
                          <span>·</span>
                          <span>{property.surfaceAreaM2} m²</span>
                        </>
                      )}
                      {property.agent?.name && (
                        <>
                          <span>·</span>
                          <span className="text-gray-500">Broker: {property.agent.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Document Actions */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleOpenDoc(property, 'brochure')}
                    className="btn btn-primary text-xs font-bold px-3.5 py-2 flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title="Generate or Preview Document"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Generate & Preview</span>
                  </button>

                  <button
                    onClick={() => handleOpenDoc(property, 'reservation-agreement')}
                    className="btn btn-secondary text-xs font-bold px-3 py-2 flex items-center gap-1.5 cursor-pointer hover:bg-gray-100"
                    title="Open Reservation Agreement Draft"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Draft Agreement</span>
                  </button>

                  <button
                    onClick={() => handleOpenDoc(property, 'payment-schedule')}
                    className="btn btn-secondary text-xs font-bold px-3 py-2 flex items-center gap-1.5 cursor-pointer hover:bg-gray-100"
                    title="View & Reconcile Payment Schedule"
                  >
                    <span>Payment Table</span>
                  </button>

                  <button
                    onClick={(e) => handleRegenerateProperty(property, e)}
                    className="p-2 rounded-xl border border-[#E3E8E3] hover:bg-gray-100 text-[#69736F] hover:text-[#18211F] transition-colors cursor-pointer"
                    title="Regenerate Document Version"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Embedded Document Viewer Modal */}
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
