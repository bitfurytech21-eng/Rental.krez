import React from 'react';
import { LegalFrameworkView } from '../legal/LegalFrameworkView';

interface LegalPageProps {
  mode?: 'terms' | 'privacy' | 'framework';
}

export const LegalPage: React.FC<LegalPageProps> = () => {
  return (
    <div className="bg-[#F8FAFC] min-h-screen py-10">
      <div className="container max-w-5xl">
        <LegalFrameworkView mode="full" />
      </div>
    </div>
  );
};
