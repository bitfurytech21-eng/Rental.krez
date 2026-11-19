import React from 'react';
import {
  AlertTriangle,
  BookOpen,
  Building2,
  FileText,
  Printer,
  ShieldCheck,
} from 'lucide-react';
import termsText from '../../content/legal/terms.md?raw';
import privacyText from '../../content/legal/privacy.md?raw';
import riskWarningText from '../../content/legal/risk-warning.md?raw';
import { COMPANY_REGISTRATION } from '../../data/institutionalConfig';

export type PublicLegalDocument = 'terms' | 'privacy' | 'risk-warning';

interface DocumentMeta {
  title: string;
  subtitle: string;
  version: string;
  effectiveDate: string;
  content: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeClass: string;
  badgeText: string;
}

const DOCUMENTS: Record<PublicLegalDocument, DocumentMeta> = {
  terms: {
    title: 'Terms & Conditions',
    subtitle:
      'Platform access, investor onboarding, SPV subscriptions, assigned payment rails, and governing legal terms.',
    version: 'v2.4',
    effectiveDate: 'March 1, 2026',
    content: termsText,
    icon: FileText,
    badgeClass: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    badgeText: 'Effective Platform Terms',
  },
  privacy: {
    title: 'Privacy Policy',
    subtitle:
      'Personal data processing, lawful bases under EU GDPR (Regulation 2016/679), statutory AML retention, and your rights.',
    version: 'v2.2',
    effectiveDate: 'March 1, 2026',
    content: privacyText,
    icon: ShieldCheck,
    badgeClass: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    badgeText: 'GDPR Compliant Notice',
  },
  'risk-warning': {
    title: 'Risk Warning',
    subtitle:
      'Essential pre-investment disclosures covering capital loss, illiquidity, rental variability, SPV, and digital-asset risks.',
    version: 'v2.5',
    effectiveDate: 'March 1, 2026',
    content: riskWarningText,
    icon: AlertTriangle,
    badgeClass: 'bg-amber-50 text-amber-950 border-amber-200',
    badgeText: 'Mandatory Risk Disclosure',
  },
};

const QUICK_LINKS: Array<{ label: string; path: string; doc?: PublicLegalDocument }> = [
  { label: 'Terms & Conditions', path: '/terms', doc: 'terms' },
  { label: 'Privacy Policy', path: '/privacy', doc: 'privacy' },
  { label: 'Risk Warning', path: '/risk-warning', doc: 'risk-warning' },
  { label: 'Cookie Policy', path: '/cookies' },
  { label: 'Full Legal Centre (12 Docs)', path: '/legal' },
];

interface PublicLegalDocumentPageProps {
  document: PublicLegalDocument;
  onNavigate?: (path: string) => void;
}

function renderInlineMarkdown(
  text: string,
  onNavigate?: (path: string) => void
): React.ReactNode[] {
  const tokenRegex =
    /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|https?:\/\/[^\s)]+|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    const key = `${match.index}-${token.slice(0, 12)}`;

    if (token.startsWith('**') && token.endsWith('**')) {
      nodes.push(
        <strong key={key} className="font-semibold text-[#171717]">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      nodes.push(
        <em key={key} className="italic">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      const codeContent = token.slice(1, -1);
      if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(codeContent)) {
        nodes.push(
          <a
            key={key}
            href={`mailto:${codeContent}`}
            className="font-medium text-[#1E3A34] underline decoration-[#C5A880] underline-offset-4 hover:text-[#8A704E]"
          >
            {codeContent}
          </a>
        );
      } else if (/^https?:\/\//.test(codeContent)) {
        nodes.push(
          <a
            key={key}
            href={codeContent}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[#1E3A34] underline decoration-[#C5A880] underline-offset-4 hover:text-[#8A704E]"
          >
            {codeContent}
          </a>
        );
      } else {
        nodes.push(
          <code
            key={key}
            className="rounded bg-[#F5F3EE] px-1.5 py-0.5 font-mono text-[0.85em] text-[#18211F]"
          >
            {codeContent}
          </code>
        );
      }
    } else if (token.startsWith('[')) {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        const [, label, href] = linkMatch;
        const isInternal = href.startsWith('/');
        if (isInternal && onNavigate) {
          nodes.push(
            <button
              key={key}
              type="button"
              onClick={() => onNavigate(href)}
              className="font-semibold text-[#1E3A34] underline decoration-[#C5A880] underline-offset-4 hover:text-[#8A704E] cursor-pointer"
            >
              {label}
            </button>
          );
        } else {
          nodes.push(
            <a
              key={key}
              href={href}
              target={isInternal ? undefined : '_blank'}
              rel={isInternal ? undefined : 'noopener noreferrer'}
              className="font-semibold text-[#1E3A34] underline decoration-[#C5A880] underline-offset-4 hover:text-[#8A704E]"
            >
              {label}
            </a>
          );
        }
      } else {
        nodes.push(token);
      }
    } else if (token.startsWith('http://') || token.startsWith('https://')) {
      nodes.push(
        <a
          key={key}
          href={token}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-[#1E3A34] underline decoration-[#C5A880] underline-offset-4 hover:text-[#8A704E] break-all"
        >
          {token}
        </a>
      );
    } else if (token.includes('@')) {
      nodes.push(
        <a
          key={key}
          href={`mailto:${token}`}
          className="font-medium text-[#1E3A34] underline decoration-[#C5A880] underline-offset-4 hover:text-[#8A704E]"
        >
          {token}
        </a>
      );
    } else {
      nodes.push(token);
    }

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

const MarkdownDocumentBody: React.FC<{
  markdown: string;
  onNavigate?: (path: string) => void;
}> = ({ markdown, onNavigate }) => {
  const blocks = markdown
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  return (
    <div className="space-y-5 text-sm sm:text-[15px] leading-7 text-[#37413E]">
      {blocks.map((block, idx) => {
        if (block === '---' || block === '***') {
          return <hr key={idx} className="my-6 border-[#EBE6DC]" />;
        }

        if (block.startsWith('## ')) {
          return (
            <h2
              key={idx}
              className="pt-2 font-heading text-xl sm:text-2xl font-bold text-[#171717] tracking-tight"
            >
              {block.slice(3).trim()}
            </h2>
          );
        }

        if (block.startsWith('### ')) {
          return (
            <h3
              key={idx}
              className="pt-1 font-heading text-base sm:text-lg font-bold text-[#18211F]"
            >
              {block.slice(4).trim()}
            </h3>
          );
        }

        const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);

        if (lines.every((l) => /^[-*]\s+/.test(l))) {
          return (
            <ul key={idx} className="space-y-2.5 pl-5 list-disc marker:text-[#9A7B4F]">
              {lines.map((line, li) => (
                <li key={li} className="leading-relaxed">
                  {renderInlineMarkdown(line.replace(/^[-*]\s+/, ''), onNavigate)}
                </li>
              ))}
            </ul>
          );
        }

        if (lines.every((l) => /^\d+\.\s+/.test(l))) {
          return (
            <ol key={idx} className="space-y-2.5 pl-5 list-decimal marker:font-semibold marker:text-[#8A704E]">
              {lines.map((line, li) => (
                <li key={li} className="leading-relaxed">
                  {renderInlineMarkdown(line.replace(/^\d+\.\s+/, ''), onNavigate)}
                </li>
              ))}
            </ol>
          );
        }

        return (
          <p key={idx} className="leading-7">
            {renderInlineMarkdown(lines.join(' '), onNavigate)}
          </p>
        );
      })}
    </div>
  );
};

export const PublicLegalDocumentPage: React.FC<PublicLegalDocumentPageProps> = ({
  document,
  onNavigate,
}) => {
  const selected = DOCUMENTS[document];
  const Icon = selected.icon;

  const handleLinkClick = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
      return;
    }
    window.location.assign(path);
  };

  return (
    <main className="min-h-[75vh] bg-[#F5F3EE] py-10 sm:py-16">
      <article className="mx-auto max-w-4xl px-4 sm:px-6 space-y-6">
        {/* Document Switcher */}
        <nav
          aria-label="Legal documents navigation"
          className="flex flex-wrap items-center gap-2"
        >
          {QUICK_LINKS.map((item) => {
            const isActive = item.doc === document;
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => handleLinkClick(item.path)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#18211F] text-[#F5F3EE] shadow-xs'
                    : 'bg-white text-[#4A5854] border border-[#DFD8CA] hover:border-[#C5A880] hover:text-[#171717]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Header Card */}
        <header className="rounded-2xl border border-[#DFD8CA] bg-white p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#8A704E]">
                  <Icon className="w-3.5 h-3.5" />
                  <span>{COMPANY_REGISTRATION.operatingBrand}</span>
                </span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-md border text-[11px] font-bold ${selected.badgeClass}`}
                >
                  {selected.badgeText}
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-heading font-bold text-[#171717] tracking-tight">
                {selected.title}
              </h1>

              <p className="text-sm text-[#52605C] leading-relaxed max-w-2xl">
                {selected.subtitle}
              </p>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 self-start shrink-0 rounded-xl border border-[#DFD8CA] bg-[#FAF8F4] px-3.5 py-2 text-xs font-bold text-[#18211F] hover:bg-[#F1ECE2] transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-[#8A704E]" />
              <span>Print</span>
            </button>
          </div>

          <div className="pt-4 border-t border-[#EEE9DF] flex flex-wrap items-center justify-between gap-3 text-xs text-[#52605C]">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px]">
              <span>Version {selected.version}</span>
              <span>·</span>
              <span>Effective {selected.effectiveDate}</span>
              <span>·</span>
              <span>SIREN {COMPANY_REGISTRATION.siren}</span>
              <span>·</span>
              <span>VAT {COMPANY_REGISTRATION.vatIdentificationNumber}</span>
            </div>

            <button
              type="button"
              onClick={() => handleLinkClick('/legal')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1E3A34] hover:text-[#8A704E] cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Open 12-Document Legal Centre</span>
            </button>
          </div>
        </header>

        {/* Document Body */}
        <section className="rounded-2xl border border-[#DFD8CA] bg-white p-6 sm:p-10 shadow-xs">
          <MarkdownDocumentBody markdown={selected.content} onNavigate={handleLinkClick} />

          {/* Corporate Registry Footer */}
          <footer className="mt-10 pt-6 border-t border-[#EEE9DF] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#52605C]">
            <div className="inline-flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#8A704E] shrink-0" />
              <span>
                {COMPANY_REGISTRATION.legalEntityLabel} · {COMPANY_REGISTRATION.rcs} · SIRET{' '}
                {COMPANY_REGISTRATION.siret}
              </span>
            </div>
            <div>
              Legal &amp; Compliance Desk:{' '}
              <a
                href={`mailto:${COMPANY_REGISTRATION.complianceEmail}`}
                className="font-semibold text-[#1E3A34] underline decoration-[#C5A880] underline-offset-4 hover:text-[#8A704E]"
              >
                {COMPANY_REGISTRATION.complianceEmail}
              </a>
            </div>
          </footer>
        </section>
      </article>
    </main>
  );
};
