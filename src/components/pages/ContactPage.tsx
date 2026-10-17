import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle2, ShieldCheck } from 'lucide-react';
import { isValidEmail } from '../../lib/validation';

export const ContactPage: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState('Investor Inquiries');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isValidEmail(email)) {
      setError('Please provide a valid contact email address.');
      return;
    }
    if (message.trim().length < 10) {
      setError('Please provide a descriptive inquiry message (min 10 characters).');
      return;
    }

    setSubmitted(true);
  };

  return (
    <div className="bg-[#F6F7F4] min-h-screen py-12">
      <div className="container max-w-5xl">
        <div className="max-w-2xl mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#E3E8E3] text-xs font-semibold text-[#182D2A] mb-3">
            <Mail className="w-3.5 h-3.5 text-[#27845D]" />
            <span>Direct Investor Desk</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-[#18211F] mb-3">
            Contact Kretz
          </h1>
          <p className="text-sm text-[#69736F]">
            Have a question regarding active offerings, institutional allocations, or luxury property developer partnerships? Reach out to our specialized team.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Details Card */}
          <div className="bg-[#182D2A] text-white p-8 rounded-3xl shadow-xl space-y-6 flex flex-col justify-between">
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Corporate Headquarters</h3>
                <p className="text-xs text-[#A0A8A5]">
                  Kretz Real Estate S.L. · CIF B-84918239
                </p>
              </div>

              <div className="space-y-4 text-xs text-[#EEF1EC]">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-[#B7E36A] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-white">Madrid Office</span>
                    <span>Paseo de la Castellana 95, 28046 Madrid, Spain</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-[#B7E36A] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-white">Official Contact Email</span>
                    <a href="mailto:info@kretz.site" className="text-[#B7E36A] font-bold hover:underline">info@kretz.site</a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-[#B7E36A] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-white">Investor Relations Hotline</span>
                    <span>+34 91 084 92 10 (Mon–Fri 09:00–18:00 CET)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#24423C] border border-[#2e544c] text-[11px] text-[#A0A8A5] space-y-1">
              <div className="flex items-center gap-1.5 text-[#B7E36A] font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>Security Assurance</span>
              </div>
              <p>
                Kretz staff will never ask for your passwords, private keys, or seed phrases.
              </p>
            </div>
          </div>

          {/* Inquiry Form */}
          <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-[#E3E8E3] shadow-sm">
            {!submitted ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h3 className="text-xl font-bold text-[#18211F] mb-4">Send Us a Direct Message</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="form-field">
                    <label>Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Jane Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label>Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="jane@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label>Department / Subject</label>
                  <select
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  >
                    <option value="Investor Inquiries">General Investor Support</option>
                    <option value="Property Developer Submissions">Property Developer / Seller Submission</option>
                    <option value="Institutional/Family Office Desk">Institutional / Family Office Allocation</option>
                    <option value="Compliance/KYC">KYC & Compliance Question</option>
                  </select>
                </div>

                <div className="form-field">
                  <label>Message Content</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Describe your inquiry with relevant asset or investment details..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-medium border border-red-200">
                    {error}
                  </div>
                )}

                <button type="submit" className="btn btn-primary text-xs font-bold px-8">
                  <Send className="w-4 h-4 mr-1.5" />
                  Submit Inquiry
                </button>
              </form>
            ) : (
              <div className="text-center py-12 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-green-50 text-[#27845D] flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <h3 className="text-2xl font-bold text-[#18211F]">Message Successfully Dispatched</h3>
                <p className="text-xs text-[#69736F] max-w-sm mx-auto">
                  Thank you, <strong>{fullName}</strong>. An investor desk specialist will follow up with you at <strong>{email}</strong> within 1 business day.
                </p>
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setMessage('');
                  }}
                  className="btn btn-secondary btn-sm text-xs mt-4"
                >
                  Send Another Inquiry
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
