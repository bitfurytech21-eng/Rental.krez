import React, { useMemo, useState } from 'react';
import {
  KREZ_JOURNAL_TOPICS,
  KrezJournalPost,
  formatJournalDate,
  getJournalPosts,
  publishJournalPost,
} from '../../data/krezTemplateData';
import { useAuth } from '../../lib/auth';
import { KrezReveal } from './KrezReveal';

interface KrezJournalPageProps {
  onNavigate: (path: string) => void;
}

export const KrezJournalPage: React.FC<KrezJournalPageProps> = () => {
  const { isAdmin } = useAuth();
  const [posts, setPosts] = useState<KrezJournalPost[]>(() => getJournalPosts());
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Admin publisher state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<KrezJournalPost['category']>('buildings');
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState('');
  const [publishNotice, setPublishNotice] = useState<string | null>(null);

  const filteredPosts = useMemo(() => {
    if (activeCategory === 'all') return posts;
    return posts.filter((p) => p.category === activeCategory);
  }, [posts, activeCategory]);

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !summary.trim() || !body.trim()) return;
    publishJournalPost({
      title,
      category,
      summary,
      body,
    });
    setPosts(getJournalPosts());
    setTitle('');
    setSummary('');
    setBody('');
    setPublishNotice('Update published to the investor journal.');
  };

  return (
    <main className="bg-[#F7F5F0] text-[#1C2420]">
      <section className="pt-header-offset pb-section-sm md:pb-section-spacing">
        <div className="mx-auto max-w-container px-gutter md:px-gutter-md lg:px-gutter-lg">
          <KrezReveal>
            <div className="max-w-2xl">
              <p className="text-xs font-semibold tracking-widest uppercase text-accent">
                Investor journal
              </p>
              <h1 className="mt-3 text-4xl font-heading font-bold tracking-tight uppercase text-foreground md:text-5xl">
                News from
                <br />
                the buildings
              </h1>
              <p className="mt-4 text-base leading-relaxed text-muted">
                Funding milestones, scheduled independent valuations, and monthly rental distribution notes across every listed property.
              </p>
            </div>
          </KrezReveal>

          {/* Admin Publisher */}
          {isAdmin && (
            <div className="mt-10 rounded-card border border-border bg-secondary/55 p-card-pad">
              <p className="text-xs font-semibold tracking-widest uppercase text-accent">
                Administrator dispatch
              </p>
              <h2 className="mt-2 text-xl font-heading font-bold uppercase text-foreground">
                Write a new update
              </h2>

              <form onSubmit={handlePublish} className="mt-5 space-y-4">
                <div className="grid gap-4 sm:grid-cols-[1.5fr_1fr]">
                  <div>
                    <label
                      htmlFor="krez-j-title"
                      className="block text-xs font-semibold tracking-widest uppercase text-muted"
                    >
                      Headline
                    </label>
                    <input
                      id="krez-j-title"
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Q3 Rent Distribution Settled Across All Buildings"
                      className="mt-2 w-full rounded-input border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="krez-j-cat"
                      className="block text-xs font-semibold tracking-widest uppercase text-muted"
                    >
                      Topic
                    </label>
                    <select
                      id="krez-j-cat"
                      value={category}
                      onChange={(e) =>
                        setCategory(e.target.value as KrezJournalPost['category'])
                      }
                      className="mt-2 w-full rounded-input border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none"
                    >
                      {KREZ_JOURNAL_TOPICS.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="krez-j-summary"
                    className="block text-xs font-semibold tracking-widest uppercase text-muted"
                  >
                    Summary
                  </label>
                  <input
                    id="krez-j-summary"
                    type="text"
                    required
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="One-sentence summary shown on cards..."
                    className="mt-2 w-full rounded-input border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="krez-j-body"
                    className="block text-xs font-semibold tracking-widest uppercase text-muted"
                  >
                    Full note
                  </label>
                  <textarea
                    id="krez-j-body"
                    rows={4}
                    required
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Detailed building figures, occupancy notes, and ledger summary..."
                    className="mt-2 w-full rounded-input border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                {publishNotice && (
                  <p className="text-xs font-medium text-primary" role="status">
                    {publishNotice}
                  </p>
                )}

                <button
                  type="submit"
                  className="rounded-pill bg-primary px-6 py-3 text-xs font-semibold tracking-widest uppercase text-white transition-transform duration-fast hover:scale-hover active:scale-active cursor-pointer"
                >
                  Publish update
                </button>
              </form>
            </div>
          )}

          {/* Topic Filters */}
          <div className="mt-10 flex flex-wrap items-center gap-2 border-b border-border pb-5">
            <button
              type="button"
              onClick={() => setActiveCategory('all')}
              className={`rounded-pill px-4 py-2 text-xs font-medium tracking-wider uppercase transition-colors duration-fast cursor-pointer ${
                activeCategory === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-secondary text-foreground hover:bg-border'
              }`}
            >
              All
            </button>
            {KREZ_JOURNAL_TOPICS.map((topic) => (
              <button
                key={topic.id}
                type="button"
                onClick={() => setActiveCategory(topic.id)}
                className={`rounded-pill px-4 py-2 text-xs font-medium tracking-wider uppercase transition-colors duration-fast cursor-pointer ${
                  activeCategory === topic.id
                    ? 'bg-primary text-white'
                    : 'bg-secondary text-foreground hover:bg-border'
                }`}
              >
                {topic.label}
              </button>
            ))}
          </div>

          {/* 2-Column Journal Feed */}
          <div className="mt-10 grid gap-gutter md:grid-cols-2 md:gap-gutter-md">
            {filteredPosts.map((post, idx) => {
              const isExpanded = expandedId === post.id;
              return (
                <KrezReveal key={post.id} delay={(idx % 2) * 0.05}>
                  <article className="flex h-full flex-col justify-between rounded-card border border-border bg-secondary/45 p-card-pad">
                    <div>
                      <div className="flex items-center justify-between gap-2 text-xs text-muted">
                        <span className="font-semibold tracking-widest uppercase text-accent">
                          {post.category}
                        </span>
                        <span>{formatJournalDate(post.publishedDate)}</span>
                      </div>
                      <h2 className="mt-4 text-xl font-heading font-semibold leading-snug text-foreground">
                        {post.title}
                      </h2>
                      <p className="mt-3 text-sm leading-relaxed text-muted">
                        {post.summary}
                      </p>

                      {isExpanded && (
                        <div className="mt-4 space-y-3 border-t border-border pt-4 text-sm leading-relaxed text-foreground">
                          {post.body.split('\n\n').map((para, pIdx) => (
                            <p key={pIdx}>{para}</p>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : post.id)}
                      aria-expanded={isExpanded}
                      className="mt-6 self-start text-xs font-semibold tracking-widest uppercase text-foreground underline underline-offset-4 transition-colors duration-fast hover:text-accent cursor-pointer"
                    >
                      {isExpanded ? 'Hide full note' : 'Read full note'}
                    </button>
                  </article>
                </KrezReveal>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
};
