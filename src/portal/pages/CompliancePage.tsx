import { safeErrorMessage } from '../../lib/safeErrorMessage';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock3,
  Eye,
  FileCheck2,
  FileText,
  ShieldCheck,
  UploadCloud,
  X,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../lib/auth';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { usePortal } from '../state/PortalContext';
import { portalApi } from '../services/portalApi';
import { LoadingSkeleton } from '../components/LoadingSkeleton';

type DocType = 'identity' | 'proof_of_address' | 'questionnaire';
type KycRow = {
  id: string;
  user_id: string;
  doc_type: DocType;
  file_path: string | null;
  answers: Record<string, unknown> | null;
  status: 'pending' | 'approved' | 'rejected';
  reason: string | null;
  created_at: string;
  inline_url?: string | null;
};

type Step = { docType: DocType; title: string; subtitle: string; instruction: string };
const STEPS: Step[] = [
  {
    docType: 'identity',
    title: 'Identity verification',
    subtitle: 'Passport or national ID',
    instruction: 'Upload a clear, valid passport or national identity document.',
  },
  {
    docType: 'proof_of_address',
    title: 'Proof of address',
    subtitle: 'Utility bill or bank statement',
    instruction: 'Upload a statement showing your name and current address, dated within the last 3 months.',
  },
  {
    docType: 'questionnaire',
    title: 'Investor questionnaire',
    subtitle: 'Investor suitability information',
    instruction: 'Tell us about your investment experience, finances and objectives.',
  },
];

const MAX_BYTES = 10 * 1024 * 1024;
const MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf', 'image/jpg'];

const normalizeDocTypeValue = (raw: unknown): DocType => {
  const val = String(raw || '').trim().toLowerCase();
  if (val === 'proof_of_address' || val === 'address' || val === 'utility_bill') return 'proof_of_address';
  if (val === 'questionnaire' || val === 'accredited_proof' || val === 'suitability') return 'questionnaire';
  return 'identity';
};

const normalizeOverallStatus = (raw: string | null): 'not_started' | 'in_review' | 'verified' | 'rejected' => {
  const clean = String(raw || '').trim().toLowerCase();
  if (clean === 'verified' || clean === 'approved') return 'verified';
  if (clean === 'rejected') return 'rejected';
  if (clean === 'in_review' || clean === 'pending') return 'in_review';
  return 'not_started';
};

const profileLabel = (status: string | null) => {
  const norm = normalizeOverallStatus(status);
  return {
    not_started: 'Not started',
    in_review: 'In review',
    verified: 'Verified',
    rejected: 'Rejected',
  }[norm];
};

const dateLabel = (value: string) =>
  new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(value || Date.now())
  );

const fileExtension = (file: File) => {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (file.type === 'image/jpeg' && (ext === 'jpg' || ext === 'jpeg')) return ext;
  if (file.type === 'image/png' && ext === 'png') return ext;
  if (file.type === 'application/pdf' && ext === 'pdf') return ext;
  if (ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'pdf') return ext;
  return file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/png' ? 'png' : 'pdf';
};

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Unable to read selected file.'));
    reader.readAsDataURL(file);
  });

const OPTIONS = {
  experience: ['none', 'some', 'experienced'],
  income: ['Under €25,000', '€25,000–€50,000', '€50,000–€100,000', '€100,000–€250,000', 'Over €250,000', 'Prefer not to say'],
  funds: ['Employment income', 'Business income', 'Savings', 'Investment proceeds', 'Property sale or inheritance', 'Other'],
  goal: ['Capital preservation', 'Income generation', 'Long-term growth', 'Diversification'],
  risk: ['low', 'medium', 'high'],
};
type Answers = { experience: string; income: string; funds: string; goal: string; risk: string; capitalRisk: boolean };
const EMPTY_ANSWERS: Answers = { experience: '', income: '', funds: '', goal: '', risk: '', capitalRisk: false };

export const CompliancePage: React.FC = () => {
  const toast = useToast();
  const { user } = useAuth();
  const { loading: portalLoading, sampleDataEnabled, profile: portalProfile, refreshProfile } = usePortal();
  const [rows, setRows] = useState<KycRow[]>([]);
  const [overallStatus, setOverallStatus] = useState<string | null>(null);
  const [loadingKyc, setLoadingKyc] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<DocType | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [addressConfirmed, setAddressConfirmed] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [insertRetry, setInsertRetry] = useState<{ path: string; docType: DocType } | null>(null);
  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS);
  const [answerErrors, setAnswerErrors] = useState<Record<string, string>>({});
  const [questionSubmitting, setQuestionSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const normalizeRow = (r: any): KycRow => {
    const rawStatus = String(r?.status || 'pending').trim().toLowerCase();
    return {
      id: String(r.id),
      user_id: String(r.user_id || r.userId || user?.id || ''),
      doc_type: normalizeDocTypeValue(r.doc_type || r.docType || r.category),
      file_path: r.file_path ?? r.filePath ?? r.storage_path ?? null,
      answers: r.answers && typeof r.answers === 'object' ? r.answers : null,
      status: rawStatus === 'approved' || rawStatus === 'verified' ? 'approved' : rawStatus === 'rejected' ? 'rejected' : 'pending',
      reason: r.reason ?? r.rejection_reason ?? null,
      created_at: String(r.created_at || r.createdAt || new Date().toISOString()),
      inline_url: r.inlineUrl || r.file_data_url || null,
    };
  };

  const refreshKyc = useCallback(async () => {
    if (!user?.id) throw new Error('Your secure investor session is unavailable. Please sign in again.');

    let fetchedFromSupabase = false;
    if (isSupabaseConfigured()) {
      const { data: sessionRes } = await supabase.auth.getSession();
      if (sessionRes?.session?.user?.id === user.id) {
        const [profileRes, userProfileRes, subRes] = await Promise.all([
          supabase.from('profiles').select('kyc_status').eq('id', user.id).maybeSingle(),
          supabase.from('user_profiles').select('kyc_status').eq('id', user.id).maybeSingle(),
          supabase
            .from('kyc_submissions')
            .select('id,user_id,doc_type,file_path,answers,status,reason,created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
        ]);

        if (!subRes.error && Array.isArray(subRes.data)) {
          fetchedFromSupabase = true;
          const mappedRows = subRes.data.map(normalizeRow);
          setRows(mappedRows);
          const rawProfileStatus =
            profileRes.data?.kyc_status ||
            userProfileRes.data?.kyc_status ||
            portalProfile?.kycStatus ||
            'not_started';
          setOverallStatus(rawProfileStatus);
          setLoadError(null);
        }
      }
    }

    if (!fetchedFromSupabase) {
      const apiRes = await portalApi.getKycSubmissions();
      setRows((apiRes.submissions || []).map(normalizeRow));
      setOverallStatus(apiRes.overallStatus || portalProfile?.kycStatus || 'not_started');
      setLoadError(null);
    }
  }, [user?.id, portalProfile?.kycStatus]);

  useEffect(() => {
    let alive = true;
    setLoadingKyc(true);
    refreshKyc()
      .catch((e: any) => alive && setLoadError(safeErrorMessage(e, 'Unable to load compliance records.')))
      .finally(() => alive && setLoadingKyc(false));

    if (!user?.id || sampleDataEnabled) return () => { alive = false; };

    const onVisibleOrFocus = () => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        void refreshKyc().catch(() => {});
      }
    };
    window.addEventListener('focus', onVisibleOrFocus);
    document.addEventListener('visibilitychange', onVisibleOrFocus);

    let channel: any = null;
    if (isSupabaseConfigured()) {
      channel = supabase
        .channel(`investor-kyc-live:${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'kyc_submissions', filter: `user_id=eq.${user.id}` }, () => {
          void refreshKyc().catch(() => {});
          void refreshProfile();
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, () => {
          void refreshKyc().catch(() => {});
          void refreshProfile();
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'user_profiles', filter: `id=eq.${user.id}` }, () => {
          void refreshKyc().catch(() => {});
          void refreshProfile();
        })
        .subscribe();
    }

    const poll = window.setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        void refreshKyc().catch(() => {});
      }
    }, 30_000);

    return () => {
      alive = false;
      window.clearInterval(poll);
      window.removeEventListener('focus', onVisibleOrFocus);
      document.removeEventListener('visibilitychange', onVisibleOrFocus);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [refreshKyc, refreshProfile, user?.id, sampleDataEnabled]);

  useEffect(() => {
    if (!selectedFile || !selectedFile.type.startsWith('image/')) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  const latestByType = useMemo(() => {
    const map = new Map<DocType, KycRow>();
    rows.forEach((row) => {
      if (!map.has(row.doc_type)) map.set(row.doc_type, row);
    });
    return map;
  }, [rows]);

  const verifiedCount = STEPS.filter((s) => latestByType.get(s.docType)?.status === 'approved').length;
  const pendingCount = STEPS.filter((s) => latestByType.get(s.docType)?.status === 'pending').length;
  const rejectedRows = STEPS.map((s) => ({ step: s, row: latestByType.get(s.docType) })).filter(
    (x) => x.row?.status === 'rejected'
  );

  const computedStatus = useMemo(() => {
    const raw = normalizeOverallStatus(overallStatus || portalProfile?.kycStatus || null);
    if (raw === 'verified' || verifiedCount === STEPS.length) return 'verified';
    if (rejectedRows.length > 0 || raw === 'rejected') return 'rejected';
    if (pendingCount > 0 || raw === 'in_review') return 'in_review';
    return raw;
  }, [overallStatus, portalProfile?.kycStatus, verifiedCount, rejectedRows.length, pendingCount]);

  const isFullyVerified = computedStatus === 'verified';

  const closeSheet = () => {
    setActiveStep(null);
    setSelectedFile(null);
    setFileError(null);
    setAddressConfirmed(false);
    setInsertRetry(null);
    setUploadProgress(0);
  };

  const openStep = (docType: DocType) => {
    setActiveStep(docType);
    setSelectedFile(null);
    setFileError(null);
    setAddressConfirmed(false);
    setInsertRetry(null);
    setUploadProgress(0);
    if (docType === 'questionnaire') {
      setAnswers(EMPTY_ANSWERS);
      setAnswerErrors({});
    }
  };

  const chooseFile = (file?: File) => {
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const validType = MIME_TYPES.includes(file.type) || ['jpg', 'jpeg', 'png', 'pdf'].includes(ext);
    if (!validType) {
      setSelectedFile(null);
      setFileError('Unsupported file type. Choose a JPG, PNG or PDF.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setSelectedFile(null);
      setFileError('This file is larger than 10 MB. Choose a smaller file.');
      return;
    }
    setFileError(null);
    setInsertRetry(null);
    setSelectedFile(file);
  };

  const insertSubmissionDirect = async (path: string, docType: DocType, file?: File) => {
    try {
      await portalApi.submitKycSubmission({
        docType,
        filePath: path,
        fileName: file?.name,
        mimeType: file?.type,
        fileSize: file?.size,
      });
      return;
    } catch {
      if (isSupabaseConfigured()) {
        const { data: sess } = await supabase.auth.getSession();
        if (sess?.session?.user?.id === user?.id) {
          const { error } = await supabase
            .from('kyc_submissions')
            .insert({ user_id: user!.id, doc_type: docType, file_path: path, status: 'pending' });
          if (!error) return;
        }
      }
      const dataUrl = file ? await fileToDataUrl(file) : undefined;
      await portalApi.submitKycSubmission({
        docType,
        filePath: path,
        fileName: file?.name,
        mimeType: file?.type,
        fileSize: file?.size,
        fileDataUrl: dataUrl,
      });
    }
  };

  const uploadFile = async (retryInsert = false) => {
    if (!activeStep || activeStep === 'questionnaire' || !user?.id || uploading) return;
    if (sampleDataEnabled) {
      toast.info('Switch to live account data before uploading compliance documents.');
      return;
    }
    if (!retryInsert && !selectedFile) {
      setFileError('Choose a file or take a photo first before submitting.');
      return;
    }
    if (activeStep === 'proof_of_address' && !addressConfirmed) {
      setFileError('Please check the box confirming this document is dated within the last 3 months.');
      return;
    }

    setUploading(true);
    setFileError(null);
    try {
      if (!selectedFile) {
        throw new Error('Choose a document or take a photo before submitting.');
      }
      let path = '';
      if (retryInsert && insertRetry?.path && insertRetry.docType === activeStep) {
        path = insertRetry.path;
        await insertSubmissionDirect(path, activeStep, selectedFile);
      } else {
        setUploadProgress(30);
        const dataUrl = await fileToDataUrl(selectedFile);
        setUploadProgress(70);
        await portalApi.submitKycSubmission({
          docType: activeStep,
          filePath: path,
          fileName: selectedFile.name,
          mimeType: selectedFile.type || 'application/octet-stream',
          fileSize: selectedFile.size,
          fileDataUrl: dataUrl,
        });
        setUploadProgress(100);
      }

      await refreshKyc();
      await refreshProfile();
      closeSheet();
      toast.success('Submitted. Your document is securely received and queued for admin review.');
    } catch (error: any) {
      setFileError(safeErrorMessage(error, 'Unable to submit your document. Please retry.'));
    } finally {
      setUploading(false);
    }
  };

  const submitQuestionnaire = async (event: React.FormEvent) => {
    event.preventDefault();
    const errors: Record<string, string> = {};
    (['experience', 'income', 'funds', 'goal', 'risk'] as const).forEach((key) => {
      if (!answers[key]) errors[key] = 'Please select an answer.';
    });
    if (!answers.capitalRisk) errors.capitalRisk = 'This acknowledgement is required.';
    setAnswerErrors(errors);
    if (Object.keys(errors).length || questionSubmitting || !user?.id) return;
    if (sampleDataEnabled) {
      toast.info('Switch to live account data before submitting your questionnaire.');
      return;
    }

    setQuestionSubmitting(true);
    const payloadAnswers = {
      investment_experience: answers.experience,
      annual_income_range: answers.income,
      source_of_funds: answers.funds,
      investment_goal: answers.goal,
      risk_tolerance: answers.risk,
      capital_at_risk_acknowledged: answers.capitalRisk,
    };

    try {
      let submitted = false;
      try {
        await portalApi.submitKycSubmission({
          docType: 'questionnaire',
          answers: payloadAnswers,
        });
        submitted = true;
      } catch {
        // Fallback to direct Supabase insert below
      }

      if (!submitted && isSupabaseConfigured()) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user?.id === user.id) {
          const { error } = await supabase.from('kyc_submissions').insert({
            user_id: user.id,
            doc_type: 'questionnaire',
            status: 'pending',
            answers: payloadAnswers,
          });
          if (error) throw error;
          submitted = true;
        }
      }

      if (!submitted) {
        throw new Error('Unable to submit questionnaire. Please retry.');
      }

      await refreshKyc();
      await refreshProfile();
      closeSheet();
      toast.success('Submitted. Your investor questionnaire is awaiting compliance review.');
    } catch (error: any) {
      setAnswerErrors({ form: safeErrorMessage(error, 'Unable to submit questionnaire. Please retry.') });
    } finally {
      setQuestionSubmitting(false);
    }
  };

  const viewUploaded = async (row: KycRow) => {
    if (row.inline_url && row.inline_url.startsWith('data:')) {
      const link = document.createElement('a');
      link.href = row.inline_url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }
    if (!row.file_path) return;
    try {
      let signedUrl: string | null = null;
      for (const bucket of ['kyc', 'kyc-documents', 'documents']) {
        const { data, error } = await supabase.storage.from(bucket).createSignedUrl(row.file_path, 60);
        if (!error && data?.signedUrl) {
          signedUrl = data.signedUrl;
          break;
        }
      }
      if (!signedUrl) throw new Error('Unable to create a secure preview.');
      const link = document.createElement('a');
      link.href = signedUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error: any) {
      toast.error(safeErrorMessage(error, 'Unable to open secure document preview.'));
    }
  };

  const setAnswer = (key: keyof Answers, value: string | boolean) => {
    setAnswers((current) => ({ ...current, [key]: value }));
    setAnswerErrors((current) => ({ ...current, [key]: '', form: '' }));
  };

  const renderRadio = (key: keyof Answers, label: string, options: string[]) => (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-[#E5ECE9]">{label}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label
            key={option}
            className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs transition-colors ${
              answers[key] === option
                ? 'border-[#6FD8B0] bg-[#6FD8B0]/10 text-[#F2F5F4]'
                : 'border-[#1F2C33] bg-[#0B0F10] text-[#C6D1CE]'
            }`}
          >
            <input
              type="radio"
              name={key}
              value={option}
              checked={answers[key] === option}
              onChange={() => setAnswer(key, option)}
              className="accent-[#6FD8B0]"
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
      {answerErrors[key] && (
        <p role="alert" className="text-xs text-rose-300">
          {answerErrors[key]}
        </p>
      )}
    </fieldset>
  );

  if (portalLoading && !user) return <LoadingSkeleton rows={4} />;

  return (
    <div className="max-w-4xl space-y-6 text-[#F2F5F4]">
      <header>
        <div className="flex items-center gap-2 text-[#6FD8B0]">
          <ShieldCheck className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-[0.16em]">Investor compliance</span>
        </div>
        <h2 className="mt-2 text-xl font-heading font-bold">Compliance Vault</h2>
        <p className="mt-1 text-sm text-[#8FA1A8]">
          We use these details to confirm your identity, address and investment suitability. Your documents are kept in a
          private vault and can only be accessed through authorized review.
        </p>
      </header>

      {isFullyVerified && (
        <div className="flex items-center gap-3 rounded-2xl border border-[#6FD8B0]/40 bg-[#6FD8B0]/10 p-4 text-[#6FD8B0]">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">You’re fully verified</p>
            <p className="mt-0.5 text-xs text-[#B8E9D6]">
              Your compliance checks are complete. No further uploads are required.
            </p>
          </div>
        </div>
      )}

      {rejectedRows.length > 0 && !isFullyVerified && (
        <div className="rounded-2xl border border-rose-400/40 bg-rose-400/10 p-4" role="alert">
          <p className="font-semibold text-rose-200">Action required — update your documents</p>
          {rejectedRows.map(({ step, row }) => (
            <p key={step.docType} className="mt-1 text-sm text-rose-100">
              <strong>{step.title}:</strong> {row?.reason || 'Please upload a corrected document.'}
            </p>
          ))}
        </div>
      )}

      <section className="rounded-2xl border border-[#1F2C33] bg-[#121A1F] p-4 sm:p-5" aria-label="Verification progress">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs text-[#8FA1A8]">Verification progress</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {verifiedCount} <span className="text-sm font-normal text-[#8FA1A8]">of 3 verified</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[#8FA1A8]">Overall account status</p>
            <span
              className={`mt-1 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                computedStatus === 'verified'
                  ? 'border-[#6FD8B0]/40 bg-[#6FD8B0]/10 text-[#6FD8B0]'
                  : computedStatus === 'rejected'
                  ? 'border-rose-400/40 bg-rose-400/10 text-rose-300'
                  : computedStatus === 'in_review'
                  ? 'border-amber-300/40 bg-amber-300/10 text-amber-200'
                  : 'border-[#1F2C33] bg-[#0B0F10] text-[#AAB8BC]'
              }`}
            >
              {loadingKyc ? 'Loading status…' : profileLabel(computedStatus)}
            </span>
          </div>
        </div>
        <div
          className="mt-4 h-2 overflow-hidden rounded-full bg-[#0B0F10]"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={3}
          aria-valuenow={verifiedCount}
        >
          <div className="h-full rounded-full bg-[#6FD8B0] transition-all" style={{ width: `${(verifiedCount / 3) * 100}%` }} />
        </div>
        <p className="mt-2 text-xs text-[#8FA1A8]">
          {pendingCount
            ? `${pendingCount} submission${pendingCount === 1 ? '' : 's'} currently in review.`
            : isFullyVerified
            ? 'All three verification steps have been approved.'
            : 'Complete all three steps to finish investor verification.'}
        </p>
      </section>

      {sampleDataEnabled && (
        <div className="rounded-xl border border-amber-300/30 bg-[#121A1F] p-3 text-sm text-amber-200">
          Sample data is active. Switch to live account data to submit real compliance information.
        </div>
      )}

      {loadError && (
        <div role="alert" className="flex items-center gap-2 rounded-xl border border-rose-400/30 p-3 text-sm text-rose-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{loadError}</span>
          <button
            type="button"
            className="ml-auto min-h-[44px] px-2 underline cursor-pointer"
            onClick={() => {
              setLoadError(null);
              setLoadingKyc(true);
              refreshKyc()
                .catch((e: any) => setLoadError(safeErrorMessage(e, 'Unable to load compliance records.')))
                .finally(() => setLoadingKyc(false));
            }}
          >
            Retry
          </button>
        </div>
      )}

      <section className="space-y-3" aria-label="Verification steps">
        {STEPS.map((step, index) => {
          const row = latestByType.get(step.docType);
          const pending = row?.status === 'pending';
          const approved = row?.status === 'approved';
          const rejected = row?.status === 'rejected';
          const statusText = !row ? 'Not started' : approved ? 'Verified' : pending ? 'In review' : 'Rejected';
          const statusClass = !row
            ? 'border-[#1F2C33] bg-[#0B0F10] text-[#AAB8BC]'
            : approved
            ? 'border-[#6FD8B0]/40 bg-[#6FD8B0]/10 text-[#6FD8B0]'
            : pending
            ? 'border-amber-300/40 bg-amber-300/10 text-amber-200'
            : 'border-rose-400/40 bg-rose-400/10 text-rose-300';
          return (
            <article key={step.docType} className="overflow-hidden rounded-2xl border border-[#1F2C33] bg-[#121A1F]">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#1F2C33] bg-[#0B0F10] text-sm font-semibold text-[#6FD8B0]">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">{step.title}</h3>
                    <p className="mt-0.5 text-xs text-[#8FA1A8]">{step.subtitle}</p>
                    {row && <p className="mt-1.5 text-xs text-[#8FA1A8]">Submitted {dateLabel(row.created_at)}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass}`}>
                    {approved && <CheckCircle2 className="h-3.5 w-3.5" />}
                    {pending && <Clock3 className="h-3.5 w-3.5" />}
                    {statusText}
                  </span>
                  {(row?.file_path || row?.inline_url) && (
                    <button
                      type="button"
                      onClick={() => void viewUploaded(row)}
                      className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-[#1F2C33] px-3 text-xs text-[#AAB8BC] hover:border-[#6FD8B0] hover:text-[#F2F5F4] cursor-pointer"
                      aria-label="View uploaded document with temporary secure link"
                    >
                      <Eye className="h-4 w-4" />
                      <span>View</span>
                    </button>
                  )}
                  {!isFullyVerified && !pending && !approved && (
                    <button
                      type="button"
                      disabled={uploading || sampleDataEnabled}
                      onClick={() => openStep(step.docType)}
                      className="min-h-[44px] rounded-lg bg-[#6FD8B0] hover:bg-[#5ec8a0] px-4 text-xs font-semibold text-[#0B0F10] disabled:opacity-50 cursor-pointer"
                    >
                      {rejected ? 'Upload again' : step.docType === 'questionnaire' ? 'Complete' : 'Upload'}
                    </button>
                  )}
                </div>
              </div>
              {rejected && (
                <div className="mx-4 mb-4 rounded-xl border border-rose-400/35 bg-rose-400/10 p-3 sm:mx-5">
                  <p className="text-xs font-semibold text-rose-300">Reason for rejection</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-rose-100">
                    {row.reason || 'Please submit an updated response.'}
                  </p>
                </div>
              )}
            </article>
          );
        })}
      </section>

      <div className="flex items-start gap-2 rounded-xl border border-[#1F2C33] bg-[#121A1F] p-3 text-xs leading-relaxed text-[#8FA1A8]">
        <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-[#6FD8B0]" />
        Your documents are stored in a private vault. Secure previews use short-lived links and are never public.
      </div>

      {activeStep && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/75 sm:items-center sm:p-4"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !uploading && !questionSubmitting) closeSheet();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="kyc-sheet-title"
            className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-[#1F2C33] bg-[#121A1F] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#6FD8B0]">Compliance Vault</p>
                <h3 id="kyc-sheet-title" className="mt-1 text-lg font-semibold">
                  {STEPS.find((s) => s.docType === activeStep)?.title}
                </h3>
              </div>
              <button
                type="button"
                disabled={uploading || questionSubmitting}
                onClick={closeSheet}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#1F2C33] text-[#AAB8BC] hover:text-[#F2F5F4] cursor-pointer"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {activeStep === 'questionnaire' ? (
              <form onSubmit={submitQuestionnaire} className="space-y-5">
                {renderRadio('experience', 'Investing experience', OPTIONS.experience)}
                {renderRadio('income', 'Annual income range', OPTIONS.income)}
                {renderRadio('funds', 'Source of funds', OPTIONS.funds)}
                {renderRadio('goal', 'Investment goal', OPTIONS.goal)}
                {renderRadio('risk', 'Risk tolerance', OPTIONS.risk)}
                <div>
                  <label className="flex min-h-[48px] cursor-pointer items-start gap-3 rounded-xl border border-[#1F2C33] bg-[#0B0F10] p-3 text-xs leading-relaxed text-[#C6D1CE]">
                    <input
                      type="checkbox"
                      checked={answers.capitalRisk}
                      onChange={(e) => setAnswer('capitalRisk', e.target.checked)}
                      className="mt-0.5 h-5 w-5 accent-[#6FD8B0]"
                    />
                    <span>
                      I understand capital is at risk and target returns are not guaranteed.{' '}
                      <span className="text-rose-300">*</span>
                    </span>
                  </label>
                  {answerErrors.capitalRisk && (
                    <p role="alert" className="mt-1 text-xs text-rose-300">
                      {answerErrors.capitalRisk}
                    </p>
                  )}
                </div>
                {answerErrors.form && (
                  <p role="alert" className="text-sm text-rose-300">
                    {answerErrors.form}
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={questionSubmitting}
                    onClick={closeSheet}
                    className="portal-btn-secondary min-h-[48px] flex-1 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={questionSubmitting}
                    className="portal-btn-primary min-h-[48px] flex-1 cursor-pointer"
                  >
                    {questionSubmitting ? 'Submitting…' : 'Submit questionnaire'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-[#1F2C33] bg-[#0B0F10] p-3">
                  <p className="text-sm font-semibold text-[#E5ECE9]">Before you upload</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed text-[#AAB8BC]">
                    <li>All four corners must be visible.</li>
                    <li>Text and details must be clear and readable.</li>
                    <li>The document must not be expired.</li>
                    <li>Do not edit, crop, alter or obscure the document.</li>
                  </ul>
                </div>

                {activeStep === 'proof_of_address' && (
                  <p className="text-xs text-[#AAB8BC]">
                    Your utility bill or bank statement must be dated within the last 3 months.
                  </p>
                )}

                <input
                  id="kyc-file-input"
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf"
                  className="sr-only"
                  onChange={(e) => {
                    chooseFile(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />

                {!selectedFile ? (
                  <label
                    htmlFor="kyc-file-input"
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      chooseFile(e.dataTransfer.files?.[0]);
                    }}
                    className={`flex min-h-32 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-5 text-center transition-colors ${
                      isDragging
                        ? 'border-[#6FD8B0] bg-[#6FD8B0]/10'
                        : 'border-[#36504B] bg-[#0B0F10] hover:border-[#6FD8B0] active:border-[#6FD8B0]'
                    }`}
                  >
                    <UploadCloud className="h-6 w-6 text-[#6FD8B0]" />
                    <span className="text-sm font-medium text-[#F2F5F4]">Choose a file or take a photo</span>
                    <span className="text-xs text-[#8FA1A8]">JPG, PNG or PDF · Maximum 10 MB</span>
                  </label>
                ) : (
                  <div className="flex items-center gap-3 rounded-xl border border-[#1F2C33] bg-[#0B0F10] p-3">
                    {previewUrl ? (
                      <img src={previewUrl} alt="Selected document preview" className="h-20 w-20 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-[#121A1F]">
                        <FileText className="h-8 w-8 text-[#6FD8B0]" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{selectedFile.name}</p>
                      <p className="text-xs text-[#8FA1A8]">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <label
                      htmlFor="kyc-file-input"
                      onClick={(e) => {
                        if (uploading) e.preventDefault();
                      }}
                      className="inline-flex min-h-[44px] items-center justify-center cursor-pointer rounded-lg border border-[#1F2C33] px-3 text-xs font-semibold text-[#6FD8B0] hover:border-[#6FD8B0]"
                    >
                      Replace
                    </label>
                  </div>
                )}

                {activeStep === 'proof_of_address' && (
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={addressConfirmed}
                    onClick={() => {
                      setAddressConfirmed((prev) => !prev);
                      setFileError(null);
                    }}
                    className={`flex min-h-[48px] w-full cursor-pointer items-center gap-3 rounded-xl border p-3 text-left text-xs transition-colors ${
                      addressConfirmed
                        ? 'border-[#6FD8B0] bg-[#6FD8B0]/10 text-[#F2F5F4]'
                        : 'border-[#1F2C33] bg-[#0B0F10] text-[#AAB8BC] hover:border-[#36504B]'
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors ${
                        addressConfirmed
                          ? 'border-[#6FD8B0] bg-[#6FD8B0] text-[#0B0F10]'
                          : 'border-[#475569] bg-white text-transparent'
                      }`}
                    >
                      <Check className="h-4 w-4 stroke-[3]" />
                    </span>
                    <span className="leading-relaxed">I confirm this document is dated within the last 3 months.</span>
                  </button>
                )}

                {fileError && (
                  <p role="alert" className="rounded-lg border border-rose-400/30 bg-rose-400/10 p-3 text-xs leading-relaxed text-rose-200">
                    {fileError}
                  </p>
                )}

                {uploading && (
                  <div>
                    <div className="mb-1 flex justify-between text-xs text-[#AAB8BC]">
                      <span>Uploading securely…</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#0B0F10]">
                      <div className="h-full bg-[#6FD8B0] transition-all" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  </div>
                )}

                {insertRetry && (
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => void uploadFile(true)}
                    className="w-full cursor-pointer rounded-xl border border-amber-300/40 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-200"
                  >
                    Retry submission record (do not upload again)
                  </button>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={closeSheet}
                    className="portal-btn-secondary min-h-[48px] flex-1 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => void uploadFile()}
                    className="portal-btn-primary min-h-[48px] flex-1 cursor-pointer"
                  >
                    {uploading ? 'Submitting…' : 'Submit'}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
