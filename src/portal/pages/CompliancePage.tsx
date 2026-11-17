import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock3, Eye, FileCheck2, FileText, ShieldCheck, UploadCloud, X } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../lib/auth';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { usePortal } from '../state/PortalContext';
import { LoadingSkeleton } from '../components/LoadingSkeleton';

type DocType = 'identity' | 'proof_of_address' | 'questionnaire';
type KycRow = {
  id: string; user_id: string; doc_type: DocType; file_path: string | null;
  answers: Record<string, unknown> | null; status: 'pending' | 'approved' | 'rejected';
  reason: string | null; created_at: string;
};
type Step = { docType: DocType; title: string; subtitle: string; instruction: string };
const STEPS: Step[] = [
  { docType: 'identity', title: 'Identity verification', subtitle: 'Passport or national ID', instruction: 'Upload a clear, valid passport or national identity document.' },
  { docType: 'proof_of_address', title: 'Proof of address', subtitle: 'Utility bill or bank statement', instruction: 'Upload a statement showing your name and current address, dated within the last 3 months.' },
  { docType: 'questionnaire', title: 'Investor questionnaire', subtitle: 'Investor suitability information', instruction: 'Tell us about your investment experience, finances and objectives.' },
];
const MAX_BYTES = 10 * 1024 * 1024;
const MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const profileLabel = (status: string | null) => ({ not_started: 'Not started', in_review: 'In review', verified: 'Verified', rejected: 'Rejected' }[status || ''] || 'Status unavailable');
const dateLabel = (value: string) => new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
const fileExtension = (file: File) => {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (file.type === 'image/jpeg' && (ext === 'jpg' || ext === 'jpeg')) return ext;
  if (file.type === 'image/png' && ext === 'png') return ext;
  if (file.type === 'application/pdf' && ext === 'pdf') return ext;
  return file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/png' ? 'png' : 'pdf';
};
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
  const { loading: portalLoading, sampleDataEnabled } = usePortal();
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
  const [insertRetry, setInsertRetry] = useState<{ path: string; docType: DocType } | null>(null);
  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS);
  const [answerErrors, setAnswerErrors] = useState<Record<string, string>>({});
  const [questionSubmitting, setQuestionSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshKyc = useCallback(async () => {
    if (!isSupabaseConfigured() || !user?.id) throw new Error('Your secure investor session is unavailable. Please sign in again.');
    const [{ data: auth, error: authError }, profile, submissions] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('profiles').select('kyc_status').eq('id', user.id).single(),
      supabase.from('kyc_submissions').select('id,user_id,doc_type,file_path,answers,status,reason,created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
    ]);
    if (authError || auth.user?.id !== user.id) throw new Error('Your secure investor session has expired. Please sign in again.');
    if (profile.error) throw profile.error;
    if (submissions.error) throw submissions.error;
    setOverallStatus(profile.data.kyc_status || 'not_started');
    setRows((submissions.data || []) as KycRow[]);
  }, [user?.id]);

  useEffect(() => {
    let alive = true;
    setLoadingKyc(true);
    refreshKyc().catch((e: any) => alive && setLoadError(e?.message || 'Unable to load compliance records.')).finally(() => alive && setLoadingKyc(false));
    if (!user?.id || sampleDataEnabled) return () => { alive = false; };
    const channel = supabase.channel('investor-kyc-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kyc_submissions', filter: `user_id=eq.${user.id}` }, () => { void refreshKyc(); })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, () => { void refreshKyc(); })
      .subscribe();
    const poll = window.setInterval(() => { void refreshKyc(); }, 30000);
    return () => { alive = false; window.clearInterval(poll); void supabase.removeChannel(channel); };
  }, [refreshKyc, user?.id, sampleDataEnabled]);

  useEffect(() => {
    if (!selectedFile || !selectedFile.type.startsWith('image/')) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  const latestByType = useMemo(() => {
    const map = new Map<DocType, KycRow>();
    rows.forEach((row) => { if (!map.has(row.doc_type)) map.set(row.doc_type, row); });
    return map;
  }, [rows]);
  const verifiedCount = STEPS.filter((s) => latestByType.get(s.docType)?.status === 'approved').length;
  const pendingCount = STEPS.filter((s) => latestByType.get(s.docType)?.status === 'pending').length;
  const rejectedRows = STEPS.map((s) => ({ step: s, row: latestByType.get(s.docType) })).filter((x) => x.row?.status === 'rejected');
  const isFullyVerified = overallStatus === 'verified';

  const closeSheet = () => { setActiveStep(null); setSelectedFile(null); setFileError(null); setAddressConfirmed(false); setInsertRetry(null); };
  const openStep = (docType: DocType) => {
    setActiveStep(docType); setSelectedFile(null); setFileError(null); setAddressConfirmed(false); setInsertRetry(null);
    if (docType === 'questionnaire') { setAnswers(EMPTY_ANSWERS); setAnswerErrors({}); }
  };

  const chooseFile = (file?: File) => {
    if (!file) return;
    if (!MIME_TYPES.includes(file.type)) { setSelectedFile(null); setFileError('Unsupported file type. Choose a JPG, PNG or PDF.'); return; }
    if (file.size > MAX_BYTES) { setSelectedFile(null); setFileError('This file is larger than 10 MB. Choose a smaller file.'); return; }
    setFileError(null); setInsertRetry(null); setSelectedFile(file);
  };

  const insertSubmission = async (path: string, docType: DocType) => {
    const { error } = await supabase.from('kyc_submissions').insert({ user_id: user!.id, doc_type: docType, file_path: path, status: 'pending' });
    if (error) throw error;
  };

  const uploadFile = async (retryInsert = false) => {
    if (!activeStep || activeStep === 'questionnaire' || !user?.id || uploading) return;
    if (sampleDataEnabled) { toast.info('Switch to live account data before uploading compliance documents.'); return; }
    if (activeStep === 'proof_of_address' && !addressConfirmed) { setFileError('Confirm that your proof of address is dated within the last 3 months.'); return; }
    if (!retryInsert && !selectedFile) { setFileError('Choose a document before submitting.'); return; }
    setUploading(true); setFileError(null);
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || auth.user?.id !== user.id) throw new Error('Your secure investor session has expired. Please sign in again.');
      let path = insertRetry?.path;
      if (retryInsert && path && insertRetry.docType === activeStep) {
        await insertSubmission(path, activeStep);
      } else {
        if (!selectedFile) throw new Error('Choose a document before submitting.');
        const ext = fileExtension(selectedFile);
        const timestamp = Date.now();
        path = `${user.id}/${activeStep}-${timestamp}.${ext}`;
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData.session?.access_token) throw new Error('Your secure session has expired. Please sign in again.');
        const env = (import.meta as any).env || {};
        const baseUrl = String(env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
        const apiKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!baseUrl || !apiKey) throw new Error('Secure storage is not configured. Please contact support.');
        setUploadProgress(0);
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', `${baseUrl}/storage/v1/object/kyc/${path.split('/').map(encodeURIComponent).join('/')}`);
          xhr.setRequestHeader('Authorization', `Bearer ${sessionData.session!.access_token}`);
          xhr.setRequestHeader('apikey', apiKey);
          xhr.setRequestHeader('Content-Type', selectedFile.type);
          xhr.setRequestHeader('x-upsert', 'false');
          xhr.upload.onprogress = (event) => { if (event.lengthComputable) setUploadProgress(Math.round((event.loaded / event.total) * 100)); };
          xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(xhr.responseText || `Storage upload failed (${xhr.status}).`));
          xhr.onerror = () => reject(new Error('Network error while uploading. Check your connection and retry.'));
          xhr.onabort = () => reject(new Error('Upload cancelled.'));
          xhr.send(selectedFile);
        });
        setUploadProgress(100);
        try { await insertSubmission(path, activeStep); }
        catch (error: any) {
          setInsertRetry({ path, docType: activeStep });
          throw new Error(`Your file uploaded securely, but the submission record could not be saved: ${error?.message || 'database error'}. Select “Retry submission” to finish without uploading the file again.`);
        }
      }
      await refreshKyc();
      closeSheet();
      toast.success('Submitted. We’ll review it shortly.');
    } catch (error: any) {
      setFileError(error?.message || 'Unable to submit your document. Please retry.');
    } finally { setUploading(false); }
  };

  const submitQuestionnaire = async (event: React.FormEvent) => {
    event.preventDefault();
    const errors: Record<string, string> = {};
    (['experience', 'income', 'funds', 'goal', 'risk'] as const).forEach((key) => { if (!answers[key]) errors[key] = 'Please select an answer.'; });
    if (!answers.capitalRisk) errors.capitalRisk = 'This acknowledgement is required.';
    setAnswerErrors(errors);
    if (Object.keys(errors).length || questionSubmitting || !user?.id) return;
    if (sampleDataEnabled) { toast.info('Switch to live account data before submitting your questionnaire.'); return; }
    setQuestionSubmitting(true);
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || auth.user?.id !== user.id) throw new Error('Your secure investor session has expired. Please sign in again.');
      const { error } = await supabase.from('kyc_submissions').insert({
        user_id: user.id, doc_type: 'questionnaire', status: 'pending',
        answers: { investment_experience: answers.experience, annual_income_range: answers.income, source_of_funds: answers.funds, investment_goal: answers.goal, risk_tolerance: answers.risk, capital_at_risk_acknowledged: answers.capitalRisk },
      });
      if (error) throw error;
      await refreshKyc(); closeSheet(); toast.success('Submitted. We’ll review it shortly.');
    } catch (error: any) { setAnswerErrors({ form: error?.message || 'Unable to submit questionnaire. Please retry.' }); }
    finally { setQuestionSubmitting(false); }
  };

  const viewUploaded = async (row: KycRow) => {
    if (!row.file_path) return;
    try {
      const { data, error } = await supabase.storage.from('kyc').createSignedUrl(row.file_path, 60);
      if (error || !data?.signedUrl) throw error || new Error('Unable to create a secure preview.');
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (error: any) { toast.error(error?.message || 'Unable to open secure document preview.'); }
  };

  const setAnswer = (key: keyof Answers, value: string | boolean) => {
    setAnswers((current) => ({ ...current, [key]: value }));
    setAnswerErrors((current) => ({ ...current, [key]: '', form: '' }));
  };
  const renderRadio = (key: keyof Answers, label: string, options: string[]) => (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-[#E5ECE9]">{label}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => <label key={option} className="flex min-h-11 items-center gap-2 rounded-xl border border-[#1F2C33] bg-[#0B0F10] px-3 py-2 text-xs text-[#C6D1CE]">
          <input type="radio" name={key} value={option} checked={answers[key] === option} onChange={() => setAnswer(key, option)} className="accent-[#6FD8B0]" />{option}
        </label>)}
      </div>
      {answerErrors[key] && <p role="alert" className="text-xs text-rose-300">{answerErrors[key]}</p>}
    </fieldset>
  );

  if (portalLoading && !user) return <LoadingSkeleton rows={4} />;
  return (
    <div className="max-w-4xl space-y-6 text-[#F2F5F4]">
      <header>
        <div className="flex items-center gap-2 text-[#6FD8B0]"><ShieldCheck className="h-5 w-5" /><span className="text-xs font-semibold uppercase tracking-[0.16em]">Investor compliance</span></div>
        <h2 className="mt-2 text-xl font-heading font-bold">Compliance Vault</h2>
        <p className="mt-1 text-sm text-[#8FA1A8]">Securely submit your verification documents and investor questionnaire.</p>
      </header>

      {isFullyVerified && <div className="flex items-center gap-3 rounded-2xl border border-[#6FD8B0]/40 bg-[#6FD8B0]/10 p-4 text-[#6FD8B0]"><CheckCircle2 className="h-5 w-5 shrink-0" /><div><p className="font-semibold">You’re fully verified</p><p className="mt-0.5 text-xs text-[#B8E9D6]">Your compliance checks are complete. No further uploads are required.</p></div></div>}
      {rejectedRows.length > 0 && !isFullyVerified && <div className="rounded-2xl border border-rose-400/40 bg-rose-400/10 p-4" role="alert"><p className="font-semibold text-rose-200">Action required — update your documents</p>{rejectedRows.map(({ step, row }) => <p key={step.docType} className="mt-1 text-sm text-rose-100"><strong>{step.title}:</strong> {row?.reason || 'Please upload a corrected document.'}</p>)}</div>}

      <section className="rounded-2xl border border-[#1F2C33] bg-[#121A1F] p-4 sm:p-5" aria-label="Verification progress">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs text-[#8FA1A8]">Verification progress</p><p className="mt-1 text-2xl font-semibold tabular-nums">{verifiedCount} <span className="text-sm font-normal text-[#8FA1A8]">of 3 verified</span></p></div><div className="text-right"><p className="text-xs text-[#8FA1A8]">Overall account status</p><span className={`mt-1 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${overallStatus === 'verified' ? 'border-[#6FD8B0]/40 bg-[#6FD8B0]/10 text-[#6FD8B0]' : overallStatus === 'rejected' ? 'border-rose-400/40 bg-rose-400/10 text-rose-300' : overallStatus === 'in_review' ? 'border-amber-300/40 bg-amber-300/10 text-amber-200' : 'border-[#1F2C33] bg-[#0B0F10] text-[#AAB8BC]'}`}>{loadingKyc ? 'Loading status…' : profileLabel(overallStatus)}</span></div></div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#0B0F10]" role="progressbar" aria-valuemin={0} aria-valuemax={3} aria-valuenow={verifiedCount}><div className="h-full rounded-full bg-[#6FD8B0] transition-all" style={{ width: `${verifiedCount / 3 * 100}%` }} /></div>
        <p className="mt-2 text-xs text-[#8FA1A8]">{pendingCount ? `${pendingCount} submission${pendingCount === 1 ? '' : 's'} currently in review.` : 'Complete all three steps to finish investor verification.'}</p>
      </section>

      {sampleDataEnabled && <div className="rounded-xl border border-amber-300/30 bg-[#121A1F] p-3 text-sm text-amber-200">Sample data is active. Switch to live account data to submit real compliance information.</div>}
      {loadError && <div role="alert" className="flex items-center gap-2 rounded-xl border border-rose-400/30 p-3 text-sm text-rose-200"><AlertCircle className="h-4 w-4" />{loadError}<button className="ml-auto underline" onClick={() => { setLoadingKyc(true); refreshKyc().catch((e: any) => setLoadError(e.message)).finally(() => setLoadingKyc(false)); }}>Retry</button></div>}

      <section className="space-y-3" aria-label="Verification steps">
        {STEPS.map((step, index) => {
          const row = latestByType.get(step.docType);
          const pending = row?.status === 'pending'; const approved = row?.status === 'approved'; const rejected = row?.status === 'rejected';
          const statusText = !row ? 'Not started' : approved ? 'Verified' : pending ? 'In review' : 'Rejected';
          const statusClass = !row ? 'border-[#1F2C33] bg-[#0B0F10] text-[#AAB8BC]' : approved ? 'border-[#6FD8B0]/40 bg-[#6FD8B0]/10 text-[#6FD8B0]' : pending ? 'border-amber-300/40 bg-amber-300/10 text-amber-200' : 'border-rose-400/40 bg-rose-400/10 text-rose-300';
          return <article key={step.docType} className="overflow-hidden rounded-2xl border border-[#1F2C33] bg-[#121A1F]">
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5"><div className="flex min-w-0 items-start gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#1F2C33] bg-[#0B0F10] text-sm font-semibold text-[#6FD8B0]">{index + 1}</div><div><h3 className="text-sm font-semibold">{step.title}</h3><p className="mt-0.5 text-xs text-[#8FA1A8]">{step.subtitle}</p>{row && <p className="mt-1.5 text-xs text-[#8FA1A8]">Submitted {dateLabel(row.created_at)}</p>}</div></div>
              <div className="flex items-center gap-2"><span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass}`}>{approved && <CheckCircle2 className="h-3.5 w-3.5" />}{pending && <Clock3 className="h-3.5 w-3.5" />}{statusText}</span>{row?.file_path && <button type="button" onClick={() => void viewUploaded(row)} className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-[#1F2C33] px-2.5 text-xs text-[#AAB8BC]" aria-label="View uploaded document with temporary secure link"><Eye className="h-4 w-4" />View</button>}{!isFullyVerified && !pending && !approved && <button type="button" disabled={loadingKyc || uploading || Boolean(loadError) || sampleDataEnabled} onClick={() => openStep(step.docType)} className="min-h-10 rounded-lg bg-[#6FD8B0] px-3.5 text-xs font-semibold text-[#0B0F10] disabled:opacity-50">{rejected ? 'Upload again' : step.docType === 'questionnaire' ? 'Complete' : 'Upload'}</button>}</div>
            </div>
            {rejected && <div className="mx-4 mb-4 rounded-xl border border-rose-400/35 bg-rose-400/10 p-3 sm:mx-5"><p className="text-xs font-semibold text-rose-300">Reason for rejection</p><p className="mt-1 whitespace-pre-wrap text-sm text-rose-100">{row.reason || 'Please submit an updated response.'}</p></div>}
          </article>;
        })}
      </section>
      <div className="flex items-start gap-2 rounded-xl border border-[#1F2C33] bg-[#121A1F] p-3 text-xs leading-relaxed text-[#8FA1A8]"><FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-[#6FD8B0]" />Your documents are stored in a private vault. Secure previews use short-lived links and are never public.</div>

      {activeStep && <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 sm:items-center sm:p-4" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget && !uploading && !questionSubmitting) closeSheet(); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="kyc-sheet-title" className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-[#1F2C33] bg-[#121A1F] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl">
          <div className="mb-4 flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-[#6FD8B0]">Compliance Vault</p><h3 id="kyc-sheet-title" className="mt-1 text-lg font-semibold">{STEPS.find((s) => s.docType === activeStep)?.title}</h3></div><button type="button" disabled={uploading || questionSubmitting} onClick={closeSheet} className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#1F2C33] text-[#AAB8BC]" aria-label="Close"><X className="h-5 w-5" /></button></div>
          {activeStep === 'questionnaire' ? <form onSubmit={submitQuestionnaire} className="space-y-5">
            {renderRadio('experience', 'Investing experience', OPTIONS.experience)}
            {renderRadio('income', 'Annual income range', OPTIONS.income)}
            {renderRadio('funds', 'Source of funds', OPTIONS.funds)}
            {renderRadio('goal', 'Investment goal', OPTIONS.goal)}
            {renderRadio('risk', 'Risk tolerance', OPTIONS.risk)}
            <div><label className="flex items-start gap-3 rounded-xl border border-[#1F2C33] bg-[#0B0F10] p-3 text-xs leading-relaxed text-[#C6D1CE]"><input type="checkbox" checked={answers.capitalRisk} onChange={(e) => setAnswer('capitalRisk', e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#6FD8B0]" /><span>I understand capital is at risk and target returns are not guaranteed. <span className="text-rose-300">*</span></span></label>{answerErrors.capitalRisk && <p role="alert" className="mt-1 text-xs text-rose-300">{answerErrors.capitalRisk}</p>}</div>
            {answerErrors.form && <p role="alert" className="text-sm text-rose-300">{answerErrors.form}</p>}
            <div className="flex gap-2"><button type="button" onClick={closeSheet} className="portal-btn-secondary flex-1">Cancel</button><button type="submit" disabled={questionSubmitting} className="portal-btn-primary flex-1">{questionSubmitting ? 'Submitting…' : 'Submit questionnaire'}</button></div>
          </form> : <div className="space-y-4">
            <div className="rounded-xl border border-[#1F2C33] bg-[#0B0F10] p-3"><p className="text-sm font-semibold text-[#E5ECE9]">Before you upload</p><ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed text-[#AAB8BC]"><li>All four corners must be visible.</li><li>Text and details must be clear and readable.</li><li>The document must not be expired.</li><li>Do not edit, crop, alter or obscure the document.</li></ul></div>
            {activeStep === 'proof_of_address' && <p className="text-xs text-[#AAB8BC]">Your utility bill or bank statement must be dated within the last 3 months.</p>}
            {!selectedFile ? <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#36504B] bg-[#0B0F10] p-5 text-center hover:border-[#6FD8B0]"><UploadCloud className="h-6 w-6 text-[#6FD8B0]" /><span className="text-sm font-medium">Choose a file or take a photo</span><span className="text-xs text-[#8FA1A8]">JPG, PNG or PDF · Maximum 10 MB</span><input ref={fileInputRef} type="file" accept="image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf" capture="environment" className="sr-only" onChange={(e) => chooseFile(e.target.files?.[0])} /></label> : <div className="flex items-center gap-3 rounded-xl border border-[#1F2C33] bg-[#0B0F10] p-3">{previewUrl ? <img src={previewUrl} alt="Selected document preview" className="h-20 w-20 rounded-lg object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-[#121A1F]"><FileText className="h-8 w-8 text-[#6FD8B0]" /></div>}<div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{selectedFile.name}</p><p className="text-xs text-[#8FA1A8]">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p></div><button type="button" disabled={uploading} onClick={() => { setSelectedFile(null); setFileError(null); fileInputRef.current?.click(); }} className="min-h-10 rounded-lg border border-[#1F2C33] px-3 text-xs font-semibold text-[#6FD8B0]">Replace</button></div>}
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf" capture="environment" className="hidden" onChange={(e) => chooseFile(e.target.files?.[0])} />
            {activeStep === 'proof_of_address' && <label className="flex items-start gap-2 text-xs text-[#AAB8BC]"><input type="checkbox" checked={addressConfirmed} onChange={(e) => setAddressConfirmed(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#6FD8B0]" />I confirm this document is dated within the last 3 months.</label>}
            {fileError && <p role="alert" className="rounded-lg border border-rose-400/30 bg-rose-400/10 p-3 text-xs leading-relaxed text-rose-200">{fileError}</p>}
            {uploading && <div><div className="mb-1 flex justify-between text-xs text-[#AAB8BC]"><span>Uploading securely…</span><span>{uploadProgress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-[#0B0F10]"><div className="h-full bg-[#6FD8B0] transition-all" style={{ width: `${uploadProgress}%` }} /></div></div>}
            {insertRetry && <button type="button" disabled={uploading} onClick={() => void uploadFile(true)} className="w-full rounded-xl border border-amber-300/40 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-200">Retry submission record (do not upload again)</button>}
            <div className="flex gap-2"><button type="button" disabled={uploading} onClick={closeSheet} className="portal-btn-secondary flex-1">Cancel</button><button type="button" disabled={uploading || !selectedFile || (activeStep === 'proof_of_address' && !addressConfirmed)} onClick={() => void uploadFile()} className="portal-btn-primary flex-1">{uploading ? 'Submitting…' : 'Submit'}</button></div>
          </div>}
        </section>
      </div>}
    </div>
  );
};
