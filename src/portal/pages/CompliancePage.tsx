import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock3, FileCheck2, ShieldCheck, UploadCloud } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../lib/auth';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { usePortal } from '../state/PortalContext';
import { LoadingSkeleton } from '../components/LoadingSkeleton';

type KycDocType = 'identity' | 'proof_of_address' | 'questionnaire';
type KycStatus = 'pending' | 'approved' | 'rejected';
type KycRow = {
  id: string;
  user_id: string;
  doc_type: KycDocType;
  file_path: string | null;
  answers: Record<string, unknown> | null;
  status: KycStatus;
  reason: string | null;
  created_at: string;
};

type StepDefinition = {
  docType: KycDocType;
  title: string;
  description: string;
  guidance: string;
};

const STEPS: StepDefinition[] = [
  {
    docType: 'identity',
    title: 'Identity verification',
    description: 'Passport or national ID',
    guidance: 'Upload a clear, legible image or PDF of your valid passport or national identity document.',
  },
  {
    docType: 'proof_of_address',
    title: 'Proof of address',
    description: 'Utility bill or bank statement',
    guidance: 'Your utility bill or bank statement must show your name and current address and be dated within the last 3 months.',
  },
  {
    docType: 'questionnaire',
    title: 'Investor questionnaire',
    description: 'Investor experience and source of funds',
    guidance: 'Complete the suitability and source-of-funds questions below.',
  },
];

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

const profileStatusLabel = (value: string | null): string => {
  switch (value) {
    case 'not_started': return 'Not started';
    case 'in_review':
    case 'pending': return 'In review';
    case 'verified':
    case 'approved': return 'Verified';
    case 'rejected': return 'Rejected';
    default: return 'Status unavailable';
  }
};

const formatDate = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
};

const fileSafeName = (name: string): string =>
  name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(-100) || 'document';

export const CompliancePage: React.FC = () => {
  const toast = useToast();
  const { user } = useAuth();
  const { loading: portalLoading, sampleDataEnabled } = usePortal();
  const [rows, setRows] = useState<KycRow[]>([]);
  const [overallStatus, setOverallStatus] = useState<string | null>(null);
  const [loadingKyc, setLoadingKyc] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<KycDocType | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [addressConfirmed, setAddressConfirmed] = useState(false);
  const [experience, setExperience] = useState('');
  const [sourceOfFunds, setSourceOfFunds] = useState('');
  const [riskAcknowledged, setRiskAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const refreshKyc = useCallback(async () => {
    if (!isSupabaseConfigured()) throw new Error('Secure document storage is not configured. Please contact support.');
    if (!user?.id) throw new Error('Your investor session could not be verified. Please sign in again.');

    const [{ data: authData, error: authError }, profileResult, submissionsResult] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('profiles').select('kyc_status').eq('id', user.id).single(),
      supabase.from('kyc_submissions').select('id,user_id,doc_type,file_path,answers,status,reason,created_at')
        .eq('user_id', user.id).order('created_at', { ascending: false }),
    ]);

    if (authError || !authData.user || authData.user.id !== user.id) {
      throw new Error('Your secure investor session has expired. Please sign in again.');
    }
    if (profileResult.error) throw profileResult.error;
    if (submissionsResult.error) throw submissionsResult.error;

    setOverallStatus(String(profileResult.data.kyc_status || 'not_started'));
    setRows((submissionsResult.data || []) as KycRow[]);
  }, [user?.id]);

  useEffect(() => {
    let alive = true;
    setLoadingKyc(true);
    setLoadError(null);
    refreshKyc()
      .catch((error: any) => {
        if (alive) setLoadError(error?.message || 'Unable to load your compliance records.');
      })
      .finally(() => {
        if (alive) setLoadingKyc(false);
      });
    return () => { alive = false; };
  }, [refreshKyc]);

  const latestByType = useMemo(() => {
    const latest = new Map<KycDocType, KycRow>();
    for (const row of rows) {
      if (!latest.has(row.doc_type)) latest.set(row.doc_type, row);
    }
    return latest;
  }, [rows]);

  const verifiedCount = STEPS.filter((step) => latestByType.get(step.docType)?.status === 'approved').length;
  const pendingCount = STEPS.filter((step) => latestByType.get(step.docType)?.status === 'pending').length;

  const openStep = (docType: KycDocType) => {
    setActiveStep((current) => current === docType ? null : docType);
    setSelectedFile(null);
    setAddressConfirmed(false);
  };

  const submitFile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting || !activeStep || activeStep === 'questionnaire' || !selectedFile) return;
    if (sampleDataEnabled) {
      toast.info('Switch to live account data before uploading compliance documents.');
      return;
    }
    if (!ACCEPTED_TYPES.includes(selectedFile.type)) {
      toast.error('Choose a JPEG, PNG, or PDF document.');
      return;
    }
    if (selectedFile.size > MAX_FILE_BYTES) {
      toast.error('The selected file exceeds the 10 MB upload limit.');
      return;
    }
    if (activeStep === 'proof_of_address' && !addressConfirmed) {
      toast.error('Please confirm that your document is dated within the last 3 months.');
      return;
    }

    setSubmitting(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user || authData.user.id !== user?.id) {
        throw new Error('Your secure investor session has expired. Please sign in again.');
      }
      const objectPath = `${user.id}/${activeStep}/${crypto.randomUUID()}-${fileSafeName(selectedFile.name)}`;
      const { error: storageError } = await supabase.storage.from('kyc').upload(objectPath, selectedFile, {
        cacheControl: '3600',
        upsert: false,
        contentType: selectedFile.type,
      });
      if (storageError) throw storageError;

      const { error: insertError } = await supabase.from('kyc_submissions').insert({
        user_id: user.id,
        doc_type: activeStep,
        file_path: objectPath,
        status: 'pending',
      });
      if (insertError) throw insertError;

      await refreshKyc();
      setSelectedFile(null);
      setAddressConfirmed(false);
      setActiveStep(null);
      toast.success('Your document has been submitted for compliance review.');
    } catch (error: any) {
      toast.error(error?.message || 'Unable to upload your document.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitQuestionnaire = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting || activeStep !== 'questionnaire') return;
    if (sampleDataEnabled) {
      toast.info('Switch to live account data before submitting your questionnaire.');
      return;
    }
    if (!experience || !sourceOfFunds || !riskAcknowledged) {
      toast.error('Complete all questionnaire fields and acknowledge the investment risk disclosure.');
      return;
    }

    setSubmitting(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user || authData.user.id !== user?.id) {
        throw new Error('Your secure investor session has expired. Please sign in again.');
      }
      const { error } = await supabase.from('kyc_submissions').insert({
        user_id: user.id,
        doc_type: 'questionnaire',
        answers: {
          investment_experience: experience,
          source_of_funds: sourceOfFunds,
          capital_at_risk_acknowledged: riskAcknowledged,
          submitted_at: new Date().toISOString(),
        },
        status: 'pending',
      });
      if (error) throw error;

      await refreshKyc();
      setActiveStep(null);
      toast.success('Your investor questionnaire has been submitted for review.');
    } catch (error: any) {
      toast.error(error?.message || 'Unable to submit your questionnaire.');
    } finally {
      setSubmitting(false);
    }
  };

  if (portalLoading && !user) return <LoadingSkeleton rows={4} />;

  return (
    <div className="max-w-4xl space-y-6 text-[#F2F5F4]">
      <header>
        <div className="flex items-center gap-2 text-[#6FD8B0]">
          <ShieldCheck className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-[0.16em]">Investor compliance</span>
        </div>
        <h2 className="mt-2 text-xl font-heading font-bold">Compliance Vault</h2>
        <p className="mt-1 text-sm text-[#8FA1A8]">Securely submit your verification documents and investor questionnaire.</p>
      </header>

      <section className="rounded-2xl border border-[#1F2C33] bg-[#121A1F] p-4 sm:p-5" aria-label="Verification progress">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs text-[#8FA1A8]">Verification progress</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{verifiedCount} <span className="text-sm font-normal text-[#8FA1A8]">of 3 verified</span></p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[#8FA1A8]">Overall account status</p>
            <span className={`mt-1 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
              overallStatus === 'verified' || overallStatus === 'approved'
                ? 'border-[#6FD8B0]/40 bg-[#6FD8B0]/10 text-[#6FD8B0]'
                : overallStatus === 'rejected'
                ? 'border-rose-400/40 bg-rose-400/10 text-rose-300'
                : overallStatus === 'in_review' || overallStatus === 'pending'
                ? 'border-amber-300/40 bg-amber-300/10 text-amber-200'
                : 'border-[#1F2C33] bg-[#0B0F10] text-[#AAB8BC]'
            }`}>{loadingKyc ? 'Loading status…' : profileStatusLabel(overallStatus)}</span>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#0B0F10]" role="progressbar" aria-valuemin={0} aria-valuemax={3} aria-valuenow={verifiedCount} aria-label={`${verifiedCount} of 3 verification steps complete`}>
          <div className="h-full rounded-full bg-[#6FD8B0] transition-all" style={{ width: `${(verifiedCount / 3) * 100}%` }} />
        </div>
        <p className="mt-2 text-xs text-[#8FA1A8]">
          {pendingCount > 0 ? `${pendingCount} submission${pendingCount === 1 ? '' : 's'} currently in review.` : 'Complete all three steps to finish your investor verification.'}
        </p>
      </section>

      {sampleDataEnabled && (
        <div className="rounded-xl border border-amber-300/30 bg-[#121A1F] p-3 text-sm text-amber-200">
          Sample data is active. Switch to live account data to submit real compliance information.
        </div>
      )}
      {loadError && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-400/30 bg-rose-400/5 p-3 text-sm text-rose-200" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{loadError}</span>
          <button type="button" className="ml-auto underline" onClick={() => {
            setLoadingKyc(true);
            setLoadError(null);
            refreshKyc().catch((error: any) => setLoadError(error?.message || 'Unable to reload compliance records.')).finally(() => setLoadingKyc(false));
          }}>Retry</button>
        </div>
      )}

      <section aria-label="Verification steps" className="space-y-3">
        {STEPS.map((step, index) => {
          const record = latestByType.get(step.docType);
          const status = record?.status;
          const isVerified = status === 'approved';
          const isPending = status === 'pending';
          const isRejected = status === 'rejected';
          const isOpen = activeStep === step.docType;
          const statusText = !record ? 'Not started' : isVerified ? 'Verified' : isPending ? 'In review' : 'Rejected';
          const statusClass = !record
            ? 'border-[#1F2C33] bg-[#0B0F10] text-[#AAB8BC]'
            : isVerified
            ? 'border-[#6FD8B0]/40 bg-[#6FD8B0]/10 text-[#6FD8B0]'
            : isPending
            ? 'border-amber-300/40 bg-amber-300/10 text-amber-200'
            : 'border-rose-400/40 bg-rose-400/10 text-rose-300';

          return (
            <article key={step.docType} className="overflow-hidden rounded-2xl border border-[#1F2C33] bg-[#121A1F]">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#1F2C33] bg-[#0B0F10] text-sm font-semibold text-[#6FD8B0]">{index + 1}</div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold">{step.title}</h3>
                    <p className="mt-0.5 text-xs text-[#8FA1A8]">{step.description}</p>
                    {record && <p className="mt-1.5 text-xs text-[#8FA1A8]">Submitted {formatDate(record.created_at)}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass}`}>
                    {isVerified && <CheckCircle2 className="h-3.5 w-3.5" />}
                    {isPending && <Clock3 className="h-3.5 w-3.5" />}
                    {statusText}
                  </span>
                  {!isPending && !isVerified && (
                    <button type="button" disabled={loadingKyc || submitting || Boolean(loadError) || sampleDataEnabled}
                      onClick={() => openStep(step.docType)}
                      className="min-h-10 rounded-lg bg-[#6FD8B0] px-3.5 text-xs font-semibold text-[#0B0F10] transition hover:bg-[#8BE6C2] disabled:cursor-not-allowed disabled:opacity-50">
                      {isRejected ? 'Upload again' : step.docType === 'questionnaire' ? 'Complete' : 'Upload'}
                    </button>
                  )}
                </div>
              </div>

              {isRejected && (
                <div className="mx-4 mb-4 rounded-xl border border-rose-400/35 bg-rose-400/10 p-3 sm:mx-5" role="alert">
                  <p className="text-xs font-semibold text-rose-300">Reason for rejection</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-rose-100">{record.reason || 'The compliance team requested a new submission. Please upload the document again.'}</p>
                </div>
              )}

              {isOpen && !isPending && !isVerified && (
                <div className="border-t border-[#1F2C33] p-4 sm:p-5">
                  <p className="mb-4 text-xs leading-relaxed text-[#8FA1A8]">{step.guidance}</p>
                  {step.docType === 'questionnaire' ? (
                    <form onSubmit={submitQuestionnaire} className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block text-xs font-medium text-[#DCE5E2]">
                          Real estate / private markets experience
                          <select required value={experience} onChange={(event) => setExperience(event.target.value)} className="portal-input mt-1.5">
                            <option value="">Select experience</option>
                            <option value="First-time investor">First-time investor</option>
                            <option value="Intermediate (3-5 years)">Intermediate (3–5 years)</option>
                            <option value="Experienced / Professional (5+ years)">Experienced / Professional (5+ years)</option>
                          </select>
                        </label>
                        <label className="block text-xs font-medium text-[#DCE5E2]">
                          Primary source of funds
                          <select required value={sourceOfFunds} onChange={(event) => setSourceOfFunds(event.target.value)} className="portal-input mt-1.5">
                            <option value="">Select source of funds</option>
                            <option value="Employment & Business Income">Employment &amp; Business Income</option>
                            <option value="Savings & Investment Proceeds">Savings &amp; Investment Proceeds</option>
                            <option value="Property Sale or Inheritance">Property Sale or Inheritance</option>
                            <option value="Corporate / Family Office Treasury">Corporate / Family Office Treasury</option>
                          </select>
                        </label>
                      </div>
                      <label className="flex items-start gap-3 rounded-xl border border-[#1F2C33] bg-[#0B0F10] p-3 text-xs leading-relaxed text-[#AAB8BC]">
                        <input type="checkbox" checked={riskAcknowledged} onChange={(event) => setRiskAcknowledged(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[#6FD8B0]" />
                        <span>I confirm the information provided is accurate and understand that real estate SPV investments involve illiquidity and capital risk, and target returns are not guaranteed.</span>
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <button type="submit" disabled={submitting || sampleDataEnabled} className="portal-btn-primary">{submitting ? 'Submitting…' : 'Submit questionnaire'}</button>
                        <button type="button" onClick={() => setActiveStep(null)} className="min-h-10 rounded-lg border border-[#1F2C33] px-4 text-xs font-semibold text-[#AAB8BC]">Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <form onSubmit={submitFile} className="space-y-4">
                      <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#36504B] bg-[#0B0F10] p-5 text-center transition hover:border-[#6FD8B0]">
                        <UploadCloud className="h-6 w-6 text-[#6FD8B0]" />
                        <span className="text-sm font-medium">{selectedFile?.name || 'Choose a document'}</span>
                        <span className="text-xs text-[#8FA1A8]">JPEG, PNG or PDF · Maximum 10 MB</span>
                        <input type="file" accept="image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf" className="sr-only"
                          onChange={(event) => setSelectedFile(event.target.files?.[0] || null)} />
                      </label>
                      {step.docType === 'proof_of_address' && (
                        <label className="flex items-start gap-2 text-xs text-[#AAB8BC]">
                          <input type="checkbox" checked={addressConfirmed} onChange={(event) => setAddressConfirmed(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[#6FD8B0]" />
                          I confirm this utility bill or bank statement is dated within the last 3 months.
                        </label>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <button type="submit" disabled={submitting || !selectedFile || (step.docType === 'proof_of_address' && !addressConfirmed) || sampleDataEnabled}
                          className="portal-btn-primary">{submitting ? 'Uploading…' : 'Submit document'}</button>
                        <button type="button" onClick={() => { setActiveStep(null); setSelectedFile(null); }} className="min-h-10 rounded-lg border border-[#1F2C33] px-4 text-xs font-semibold text-[#AAB8BC]">Cancel</button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </section>

      <div className="flex items-start gap-2 rounded-xl border border-[#1F2C33] bg-[#121A1F] p-3 text-xs leading-relaxed text-[#8FA1A8]">
        <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-[#6FD8B0]" />
        Your documents are stored in a private vault. Only you and authorized compliance staff can access the uploaded files.
      </div>
    </div>
  );
};
