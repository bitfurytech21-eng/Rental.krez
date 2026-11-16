import React, { useEffect, useRef, useState } from 'react';
import { UploadCloud, FileText } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { usePortal } from '../state/PortalContext';
import { portalApi } from '../services/portalApi';
import { PortalComplianceDoc } from '../types';
import { formatShortDate } from '../utils/format';
import { validateComplianceFile } from '../utils/validate';
import { EmptyState } from '../components/EmptyState';

export const CompliancePage: React.FC = () => {
  const toast = useToast();
  const { profile, refreshProfile } = usePortal();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [docs, setDocs] = useState<PortalComplianceDoc[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [category, setCategory] = useState<'kyc_identity' | 'proof_of_address' | 'accredited_proof'>('kyc_identity');
  const [documentType, setDocumentType] = useState('Passport');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    portalApi
      .getComplianceDocuments()
      .then((list) => {
        if (active) setDocs(list);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingDocs(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const kycStatus = profile?.kycStatus || 'pending';
  const hasId = kycStatus === 'verified' || docs.some((d) => d.category === 'kyc_identity');
  const hasAddr = kycStatus === 'verified' || docs.some((d) => d.category === 'proof_of_address');
  const hasSuitability = kycStatus === 'verified' || docs.some((d) => d.category === 'accredited_proof');

  const renderStateLabel = (done: boolean) => {
    if (kycStatus === 'verified') return <span className="text-xs font-semibold text-[#34D399]">Verified</span>;
    if (done) return <span className="text-xs font-semibold text-[#FBBF24]">In review</span>;
    return <span className="text-xs font-medium text-[#8EA7C7]">Required</span>;
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const check = validateComplianceFile(file);
    if (!check.valid) {
      toast.error(check.error || 'Invalid file.');
      e.target.value = '';
      return;
    }
    setSelectedFile(file);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!selectedFile) {
      toast.error('Choose a PDF, JPG, or PNG file before uploading.');
      return;
    }

    setSubmitting(true);
    try {
      let dataUrl: string | undefined;
      if (selectedFile.size <= 1_500_000) {
        dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = () => resolve('');
          reader.readAsDataURL(selectedFile);
        });
      }

      const res = await portalApi.uploadComplianceDocument({
        category,
        documentType,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        mimeType: selectedFile.type || 'application/pdf',
        fileDataUrl: dataUrl || undefined,
      });

      setDocs(res.documents);
      setSelectedFile(null);
      if (fileRef.current) fileRef.current.value = '';
      await refreshProfile();
      toast.success('Compliance document uploaded for verification.');
    } catch (err: any) {
      toast.error(err?.message || 'Unable to upload compliance document.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-xl font-heading font-bold text-white">Compliance &amp; KYC vault</h2>
        <p className="text-sm text-[#8EA7C7] mt-0.5">
          European AML/KYC identity verification and suitability documentation.
        </p>
      </div>

      {/* Checklist */}
      <section className="portal-card divide-y divide-[#1D3860]">
        <div className="p-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-white">Government-issued identity</div>
            <div className="text-xs text-[#8EA7C7] mt-0.5">Passport or EU national identity card</div>
          </div>
          {renderStateLabel(hasId)}
        </div>
        <div className="p-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-white">Proof of residential address</div>
            <div className="text-xs text-[#8EA7C7] mt-0.5">Utility bill or bank statement dated within 90 days</div>
          </div>
          {renderStateLabel(hasAddr)}
        </div>
        <div className="p-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-white">Investor suitability &amp; source of funds</div>
            <div className="text-xs text-[#8EA7C7] mt-0.5">Declaration or tax residency confirmation</div>
          </div>
          {renderStateLabel(hasSuitability)}
        </div>
      </section>

      {/* Upload Form */}
      <form onSubmit={handleUpload} className="portal-card p-5 sm:p-6 space-y-4">
        <h3 className="text-base font-semibold text-white">Upload verification document</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="comp-category" className="block text-xs font-medium text-[#8EA7C7] mb-1.5">
              Verification category
            </label>
            <select
              id="comp-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="portal-input"
            >
              <option value="kyc_identity">Identity verification</option>
              <option value="proof_of_address">Proof of address</option>
              <option value="accredited_proof">Investor suitability / Source of funds</option>
            </select>
          </div>
          <div>
            <label htmlFor="comp-doctype" className="block text-xs font-medium text-[#8EA7C7] mb-1.5">
              Document type
            </label>
            <input
              id="comp-doctype"
              type="text"
              required
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              placeholder="e.g. Passport, Utility Bill"
              className="portal-input"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="comp-file"
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#1D3860] bg-[#0B1B30] p-6 text-center cursor-pointer hover:border-[#C5A880] transition-colors"
          >
            <UploadCloud className="w-6 h-6 text-[#C5A880]" />
            <span className="text-sm font-medium text-white">
              {selectedFile ? selectedFile.name : 'Select PDF, JPG, or PNG scan (max 15 MB)'}
            </span>
            <input
              ref={fileRef}
              id="comp-file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFilePick}
              className="sr-only"
            />
          </label>
        </div>

        <button type="submit" disabled={submitting} className="portal-btn-primary">
          {submitting ? 'Uploading...' : 'Submit document'}
        </button>
      </form>

      {/* Submitted Documents */}
      <section className="space-y-3">
        <h3 className="text-base font-semibold text-white">Submitted documents</h3>
        {loadingDocs ? (
          <div className="portal-card p-6 text-sm text-[#8EA7C7]">Loading documents...</div>
        ) : docs.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-5 h-5" />}
            title="No documents uploaded"
            description="Submit your identity scan and proof of address above to complete regulatory onboarding."
          />
        ) : (
          <div className="portal-card divide-y divide-[#1D3860]">
            {docs.map((doc) => (
              <div key={doc.id} className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{doc.title}</div>
                  <div className="text-xs text-[#8EA7C7] mt-0.5 truncate">
                    {doc.fileName} · {(doc.fileSize / 1024).toFixed(0)} KB · {formatShortDate(doc.uploadedAt)}
                  </div>
                </div>
                <span
                  className={`text-xs font-semibold shrink-0 ${
                    doc.status === 'verified'
                      ? 'text-[#34D399]'
                      : doc.status === 'rejected'
                      ? 'text-[#FB7185]'
                      : 'text-[#FBBF24]'
                  }`}
                >
                  {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
