import React from 'react';
import { LegalFrameworkView } from '../legal/LegalFrameworkView';

interface LegalPageProps {
  mode?: 'terms' | 'privacy' | 'cookies' | 'disclosures' | 'framework';
  initialDocSlug?: string;
  onNavigateTrust?: () => void;
}

export const LegalPage: React.FC<LegalPageProps> = ({
  mode = 'terms',
  initialDocSlug,
  onNavigateTrust,
}) => {
  const resolvedSlug =
    initialDocSlug ||
    (mode === 'privacy'
      ? 'privacy-policy'
      : mode === 'cookies'
      ? 'cookie-policy'
      : mode === 'disclosures'
      ? 'risk-disclosure-statement'
      : 'terms-and-conditions');

  return (
    <div className="bg-[#F6F9F8] min-h-screen py-10 sm:py-14">
      <div className="container max-w-[1240px] mx-auto px-4 sm:px-6">
        <LegalFrameworkView
          mode="full"
          initialDocSlug={resolvedSlug}
          onNavigateTrust={onNavigateTrust}
        />
      </div>
    </div>
  );
};
