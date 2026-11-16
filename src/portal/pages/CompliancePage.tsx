import React, { useEffect, useRef, useState } from 'react';
import { UploadCloud, FileText, CheckCircle2 } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { usePortal } from '../state/PortalContext';
import { portalApi } from '../services/portalApi';
import { PortalComplianceDoc, PortalComplianceStep } from '../types';
import { formatNumber, formatShortDate } from '../utils/format';
import { validateComplianceFile } from '../utils/validate';
import { EmptyState } from '../components/EmptyState';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { StatusBadge } from '../components/StatusBadge';

type ComplianceCategory = 'kyc_identity' | 'proof_of_address' | 'accredited_proof';

const COMPLIANCE_STEPS: Array<{
  category: ComplianceCategory;
  title: string;
  description: string;
  defaultDocType: string;
}> = [
  {
    category: 'kyc_identity',
    title: 'Identity verification',
    description: 'Valid passport or EU national identity card',
    defaultDocType: 'Passport',
  },
  {
    category: 'proof_of_address',
    title: 'Proof of address',
    description: 'Utility bill or bank statement dated within 90 days',
    defaultDocType: 'Utility Bill',
  },
  {
    category: 'accredited_proof',
    title: 'Investor questionnaire',
    description: 'Regulatory suitability, source of funds & risk declaration',
    defaultDocType: 'Investor Questionnaire',
  },
];

function buildQuestionnaireDataUrl(summaryText: string): { dataUrl: string; byteSize: number } {
  const escaped = summaryText.replace(/[()\\]/g, '');
  const pdfContent = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj
4 0 obj << /Length ${escaped.length + 32} >>
stream
BT /F1 11 Tf 40 740 Td (${escaped}) Tj ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
0000000117 00000 n 
0000000200 00000 n 
trailer << /Size 5 /Root 1 0 R >>
startxref
300
%%EOF`;
  const encoded = btoa(unescape(encodeURIComponent(pdfContent)));
  return {
    dataUrl: `data:application/pdf;base64,${encoded}`,
    byteSize: pdfContent.length,
  };
}

export const CompliancePage: React.FC = () => {
  const toast = useToast();
  const { loading, profile, sampleDataEnabled, sampleDataset, refreshProfile } = usePortal();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [docs, setDocs] = useState<PortalComplianceDoc[]>([]);
  const [steps, setSteps] = useState<PortalComplianceStep[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [category, setCategory] = useState<ComplianceCategory>('kyc_identity');
  const [documentType, setDocumentType] = useState('Passport');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docTypeError, setDocTypeError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [questionnaireError, setQuestionnaireError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Investor questionnaire state
  const [experience, setExperience] = useState('Intermediate (3-5 years)');
  const [sourceOfFunds, setSourceOfFunds] = useState('Employment & Business Income');
  const [riskAck, setRiskAck] = useState(false);

  useEffect(() => {
    if (sampleDataEnabled) {
      setLoadingDocs(false);
      return;
    }
    let active = true;
    setLoadingDocs(true);
    Promise.all([
      portalApi.getComplianceDocuments().catch(() => [] as PortalComplianceDoc[]),
      portalApi.getComplianceSteps().catch(() => [] as PortalComplianceStep[]),
    ])
      .then(([docList, stepList]) => {
        if (!active) return;
        setDocs(docList);
        setSteps(stepList);
      })
      .finally(() => {
        if (active) setLoadingDocs(false);
      });
    return () => {
      active = false;
    };
  }, [sampleDataEnabled]);

  if (loading && !sampleDataEnabled && !profile) {
    return <LoadingSkeleton rows={4} />;
  }

  const displayedDocs = sampleDataEnabled && sampleDataset ? sampleDataset.complianceDocs : docs;
  const kycStatus = profile?.kycStatus || 'pending';

  const getStepState = (cat: ComplianceCategory): { status: string; label: string } => {
    if (!sampleDataEnabled && steps.length > 0) {
      const serverStep = steps.find((s) => s.stepKey === cat);
      if (serverStep) {
        if (serverStep.status === 'verified') return { status: 'completed', label: 'Verified' };
        if (serverStep.status === 'in_review') return { status: 'pending', label: 'In review' };
        if (serverStep.status === 'rejected') return { status: 'failed', label: 'Rejected' };
        return { status: 'not_started', label: 'Not started' };
      }
    }
    if (kycStatus === 'verified' && !sampleDataEnabled) {
      return { status: 'completed', label: 'Verified' };
    }
    const matching = displayedDocs.filter((d) => d.category === cat);
    if (matching.length === 0) {
      if (kycStatus === 'rejected') {
        return { status: 'failed', label: 'Action needed' };
      }
      return { status: 'not_started', label: 'Not started' };
    }
    const latest = matching[0];
    if (latest.status === 'verified') {
      return { status: 'completed', label: 'Verified' };
    }
    if (latest.status === 'rejected') {
      return { status: 'failed', label: 'Rejected' };
    }
    return { status: 'pending', label: 'In review' };
  };

  const selectStepCategory = (cat: ComplianceCategory) => {
    setCategory(cat);
    const meta = COMPLIANCE_STEPS.find((s) => s.category === cat);
    if (meta) {
      setDocumentType(meta.defaultDocType);
    }
    setSelectedFile(null);
    setDocTypeError(null);
    setFileError(null);
    setQuestionnaireError(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const check = validateComplianceFile(file);
    if (!check.valid) {
      setFileError(check.error || 'Select a valid PDF, JPG, or PNG scan (max 15 MB).');
      setSelectedFile(null);
      e.target.value = '';
      return;
    }
    setFileError(null);
    setSelectedFile(file);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const trimmedDocType = documentType.trim();
    let hasError = false;
    if (!trimmedDocType) {
      setDocTypeError('Specify the document type (e.g. Passport, Utility Bill).');
      hasError = true;
    } else {
      setDocTypeError(null);
    }
    if (!selectedFile) {
      setFileError('Choose a PDF, JPG, or PNG file before submitting.');
      hasError = true;
    } else {
      setFileError(null);
    }
    if (hasError || !selectedFile) return;

    if (sampleDataEnabled) {
      toast.info('Sample data preview is active. Disable Sample data to submit live compliance documents.');
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
        documentType: trimmedDocType,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        mimeType: selectedFile.type || 'application/pdf',
        fileDataUrl: dataUrl || undefined,
      });

      setDocs(res.documents);
      setSelectedFile(null);
      if (fileRef.current) fileRef.current.value = '';
      const updatedSteps = await portalApi.getComplianceSteps().catch(() => null);
      if (updatedSteps) setSteps(updatedSteps);
      await refreshProfile();
      toast.success('Document submitted for compliance review.');
    } catch (err: any) {
      toast.error(err?.message || 'Unable to submit compliance document.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitQuestionnaire = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!riskAck) {
      setQuestionnaireError('Confirm the capital-at-risk disclosure before submitting your questionnaire.');
      return;
    }
    setQuestionnaireError(null);

    if (sampleDataEnabled) {
      toast.info('Sample data preview is active. Disable Sample data to submit your live questionnaire.');
      return;
    }

    setSubmitting(true);
    try {
      const summaryLine = `Investor: ${profile?.email || 'Investor'} | Experience: ${experience} | Source: ${sourceOfFunds} | CapitalAtRiskAcknowledged: Yes`;
      const { dataUrl, byteSize } = buildQuestionnaireDataUrl(summaryLine);
      const res = await portalApi.uploadComplianceDocument({
        category: 'accredited_proof',
        documentType: 'Investor Questionnaire',
        fileName: 'investor-suitability-questionnaire.pdf',
        fileSize: byteSize,
        mimeType: 'application/pdf',
        fileDataUrl: dataUrl,
      });

      setDocs(res.documents);
      const updatedSteps = await portalApi.getComplianceSteps().catch(() => null);
      if (updatedSteps) setSteps(updatedSteps);
      await refreshProfile();
      toast.success('Investor questionnaire submitted for review.');
    } catch (err: any) {
      toast.error(err?.message || 'Unable to submit investor questionnaire.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-xl font-heading font-bold text-[#F2F5F4]">Compliance Vault</h2>
        <p className="text-sm text-[#8FA1A8] mt-0.5">
          Complete identity verification, proof of address, and your investor suitability questionnaire.
        </p>
      </div>

      {/* 3 Verification Steps */}
      <section aria-label="Verification steps" className="portal-card-list divide-y divide-[#1F2C33]">
        {COMPLIANCE_STEPS.map((item, idx) => {
          const stepState = getStepState(item.category);
          const isSelected = category === item.category;
          return (
            <button
              key={item.category}
              type="button"
              onClick={() => selectStepCategory(item.category)}
              className={`w-full min-h-[72px] p-4 flex items-center justify-between gap-4 text-left transition-colors ${
                isSelected ? 'bg-[#172228]' : 'hover:bg-[#172228]/70'
              }`}
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[#F2F5F4] flex items-center gap-2">
                  <span className="text-[#6FD8B0] portal-tabular">{idx + 1}.</span>
                  <span>{item.title}</span>
                </div>
                <div className="text-xs text-[#8FA1A8] mt-0.5">{item.description}</div>
              </div>
              <StatusBadge status={stepState.status} label={stepState.label} />
            </button>
          );
        })}
      </section>

      {/* Active Step Submission Panel */}
      {category === 'accredited_proof' ? (
        <form onSubmit={handleSubmitQuestionnaire} noValidate className="portal-card space-y-4">
          <div>
            <h3 className="text-base font-semibold text-[#F2F5F4]">Investor questionnaire</h3>
            <p className="text-xs text-[#8FA1A8] mt-0.5">
              Required regulatory suitability and source-of-funds confirmation.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="quest-exp" className="block text-sm font-medium text-[#F2F5F4] mb-1.5">
                Real estate / private markets experience
              </label>
              <select
                id="quest-exp"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                className="portal-input"
              >
                <option value="First-time investor">First-time investor</option>
                <option value="Intermediate (3-5 years)">Intermediate (3–5 years)</option>
                <option value="Experienced / Professional (5+ years)">Experienced / Professional (5+ years)</option>
              </select>
            </div>
            <div>
              <label htmlFor="quest-source" className="block text-sm font-medium text-[#F2F5F4] mb-1.5">
                Primary source of funds
              </label>
              <select
                id="quest-source"
                value={sourceOfFunds}
                onChange={(e) => setSourceOfFunds(e.target.value)}
                className="portal-input"
              >
                <option value="Employment & Business Income">Employment &amp; Business Income</option>
                <option value="Savings & Investment Proceeds">Savings &amp; Investment Proceeds</option>
                <option value="Property Sale or Inheritance">Property Sale or Inheritance</option>
                <option value="Corporate / Family Office Treasury">Corporate / Family Office Treasury</option>
              </select>
            </div>
          </div>

          <div>
            <label
              className={`min-h-[44px] flex items-start gap-3 p-3.5 rounded-[14px] border bg-[#0B0F10] cursor-pointer ${
                questionnaireError ? 'border-[#FB7185]' : 'border-[#1F2C33]'
              }`}
            >
              <input
                type="checkbox"
                checked={riskAck}
                onChange={(e) => {
                  setRiskAck(e.target.checked);
                  if (e.target.checked) setQuestionnaireError(null);
                }}
                aria-invalid={Boolean(questionnaireError)}
                aria-describedby={questionnaireError ? 'quest-ack-error' : undefined}
                className="mt-1 h-4 w-4 accent-[#6FD8B0] shrink-0"
              />
              <span className="text-xs text-[#8FA1A8] leading-relaxed">
                I confirm the information provided is accurate and understand that real estate SPV investments involve illiquidity and capital risk, and target returns are not guaranteed.
              </span>
            </label>
            {questionnaireError && (
              <p id="quest-ack-error" role="alert" className="text-xs text-[#FB7185] mt-1.5">
                {questionnaireError}
              </p>
            )}
          </div>

          <button type="submit" disabled={submitting} className="portal-btn-primary">
            <CheckCircle2 className="w-4 h-4" />
            <span>{submitting ? 'Submitting...' : 'Submit questionnaire'}</span>
          </button>
        </form>
      ) : (
        <form onSubmit={handleUpload} noValidate className="portal-card space-y-4">
          <h3 className="text-base font-semibold text-[#F2F5F4]">
            Upload {category === 'kyc_identity' ? 'identity document' : 'proof of address'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="comp-category" className="block text-sm font-medium text-[#F2F5F4] mb-1.5">
                Verification step
              </label>
              <select
                id="comp-category"
                value={category}
                onChange={(e) => selectStepCategory(e.target.value as ComplianceCategory)}
                className="portal-input"
              >
                <option value="kyc_identity">Identity verification</option>
                <option value="proof_of_address">Proof of address</option>
                <option value="accredited_proof">Investor questionnaire</option>
              </select>
            </div>
            <div>
              <label htmlFor="comp-doctype" className="block text-sm font-medium text-[#F2F5F4] mb-1.5">
                Document type
              </label>
              <input
                id="comp-doctype"
                type="text"
                value={documentType}
                onChange={(e) => {
                  setDocumentType(e.target.value);
                  if (docTypeError) setDocTypeError(null);
                }}
                aria-invalid={Boolean(docTypeError)}
                aria-describedby={docTypeError ? 'comp-doctype-error' : undefined}
                placeholder="e.g. Passport, Utility Bill"
                className={`portal-input ${docTypeError ? '!border-[#FB7185]' : ''}`}
              />
              {docTypeError && (
                <p id="comp-doctype-error" role="alert" className="text-xs text-[#FB7185] mt-1.5">
                  {docTypeError}
                </p>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="comp-file"
              className={`min-h-[120px] flex flex-col items-center justify-center gap-2 rounded-[14px] border border-dashed bg-[#0B0F10] p-6 text-center cursor-pointer transition-colors ${
                fileError ? 'border-[#FB7185]' : 'border-[#1F2C33] hover:border-[#6FD8B0]'
              }`}
            >
              <UploadCloud className="w-6 h-6 text-[#6FD8B0]" />
              <span className="text-sm font-medium text-[#F2F5F4]">
                {selectedFile ? selectedFile.name : 'Select PDF, JPG, or PNG scan (max 15 MB)'}
              </span>
              <input
                ref={fileRef}
                id="comp-file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFilePick}
                aria-invalid={Boolean(fileError)}
                aria-describedby={fileError ? 'comp-file-error' : undefined}
                className="sr-only"
              />
            </label>
            {fileError && (
              <p id="comp-file-error" role="alert" className="text-xs text-[#FB7185] mt-1.5">
                {fileError}
              </p>
            )}
          </div>

          <button type="submit" disabled={submitting} className="portal-btn-primary">
            {submitting ? 'Uploading...' : 'Submit document'}
          </button>
        </form>
      )}

      {/* Submitted Documents */}
      <section className="space-y-3">
        <h3 className="text-base font-semibold text-[#F2F5F4]">Submitted records</h3>
        {loadingDocs && !sampleDataEnabled ? (
          <LoadingSkeleton rows={2} />
        ) : displayedDocs.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-5 h-5" />}
            title="No documents submitted yet"
            description="Select one of the steps above to upload your verification documents or submit the investor questionnaire."
          />
        ) : (
          <div className="portal-card-list divide-y divide-[#1F2C33]">
            {displayedDocs.map((doc) => (
              <div key={doc.id} className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[#F2F5F4] truncate">{doc.title}</div>
                  <div className="text-xs text-[#8FA1A8] mt-0.5 truncate portal-tabular">
                    {doc.fileName} · {formatNumber(Math.round(doc.fileSize / 1024))} KB · {formatShortDate(doc.uploadedAt)}
                  </div>
                </div>
                <StatusBadge
                  status={doc.status}
                  label={
                    doc.status === 'verified'
                      ? 'Verified'
                      : doc.status === 'rejected'
                      ? 'Rejected'
                      : 'In review'
                  }
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
