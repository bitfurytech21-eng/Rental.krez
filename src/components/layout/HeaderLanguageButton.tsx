import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { LanguageSelectorModal } from './LanguageSelectorModal';
import { ChevronDown } from 'lucide-react';

interface HeaderLanguageButtonProps {
  className?: string;
}

export const HeaderLanguageButton: React.FC<HeaderLanguageButtonProps> = ({
  className = '',
}) => {
  const { currentLanguageOption } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        aria-label="Select Language"
        title="Select Language"
        className={`px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-lg border border-[#1D3860] hover:border-[#BEE179] bg-[#0B1B30] hover:bg-[#122846] text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${className}`}
      >
        <span className="text-sm leading-none shrink-0">{currentLanguageOption.flag}</span>
        <span className="font-bold text-[#BEE179] text-xs truncate max-w-[70px] sm:max-w-[100px]">
          {currentLanguageOption.nativeName}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-[#BEE179] shrink-0" />
      </button>

      <LanguageSelectorModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};
