import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { LanguageSelectorModal } from './LanguageSelectorModal';
import { Globe, ChevronDown } from 'lucide-react';

interface HeaderLanguageButtonProps {
  className?: string;
  variant?: 'navbar' | 'mobile' | 'footer';
}

export const HeaderLanguageButton: React.FC<HeaderLanguageButtonProps> = ({
  className = '',
  variant = 'footer',
}) => {
  const { currentLanguageOption } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        aria-label="Select Language"
        className={`px-3 py-1.5 rounded-lg border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${className}`}
      >
        <Globe className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
        <span className="text-sm leading-none shrink-0">{currentLanguageOption.flag}</span>
        <span className="font-semibold text-slate-800 text-xs truncate max-w-[100px]">
          {currentLanguageOption.nativeName}
        </span>
        <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
      </button>

      <LanguageSelectorModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};
