import React, { useEffect, useState } from 'react';
import { CheckCircle2, HelpCircle, Send } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { usePortal } from '../state/PortalContext';
import { portalApi } from '../services/portalApi';
import { ErrorBanner } from '../components/LoadingSkeleton';

const SUPPORT_TOPICS = [
  'Portfolio & SPV Dossiers',
  'Deposits & SEPA Transfers',
  'Withdrawals & Payouts',
  'KYC & Compliance Verification',
  'Tax Statements & Reporting',
  'Technical Assistance',
];

export const SupportPage: React.FC = () => {
  const { user } = useAuth();
  const { profile, navigatePortal } = usePortal();

  const [fullName, setFullName] = useState(profile?.fullName || user?.fullName || '');
  const [email, setEmail] = useState(profile?.email || user?.email || '');
  const [topic, setTopic] = useState(SUPPORT_TOPICS[0]);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.fullName && !fullName) setFullName(profile.fullName);
    if (profile?.email && !email) setEmail(profile.email);
  }, [profile, fullName, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !email.trim()) {
      setError('Please provide your full name and email address.');
      return;
    }
    if (message.trim().length < 10) {
      setError('Please enter a message of at least 10 characters so our investor relations desk can assist you.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await portalApi.submitSupportMessage({
        fullName: fullName.trim(),
        email: email.trim(),
        topic,
        message: message.trim(),
      });
      setTicketId(res.ticketId || 'DISPATCHED');
      setMessage('');
    } catch (err: any) {
      setError(err?.message || 'Unable to submit your inquiry at this moment.');
    } finally {
      setSubmitting(false);
    }
  };

  if (ticketId) {
    return (
      <div className="max-w-xl portal-card p-6 space-y-4">
        <div className="w-11 h-11 rounded-xl bg-[#152E54] border border-[#34D399]/40 text-[#34D399] flex items-center justify-center">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-heading font-bold text-white">Inquiry received</h2>
          <p className="text-sm text-[#8EA7C7] mt-1 leading-relaxed">
            Our investor relations team has logged your request under reference{' '}
            <span className="text-white font-semibold portal-tabular">{ticketId}</span> and will respond via{' '}
            <span className="text-white">{email}</span>.
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

      <div className="portal-card p-5 sm:p-6 space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#152E54] border border-[#1D3860] text-[#C5A880] flex items-center justify-center shrink-0">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Investor Relations Desk</h2>
            <p className="text-xs text-[#8EA7C7] mt-0.5 leading-relaxed">
              Direct private client support for capital transfers, SPV legal documentation, and compliance reviews.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-[#8EA7C7]">Full name</span>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="portal-input"
                placeholder="Investor full name"
                required
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-[#8EA7C7]">Reply email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="portal-input"
                placeholder="investor@domain.com"
                required
              />
            </label>
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-[#8EA7C7]">Subject</span>
            <select
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
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-[#8EA7C7]">Message</span>
            <textarea
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="portal-input min-h-[130px] resize-y"
              placeholder="Include transfer references, SPV property names, or compliance details if applicable."
              required
            />
          </label>

          <div className="pt-1 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-[#8EA7C7]">
              Average desk response within 1 business day
            </span>
            <button
              type="submit"
              disabled={submitting}
              className="portal-btn-primary"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? 'Sending…' : 'Submit inquiry'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
