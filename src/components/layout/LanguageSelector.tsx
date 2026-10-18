import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { LanguageCode } from '../../types/language';
import { Globe, ChevronDown, Check, X } from 'lucide-react';

interface LanguageSelectorProps {
  variant?: 'floating' | 'footer' | 'mobile';
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ variant = 'floating' }) => {
  const { currentLanguage, currentLanguageOption, setLanguage, supportedLanguages } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectLanguage = (code: LanguageCode) => {
    setLanguage(code);
    setIsOpen(false);
  };

  if (variant === 'mobile') {
    return (
      <div className="w-full space-y-2">
        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block px-1">
          Select Interface Language / اللغة
        </label>
        <div className="grid grid-cols-2 gap-2">
          {supportedLanguages.map((lang) => {
            const isSelected = lang.code === currentLanguage;
            return (
              <button
                key={lang.code}
                onClick={() => handleSelectLanguage(lang.code)}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#182D2A] text-[#B7E36A] border-[#B7E36A]/50 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="text-base">{lang.flag}</span>
                  <span className="truncate">{lang.nativeName}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-[#B7E36A] shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (variant === 'footer') {
    return (
      <div className="relative inline-block text-left" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-label="Select Language"
          className="px-3 py-2 rounded-xl bg-[#0E1F1B] hover:bg-[#18302A] border border-[#23423B] text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs"
        >
          <Globe className="w-3.5 h-3.5 text-[#B7E36A]" />
          <span>{currentLanguageOption.flag}</span>
          <span className="font-medium text-slate-200">{currentLanguageOption.nativeName}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div
            className="absolute bottom-full left-0 mb-2 w-60 bg-[#0E201C] text-white border border-[#23423B] rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150 py-2"
          >
            <div className="px-3.5 py-1.5 border-b border-[#1E3832] text-[10px] font-bold uppercase tracking-wider text-[#A0B2AC] flex items-center justify-between">
              <span>Select Platform Language</span>
              <Globe className="w-3 h-3 text-[#B7E36A]" />
            </div>

            <div className="max-h-72 overflow-y-auto scrollbar-none py-1">
              {supportedLanguages.map((lang) => {
                const isSelected = lang.code === currentLanguage;
                return (
                  <button
                    key={lang.code}
                    onClick={() => handleSelectLanguage(lang.code)}
                    className={`w-full px-3.5 py-2 text-xs flex items-center justify-between hover:bg-[#18332D] transition-colors cursor-pointer text-left ${
                      isSelected ? 'bg-[#18332D] text-[#B7E36A] font-bold' : 'text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="text-base shrink-0">{lang.flag}</span>
                      <span className="truncate">{lang.nativeName}</span>
                      <span className="text-[10px] text-slate-400 font-normal">({lang.name})</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#B7E36A] shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Floating Bottom-Left Global Widget Variant
  return (
    <div className="fixed bottom-5 left-5 z-40 select-none" ref={dropdownRef}>
      {/* Floating Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label="Language Selector"
        className="group bg-[#0E201C] hover:bg-[#162D28] text-white p-2.5 sm:px-4 sm:py-3 rounded-full shadow-2xl border border-emerald-500/30 transition-all duration-300 flex items-center gap-2.5 cursor-pointer hover:scale-105"
        title="Select Language / تغيير اللغة"
      >
        <div className="w-7 h-7 rounded-full bg-[#18302A] border border-[#2B4E45] flex items-center justify-center text-sm shrink-0">
          {currentLanguageOption.flag}
        </div>
        <div className="hidden sm:flex flex-col text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black tracking-tight leading-none text-white uppercase font-mono">
              {currentLanguageOption.code}
            </span>
            <span className="text-[10px] font-bold text-[#B7E36A] leading-none">
              {currentLanguageOption.nativeName}
            </span>
          </div>
          <span className="text-[9px] text-slate-400 font-medium leading-tight mt-0.5">
            12 Languages Supported
          </span>
        </div>
        <Globe className="w-4 h-4 text-[#B7E36A] ml-0.5 shrink-0" />
      </button>

      {/* Floating Popup Menu */}
      {isOpen && (
        <div className="absolute bottom-full left-0 mb-3 w-64 sm:w-72 bg-[#0A1815] text-white border border-[#224039] rounded-3xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-3 duration-200 text-left">
          <div className="p-3.5 bg-[#122521] border-b border-[#203D37] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#B7E36A]" />
              <div>
                <h4 className="text-xs font-bold text-white leading-none">Select Language</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Real-time Website Translation</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-2 max-h-80 overflow-y-auto scrollbar-none grid grid-cols-1 gap-1">
            {supportedLanguages.map((lang) => {
              const isSelected = lang.code === currentLanguage;
              return (
                <button
                  key={lang.code}
                  onClick={() => handleSelectLanguage(lang.code)}
                  className={`w-full p-2.5 rounded-2xl text-xs flex items-center justify-between transition-colors cursor-pointer text-left ${
                    isSelected
                      ? 'bg-[#18332D] text-[#B7E36A] font-bold border border-[#2B544A]'
                      : 'hover:bg-[#122521] text-slate-200 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="text-lg shrink-0">{lang.flag}</span>
                    <div className="flex flex-col truncate">
                      <span className="font-bold text-xs truncate leading-tight">{lang.nativeName}</span>
                      <span className="text-[10px] text-slate-400 font-normal">{lang.name}</span>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-[#B7E36A] shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
