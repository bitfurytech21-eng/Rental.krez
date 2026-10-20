import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { SUPPORTED_LANGUAGES, LanguageOption } from '../../types/language';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white text-slate-800 rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden text-left">
        {/* Simple Header */}
        <div className="p-4 sm:p-5 bg-[#F8FAF8] border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 leading-tight">Select Language</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Choose your preferred browser language</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-200/70 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-3 sm:p-4 bg-white border-b border-slate-100 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search languages (e.g. Français, Spanish, Arabic, 中文)..."
              className="w-full pl-10 pr-8 py-2.5 rounded-xl bg-[#F6F8F6] border border-slate-200 text-slate-800 placeholder-slate-400 text-xs font-medium focus:outline-none focus:border-emerald-600 focus:bg-white"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-bold"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Simple Language List */}
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
                    ? 'bg-emerald-50 border-emerald-600 text-emerald-950 font-bold shadow-2xs'
                    : 'bg-white hover:bg-slate-50 border-slate-200/80 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate min-w-0">
                  <span className="text-lg shrink-0">{lang.flag}</span>
                  <div className="flex flex-col truncate min-w-0">
                    <span className="text-xs font-bold truncate leading-tight">{lang.nativeName}</span>
                    <span className="text-[10px] text-slate-500 font-normal truncate">{lang.name}</span>
                  </div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-emerald-700 shrink-0 ml-1" />}
              </button>
            );
          })}

          {filteredLanguages.length === 0 && (
            <div className="col-span-full py-8 text-center text-slate-400 space-y-1">
              <p className="text-xs font-bold text-slate-600">No language found for "{searchQuery}"</p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-xs text-emerald-700 hover:underline"
              >
                Show all languages
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-[#F8FAF8] border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span className="text-[11px]">100+ Supported Languages</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
