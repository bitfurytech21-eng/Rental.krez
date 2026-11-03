import React, { useState } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { KREZ_IMAGES } from '../../data/krezTemplateData';
import { useAuth } from '../../lib/auth';
import { contactApi } from '../../lib/api';
import { TurnstileWidget } from '../security/TurnstileWidget';
import { KrezImage, KrezReveal } from './KrezReveal';

const TOPICS = [
  'Question about a listed building',
  'How shares and SPV custody work',
  'Monthly rent payouts & tax statements',
  'Institutional or family office allocation',
  'General enquiry',
];

export const KrezContactPage: React.FC = () => {
  const { user } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [topic, setTopic] = useState(TOPICS[0]);
  const [message, setMessage] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    const cleanName = fullName.trim();
    const cleanEmail = email.trim();
    const cleanMsg = message.trim();

    if (cleanName.length < 2) {
      setError('Please enter your full name.');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (cleanMsg.length < 5) {
      setError('Please include a short message so we can direct your note.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await contactApi.submit({
        fullName: cleanName,
        email: cleanEmail,
        topic,
        message: cleanMsg,
        turnstileToken: turnstileToken || undefined,
      });
      setTicketId(res.data?.ticketId || 'SENT');
      setMessage('');
    } catch (err: any) {
      setError(err?.message || 'Unable to send your message right now. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="bg-background text-foreground">
      <section className="pt-header-offset pb-section-sm md:pb-section-spacing">
        <div className="mx-auto max-w-container px-gutter md:px-gutter-md lg:px-gutter-lg">
          <KrezReveal>
            <div className="max-w-2xl">
              <p className="text-xs font-semibold tracking-widest uppercase text-accent">
                Contact
              </p>
              <h1 className="mt-3 text-4xl font-heading font-bold tracking-tight uppercase text-foreground md:text-5xl">
                Ask us
                <br />
                anything
              </h1>
              <p className="mt-4 text-base leading-relaxed text-muted">
                Whether you want the lease schedule for a specific building or want to understand how monthly payouts settle, write to us directly.
              </p>
            </div>
          </KrezReveal>

          <div className="mt-12 grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-start">
            {/* Contact Form */}
            <KrezReveal>
              <div className="rounded-card border border-border bg-secondary/45 p-card-pad">
                {ticketId ? (
                  <div className="space-y-4 py-4">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-pill bg-primary text-white">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <h2 className="text-xl font-heading font-bold uppercase text-foreground">
                      Message received
                    </h2>
                    <p className="text-sm leading-relaxed text-muted">
                      Thank you, {fullName}. Your enquiry (ref.{' '}
                      <span className="font-mono text-foreground">{ticketId}</span>) has been delivered to our investor desk and we will reply to {email}.
                    </p>
                    <button
                      type="button"
                      onClick={() => setTicketId(null)}
                      className="text-xs font-semibold tracking-widest uppercase text-accent hover:text-foreground cursor-pointer"
                    >
                      Send another message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="krez-contact-name"
                          className="block text-xs font-semibold tracking-widest uppercase text-muted"
                        >
                          Full name
                        </label>
                        <input
                          id="krez-contact-name"
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Alex Morgan"
                          className="mt-2 w-full rounded-input border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="krez-contact-email"
                          className="block text-xs font-semibold tracking-widest uppercase text-muted"
                        >
                          Email
                        </label>
                        <input
                          id="krez-contact-email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@domain.com"
                          className="mt-2 w-full rounded-input border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="krez-contact-topic"
                        className="block text-xs font-semibold tracking-widest uppercase text-muted"
                      >
                        Topic
                      </label>
                      <select
                        id="krez-contact-topic"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        className="mt-2 w-full rounded-input border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none"
                      >
                        {TOPICS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="krez-contact-message"
                        className="block text-xs font-semibold tracking-widest uppercase text-muted"
                      >
                        Message
                      </label>
                      <textarea
                        id="krez-contact-message"
                        rows={5}
                        required
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Tell us what you would like to know..."
                        className="mt-2 w-full rounded-input border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none"
                      />
                    </div>

                    {!user && (
                      <TurnstileWidget
                        theme="light"
                        action="contact_desk"
                        onVerify={(tok) => setTurnstileToken(tok)}
                      />
                    )}

                    {error && (
                      <p className="rounded-input border border-red-300 bg-red-50 px-3.5 py-2.5 text-xs text-red-800" role="alert">
                        {error}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center gap-2 rounded-pill bg-primary px-7 py-3.5 text-xs font-semibold tracking-widest uppercase text-white transition-transform duration-fast hover:scale-hover active:scale-active disabled:opacity-50 cursor-pointer"
                    >
                      <span>{submitting ? 'Sending...' : 'Send message'}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </form>
                )}
              </div>
            </KrezReveal>

            {/* Direct Details Card */}
            <KrezReveal delay={0.08}>
              <aside className="overflow-hidden rounded-card bg-secondary">
                <div className="aspect-[16/10] overflow-hidden">
                  <KrezImage
                    src={KREZ_IMAGES.contactOffice}
                    alt="L'Agence investor desk reception"
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="space-y-5 p-card-pad">
                  <div>
                    <h2 className="text-xs font-semibold tracking-widest uppercase text-accent">
                      Direct details
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-muted">
                      Every enquiry goes straight to our investor relations team—never an automated queue.
                    </p>
                  </div>

                  <dl className="space-y-4 border-t border-border pt-4 text-sm">
                    <div>
                      <dt className="text-xs font-medium tracking-wider uppercase text-muted">
                        Email
                      </dt>
                      <dd className="mt-1 font-medium text-foreground">
                        <a
                          href="mailto:info@kretzdespain.com"
                          className="underline underline-offset-4 hover:text-accent"
                        >
                          info@kretzdespain.com
                        </a>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium tracking-wider uppercase text-muted">
                        Desks
                      </dt>
                      <dd className="mt-1 text-foreground">
                        Barcelona · Passeig de Gràcia
                        <br />
                        Paris · Boulogne-Billancourt
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium tracking-wider uppercase text-muted">
                        Hours
                      </dt>
                      <dd className="mt-1 text-muted">
                        Monday to Friday, 09:00 – 18:30 CET
                      </dd>
                    </div>
                  </dl>
                </div>
              </aside>
            </KrezReveal>
          </div>
        </div>
      </section>

      {/* Embedded Office Map */}
      <section aria-label="Office map" className="h-96 w-full overflow-hidden border-t border-border bg-secondary">
        <iframe
          title="L'Agence Investor Desk Location"
          src="https://www.openstreetmap.org/export/embed.html?bbox=2.1550%2C41.3870%2C2.1750%2C41.3990&layer=mapnik&marker=41.3932%2C2.1649"
          className="h-full w-full border-0 grayscale contrast-105"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </section>
    </main>
  );
};
