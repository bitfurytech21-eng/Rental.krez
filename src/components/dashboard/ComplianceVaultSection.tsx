import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../context/ToastContext';
import { ledger, DocumentCategory } from '../../lib/ledger';
import { userApi } from '../../lib/api';
import { formatDate } from '../../lib/utils';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, ShieldCheck, ArrowRight, RefreshCw } from 'lucide-react';

interface ComplianceVaultSectionProps {
  onNavigateProfile: () => void;
  onNavigateWallet: () => void;
}

const MAX_DOC_BYTES = 15 * 1024 * 1024;

export const ComplianceVaultSection: React.FC<ComplianceVaultSectionProps> = ({
  onNavigateProfile,
  onNavigateWallet,
}) => {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [category, setCategory] = useState<DocumentCategory>('kyc_identity');
  const [docType, setDocType] = useState('Passport');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [serverSteps, setServerSteps] = useState<any[]>([]);
  const [serverDocs, setServerDocs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchComplianceData = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const [stepsRes, docsRes] = await Promise.all([
        userApi.getComplianceSteps(),
        userApi.getComplianceDocuments(),
      ]);
      setServerSteps(Array.isArray(stepsRes?.data) ? stepsRes.data : []);
      setServerDocs(Array.isArray(docsRes?.data) ? docsRes.data : []);
    } catch (err: any) {
      setLoadError(err?.message || 'Unable to load live compliance status.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchComplianceData();
  }, [fetchComplianceData]);

  if (!user) return null;

  const docs = serverDocs.length > 0 ? serverDocs : ledger.getVerificationDocuments(user.id);

  const resolveStepStatus = (stepKey: string, fallbackDone: boolean) => {
    const matchedStep = serverSteps.find((s) => s.stepKey === stepKey || s.key === stepKey);
    const raw = String(matchedStep?.status || '').toLowerCase();
    if (raw === 'verified' || raw === 'approved' || raw === 'completed' || user.kycStatus === 'verified') {
      return { label: 'Verified', cls: 'ok' };
    }
    if (raw === 'rejected') {
      return { label: 'Rejected', cls: 'bad' };
    }
    if (raw === 'action_required') {
      return { label: 'Action Required', cls: 'wait' };
    }
    if (raw === 'in_review') {
      return { label: 'In Review', cls: 'wait' };
    }
    if (raw === 'pending') {
      return { label: 'Pending', cls: 'wait' };
    }
    if (fallbackDone || user.kycStatus === 'pending') {
      return { label: 'In Review', cls: 'wait' };
    }
    return { label: 'Not Started', cls: '' };
  };

  const hasIdentityDoc = docs.some((d) => d.category === 'kyc_identity');
  const hasAddressDoc = docs.some(
    (d) => d.category === 'proof_of_address' || String(d.documentType || '').toLowerCase().includes('address')
  );
  const hasQuestionnaire = docs.some((d) => d.category === 'accredited_proof') || Boolean(user.taxId);

  const identityPill = resolveStepStatus('kyc_identity', hasIdentityDoc);
  const addressPill = resolveStepStatus('proof_of_address', hasAddressDoc);
  const suitabilityPill = resolveStepStatus('investor_profile', hasQuestionnaire);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const validMime = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    const extOk = /\.(pdf|jpe?g|png)$/i.test(file.name);
    if (!validMime.includes(file.type) && !extOk) {
      setError('Unsupported format. Please upload a PDF, JPG, or PNG document.');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_DOC_BYTES) {
      setError('File exceeds the 15MB compliance upload limit.');
      e.target.value = '';
      return;
    }
    setSelectedFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError(null);

    if (!selectedFile) {
      setError('Select a PDF, JPG, or PNG scan before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read selected file.'));
        reader.readAsDataURL(selectedFile);
      });

      const uploadRes = await userApi.uploadComplianceDocument({
        category: category as 'kyc_identity' | 'proof_of_address' | 'accredited_proof',
        documentType: docType,
        fileName: selectedFile.name,
        mimeType: selectedFile.type || 'application/octet-stream',
        fileSize: selectedFile.size,
        fileDataUrl: dataUrl,
      });

      if (Array.isArray(uploadRes?.documents)) setServerDocs(uploadRes.documents);
      if (Array.isArray(uploadRes?.steps)) setServerSteps(uploadRes.steps);

      // Sync local UI mirror cleanly without risking unverified failure
      try {
        ledger.uploadVerificationDocument({
          userId: user.id,
          userName: user.fullName,
          userEmail: user.email,
          category,
          title: `${docType} — ${category.replace(/_/g, ' ')}`,
          documentType: docType,
          fileUrl: dataUrl,
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
        });
        if (user.kycStatus !== 'verified') {
          ledger.updateKYCStatus(user.id, 'pending', docType);
        }
      } catch {
        // Non-blocking cache mirror
      }

      await refreshUser();
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast.success(uploadRes?.message || 'Compliance document uploaded and queued for review.');
    } catch (err: any) {
      const msg = err?.message || 'Unable to upload verification document.';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="dashboard-section-heading">
        <div>
          <p className="dashboard-eyebrow">KYC &amp; AML COMPLIANCE</p>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--dash-text)]">Verification</h2>
          <p className="text-xs sm:text-sm text-[var(--dash-text-muted)] mt-1">
            Identity, residential address, and EU AML verification status for your account.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchComplianceData}
            disabled={isLoading}
            className="dashboard-secondary-action cursor-pointer"
            title="Refresh compliance records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
          <button
            type="button"
            onClick={onNavigateWallet}
            className="dashboard-secondary-action cursor-pointer"
          >
            Go to Wallet <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {loadError && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs font-semibold text-[var(--dash-negative)] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{loadError}</span>
          </div>
          <button
            type="button"
            onClick={fetchComplianceData}
            className="px-2.5 py-1 rounded-lg bg-rose-500 text-white text-[10.5px] font-bold cursor-pointer shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Live Compliance Checklist Card */}
      <div className="portal-card divide-y divide-[var(--dash-card-border)]">
        {isLoading && serverSteps.length === 0 ? (
          <div className="p-5 space-y-3 animate-pulse">
            <div className="h-10 rounded-xl bg-[var(--dash-inner)]" />
            <div className="h-10 rounded-xl bg-[var(--dash-inner)]" />
            <div className="h-10 rounded-xl bg-[var(--dash-inner)]" />
          </div>
        ) : (
          <>
            <div className="p-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[var(--dash-text)]">Identity verification</div>
                <div className="text-xs text-[var(--dash-text-muted)] mt-0.5">
                  Passport or EU national identity card
                </div>
              </div>
              <span className={`portal-pill ${identityPill.cls}`}>{identityPill.label}</span>
            </div>

            <div className="p-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[var(--dash-text)]">Proof of address</div>
                <div className="text-xs text-[var(--dash-text-muted)] mt-0.5">
                  Recent utility bill or bank statement (within 90 days)
                </div>
              </div>
              <span className={`portal-pill ${addressPill.cls}`}>{addressPill.label}</span>
            </div>

            <div className="p-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[var(--dash-text)]">Investor profile &amp; fiscal ID</div>
                <div className="text-xs text-[var(--dash-text-muted)] mt-0.5">
                  Suitability assessment &amp; tax residency declaration
                </div>
              </div>
              <span className={`portal-pill ${suitabilityPill.cls}`}>{suitabilityPill.label}</span>
            </div>
          </>
        )}
      </div>

      {/* Document Submission Form */}
      <div className="portal-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--dash-card-border)]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--dash-highlight)] text-[var(--dash-accent)] border border-[var(--dash-accent-border)] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--dash-text)]">Upload Verification Document</h3>
              <p className="text-xs text-[var(--dash-text-muted)]">
                Encrypted EU AML Directive 2018/843 custody vault (PDF, JPG, PNG up to 15MB)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onNavigateProfile}
            className="text-xs font-semibold text-[var(--dash-accent)] hover:underline cursor-pointer self-start sm:self-auto"
          >
            Update fiscal ID &amp; address &rarr;
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs font-semibold text-[var(--dash-negative)] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="vault-category" className="block text-xs font-semibold text-[var(--dash-text)] mb-1">
                Verification Step
              </label>
              <select
                id="vault-category"
                value={category}
                onChange={(e) => {
                  const next = e.target.value as DocumentCategory;
                  setCategory(next);
                  if (next === 'kyc_identity') setDocType('Passport');
                  if (next === 'proof_of_address') setDocType('Utility Bill');
                  if (next === 'accredited_proof') setDocType('Tax Residency Certificate');
                }}
                className="portal-input text-xs cursor-pointer"
              >
                <option value="kyc_identity">1. Identity Verification</option>
                <option value="proof_of_address">2. Proof of Address</option>
                <option value="accredited_proof">3. Tax / Suitability Record</option>
              </select>
            </div>

            <div>
              <label htmlFor="vault-doctype" className="block text-xs font-semibold text-[var(--dash-text)] mb-1">
                Document Type
              </label>
              <input
                id="vault-doctype"
                type="text"
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                required
                className="portal-input text-xs"
              />
            </div>
          </div>

          <div>
            <input
              ref={fileInputRef}
              id="vault-file-input"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              className="sr-only"
            />
            <label
              htmlFor="vault-file-input"
              className="block rounded-2xl border border-dashed border-[var(--dash-inner-border)] bg-[var(--dash-inner)] hover:border-[var(--dash-accent)] p-5 text-center space-y-1.5 cursor-pointer transition-colors"
            >
              <UploadCloud className="w-6 h-6 text-[var(--dash-accent)] mx-auto" />
              <p className="text-xs font-semibold text-[var(--dash-text)]">
                {selectedFile ? `Selected: ${selectedFile.name}` : 'Select PDF, JPG, or PNG document'}
              </p>
              <p className="text-[11px] text-[var(--dash-text-muted)]">
                Both sides required for national ID cards
              </p>
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="portal-btn h-11 text-xs inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? 'Uploading...' : 'Submit Document'}</span>
          </button>
        </form>
      </div>

      {/* Uploaded Records List */}
      {docs.length > 0 && (
        <div className="portal-card p-5 space-y-3">
          <h3 className="text-sm font-bold text-[var(--dash-text)]">Submitted Compliance Files</h3>
          <div className="divide-y divide-[var(--dash-card-border)]">
            {docs.map((d) => {
              const docStatus = String(d.status || 'pending').toLowerCase();
              const isOk = docStatus === 'approved' || docStatus === 'verified';
              const isWait = docStatus === 'pending' || docStatus === 'in_review';
              return (
                <div key={d.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="w-4 h-4 text-[var(--dash-accent)] shrink-0" />
                    <div className="min-w-0">
                      <div className="font-semibold text-[var(--dash-text)] truncate">
                        {d.title || `${d.documentType || 'Compliance Document'}`}
                      </div>
                      <div className="text-[11px] text-[var(--dash-text-muted)] truncate">
                        {d.fileName} · {formatDate(d.uploadedAt || d.createdAt)}
                      </div>
                    </div>
                  </div>
                  <span className={`portal-pill ${isOk ? 'ok' : isWait ? 'wait' : ''}`}>
                    {isOk ? 'Verified' : isWait ? 'In Review' : d.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

