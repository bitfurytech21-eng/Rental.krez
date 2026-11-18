import React, { useEffect, useState } from 'react';
import { safeErrorMessage } from '../../lib/safeErrorMessage';
import { CheckCircle2, HelpCircle, Send } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../context/ToastContext';
import { usePortal } from '../state/PortalContext';
import { portalApi } from '../services/portalApi';
import { ErrorBanner } from '../components/LoadingSkeleton';
import { StatusBadge } from '../components/StatusBadge';

const SUPPORT_TOPICS = [
  'Portfolio & SPV Dossiers',
  'Deposits & SEPA Transfers',
  'Withdrawals & Payouts',
  'KYC & Compliance Verification',
  'Tax Statements & Reporting',
  'Technical Assistance',
];

interface SupportFieldErrors {
  fullName?: string;
  email?: string;
  message?: string;
}

export const SupportPage: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();
  const { profile, sampleDataEnabled, navigatePortal } = usePortal();

  const [fullName, setFullName] = useState(profile?.fullName || user?.fullName || '');
  const [email, setEmail] = useState(profile?.email || user?.email || '');
  const [topic, setTopic] = useState(SUPPORT_TOPICS[0]);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<SupportFieldErrors>({});
  const [ticketId, setTicketId] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.fullName && !fullName) setFullName(profile.fullName);
    if (profile?.email && !email) setEmail(profile.email);
  }, [profile, fullName, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const nextErrors: SupportFieldErrors = {};
    if (!fullName.trim()) {
      nextErrors.fullName = 'Enter your full name.';
    }
    const cleanEmail = email.trim();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      nextErrors.email = 'Enter a valid reply email address.';
    }
    if (message.trim().length < 10) {
      nextErrors.message =
        'Enter a message of at least 10 characters so our investor relations desk can assist you.';
    }

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    if (sampleDataEnabled) {
      setTicketId(`SAMPLE-SUP-${Math.floor(1000 + Math.random() * 9000)}`);
      setMessage('');
      toast.success('Sample inquiry logged (preview).');
      return;
    }

    setSubmitting(true);
    try {
      const res = await portalApi.submitSupportMessage({
        fullName: fullName.trim(),
        email: cleanEmail,
        topic,
        message: message.trim(),
      });
      setTicketId(res.ticketId || 'DISPATCHED');
      setMessage('');
      toast.success('Support inquiry submitted.');
    } catch (err: any) {
      setError(safeErrorMessage(err, 'Unable to submit your inquiry at this moment.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (ticketId) {
    return (
      <div className="max-w-xl portal-card space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="w-11 h-11 rounded-[14px] bg-[#6FD8B0]/12 border border-[#6FD8B0]/35 text-[#6FD8B0] flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <StatusBadge status="completed" />
        </div>
        <div>
          <h2 className="text-lg font-heading font-bold text-[#F2F5F4]">Inquiry received</h2>
          <p className="text-sm text-[#8FA1A8] mt-1 leading-relaxed">
            Our investor relations team has logged your request under reference{' '}
            <span className="text-[#F2F5F4] font-semibold portal-tabular">{ticketId}</span> and will respond via{' '}
            <span className="text-[#F2F5F4]">{email}</span>.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="button"
            onClick={() => setTicketId(null)}
            className="portal-btn-primary"
          >
            Send another inquiry
          </button>
          <button
            type="button"
            onClick={() => navigatePortal('overview')}
            className="portal-btn-secondary"
          >
            Back to overview
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      {error && <ErrorBanner message={error} />}

      <div className="portal-card space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-[14px] bg-[#0B0F10] border border-[#1F2C33] text-[#6FD8B0] flex items-center justify-center shrink-0">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#F2F5F4]">Investor Relations Desk</h2>
            <p className="text-xs text-[#8FA1A8] mt-0.5 leading-relaxed">
              Direct private client support for capital transfers, SPV legal documentation, and compliance reviews.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="support-name" className="block text-sm font-medium text-[#F2F5F4] mb-1.5">
                Full name
              </label>
              <input
                id="support-name"
                type="text"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (fieldErrors.fullName) setFieldErrors((p) => ({ ...p, fullName: undefined }));
                }}
                aria-invalid={Boolean(fieldErrors.fullName)}
                aria-describedby={fieldErrors.fullName ? 'support-name-error' : undefined}
                className={`portal-input ${fieldErrors.fullName ? '!border-[#FB7185]' : ''}`}
                placeholder="Investor full name"
              />
              {fieldErrors.fullName && (
                <p id="support-name-error" role="alert" className="text-xs text-[#FB7185] mt-1.5">
                  {fieldErrors.fullName}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="support-email" className="block text-sm font-medium text-[#F2F5F4] mb-1.5">
                Reply email
              </label>
              <input
                id="support-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
                }}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? 'support-email-error' : undefined}
                className={`portal-input ${fieldErrors.email ? '!border-[#FB7185]' : ''}`}
                placeholder="investor@domain.com"
              />
              {fieldErrors.email && (
                <p id="support-email-error" role="alert" className="text-xs text-[#FB7185] mt-1.5">
                  {fieldErrors.email}
                </p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="support-topic" className="block text-sm font-medium text-[#F2F5F4] mb-1.5">
              Subject
            </label>
            <select
              id="support-topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="portal-input"
            >
              {SUPPORT_TOPICS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="support-message" className="block text-sm font-medium text-[#F2F5F4] mb-1.5">
              Message
            </label>
            <textarea
              id="support-message"
              rows={5}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                if (fieldErrors.message) setFieldErrors((p) => ({ ...p, message: undefined }));
              }}
              aria-invalid={Boolean(fieldErrors.message)}
              aria-describedby={fieldErrors.message ? 'support-message-error' : undefined}
              className={`portal-input min-h-[130px] resize-y ${fieldErrors.message ? '!border-[#FB7185]' : ''}`}
              placeholder="Include transfer references, SPV property names, or compliance details if applicable."
            />
            {fieldErrors.message && (
              <p id="support-message-error" role="alert" className="text-xs text-[#FB7185] mt-1.5">
                {fieldErrors.message}
              </p>
            )}
          </div>

          <div className="pt-1 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-[#8FA1A8]">
              Average desk response within 1 business day
            </span>
            <button
              type="submit"
              disabled={submitting}
              className="portal-btn-primary"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? 'Sending...' : 'Submit inquiry'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
