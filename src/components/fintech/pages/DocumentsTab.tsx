import React, { useState, useMemo } from 'react';
import {
  FileText, Download, Eye, Search, Filter, ShieldCheck,
  Calendar, CheckCircle2, X
} from 'lucide-react';
import { useToast } from '../../../context/ToastContext';

export const DocumentsTab: React.FC = () => {
  const toast = useToast();
  const [activeCategory, setActiveCategory] = useState<'all' | 'agreements' | 'reports' | 'tax' | 'statements'>('all');
  const [search, setSearch] = useState('');
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);

  const documents = useMemo(() => [
    {
      id: 'doc-agr-01',
      title: 'SPV Co-Ownership & Subscription Agreement',
      property: 'NEUILLY-SUR-SEINE - Boulevard d\'Argenson Mansion',
      category: 'agreements',
      categoryLabel: 'Agreements',
      date: '2026-02-18',
      size: '2.4 MB',
      verified: true,
      fileType: 'PDF',
    },
    {
      id: 'doc-agr-02',
      title: 'Digital Token Purchase Contract (ERC-3643)',
      property: 'SAINT-TROPEZ - Les Parcs Private Estate & Vineyard',
      category: 'agreements',
      categoryLabel: 'Agreements',
      date: '2026-03-02',
      size: '1.8 MB',
      verified: true,
      fileType: 'PDF',
    },
    {
      id: 'doc-rep-01',
      title: 'Q1 2026 Portfolio Asset Management Report',
      property: 'All Holdings',
      category: 'reports',
      categoryLabel: 'Reports',
      date: '2026-03-31',
      size: '8.4 MB',
      verified: true,
      fileType: 'PDF',
    },
    {
      id: 'doc-rep-02',
      title: 'Independent RICS Valuation & Engineering Audit',
      property: 'NEUILLY-SUR-SEINE Mansion',
      category: 'reports',
      categoryLabel: 'Reports',
      date: '2026-01-10',
      size: '5.2 MB',
      verified: true,
      fileType: 'PDF',
    },
    {
      id: 'doc-tax-01',
      title: 'Form 1099-DIV / EU Capital Distributions Summary',
      property: 'Fiscal Year 2025',
      category: 'tax',
      categoryLabel: 'Tax forms',
      date: '2026-01-31',
      size: '620 KB',
      verified: true,
      fileType: 'PDF',
    },
    {
      id: 'doc-tax-02',
      title: 'Depreciation & Amortization Schedule (Schedule K-1)',
      property: 'Fiscal Year 2025',
      category: 'tax',
      categoryLabel: 'Tax forms',
      date: '2026-02-15',
      size: '940 KB',
      verified: true,
      fileType: 'PDF',
    },
    {
      id: 'doc-stm-01',
      title: 'Monthly Investor Custody Account Statement - March 2026',
      property: 'Escrow Account #8492',
      category: 'statements',
      categoryLabel: 'Statements',
      date: '2026-04-01',
      size: '480 KB',
      verified: true,
      fileType: 'PDF',
    },
    {
      id: 'doc-stm-02',
      title: 'Monthly Investor Custody Account Statement - February 2026',
      property: 'Escrow Account #8492',
      category: 'statements',
      categoryLabel: 'Statements',
      date: '2026-03-01',
      size: '475 KB',
      verified: true,
      fileType: 'PDF',
    },
  ], []);

  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      if (activeCategory !== 'all' && doc.category !== activeCategory) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!doc.title.toLowerCase().includes(q) && !doc.property.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [documents, activeCategory, search]);

  const handleDownload = (doc: any) => {
    toast.success(`Downloading verified document: ${doc.title}`);
  };

  return (
    <div className="space-y-[16px] text-[#0F172A] dark:text-[#E2E8F0]">
      {/* Header and Controls */}
      <div className="p-[20px] rounded-[12px] bg-white dark:bg-[#111A2C] border border-[#E2E8F0] dark:border-[#1E293B] shadow-[0_1px_3px_rgba(0,0,0,0.06)] space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-[20px] font-semibold">Institutional Documents Vault</h2>
            <p className="text-[12px] text-[#64748B] dark:text-[#94A3B8]">
              Cryptographically signed deeds, SPV governance bylaws, independent audit appraisals, and tax filings
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] dark:text-[#94A3B8]" strokeWidth={1.5} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documents or properties..."
              className="w-full pl-9 pr-3 py-1.5 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#0B1220] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0F4C81]"
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1 border-b border-[#E2E8F0] dark:border-[#1E293B] overflow-x-auto pb-1 text-[13px]">
          {[
            { id: 'all', label: 'All Documents' },
            { id: 'agreements', label: 'Agreements' },
            { id: 'reports', label: 'Reports' },
            { id: 'tax', label: 'Tax forms' },
            { id: 'statements', label: 'Statements' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id as any)}
              className={`px-4 py-2 font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeCategory === tab.id
                  ? 'border-[#0F4C81] dark:border-[#14B8A6] text-[#0F4C81] dark:text-[#14B8A6]'
                  : 'border-transparent text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#E2E8F0]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* File Rows List */}
      <div className="rounded-[12px] bg-white dark:bg-[#111A2C] border border-[#E2E8F0] dark:border-[#1E293B] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="divide-y divide-[#E2E8F0] dark:divide-[#1E293B]">
          {filteredDocs.length === 0 ? (
            <div className="p-12 text-center text-[14px] text-[#64748B] dark:text-[#94A3B8]">
              No documents found in this category.
            </div>
          ) : (
            filteredDocs.map((doc) => (
              <div
                key={doc.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B]/40 transition-colors"
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-[8px] bg-[#0F4C81]/10 dark:bg-[#14B8A6]/10 text-[#0F4C81] dark:text-[#14B8A6] flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[14px] truncate">{doc.title}</span>
                      <span className="px-2 py-0.5 rounded-full bg-[#16A34A]/10 text-[#16A34A] text-[10px] font-semibold flex items-center gap-0.5 shrink-0">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Certified
                      </span>
                    </div>
                    <div className="text-[12px] text-[#64748B] dark:text-[#94A3B8] flex items-center gap-3 mt-0.5">
                      <span className="font-medium text-[#0F172A] dark:text-[#E2E8F0]">{doc.property}</span>
                      <span>•</span>
                      <span>{doc.size}</span>
                      <span>•</span>
                      <span>{doc.date}</span>
                    </div>
                  </div>
                </div>

                {/* Actions: Preview & Download */}
                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <button
                    onClick={() => setPreviewDoc(doc)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E293B] text-[12px] font-medium hover:bg-[#F8FAFC] dark:hover:bg-[#111A2C] transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" /> Preview
                  </button>
                  <button
                    onClick={() => handleDownload(doc)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-[#0F4C81] text-white text-[12px] font-semibold hover:bg-[#0F4C81]/90 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Document Preview Modal */}
      {previewDoc && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={() => setPreviewDoc(null)}
        >
          <div
            className="w-full max-w-[680px] rounded-[12px] bg-white dark:bg-[#111A2C] border border-[#E2E8F0] dark:border-[#1E293B] shadow-2xl p-6 text-[#0F172A] dark:text-[#E2E8F0] space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#1E293B] pb-3">
              <div>
                <h3 className="text-[16px] font-semibold">{previewDoc.title}</h3>
                <p className="text-[12px] text-[#64748B] dark:text-[#94A3B8]">
                  {previewDoc.property} • {previewDoc.date}
                </p>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-1 rounded text-[#64748B] hover:bg-black/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Document Mock Viewer Box */}
            <div className="p-6 rounded-[8px] bg-[#F8FAFC] dark:bg-[#0B1220] border border-[#E2E8F0] dark:border-[#1E293B] space-y-4 text-[13px] leading-relaxed">
              <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-[#64748B] border-b pb-2">
                <span>Notarial Register Deed · Dossier #{previewDoc.id}</span>
                <span className="text-[#16A34A] font-bold">Verified On-Chain</span>
              </div>
              <p className="text-[#0F172A] dark:text-[#E2E8F0]">
                This digital representation verifies that the beneficiary holds legal fractional equity under Special Purpose Vehicle articles registered with the commercial registry.
              </p>
              <div className="grid grid-cols-2 gap-3 text-[12px] p-3 rounded bg-white dark:bg-[#111A2C] border border-[#E2E8F0] dark:border-[#1E293B]">
                <div>
                  <span className="text-[#64748B] block">Registry Code:</span>
                  <span className="font-mono font-bold">FR-RCS-7940182</span>
                </div>
                <div>
                  <span className="text-[#64748B] block">Hash Signature:</span>
                  <span className="font-mono font-bold">0x84fa...91b2</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E8F0] dark:border-[#1E293B]">
              <button
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E293B] text-[13px] font-medium"
              >
                Close Preview
              </button>
              <button
                onClick={() => {
                  handleDownload(previewDoc);
                  setPreviewDoc(null);
                }}
                className="px-5 py-2 rounded-[8px] bg-[#0F4C81] text-white text-[13px] font-semibold"
              >
                Download PDF ({previewDoc.size})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
