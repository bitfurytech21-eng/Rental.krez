import React, { useState, useEffect, useMemo } from 'react';
import {
  Mail,
  Send,
  Eye,
  Smartphone,
  Monitor,
  FileText,
  Code,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sliders,
  Copy,
  Check,
  Shield,
  Clock,
  ExternalLink,
  ChevronRight,
  Filter
} from 'lucide-react';

interface EmailTemplateInfo {
  id: string;
  name: string;
  category: 'account' | 'transactions' | 'investments' | 'support' | 'admin';
  description: string;
  defaultSubject: string;
  sampleData: Record<string, any>;
}

interface EmailLogEntry {
  id: string;
  templateId: string;
  recipient: string;
  subject: string;
  status: 'delivered' | 'simulated' | 'failed';
  deliveryMode: 'smtp' | 'sandbox';
  sentAt: string;
  deliveryTimeMs: number;
  previewSnippet: string;
  reference?: string;
  error?: string;
}

interface EmailSettings {
  senderName: string;
  fromAddress: string;
  replyToAddress: string;
  supportEmail: string;
  supportPhone: string;
  platformUrl: string;
  smtpConfigured: boolean;
  smtpHost: string;
  subjectOverrides: Record<string, string>;
}

export const AdminEmailManager: React.FC = () => {
  const [templates, setTemplates] = useState<EmailTemplateInfo[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('welcome_verification');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [renderFormat, setRenderFormat] = useState<'html' | 'text'>('html');
  
  // Custom variables for preview
  const [customVariables, setCustomVariables] = useState<Record<string, any>>({});
  
  // Rendered preview content from backend
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [previewText, setPreviewText] = useState<string>('');
  const [previewSubject, setPreviewSubject] = useState<string>('');
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false);

  // Test dispatch state
  const [testRecipient, setTestRecipient] = useState<string>('admin@kretz.com');
  const [isSendingTest, setIsSendingTest] = useState<boolean>(false);
  const [sendSuccessMessage, setSendSuccessMessage] = useState<string | null>(null);
  const [sendErrorMessage, setSendErrorMessage] = useState<string | null>(null);

  // Logs & Settings
  const [logs, setLogs] = useState<EmailLogEntry[]>([]);
  const [settings, setSettings] = useState<EmailSettings | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);
  const [isTestingSmtp, setIsTestingSmtp] = useState<boolean>(false);
  const [smtpTestResult, setSmtpTestResult] = useState<any | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'preview' | 'logs' | 'settings'>('preview');
  const [copiedText, setCopiedText] = useState<boolean>(false);

  // Initial Load: Fetch templates, settings, and logs
  useEffect(() => {
    fetchTemplates();
    fetchLogs();
    fetchSettings();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/v1/admin/email/templates');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setTemplates(data.data);
        if (data.data.length > 0 && !selectedTemplateId) {
          setSelectedTemplateId(data.data[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to load email templates:', e);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/v1/admin/email/logs');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setLogs(data.data);
      }
    } catch (e) {
      console.error('Failed to load email logs:', e);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/v1/admin/email/settings');
      const data = await res.json();
      if (data.success) {
        setSettings(data.data);
      }
    } catch (e) {
      console.error('Failed to load email settings:', e);
    }
  };

  // Selected Template Object
  const selectedTemplate = useMemo(() => {
    return templates.find(t => t.id === selectedTemplateId) || templates[0];
  }, [templates, selectedTemplateId]);

  // Reset custom variables whenever the template changes
  useEffect(() => {
    if (selectedTemplate) {
      setCustomVariables({ ...selectedTemplate.sampleData });
    }
  }, [selectedTemplate]);

  // Fetch live rendered preview when template or custom variables change
  useEffect(() => {
    if (!selectedTemplate) return;

    let isMounted = true;
    const fetchPreview = async () => {
      setIsLoadingPreview(true);
      try {
        const queryParams = new URLSearchParams();
        Object.entries(customVariables).forEach(([key, val]) => {
          if (val !== undefined && val !== null) {
            queryParams.set(key, String(val));
          }
        });

        const res = await fetch(`/api/v1/admin/email/preview/${selectedTemplate.id}?${queryParams.toString()}`);
        const result = await res.json();

        if (isMounted && result.success && result.data) {
          setPreviewHtml(result.data.html || '');
          setPreviewText(result.data.text || '');
          setPreviewSubject(result.data.subject || selectedTemplate.defaultSubject);
        }
      } catch (err) {
        console.error('Error rendering email preview:', err);
      } finally {
        if (isMounted) setIsLoadingPreview(false);
      }
    };

    const debounceTimer = setTimeout(fetchPreview, 150);
    return () => {
      isMounted = false;
      clearTimeout(debounceTimer);
    };
  }, [selectedTemplate, customVariables]);

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testRecipient || !selectedTemplate) return;

    setIsSendingTest(true);
    setSendSuccessMessage(null);
    setSendErrorMessage(null);

    try {
      const res = await fetch('/api/v1/admin/email/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          recipient: testRecipient,
          customData: customVariables
        })
      });

      const data = await res.json();
      if (data.success) {
        setSendSuccessMessage(
          `Test email dispatched to ${testRecipient} (${data.data?.deliveryMode?.toUpperCase()} · ${data.data?.deliveryTimeMs}ms).`
        );
        fetchLogs();
      } else {
        setSendErrorMessage(data.error || 'Failed to dispatch test email.');
      }
    } catch (err: any) {
      setSendErrorMessage(err.message || 'Network error dispatching test email.');
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setIsSavingSettings(true);
    try {
      const res = await fetch('/api/v1/admin/email/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (data.success) {
        setSettings(data.data);
        alert('Email sender configuration saved successfully.');
      }
    } catch (err: any) {
      alert('Failed to save settings: ' + err.message);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleCopyPlainText = () => {
    if (!previewText) return;
    navigator.clipboard.writeText(previewText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  // Filter templates by category
  const filteredTemplates = useMemo(() => {
    if (activeCategory === 'all') return templates;
    return templates.filter(t => t.category === activeCategory);
  }, [templates, activeCategory]);

  return (
    <div className="space-y-6">
      {/* Top Header & Sub-tab Bar */}
      <div className="bg-white rounded-2xl border border-[#E3E8E3] p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#182D2A] text-[#B7E36A] flex items-center justify-center font-bold">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#18211F]">
                Institutional Email Communication System
              </h2>
              <p className="text-xs text-[#69736F]">
                Enterprise HTML & Plain-Text templates matching L'Agence / Kretz &amp; De Spain branding
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex bg-[#F6F7F4] p-1 rounded-xl border border-[#E3E8E3] text-xs font-semibold">
            <button
              onClick={() => setActiveSubTab('preview')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeSubTab === 'preview'
                  ? 'bg-white text-[#182D2A] font-bold shadow-xs'
                  : 'text-[#69736F] hover:text-[#18211F]'
              }`}
            >
              Templates &amp; Preview
            </button>
            <button
              onClick={() => { setActiveSubTab('logs'); fetchLogs(); }}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'logs'
                  ? 'bg-white text-[#182D2A] font-bold shadow-xs'
                  : 'text-[#69736F] hover:text-[#18211F]'
              }`}
            >
              <span>Transmission Logs</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 rounded-full font-bold">
                {logs.length}
              </span>
            </button>
            <button
              onClick={() => setActiveSubTab('settings')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'settings'
                  ? 'bg-white text-[#182D2A] font-bold shadow-xs'
                  : 'text-[#69736F] hover:text-[#18211F]'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Sender Config</span>
            </button>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 1. TEMPLATES & LIVE PREVIEW VIEW */}
      {/* ===================================================================== */}
      {activeSubTab === 'preview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Template Selector & Variables Form */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Category Filter */}
            <div className="bg-white rounded-2xl border border-[#E3E8E3] p-4 shadow-xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#69736F] mb-2.5 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-emerald-700" />
                <span>Filter Templates by Lifecycle</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'all', label: 'All (12)' },
                  { id: 'account', label: 'Account & Security' },
                  { id: 'transactions', label: 'Treasury & Escrow' },
                  { id: 'investments', label: 'Investments' },
                  { id: 'support', label: 'Investor Desk' },
                  { id: 'admin', label: 'Super Admin' }
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer font-medium ${
                      activeCategory === cat.id
                        ? 'bg-[#182D2A] text-white border-[#182D2A]'
                        : 'bg-[#F6F7F4] text-[#69736F] border-transparent hover:border-[#D1D9D4]'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Template List Selection */}
            <div className="bg-white rounded-2xl border border-[#E3E8E3] shadow-xs overflow-hidden">
              <div className="p-3.5 border-b border-[#E3E8E3] bg-[#F9FAF8] flex items-center justify-between">
                <span className="text-xs font-bold text-[#18211F]">
                  Available Email Templates ({filteredTemplates.length})
                </span>
                <span className="text-[11px] text-[#69736F]">
                  Click to inspect &amp; test
                </span>
              </div>
              <div className="max-h-[380px] overflow-y-auto divide-y divide-[#EAEFEA]">
                {filteredTemplates.map(t => {
                  const isSelected = t.id === selectedTemplate?.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTemplateId(t.id)}
                      className={`w-full text-left p-3.5 transition-colors flex items-start justify-between gap-3 cursor-pointer ${
                        isSelected
                          ? 'bg-[#F0F5F2] border-l-3 border-[#182D2A]'
                          : 'hover:bg-[#F9FAF8]'
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold truncate ${isSelected ? 'text-[#182D2A]' : 'text-[#18211F]'}`}>
                            {t.name}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#69736F] line-clamp-1">
                          {t.description}
                        </p>
                        <div className="text-[10px] text-[#86928E] truncate">
                          Subj: {t.defaultSubject}
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? 'text-[#182D2A] translate-x-0.5' : 'text-gray-300'}`} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Variable Editor for Selected Template */}
            {selectedTemplate && (
              <div className="bg-white rounded-2xl border border-[#E3E8E3] p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-[#EAEFEA] pb-2">
                  <span className="text-xs font-bold text-[#18211F]">
                    Live Dynamic Variables
                  </span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold">
                    Real-time Preview Binding
                  </span>
                </div>

                <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                  {Object.keys(selectedTemplate.sampleData).map(key => (
                    <div key={key}>
                      <label className="block text-[11px] font-semibold text-[#5F6B66] mb-1 font-mono">
                        {key}
                      </label>
                      <input
                        type="text"
                        value={customVariables[key] !== undefined ? customVariables[key] : selectedTemplate.sampleData[key]}
                        onChange={(e) => setCustomVariables(prev => ({ ...prev, [key]: e.target.value }))}
                        className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[#D5DDD7] bg-[#FBFDFB] text-[#18211F] focus:outline-none focus:border-[#182D2A] focus:ring-1 focus:ring-[#182D2A]"
                      />
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-[#EAEFEA] flex justify-end">
                  <button
                    type="button"
                    onClick={() => setCustomVariables({ ...selectedTemplate.sampleData })}
                    className="text-[11px] text-[#69736F] hover:text-[#18211F] font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Reset to Default Values
                  </button>
                </div>
              </div>
            )}

            {/* Test Email Dispatch Card */}
            <div className="bg-[#182D2A] text-white rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-[#B7E36A]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#B7E36A]">
                  Dispatch Live Test Email
                </span>
              </div>
              <p className="text-[11px] text-[#A0A8A5]">
                Send this rendered template with current variable overrides directly to any inbox.
              </p>

              <form onSubmit={handleSendTestEmail} className="space-y-2.5">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-semibold text-[#C3C9C6] mb-1">
                    Recipient Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={testRecipient}
                    onChange={(e) => setTestRecipient(e.target.value)}
                    placeholder="e.g. your-email@kretz.com"
                    className="w-full text-xs px-3 py-2 rounded-lg bg-[#24423C] border border-[#27845D]/40 text-white placeholder-gray-400 focus:outline-none focus:border-[#B7E36A]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSendingTest}
                  className="w-full text-xs font-bold py-2 px-3 rounded-lg bg-[#B7E36A] text-[#182D2A] hover:bg-[#a8d65a] transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {isSendingTest ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending Test via Engine...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Live Test Email</span>
                    </>
                  )}
                </button>
              </form>

              {sendSuccessMessage && (
                <div className="p-2.5 rounded-lg bg-emerald-900/60 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#B7E36A] shrink-0" />
                  <span>{sendSuccessMessage}</span>
                </div>
              )}

              {sendErrorMessage && (
                <div className="p-2.5 rounded-lg bg-red-900/60 border border-red-500/50 text-red-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{sendErrorMessage}</span>
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Interactive Rendering Canvas (Desktop / Mobile / HTML / Text) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E3E8E3] shadow-xs overflow-hidden flex flex-col">
            
            {/* Viewport & Format Controls Bar */}
            <div className="p-3.5 bg-[#F9FAF8] border-b border-[#E3E8E3] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="text-xs font-bold text-[#18211F]">
                  Subject: <span className="font-normal text-[#4A5551]">{previewSubject}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* HTML vs Plain Text Toggle */}
                <div className="inline-flex bg-[#EAEFEA] p-0.5 rounded-lg text-xs font-semibold">
                  <button
                    onClick={() => setRenderFormat('html')}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                      renderFormat === 'html'
                        ? 'bg-white text-[#182D2A] font-bold shadow-xs'
                        : 'text-[#69736F]'
                    }`}
                  >
                    <Code className="w-3 h-3" />
                    <span>HTML</span>
                  </button>
                  <button
                    onClick={() => setRenderFormat('text')}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                      renderFormat === 'text'
                        ? 'bg-white text-[#182D2A] font-bold shadow-xs'
                        : 'text-[#69736F]'
                    }`}
                  >
                    <FileText className="w-3 h-3" />
                    <span>Plain Text</span>
                  </button>
                </div>

                {/* Desktop vs Mobile Toggle */}
                {renderFormat === 'html' && (
                  <div className="inline-flex bg-[#EAEFEA] p-0.5 rounded-lg text-xs font-semibold">
                    <button
                      onClick={() => setPreviewMode('desktop')}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                        previewMode === 'desktop'
                          ? 'bg-white text-[#182D2A] font-bold shadow-xs'
                          : 'text-[#69736F]'
                      }`}
                      title="Desktop view (600px)"
                    >
                      <Monitor className="w-3 h-3" />
                      <span>600px</span>
                    </button>
                    <button
                      onClick={() => setPreviewMode('mobile')}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                        previewMode === 'mobile'
                          ? 'bg-white text-[#182D2A] font-bold shadow-xs'
                          : 'text-[#69736F]'
                      }`}
                      title="Mobile view (375px)"
                    >
                      <Smartphone className="w-3 h-3" />
                      <span>375px</span>
                    </button>
                  </div>
                )}

                {renderFormat === 'text' && (
                  <button
                    onClick={handleCopyPlainText}
                    className="text-xs px-2.5 py-1 rounded-lg border border-[#D5DDD7] bg-white text-[#18211F] hover:bg-gray-50 flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    {copiedText ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Text</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Email Canvas Preview Container */}
            <div className="p-4 sm:p-6 bg-[#EDF1EE] min-h-[620px] flex items-center justify-center overflow-x-auto">
              {renderFormat === 'html' ? (
                <div
                  className={`bg-white transition-all duration-300 shadow-lg rounded-xl overflow-hidden border border-[#D5DDD7] ${
                    previewMode === 'mobile' ? 'w-[375px]' : 'w-full max-w-[620px]'
                  }`}
                  style={{ minHeight: '520px' }}
                >
                  {isLoadingPreview ? (
                    <div className="h-[480px] flex items-center justify-center text-[#69736F] text-xs gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-emerald-700" />
                      <span>Rendering layout...</span>
                    </div>
                  ) : (
                    <iframe
                      title="Email Preview"
                      srcDoc={previewHtml}
                      className="w-full border-0"
                      style={{ height: '700px', display: 'block' }}
                      sandbox="allow-same-origin allow-popups"
                    />
                  )}
                </div>
              ) : (
                <div className="w-full max-w-[640px] bg-[#182D2A] text-emerald-100 p-5 rounded-xl font-mono text-xs leading-relaxed shadow-lg overflow-x-auto whitespace-pre-wrap select-all">
                  {previewText}
                </div>
              )}
            </div>

            {/* Email Metadata & Compatibility Footer */}
            <div className="p-3 bg-[#F9FAF8] border-t border-[#E3E8E3] text-[11px] text-[#69736F] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Compatible with Gmail, Apple Mail, Outlook MSO, &amp; iOS Mail.</span>
              </div>
              <span className="font-mono text-[10px] text-[#8C9893]">
                Container: {previewMode === 'mobile' ? '375px fluid' : '600px centered table'}
              </span>
            </div>

          </div>

        </div>
      )}

      {/* ===================================================================== */}
      {/* 2. TRANSMISSION AUDIT LOGS VIEW */}
      {/* ===================================================================== */}
      {activeSubTab === 'logs' && (
        <div className="bg-white rounded-2xl border border-[#E3E8E3] shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#E3E8E3] bg-[#F9FAF8] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-700" />
              <h3 className="text-xs font-bold text-[#18211F]">
                Real-Time Email Transmission Audit Ledger ({logs.length})
              </h3>
            </div>
            <button
              onClick={fetchLogs}
              className="text-xs px-2.5 py-1 rounded-lg border border-[#D5DDD7] bg-white text-[#18211F] hover:bg-gray-50 flex items-center gap-1 font-semibold cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh Log</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F6F7F4] text-[#69736F] font-semibold uppercase text-[10px] border-b border-[#E3E8E3]">
                <tr>
                  <th className="py-2.5 px-4">Dispatched At</th>
                  <th className="py-2.5 px-4">Template ID</th>
                  <th className="py-2.5 px-4">Recipient</th>
                  <th className="py-2.5 px-4">Subject</th>
                  <th className="py-2.5 px-4">Mode / Speed</th>
                  <th className="py-2.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAEFEA]">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#69736F]">
                      No email transmissions recorded yet.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#F9FAF8] transition-colors">
                      <td className="py-2.5 px-4 text-[#69736F] whitespace-nowrap font-mono text-[11px]">
                        {new Date(log.sentAt).toLocaleTimeString()} · {new Date(log.sentAt).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px] font-bold text-[#182D2A]">
                        {log.templateId}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-[#18211F]">
                        {log.recipient}
                      </td>
                      <td className="py-2.5 px-4 text-[#4A5551] max-w-[280px] truncate" title={log.subject}>
                        {log.subject}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap text-[#69736F] text-[11px]">
                        <span className="uppercase font-semibold">{log.deliveryMode}</span> · {log.deliveryTimeMs}ms
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          log.status === 'delivered'
                            ? 'bg-emerald-100 text-emerald-800'
                            : log.status === 'simulated'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {log.status === 'delivered' ? '✓ DELIVERED' : log.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 3. SENDER CONFIGURATION & SMTP STATUS VIEW */}
      {/* ===================================================================== */}
      {activeSubTab === 'settings' && settings && (
        <div className="bg-white rounded-2xl border border-[#E3E8E3] shadow-xs p-6 max-w-3xl space-y-6">
          <div className="border-b border-[#EAEFEA] pb-4">
            <h3 className="text-sm font-bold text-[#18211F]">
              Sender Metadata &amp; Delivery Engine Configuration
            </h3>
            <p className="text-xs text-[#69736F]">
              Standardized sender parameters applied across all outgoing operational and investor correspondence.
            </p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#18211F] mb-1">
                  Sender Display Name
                </label>
                <input
                  type="text"
                  required
                  value={settings.senderName}
                  onChange={(e) => setSettings({ ...settings, senderName: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-[#D5DDD7] bg-[#FBFDFB] text-[#18211F] focus:outline-none focus:border-[#182D2A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#18211F] mb-1">
                  From Address
                </label>
                <input
                  type="email"
                  required
                  value={settings.fromAddress}
                  onChange={(e) => setSettings({ ...settings, fromAddress: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-[#D5DDD7] bg-[#FBFDFB] text-[#18211F] focus:outline-none focus:border-[#182D2A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#18211F] mb-1">
                  Reply-To Address
                </label>
                <input
                  type="email"
                  required
                  value={settings.replyToAddress}
                  onChange={(e) => setSettings({ ...settings, replyToAddress: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-[#D5DDD7] bg-[#FBFDFB] text-[#18211F] focus:outline-none focus:border-[#182D2A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#18211F] mb-1">
                  Direct Support Phone
                </label>
                <input
                  type="text"
                  required
                  value={settings.supportPhone}
                  onChange={(e) => setSettings({ ...settings, supportPhone: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-[#D5DDD7] bg-[#FBFDFB] text-[#18211F] focus:outline-none focus:border-[#182D2A]"
                />
              </div>
            </div>

            {/* SMTP Status Notification Banner & Test Connection Button */}
            <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
              settings.smtpConfigured 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                : 'bg-blue-50 border-blue-200 text-blue-900'
            }`}>
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <div className="font-bold">
                    {settings.smtpConfigured ? 'External SMTP Server Connected (Zoho / Gmail)' : 'High-Performance Delivery Engine Active'}
                  </div>
                  <div className="text-[#4A5551]">
                    Current Transport: <span className="font-mono font-semibold">{settings.smtpHost}</span>
                  </div>
                  <p className="text-[11px] text-[#69736F]">
                    All emails trigger server-side delivery logging and verification link tokens with zero mock data.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={async () => {
                  setIsTestingSmtp(true);
                  setSmtpTestResult(null);
                  try {
                    const res = await fetch('/api/v1/admin/email/verify-smtp');
                    const data = await res.json();
                    setSmtpTestResult(data.data || null);
                  } catch (e: any) {
                    setSmtpTestResult({
                      connected: false,
                      provider: 'sandbox',
                      host: 'Error',
                      port: 0,
                      user: 'Error',
                      latencyMs: 0,
                      message: e.message || 'Failed to connect to backend SMTP verification route.',
                      dnsRecordsRecommendation: {
                        spf: 'v=spf1 include:zoho.com ~all',
                        dmarc: 'v=DMARC1; p=none; rua=mailto:dmarc-reports@kretz.site',
                        dkimInstructions: 'Check DNS settings'
                      }
                    });
                  } finally {
                    setIsTestingSmtp(false);
                  }
                }}
                disabled={isTestingSmtp}
                className="shrink-0 text-xs font-bold py-2 px-3.5 rounded-lg bg-white border border-[#D5DDD7] text-[#18211F] hover:bg-gray-50 transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                {isTestingSmtp ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-700" />
                    <span>Verifying SMTP Credentials...</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Test SMTP Connection</span>
                  </>
                )}
              </button>
            </div>

            {/* Live SMTP Test Result & DNS Recommendations Card */}
            {smtpTestResult && (
              <div className="p-4 rounded-xl border border-[#E3E8E3] bg-[#F9FAF8] space-y-3">
                <div className="flex items-center justify-between border-b border-[#EAEFEA] pb-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${smtpTestResult.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                    <span className="text-xs font-bold text-[#18211F]">
                      SMTP Connection Status: {smtpTestResult.connected ? 'VERIFIED CONNECTED (100%)' : 'SANDBOX / UNCONFIGURED'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[#69736F]">
                    Latency: {smtpTestResult.latencyMs}ms
                  </span>
                </div>

                <p className="text-xs text-[#3A4642]">
                  {smtpTestResult.message}
                </p>

                {smtpTestResult.error && (
                  <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs font-mono">
                    Diagnostic Error: {smtpTestResult.error}
                  </div>
                )}

                {/* DNS Records Guide */}
                <div className="pt-2 space-y-2 text-xs border-t border-[#EAEFEA]">
                  <span className="font-bold text-[#182D2A] block uppercase tracking-wider text-[10px]">
                    Recommended DNS Deliverability TXT Records (SPF, DKIM &amp; DMARC)
                  </span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2.5 rounded-lg bg-white border border-[#E2E8E4] font-mono space-y-1">
                      <span className="text-[10px] font-bold font-sans text-[#5F6B66] uppercase block">
                        SPF TXT Record
                      </span>
                      <code className="text-[#182D2A] font-bold block select-all">
                        {smtpTestResult.dnsRecordsRecommendation.spf}
                      </code>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-[#E2E8E4] font-mono space-y-1">
                      <span className="text-[10px] font-bold font-sans text-[#5F6B66] uppercase block">
                        DMARC TXT Record
                      </span>
                      <code className="text-[#182D2A] font-bold block select-all">
                        {smtpTestResult.dnsRecordsRecommendation.dmarc}
                      </code>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-[#E2E8E4] text-[11px] text-[#5F6B66]">
                    <strong className="text-[#18211F]">DKIM Guidance:</strong> {smtpTestResult.dnsRecordsRecommendation.dkimInstructions}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3">
              <button
                type="submit"
                disabled={isSavingSettings}
                className="text-xs font-bold py-2.5 px-5 rounded-lg bg-[#182D2A] text-white hover:bg-[#24423C] transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                {isSavingSettings ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <span>Save Configuration</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
