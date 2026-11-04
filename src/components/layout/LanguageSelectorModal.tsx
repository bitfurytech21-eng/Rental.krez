import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { SUPPORTED_LANGUAGES } from '../../types/language';
import { Globe, Search, X, Check } from 'lucide-react';

interface LanguageSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LanguageSelectorModal: React.FC<LanguageSelectorModalProps> = ({ isOpen, onClose }) => {
  const { currentLanguage, setLanguage } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filtered languages
  const filteredLanguages = useMemo(() => {
    if (!searchQuery.trim()) return SUPPORTED_LANGUAGES;
    const query = searchQuery.toLowerCase().trim();
    return SUPPORTED_LANGUAGES.filter(
      (lang) =>
        lang.name.toLowerCase().includes(query) ||
        lang.nativeName.toLowerCase().includes(query) ||
        lang.code.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[#0B1B30] text-slate-100 rounded-3xl shadow-2xl border border-[#1D3860] w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden text-left">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#102442] border-b border-[#1D3860] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#1D3860] text-[#BEE179] flex items-center justify-center border border-[#2B4E7E]">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#BEE179] leading-tight">Select Platform Language</h3>
              <p className="text-[11px] text-[#A2C2EC] mt-0.5">Instant free translation across 100+ languages</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-[#1D3860] text-[#A2C2EC] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-3 sm:p-4 bg-[#0B1B30] border-b border-[#1D3860] shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-[#A2C2EC] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search languages (e.g. Français, Spanish, Arabic, 中文)..."
              className="w-full pl-10 pr-8 py-2.5 rounded-xl bg-[#102442] border border-[#1D3860] text-white placeholder-[#8EA7C7] text-xs font-medium focus:outline-none focus:border-[#BEE179]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8EA7C7] hover:text-white text-xs font-bold"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Language Grid */}
        <div className="p-3 sm:p-4 overflow-y-auto max-h-[55vh] grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {filteredLanguages.map((lang) => {
            const isSelected = lang.code === currentLanguage;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => {
                  setLanguage(lang.code);
                  onClose();
                }}
                className={`p-2.5 rounded-xl text-left border flex items-center justify-between transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#1D3860] border-[#BEE179] text-[#BEE179] font-bold shadow-xs'
                    : 'bg-[#102442]/60 hover:bg-[#102442] border-[#1D3860]/70 text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate min-w-0">
                  <span className="text-lg shrink-0">{lang.flag}</span>
                  <div className="flex flex-col truncate min-w-0">
                    <span className="text-xs font-bold truncate leading-tight">{lang.nativeName}</span>
                    <span className="text-[10px] text-[#8EA7C7] font-normal truncate">{lang.name}</span>
                  </div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-[#BEE179] shrink-0 ml-1" />}
              </button>
            );
          })}

          {filteredLanguages.length === 0 && (
            <div className="col-span-full py-8 text-center text-[#8EA7C7] space-y-1">
              <p className="text-xs font-bold text-white">No language found for "{searchQuery}"</p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-xs text-[#BEE179] hover:underline cursor-pointer"
              >
                Show all languages
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-[#102442] border-t border-[#1D3860] flex items-center justify-between text-xs text-[#8EA7C7] shrink-0">
          <span className="text-[11px] font-semibold text-[#BEE179]">100+ Languages Supported</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#BEE179] hover:bg-[#AEDB5B] text-[#0B1B30] font-bold text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
