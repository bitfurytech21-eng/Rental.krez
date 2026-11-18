import React from 'react';
import termsText from '../../content/legal/terms.md?raw';
import privacyText from '../../content/legal/privacy.md?raw';
import riskWarningText from '../../content/legal/risk-warning.md?raw';

export type PublicLegalDocument = 'terms' | 'privacy' | 'risk-warning';

const DOCUMENTS: Record<PublicLegalDocument, { title: string; content: string }> = {
  terms: { title: 'Terms & Conditions', content: termsText },
  privacy: { title: 'Privacy Policy', content: privacyText },
  'risk-warning': { title: 'Risk Warning', content: riskWarningText },
};

interface PublicLegalDocumentPageProps {
  document: PublicLegalDocument;
}

export const PublicLegalDocumentPage: React.FC<PublicLegalDocumentPageProps> = ({ document }) => {
  const selected = DOCUMENTS[document];

  return (
    <main className="min-h-[70vh] bg-[#F5F3EE] py-12 sm:py-16">
      <article className="mx-auto max-w-4xl px-4 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8A704E]">
          L'Agence · Legal information
        </p>
        <h1 className="mt-3 text-3xl sm:text-4xl font-heading font-bold text-[#171717]">
          {selected.title}
        </h1>
        <div className="mt-8 rounded-xl border border-[#C5A880]/50 bg-white p-6 sm:p-8 shadow-sm">
          <p className="mb-4 text-xs font-bold uppercase tracking-wider text-amber-800">
            Awaiting approved content
          </p>
          <div className="whitespace-pre-wrap break-words text-sm leading-7 text-[#292929]">
            {selected.content.trim() || '[Replace with approved text]'}
          </div>
        </div>
      </article>
    </main>
  );
};
