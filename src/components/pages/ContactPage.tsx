import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle2, ShieldCheck, Loader2, ExternalLink } from 'lucide-react';
import { isValidEmail } from '../../lib/validation';
import { TurnstileWidget } from '../security/TurnstileWidget';
import { contactApi } from '../../lib/api';

export const ContactPage: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState('Investor Inquiries');
  const [message, setMessage] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
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
    if (!turnstileToken) {
      setError('Please complete the Cloudflare Turnstile human security verification check.');
      return;
    }

    setLoading(true);
    try {
      await contactApi.submit({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        topic,
        message: message.trim(),
        turnstileToken,
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit inquiry. Please complete the security check again.');
      setTurnstileToken(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#0B1B30] min-h-screen py-12 text-white">
      <div className="container max-w-5xl">
        <div className="max-w-2xl mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#102442] border border-[#1D3860] text-xs font-bold text-[#BEE179] mb-4 shadow-sm">
            <Mail className="w-4 h-4 text-[#BEE179]" />
            <span>Direct Investor Desk</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white mb-3 tracking-tight">
            Contact Kretz
          </h1>
          <p className="text-sm text-[#8EA7C7] leading-relaxed">
            Have a question regarding active offerings, institutional allocations, or luxury property developer partnerships? Reach out to our specialized team.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Details Card */}
          <div className="bg-[#102442] text-white p-8 rounded-3xl border border-[#1D3860] shadow-2xl space-y-6 flex flex-col justify-between">
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-black text-white mb-2">Corporate Headquarters</h3>
                <p className="text-xs text-[#8EA7C7]">
                  Kretz Real Estate S.L. · CIF B-84918239
                </p>
              </div>

              <div className="space-y-5 text-xs text-[#D1E2F7]">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-[#BEE179] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-white">Spain Office (Barcelona)</span>
                    <span className="text-[#D1E2F7] block mt-0.5">Carrer de Pau Claris, 139, Eixample, 08009 Barcelona, Spain</span>
                    <a
                      href="https://maps.google.com/maps/place//data=!4m2!3m1!1s0x12a4a3069490fcf7:0x3a4797b32e1a90ce?entry=s&sa=X&ved=2ahUKEwjuy4P6jcmXAxXyZkEAHSLXJk8Q4kB6BAgVEAA&hl=en"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[11px] text-[#BEE179] font-bold hover:underline mt-2"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>View Live Location on Google Maps</span>
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-[#BEE179] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-white">Official Contact Email</span>
                    <a href="mailto:info@kretz.site" className="text-[#BEE179] font-bold hover:underline mt-0.5 block">info@kretz.site</a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-[#BEE179] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-white">Investor Relations Hotline</span>
                    <span className="text-[#D1E2F7] block mt-0.5">+34 91 084 92 10 (Mon–Fri 09:00–18:00 CET)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0B1B30] border border-[#1D3860] text-[11px] text-[#8EA7C7] space-y-1">
              <div className="flex items-center gap-1.5 text-[#BEE179] font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>Security Assurance</span>
              </div>
              <p>
                Kretz staff will never ask for your passwords, private keys, or seed phrases.
              </p>
            </div>
          </div>

          {/* Inquiry Form */}
          <div className="lg:col-span-2 bg-[#102442] p-8 rounded-3xl border border-[#1D3860] shadow-2xl">
            {!submitted ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                <h3 className="text-xl font-black text-[#BEE179] mb-4">Send Us a Direct Message</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="form-field">
                    <label className="block text-xs font-bold text-[#BEE179] mb-1.5 uppercase tracking-wider">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Jane Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-[#0B1B30] border border-[#1D3860] text-white placeholder-[#8EA7C7] focus:border-[#BEE179] focus:outline-none focus:ring-1 focus:ring-[#BEE179] text-xs font-medium"
                    />
                  </div>
                  <div className="form-field">
                    <label className="block text-xs font-bold text-[#BEE179] mb-1.5 uppercase tracking-wider">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="jane@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-[#0B1B30] border border-[#1D3860] text-white placeholder-[#8EA7C7] focus:border-[#BEE179] focus:outline-none focus:ring-1 focus:ring-[#BEE179] text-xs font-medium"
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label className="block text-xs font-bold text-[#BEE179] mb-1.5 uppercase tracking-wider">Department / Subject</label>
                  <select
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[#0B1B30] border border-[#1D3860] text-white focus:border-[#BEE179] focus:outline-none focus:ring-1 focus:ring-[#BEE179] text-xs font-semibold"
                  >
                    <option value="Investor Inquiries" className="bg-[#102442] text-white">General Investor Support</option>
                    <option value="Property Developer Submissions" className="bg-[#102442] text-white">Property Developer / Seller Submission</option>
                    <option value="Institutional/Family Office Desk" className="bg-[#102442] text-white">Institutional / Family Office Allocation</option>
                    <option value="Compliance/KYC" className="bg-[#102442] text-white">KYC & Compliance Question</option>
                  </select>
                </div>

                <div className="form-field">
                  <label className="block text-xs font-bold text-[#BEE179] mb-1.5 uppercase tracking-wider">Message Content</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Describe your inquiry with relevant asset or investment details..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[#0B1B30] border border-[#1D3860] text-white placeholder-[#8EA7C7] focus:border-[#BEE179] focus:outline-none focus:ring-1 focus:ring-[#BEE179] text-xs font-medium"
                  />
                </div>

                {error && (
                  <div className="p-3.5 rounded-xl bg-red-950/60 text-red-200 text-xs font-medium border border-red-500/40">
                    {error}
                  </div>
                )}

                {/* Cloudflare Turnstile Human Verification Widget */}
                <div className="pt-2">
                  <TurnstileWidget
                    onVerify={(token) => {
                      setTurnstileToken(token);
                      setError(null);
                    }}
                    onExpire={() => setTurnstileToken(null)}
                    onError={(msg) => setError(msg)}
                    action="contact"
                    theme="dark"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !turnstileToken}
                  className="bg-[#BEE179] hover:bg-[#aed860] text-[#0B1B30] font-black text-xs px-8 py-3.5 rounded-xl transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Validating Security & Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit Inquiry</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="text-center py-12 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-[#0B1B30] text-[#BEE179] border border-[#1D3860] flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <h3 className="text-2xl font-black text-white">Message Successfully Dispatched</h3>
                <p className="text-xs text-[#8EA7C7] max-w-sm mx-auto">
                  Thank you, <strong className="text-white">{fullName}</strong>. An investor desk specialist will follow up with you at <strong className="text-[#BEE179]">{email}</strong> within 1 business day.
                </p>
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setMessage('');
                  }}
                  className="bg-[#0B1B30] hover:bg-[#132B4A] text-[#BEE179] border border-[#1D3860] font-bold text-xs px-6 py-2.5 rounded-xl transition-all mt-4 cursor-pointer"
                >
                  Send Another Inquiry
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Live Spain Office Google Map Card */}
        <div className="mt-10 bg-[#102442] rounded-3xl border border-[#1D3860] shadow-2xl overflow-hidden">
          <div className="p-6 sm:p-8 border-b border-[#1D3860] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-[#0B1B30] text-[#BEE179] border border-[#1D3860] flex items-center justify-center shrink-0 shadow-sm">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white">Kretz Spain Office · Barcelona</h3>
                  <span className="text-[10px] font-bold bg-[#0B1B30] text-[#BEE179] px-2.5 py-0.5 rounded-full border border-[#1D3860]">
                    Live Location
                  </span>
                </div>
                <p className="text-xs text-[#8EA7C7] mt-0.5">
                  Carrer de Pau Claris, 139, Eixample, 08009 Barcelona, Spain
                </p>
              </div>
            </div>
            <a
              href="https://maps.google.com/maps/place//data=!4m2!3m1!1s0x12a4a3069490fcf7:0x3a4797b32e1a90ce?entry=s&sa=X&ved=2ahUKEwjuy4P6jcmXAxXyZkEAHSLXJk8Q4kB6BAgVEAA&hl=en"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0B1B30] hover:bg-[#132B4A] text-white text-xs font-bold transition-all border border-[#1D3860] shadow-sm cursor-pointer shrink-0"
            >
              <span>Open in Google Maps</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#BEE179]" />
            </a>
          </div>
          <div className="w-full h-80 sm:h-96 relative bg-[#0B1B30]">
            <iframe
              title="Kretz Spain Office Location"
              src="https://maps.google.com/maps?q=Carrer+de+Pau+Claris,+139,+08009+Barcelona,+Spain&t=&z=16&ie=UTF8&iwloc=&output=embed"
              className="w-full h-full border-0 grayscale contrast-125 opacity-90"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
