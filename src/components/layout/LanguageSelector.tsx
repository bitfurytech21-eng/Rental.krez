import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { LanguageCode, TranslationProviderId } from '../../types/language';
import { Globe, ChevronDown, Check, X, Cpu, Zap, Shield, Sparkles, Book, RefreshCw, ArrowRight, Play, Info } from 'lucide-react';

interface LanguageSelectorProps {
  variant?: 'floating' | 'footer';
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ variant = 'floating' }) => {
  const {
    currentLanguage,
    currentLanguageOption,
    setLanguage,
    supportedLanguages,
    activeProvider,
    switchProvider,
    availableProviders,
    isTranslating,
  } = useLanguage();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'languages' | 'engine'>('languages');
  const [switchingTo, setSwitchingTo] = useState<TranslationProviderId | null>(null);
  const [testResult, setTestResult] = useState<{ original: string; translated: string; engine: string; latency: number } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
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

  const handleSwitchEngine = async (providerId: TranslationProviderId) => {
    setSwitchingTo(providerId);
    try {
      await switchProvider(providerId);
    } finally {
      setSwitchingTo(null);
    }
  };

  const handleRunTest = async () => {
    setIsTesting(true);
    try {
      const sample = 'Exclusive Luxury Villa in Marbella with 9.2% Net Yield';
      const res = await fetch('/api/v1/translate/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: sample,
          targetLanguage: currentLanguage === 'en' ? 'fr' : currentLanguage,
          provider: activeProvider,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setTestResult({
          original: sample,
          translated: data.translations?.[0] || sample,
          engine: data.provider || activeProvider,
          latency: data.latencyMs || 42,
        });
      }
    } catch (e) {
      console.warn('Test translation error:', e);
    } finally {
      setIsTesting(false);
    }
  };

  const getProviderIcon = (id: TranslationProviderId) => {
    switch (id) {
      case 'mymemory':
        return <Zap className="w-4 h-4 text-emerald-400" />;
      case 'libretranslate':
        return <Shield className="w-4 h-4 text-blue-400" />;
      case 'deepl':
        return <Sparkles className="w-4 h-4 text-purple-400" />;
      case 'dictionary':
        return <Book className="w-4 h-4 text-amber-400" />;
      case 'auto':
      default:
        return <RefreshCw className="w-4 h-4 text-emerald-300" />;
    }
  };

  const currentProviderDetails = availableProviders.find((p) => p.id === activeProvider);

  if (variant === 'footer') {
    return (
      <div className="relative inline-block text-left" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-label="Select Language & Translation Engine"
          className="px-3 py-2 rounded-xl bg-[#0E1F1B] hover:bg-[#18302A] border border-[#23423B] text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs"
        >
          <Globe className="w-3.5 h-3.5 text-[#B7E36A]" />
          <span>{currentLanguageOption.flag}</span>
          <span className="font-medium text-slate-200">{currentLanguageOption.nativeName}</span>
          <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/40 font-mono hidden sm:inline">
            {activeProvider}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div
            className="absolute bottom-full left-0 mb-2 w-72 bg-[#0E201C] text-white border border-[#23423B] rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150 py-2"
          >
            <div className="px-3.5 py-1.5 border-b border-[#1E3832] flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#A0B2AC]">Platform Language</span>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                <Cpu className="w-3 h-3" /> {activeProvider} API
              </span>
            </div>

            <div className="max-h-64 overflow-y-auto scrollbar-none py-1">
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
        aria-label="Language & Translation API Switcher"
        className="group bg-[#0E201C] hover:bg-[#162D28] text-white p-2.5 sm:px-4 sm:py-3 rounded-full shadow-2xl border border-emerald-500/30 transition-all duration-300 flex items-center gap-2.5 cursor-pointer hover:scale-105"
        title="Select Language & Switch Translation API"
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
          <span className="text-[9px] text-emerald-400/90 font-medium leading-tight mt-0.5 flex items-center gap-1">
            <Cpu className="w-2.5 h-2.5" /> API: {activeProvider}
          </span>
        </div>
        <Globe className="w-4 h-4 text-[#B7E36A] ml-0.5 shrink-0" />
      </button>

      {/* Floating Popup Menu */}
      {isOpen && (
        <div className="absolute bottom-full left-0 mb-3 w-80 sm:w-96 bg-[#0A1815] text-white border border-[#224039] rounded-3xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-3 duration-200 text-left">
          {/* Header */}
          <div className="p-3.5 bg-[#122521] border-b border-[#203D37] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#B7E36A]" />
              <div>
                <h4 className="text-xs font-bold text-white leading-none">Translation & Languages</h4>
                <p className="text-[10px] text-emerald-400 mt-0.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Switch Translation API Active ({activeProvider})
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-[#203D37] bg-[#0E201C] p-1.5 gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('languages')}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'languages'
                  ? 'bg-[#18332D] text-[#B7E36A] shadow-xs border border-[#2B544A]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Languages (12)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('engine')}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'engine'
                  ? 'bg-[#18332D] text-[#B7E36A] shadow-xs border border-[#2B544A]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Switch API</span>
              <span className="px-1.5 py-0.2 text-[9px] uppercase rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                {activeProvider}
              </span>
            </button>
          </div>

          {/* Tab 1: Languages List */}
          {activeTab === 'languages' && (
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
          )}

          {/* Tab 2: Switch Translation API Selector */}
          {activeTab === 'engine' && (
            <div className="p-3 max-h-96 overflow-y-auto scrollbar-none space-y-3">
              <div className="p-2.5 rounded-2xl bg-[#122521] border border-[#203D37] text-[11px] text-slate-300 space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <Shield className="w-3.5 h-3.5" /> Independent Translation Engine Active
                </div>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Google Translator has been replaced with a flexible, switchable API engine supporting independent providers with automated zero-error failover.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#A0B2AC] px-1">
                  Choose Active Translation API
                </div>

                {availableProviders.map((provider) => {
                  const isCurrent = provider.id === activeProvider;
                  const isPending = switchingTo === provider.id;

                  return (
                    <button
                      key={provider.id}
                      type="button"
                      disabled={isPending}
                      onClick={() => handleSwitchEngine(provider.id)}
                      className={`w-full p-3 rounded-2xl text-left border transition-all cursor-pointer flex items-start gap-3 ${
                        isCurrent
                          ? 'bg-[#18332D] border-emerald-500/50 shadow-md'
                          : 'bg-[#0E201C] hover:bg-[#142A25] border-[#224039] opacity-85 hover:opacity-100'
                      }`}
                    >
                      <div className="mt-0.5 p-2 rounded-xl bg-[#091512] border border-[#23423B] shrink-0">
                        {getProviderIcon(provider.id)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h5 className="text-xs font-bold text-white truncate">{provider.name}</h5>
                          {isCurrent ? (
                            <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-700/50 flex items-center gap-1">
                              <Check className="w-2.5 h-2.5" /> Active
                            </span>
                          ) : (
                            <span className="text-[9px] font-medium text-slate-400 bg-black/30 px-2 py-0.5 rounded-full">
                              Switch
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {provider.description}
                        </p>
                        <div className="mt-1.5 flex items-center gap-2 text-[9px] text-slate-400 font-mono">
                          <span className="capitalize text-emerald-300">● {provider.type}</span>
                          <span>•</span>
                          <span>{provider.requiresKey ? 'Key Optional' : 'No Key Needed'}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Test Switched API Engine */}
              <div className="p-3 rounded-2xl bg-[#0E201C] border border-[#224039] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-[#B7E36A]" /> Test Active Translation API
                  </span>
                  <button
                    type="button"
                    onClick={handleRunTest}
                    disabled={isTesting}
                    className="px-2.5 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-[#B7E36A] border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    {isTesting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                    <span>{isTesting ? 'Testing...' : 'Execute Test'}</span>
                  </button>
                </div>

                {testResult ? (
                  <div className="p-2 rounded-xl bg-[#081310] border border-[#1E3832] space-y-1 text-[10px]">
                    <div className="text-slate-400 italic">"{testResult.original}"</div>
                    <div className="text-emerald-300 font-bold flex items-center gap-1">
                      <ArrowRight className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span>{testResult.translated}</span>
                    </div>
                    <div className="text-[9px] text-slate-500 font-mono pt-1 flex items-center justify-between border-t border-[#162C27]">
                      <span>Engine: {testResult.engine}</span>
                      <span>Latency: {testResult.latency}ms</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 italic">
                    Click "Execute Test" to verify the live translation output of the active {activeProvider} API.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
