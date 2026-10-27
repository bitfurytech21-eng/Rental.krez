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
  Filter,
  Play,
  Zap,
  RotateCcw,
  Trash2,
  Settings,
  Server,
  Key,
  Globe,
  Radio,
  ToggleLeft,
  ToggleRight,
  CheckSquare,
  Lock,
  ArrowRight
} from 'lucide-react';
import { getAuthToken } from '../../lib/api';

const getAdminHeaders = (extraHeaders: Record<string, string> = {}) => {
  const token = getAuthToken() || 'admin_sess_usr-admin-01';
  return {
    ...extraHeaders,
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

interface EmailTemplateInfo {
  id: string;
  name: string;
  category: 'account' | 'transactions' | 'investments' | 'security' | 'operations' | 'reports' | 'custom';
  description: string;
  defaultSubject: string;
  supportedCommand: string;
  defaultVariables: string[];
  sampleData: Record<string, any>;
}

interface EmailLogEntry {
  id: string;
  eventId?: string;
  commandName?: string;
  templateId: string;
  templateName?: string;
  recipient: string;
  subject: string;
  status: 'queued' | 'sent' | 'delivered' | 'bounced' | 'failed';
  deliveryMode: 'resend' | 'sendgrid' | 'smtp' | 'sandbox';
  provider: string;
  sentAt: string;
  deliveredAt?: string;
  deliveryTimeMs: number;
  previewSnippet: string;
  idempotencyKey?: string;
  retryCount: number;
  reference?: string;
  error?: string;
}

interface EmailAutomationRule {
  id: string;
  eventName: string;
  commandName: string;
  templateId: string;
  description: string;
  enabled: boolean;
  recipientRule: 'user_email' | 'admin_alerts' | 'custom_recipients';
  customRecipients?: string[];
  subjectOverride?: string;
  idempotencyWindowHours: number;
}

interface EmailSettings {
  senderName: string;
  fromAddress: string;
  replyToAddress: string;
  supportEmail: string;
  supportPhone: string;
  platformUrl: string;
  primaryBrandColor: string;
  providerType: string;
  providerName: string;
  providerConfigured: boolean;
  testMode: boolean;
  subjectOverrides: Record<string, string>;
}

export const AdminEmailManager: React.FC = () => {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'templates' | 'commands' | 'automations' | 'logs' | 'provider'>('templates');

  // Templates & Preview State
  const [templates, setTemplates] = useState<EmailTemplateInfo[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('welcome');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [renderFormat, setRenderFormat] = useState<'html' | 'text' | 'code'>('html');
  const [customVariables, setCustomVariables] = useState<Record<string, any>>({});
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [previewText, setPreviewText] = useState<string>('');
  const [previewSubject, setPreviewSubject] = useState<string>('');
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false);

  // Test Dispatch State
  const [testRecipient, setTestRecipient] = useState<string>('investor@kretz.com');
  const [isSendingTest, setIsSendingTest] = useState<boolean>(false);
  const [sendSuccessMessage, setSendSuccessMessage] = useState<string | null>(null);
  const [sendErrorMessage, setSendErrorMessage] = useState<string | null>(null);

  // Command Console State
  const [selectedCommand, setSelectedCommand] = useState<string>('send_welcome_email');
  const [commandRecipient, setCommandRecipient] = useState<string>('investor@kretz.com');
  const [commandPayload, setCommandPayload] = useState<string>('{\n  "user_name": "Angela Moreau",\n  "amount": "€10,000.00",\n  "property_title": "Villa El Mirador, Marbella"\n}');
  const [isExecutingCommand, setIsExecutingCommand] = useState<boolean>(false);
  const [commandResult, setCommandResult] = useState<any | null>(null);

  // Automations State
  const [automations, setAutomations] = useState<EmailAutomationRule[]>([]);
  const [isTogglingAutomation, setIsTogglingAutomation] = useState<string | null>(null);

  // Logs State
  const [logs, setLogs] = useState<EmailLogEntry[]>([]);
  const [logSearch, setLogSearch] = useState<string>('');
  const [logStatusFilter, setLogStatusFilter] = useState<string>('all');
  const [selectedLogModal, setSelectedLogModal] = useState<EmailLogEntry | null>(null);
  const [retryingLogId, setRetryingLogId] = useState<string | null>(null);

  // Settings & Provider State
  const [settings, setSettings] = useState<EmailSettings | null>(null);
  const [isTestingProvider, setIsTestingProvider] = useState<boolean>(false);
  const [providerTestResult, setProviderTestResult] = useState<any | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Initial Load
  useEffect(() => {
    fetchTemplates();
    fetchAutomations();
    fetchLogs();
    fetchSettings();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/v1/admin/email/templates', {
        headers: getAdminHeaders()
      });
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

  const fetchAutomations = async () => {
    try {
      const res = await fetch('/api/v1/admin/email/automations', {
        headers: getAdminHeaders()
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setAutomations(data.data);
      }
    } catch (e) {
      console.error('Failed to load automations:', e);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/v1/admin/email/logs', {
        headers: getAdminHeaders()
      });
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
      const res = await fetch('/api/v1/admin/email/settings', {
        headers: getAdminHeaders()
      });
      const data = await res.json();
      if (data.success && data.data) {
        setSettings(data.data);
      }
    } catch (e) {
      console.error('Failed to load email settings:', e);
    }
  };

  // Active template info
  const currentTemplate = useMemo(() => {
    return templates.find(t => t.id === selectedTemplateId) || templates[0];
  }, [templates, selectedTemplateId]);

  // Load preview when template or variables change
  useEffect(() => {
    if (!currentTemplate) return;
    loadPreview();
  }, [selectedTemplateId, currentTemplate]);

  const loadPreview = async () => {
    if (!currentTemplate) return;
    setIsLoadingPreview(true);
    try {
      const res = await fetch(`/api/v1/admin/email/preview/${currentTemplate.id}`, {
        headers: getAdminHeaders()
      });
      const data = await res.json();
      if (data.success && data.data) {
        setPreviewHtml(data.data.html);
        setPreviewText(data.data.text);
        setPreviewSubject(data.data.subject);
        setCustomVariables(data.data.sampleData || {});
      }
    } catch (e) {
      console.error('Failed to render template preview:', e);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Re-render preview with updated custom variables
  const handleVariableChange = (key: string, value: string) => {
    const updated = { ...customVariables, [key]: value };
    setCustomVariables(updated);

    // Live update preview HTML if possible
    let tempHtml = previewHtml;
    tempHtml = tempHtml.replace(new RegExp(`\{\{\\s*${key}\\s*\}\}`, 'g'), value);
    setPreviewHtml(tempHtml);
  };

  // Send Test Email
  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testRecipient || !currentTemplate) return;

    setIsSendingTest(true);
    setSendSuccessMessage(null);
    setSendErrorMessage(null);

    try {
      const res = await fetch('/api/v1/admin/email/send-test', {
        method: 'POST',
        headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          templateId: currentTemplate.id,
          recipient: testRecipient,
          customData: customVariables
        })
      });

      const data = await res.json();
      if (data.success) {
        setSendSuccessMessage(`Test email successfully dispatched to ${testRecipient}! Delivery Mode: ${data.data.deliveryMode}`);
        fetchLogs();
      } else {
        setSendErrorMessage(data.error || 'Failed to dispatch test email.');
      }
    } catch (e: any) {
      setSendErrorMessage(e.message || 'Network error dispatching test email.');
    } finally {
      setIsSendingTest(false);
    }
  };

  // Execute Command
  const handleExecuteCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsExecutingCommand(true);
    setCommandResult(null);

    try {
      let parsedPayload = {};
      try {
        parsedPayload = JSON.parse(commandPayload);
      } catch (err) {
        throw new Error('Invalid JSON payload in command editor.');
      }

      const res = await fetch('/api/v1/admin/email/execute-command', {
        method: 'POST',
        headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          command: selectedCommand,
          recipient: commandRecipient,
          payload: parsedPayload,
          idempotencyKey: `idemp-manual-${Date.now()}`
        })
      });

      const data = await res.json();
      setCommandResult(data);
      fetchLogs();
    } catch (err: any) {
      setCommandResult({
        success: false,
        error: err.message || 'Execution error.'
      });
    } finally {
      setIsExecutingCommand(false);
    }
  };

  // Toggle Automation
  const handleToggleAutomation = async (ruleId: string, currentEnabled: boolean) => {
    setIsTogglingAutomation(ruleId);
    try {
      const res = await fetch(`/api/v1/admin/email/automations/${ruleId}`, {
        method: 'PATCH',
        headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ enabled: !currentEnabled })
      });
      const data = await res.json();
      if (data.success) {
        setAutomations(prev => prev.map(a => a.id === ruleId ? { ...a, enabled: !currentEnabled } : a));
      }
    } catch (e) {
      console.error('Failed to toggle automation:', e);
    } finally {
      setIsTogglingAutomation(null);
    }
  };

  // Retry Failed Email
  const handleRetryEmail = async (logId: string) => {
    setRetryingLogId(logId);
    try {
      const res = await fetch(`/api/v1/admin/email/logs/${logId}/retry`, {
        method: 'POST',
        headers: getAdminHeaders({ 'Content-Type': 'application/json' })
      });
      const data = await res.json();
      if (data.success) {
        fetchLogs();
      }
    } catch (e) {
      console.error('Failed to retry email:', e);
    } finally {
      setRetryingLogId(null);
    }
  };

  // Test Provider Connection
  const handleTestProvider = async () => {
    setIsTestingProvider(true);
    setProviderTestResult(null);
    try {
      const res = await fetch('/api/v1/admin/email/verify-provider', {
        headers: getAdminHeaders()
      });
      const data = await res.json();
      setProviderTestResult(data);
    } catch (e: any) {
      setProviderTestResult({ success: false, error: e.message });
    } finally {
      setIsTestingProvider(false);
    }
  };

  // Filtered Templates
  const filteredTemplates = useMemo(() => {
    if (activeCategory === 'all') return templates;
    return templates.filter(t => t.category === activeCategory);
  }, [templates, activeCategory]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      const matchesSearch = !logSearch || 
        l.recipient.toLowerCase().includes(logSearch.toLowerCase()) ||
        l.subject.toLowerCase().includes(logSearch.toLowerCase()) ||
        (l.commandName && l.commandName.toLowerCase().includes(logSearch.toLowerCase()));
      const matchesStatus = logStatusFilter === 'all' || l.status === logStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [logs, logSearch, logStatusFilter]);

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-[#E4EEEA] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#087F5B] animate-pulse"></span>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#087F5B]">
              Enterprise Email Engine · Notable / Finora Architecture
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#172B2A]">
            Automated Email Notification System
          </h2>
          <p className="text-xs sm:text-sm text-[#71817D] mt-1 max-w-2xl leading-relaxed">
            Responsive HTML transactional template library, event-driven command dispatcher, idempotency safeguards, and delivery monitoring.
          </p>
        </div>

        {/* Quick Summary Pill */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="bg-[#EAF8F4] border border-[#BCE8D7] px-3.5 py-2 rounded-2xl flex items-center gap-2">
            <Server className="w-4 h-4 text-[#087F5B]" />
            <div className="text-left">
              <span className="text-[10px] uppercase font-bold text-[#71817D] block leading-tight">Active Engine</span>
              <span className="text-xs font-bold text-[#087F5B] font-mono block leading-tight">
                {settings?.providerName || 'Sandbox / Resend Ready'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-[#E4EEEA]">
        {[
          { id: 'templates', label: 'Template Library & Preview', icon: Mail, count: templates.length },
          { id: 'commands', label: 'Command Trigger Console', icon: Zap },
          { id: 'automations', label: 'Event Automations', icon: Play, count: automations.length },
          { id: 'logs', label: 'Activity Logs & Troubleshooter', icon: Clock, count: logs.length },
          { id: 'provider', label: 'Provider & DNS Verification', icon: Shield }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-[#087F5B] text-white shadow-xs'
                  : 'bg-white hover:bg-[#F6FAF8] text-[#71817D] hover:text-[#172B2A] border border-[#E4EEEA]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-[#EAF8F4] text-[#087F5B]'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: TEMPLATE LIBRARY & INTERACTIVE LIVE PREVIEW */}
      {/* ========================================================================= */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Template Selector List */}
          <div className="lg:col-span-4 space-y-4">
            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-1.5 bg-[#F6FAF8] p-2 rounded-2xl border border-[#E4EEEA]">
              {[
                { id: 'all', label: 'All (10)' },
                { id: 'account', label: 'Account' },
                { id: 'transactions', label: 'Transactions' },
                { id: 'security', label: 'Security' },
                { id: 'operations', label: 'Operations' },
                { id: 'reports', label: 'Reports' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                    activeCategory === cat.id
                      ? 'bg-[#087F5B] text-white shadow-2xs'
                      : 'text-[#71817D] hover:text-[#172B2A]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Template Card Items */}
            <div className="space-y-2 max-h-[720px] overflow-y-auto pr-1">
              {filteredTemplates.map(tmpl => {
                const isSelected = selectedTemplateId === tmpl.id;
                return (
                  <div
                    key={tmpl.id}
                    onClick={() => setSelectedTemplateId(tmpl.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'bg-white border-[#087F5B] ring-2 ring-[#087F5B]/15 shadow-sm'
                        : 'bg-white border-[#E4EEEA] hover:border-[#087F5B]/30 hover:bg-[#F6FAF8]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] uppercase font-bold text-[#087F5B] bg-[#DDF5EC] px-2 py-0.5 rounded-full border border-[#BCE8D7]">
                        {tmpl.category}
                      </span>
                      <span className="text-[10px] font-mono text-[#71817D]">
                        cmd: {tmpl.supportedCommand}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-[#172B2A] leading-snug">
                      {tmpl.name}
                    </h4>
                    <p className="text-xs text-[#71817D] line-clamp-2 mt-1 leading-relaxed">
                      {tmpl.description}
                    </p>

                    <div className="mt-2.5 pt-2 border-t border-[#F0F4F2] flex items-center justify-between text-[11px] text-[#71817D]">
                      <span className="truncate max-w-[200px] font-medium text-[#172B2A]">
                        {tmpl.defaultSubject}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-[#087F5B] shrink-0" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Live Responsive Preview & Controls */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* Action Bar: Desktop vs Mobile View + Format Selector + Test Dispatch */}
            <div className="bg-white p-4 rounded-3xl border border-[#E4EEEA] shadow-xs flex flex-wrap items-center justify-between gap-3">
              {/* Desktop vs Mobile Toggle */}
              <div className="flex items-center bg-[#F6FAF8] p-1 rounded-xl border border-[#E4EEEA]">
                <button
                  onClick={() => setPreviewMode('desktop')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                    previewMode === 'desktop' ? 'bg-white text-[#172B2A] shadow-2xs' : 'text-[#71817D]'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Desktop (600px)</span>
                </button>
                <button
                  onClick={() => setPreviewMode('mobile')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                    previewMode === 'mobile' ? 'bg-white text-[#172B2A] shadow-2xs' : 'text-[#71817D]'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Mobile View</span>
                </button>
              </div>

              {/* Format Selector */}
              <div className="flex items-center bg-[#F6FAF8] p-1 rounded-xl border border-[#E4EEEA]">
                <button
                  onClick={() => setRenderFormat('html')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                    renderFormat === 'html' ? 'bg-white text-[#087F5B] shadow-2xs' : 'text-[#71817D]'
                  }`}
                >
                  Visual HTML
                </button>
                <button
                  onClick={() => setRenderFormat('text')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                    renderFormat === 'text' ? 'bg-white text-[#087F5B] shadow-2xs' : 'text-[#71817D]'
                  }`}
                >
                  Plain Text
                </button>
                <button
                  onClick={() => setRenderFormat('code')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                    renderFormat === 'code' ? 'bg-white text-[#087F5B] shadow-2xs' : 'text-[#71817D]'
                  }`}
                >
                  HTML Source
                </button>
              </div>

              {/* 1-Click Send Test Form */}
              <form onSubmit={handleSendTest} className="flex items-center gap-2">
                <input
                  type="email"
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  placeholder="Test recipient..."
                  className="text-xs px-3 py-1.5 rounded-xl border border-[#E4EEEA] bg-[#F6FAF8] font-mono text-[#172B2A] w-48"
                  required
                />
                <button
                  type="submit"
                  disabled={isSendingTest}
                  className="px-3 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                  title="Dispatch real test message using active engine"
                >
                  {isSendingTest ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  <span>Send Test</span>
                </button>
              </form>
            </div>

            {/* Test Send Feedback Notices */}
            {sendSuccessMessage && (
              <div className="p-3 bg-[#EAF8F4] border border-[#BCE8D7] rounded-2xl text-xs text-[#075B46] font-medium flex items-center justify-between">
                <span>&#10003; {sendSuccessMessage}</span>
                <button onClick={() => setSendSuccessMessage(null)} className="font-bold text-[#087F5B] cursor-pointer">✕</button>
              </div>
            )}
            {sendErrorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 font-medium flex items-center justify-between">
                <span>&#9888; {sendErrorMessage}</span>
                <button onClick={() => setSendErrorMessage(null)} className="font-bold text-rose-600 cursor-pointer">✕</button>
              </div>
            )}

            {/* Email Metadata Bar (Subject, From, To) */}
            <div className="bg-[#F6FAF8] p-3.5 rounded-2xl border border-[#E4EEEA] text-xs space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#71817D] w-16">Subject:</span>
                <span className="font-bold text-[#172B2A]">{previewSubject || currentTemplate?.defaultSubject}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#71817D] w-16">Sender:</span>
                <span className="text-[#172B2A] font-mono">{settings?.senderName} &lt;{settings?.fromAddress}&gt;</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#71817D] w-16">Command:</span>
                <span className="text-[#087F5B] font-mono font-bold bg-[#DDF5EC] px-2 py-0.2 rounded-md">
                  {currentTemplate?.supportedCommand}
                </span>
              </div>
            </div>

            {/* Dynamic Variables Live Editor Drawer */}
            {currentTemplate && currentTemplate.defaultVariables && currentTemplate.defaultVariables.length > 0 && (
              <details className="bg-white p-3.5 rounded-2xl border border-[#E4EEEA] shadow-xs group">
                <summary className="text-xs font-bold text-[#172B2A] flex items-center justify-between cursor-pointer">
                  <span className="flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-[#087F5B]" />
                    <span>Customize Dynamic Variables & Preview Values ({currentTemplate.defaultVariables.length})</span>
                  </span>
                  <span className="text-[10px] text-[#71817D] group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-3 mt-2 border-t border-[#F0F4F2]">
                  {currentTemplate.defaultVariables.map(v => (
                    <div key={v} className="space-y-1">
                      <label className="text-[10px] font-bold text-[#71817D] uppercase font-mono block">
                        &#123;&#123;{v}&#125;&#125;
                      </label>
                      <input
                        type="text"
                        value={customVariables[v] || ''}
                        onChange={(e) => handleVariableChange(v, e.target.value)}
                        placeholder={`Value for {{${v}}}...`}
                        className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-[#E4EEEA] bg-[#F6FAF8] font-mono text-[#172B2A]"
                      />
                    </div>
                  ))}
                </div>
              </details>
            )}

            {/* PREVIEW CONTAINER */}
            <div className="bg-[#EAEFEA]/50 p-4 sm:p-6 rounded-3xl border border-[#E4EEEA] flex justify-center min-h-[560px]">
              {renderFormat === 'html' && (
                <div
                  className={`bg-white rounded-2xl shadow-lg border border-[#E5E7EB] overflow-hidden transition-all duration-300 ${
                    previewMode === 'mobile' ? 'w-[375px] max-w-full' : 'w-[640px] max-w-full'
                  }`}
                >
                  <iframe
                    title="Email Preview"
                    srcDoc={previewHtml}
                    className="w-full h-[640px] border-none"
                    sandbox="allow-same-origin"
                  />
                </div>
              )}

              {renderFormat === 'text' && (
                <div className="w-full max-w-2xl bg-white p-6 rounded-2xl border border-[#E4EEEA] font-mono text-xs whitespace-pre-wrap text-[#172B2A] leading-relaxed shadow-sm overflow-x-auto">
                  {previewText}
                </div>
              )}

              {renderFormat === 'code' && (
                <div className="w-full max-w-2xl bg-[#172B2A] text-[#DDF5EC] p-6 rounded-2xl border border-[#087F5B]/30 font-mono text-xs overflow-x-auto relative">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(previewHtml);
                      setCopiedCode(true);
                      setTimeout(() => setCopiedCode(false), 2000);
                    }}
                    className="absolute top-4 right-4 px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCode ? 'Copied' : 'Copy HTML'}</span>
                  </button>
                  <pre>{previewHtml}</pre>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: COMMAND TRIGGER CONSOLE */}
      {/* ========================================================================= */}
      {activeTab === 'commands' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-[#E4EEEA] shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-bold text-[#172B2A] flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#087F5B]" />
                <span>Command Execution Console</span>
              </h3>
              <p className="text-xs text-[#71817D] mt-0.5">
                Simulate backend event dispatches. Validates command parameters, checks automation status, and applies idempotency.
              </p>
            </div>

            <form onSubmit={handleExecuteCommand} className="space-y-4 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#172B2A]">Select Supported Command</label>
                <select
                  value={selectedCommand}
                  onChange={(e) => setSelectedCommand(e.target.value)}
                  className="w-full text-xs font-mono font-bold p-2.5 rounded-xl border border-[#E4EEEA] bg-[#F6FAF8] text-[#172B2A]"
                >
                  <option value="send_welcome_email">send_welcome_email (Welcome Email)</option>
                  <option value="send_verification_email">send_verification_email (Email Verification Code)</option>
                  <option value="send_password_reset">send_password_reset (Password Reset Link)</option>
                  <option value="send_command_confirmation">send_command_confirmation (Command Confirmation)</option>
                  <option value="send_transaction_receipt">send_transaction_receipt (Transaction Confirmation)</option>
                  <option value="send_payment_notification">send_payment_notification (Payment / Deposit Notice)</option>
                  <option value="send_security_alert">send_security_alert (New Login / Security Alert)</option>
                  <option value="send_status_update">send_status_update (Requested Operation Status)</option>
                  <option value="send_report_notification">send_report_notification (Monthly Report Ready)</option>
                  <option value="send_custom_email">send_custom_email (Admin Custom Broadcast)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#172B2A]">Recipient Email Address</label>
                <input
                  type="email"
                  value={commandRecipient}
                  onChange={(e) => setCommandRecipient(e.target.value)}
                  required
                  placeholder="user@example.com"
                  className="w-full text-xs font-mono p-2.5 rounded-xl border border-[#E4EEEA] bg-[#F6FAF8] text-[#172B2A]"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#172B2A]">Command Payload (JSON)</label>
                  <span className="text-[10px] text-[#71817D]">Dynamic variables schema</span>
                </div>
                <textarea
                  rows={8}
                  value={commandPayload}
                  onChange={(e) => setCommandPayload(e.target.value)}
                  className="w-full text-xs font-mono p-3 rounded-xl border border-[#E4EEEA] bg-[#F6FAF8] text-[#172B2A] leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={isExecutingCommand}
                className="w-full py-3 bg-[#087F5B] hover:bg-[#075B46] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isExecutingCommand ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                <span>Execute Command & Dispatch Email</span>
              </button>
            </form>
          </div>

          {/* Right Column: Execution Response Card */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-white p-6 rounded-3xl border border-[#E4EEEA] shadow-xs space-y-4 min-h-[420px]">
              <h3 className="text-base font-bold text-[#172B2A]">
                Command Execution Response & Diagnostics
              </h3>

              {commandResult ? (
                <div className="space-y-4">
                  <div className={`p-4 rounded-2xl border ${
                    commandResult.success ? 'bg-[#EAF8F4] border-[#BCE8D7]' : 'bg-rose-50 border-rose-200'
                  }`}>
                    <div className="flex items-center gap-2 font-bold text-xs mb-1">
                      {commandResult.success ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-[#087F5B]" />
                          <span className="text-[#075B46]">Command Dispatched Successfully</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 text-rose-600" />
                          <span className="text-rose-800">Execution Error</span>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-[#172B2A]">{commandResult.message || commandResult.error}</p>
                  </div>

                  {commandResult.data && (
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-[#F6FAF8] rounded-xl border border-[#E4EEEA]">
                        <span className="text-[10px] text-[#71817D] uppercase font-bold block">Delivery Mode</span>
                        <span className="font-mono font-bold text-[#087F5B]">{commandResult.data.deliveryMode}</span>
                      </div>
                      <div className="p-3 bg-[#F6FAF8] rounded-xl border border-[#E4EEEA]">
                        <span className="text-[10px] text-[#71817D] uppercase font-bold block">Latency</span>
                        <span className="font-mono font-bold text-[#172B2A]">{commandResult.data.deliveryTimeMs} ms</span>
                      </div>
                      <div className="col-span-2 p-3 bg-[#F6FAF8] rounded-xl border border-[#E4EEEA]">
                        <span className="text-[10px] text-[#71817D] uppercase font-bold block">Idempotency Guard Key</span>
                        <span className="font-mono text-[11px] text-[#172B2A] break-all">{commandResult.data.idempotencyKey}</span>
                      </div>
                    </div>
                  )}

                  <div className="p-3 bg-[#172B2A] rounded-xl text-[#DDF5EC] font-mono text-[11px] overflow-x-auto">
                    <pre>{JSON.stringify(commandResult, null, 2)}</pre>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center text-[#71817D] space-y-2">
                  <Zap className="w-8 h-8 text-[#BCE8D7]" />
                  <p className="text-xs">Select a command and click Execute to test the event-driven email pipeline.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: AUTOMATIONS & TRIGGER RULES MANAGER */}
      {/* ========================================================================= */}
      {activeTab === 'automations' && (
        <div className="bg-white p-6 rounded-3xl border border-[#E4EEEA] shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-bold text-[#172B2A]">
              Event-Driven Automations Registry ({automations.length})
            </h3>
            <p className="text-xs text-[#71817D] mt-0.5">
              Enable or disable automated emails for specific user actions, ledger milestones, and system commands.
            </p>
          </div>

          <div className="divide-y divide-[#E4EEEA]">
            {automations.map(auto => {
              const isToggling = isTogglingAutomation === auto.id;
              return (
                <div key={auto.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#172B2A]">{auto.eventName}</span>
                      <span className="text-[10px] font-mono font-bold text-[#087F5B] bg-[#DDF5EC] px-2 py-0.5 rounded-full border border-[#BCE8D7]">
                        {auto.commandName}
                      </span>
                    </div>
                    <p className="text-xs text-[#71817D]">{auto.description}</p>
                    <div className="flex items-center gap-3 text-[11px] text-[#71817D] pt-0.5">
                      <span>Template: <strong className="text-[#172B2A]">{auto.templateId}</strong></span>
                      <span>·</span>
                      <span>Recipient: <strong className="text-[#172B2A]">{auto.recipientRule}</strong></span>
                      <span>·</span>
                      <span>Idempotency: <strong>{auto.idempotencyWindowHours}h window</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={() => handleToggleAutomation(auto.id, auto.enabled)}
                      disabled={isToggling}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        auto.enabled
                          ? 'bg-[#EAF8F4] text-[#075B46] border border-[#087F5B]/30 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-[#EAF8F4] hover:text-[#087F5B]'
                      }`}
                    >
                      {auto.enabled ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#087F5B]" />
                          <span>Enabled</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3.5 h-3.5 text-gray-400" />
                          <span>Disabled</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: ACTIVITY LOGS & TROUBLESHOOTER */}
      {/* ========================================================================= */}
      {activeTab === 'logs' && (
        <div className="bg-white p-6 rounded-3xl border border-[#E4EEEA] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E4EEEA]">
            <div>
              <h3 className="text-base font-bold text-[#172B2A]">
                Email Delivery Activity Logs & Audit Trail ({logs.length})
              </h3>
              <p className="text-xs text-[#71817D]">
                Real-time delivery status, latency, idempotency tracking, and troubleshooting for all dispatched messages.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search recipient, command, subject..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="text-xs px-3 py-1.5 rounded-xl border border-[#E4EEEA] bg-[#F6FAF8] text-[#172B2A] w-64"
              />
              <select
                value={logStatusFilter}
                onChange={(e) => setLogStatusFilter(e.target.value)}
                className="text-xs p-1.5 rounded-xl border border-[#E4EEEA] bg-[#F6FAF8] text-[#172B2A] font-bold"
              >
                <option value="all">All Statuses</option>
                <option value="delivered">Delivered</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
                <option value="bounced">Bounced</option>
              </select>
            </div>
          </div>

          {/* Logs Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[#E4EEEA] text-[#71817D] uppercase font-bold text-[10px]">
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Recipient</th>
                  <th className="py-2.5 px-3">Command / Template</th>
                  <th className="py-2.5 px-3">Subject & Snippet</th>
                  <th className="py-2.5 px-3">Provider</th>
                  <th className="py-2.5 px-3">Latency</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4EEEA]">
                {filteredLogs.map(l => (
                  <tr key={l.id} className="hover:bg-[#F6FAF8] transition-colors">
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide inline-flex items-center gap-1 ${
                        l.status === 'delivered'
                          ? 'bg-[#EAF8F4] text-[#075B46] border border-[#087F5B]/30'
                          : l.status === 'failed'
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : l.status === 'bounced'
                          ? 'bg-purple-100 text-purple-800 border border-purple-300'
                          : 'bg-blue-100 text-blue-800 border border-blue-300'
                      }`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-[#172B2A]">{l.recipient}</td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-[#172B2A] block">{l.templateName || l.templateId}</span>
                      <span className="text-[10px] font-mono text-[#087F5B]">{l.commandName}</span>
                    </td>
                    <td className="py-3 px-3 max-w-[240px]">
                      <span className="font-semibold text-[#172B2A] block truncate">{l.subject}</span>
                      <span className="text-[10px] text-[#71817D] block truncate">{l.previewSnippet}</span>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-[#71817D]">{l.deliveryMode}</td>
                    <td className="py-3 px-3 font-mono text-[11px] text-[#172B2A]">{l.deliveryTimeMs}ms</td>
                    <td className="py-3 px-3 text-[10px] text-[#71817D] whitespace-nowrap">
                      {new Date(l.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {l.status === 'failed' && (
                          <button
                            onClick={() => handleRetryEmail(l.id)}
                            disabled={retryingLogId === l.id}
                            className="px-2 py-1 bg-[#EAF8F4] hover:bg-[#DDF5EC] text-[#087F5B] rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                            title="Retry failed message delivery"
                          >
                            <RotateCcw className={`w-3 h-3 ${retryingLogId === l.id ? 'animate-spin' : ''}`} />
                            <span>Retry</span>
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedLogModal(l)}
                          className="px-2 py-1 bg-white hover:bg-gray-100 border border-[#E4EEEA] text-[#172B2A] rounded-lg text-[10px] font-bold cursor-pointer"
                        >
                          Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: PROVIDER INTEGRATION & DNS VERIFICATION GUIDE */}
      {/* ========================================================================= */}
      {activeTab === 'provider' && (
        <div className="space-y-6">
          {/* Active Provider Status Banner */}
          <div className="bg-white p-6 rounded-3xl border border-[#E4EEEA] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4EEEA] pb-4">
              <div>
                <h3 className="text-base font-bold text-[#172B2A] flex items-center gap-2">
                  <Server className="w-4 h-4 text-[#087F5B]" />
                  <span>Transactional Delivery Provider Integration</span>
                </h3>
                <p className="text-xs text-[#71817D] mt-0.5">
                  Secure server-side API integration supporting Resend, SendGrid, Amazon SES / SMTP, and Instant Sandbox.
                </p>
              </div>

              <button
                onClick={handleTestProvider}
                disabled={isTestingProvider}
                className="px-4 py-2 bg-[#087F5B] hover:bg-[#075B46] text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                {isTestingProvider ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>Test Provider Connection</span>
              </button>
            </div>

            {/* Test Result Callout */}
            {providerTestResult && (
              <div className={`p-4 rounded-2xl border text-xs ${
                providerTestResult.success ? 'bg-[#EAF8F4] border-[#BCE8D7] text-[#075B46]' : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}>
                <div className="font-bold flex items-center gap-1.5 mb-1">
                  <span>{providerTestResult.success ? '&#10003;' : '&#9888;'}</span>
                  <span>{providerTestResult.data?.message || providerTestResult.message}</span>
                </div>
                <div className="text-[11px] opacity-80">
                  Provider: {providerTestResult.data?.providerName || providerTestResult.data?.provider} · Latency: {providerTestResult.data?.latencyMs}ms
                </div>
              </div>
            )}

            {/* Provider Support Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-[#F6FAF8] border border-[#E4EEEA] space-y-1">
                <span className="text-[10px] font-bold text-[#71817D] uppercase">Resend Transactional</span>
                <span className="text-sm font-bold text-[#172B2A] block font-mono">RESEND_API_KEY</span>
                <p className="text-[11px] text-[#71817D]">Recommended modern email API with instant delivery and automatic webhooks.</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#F6FAF8] border border-[#E4EEEA] space-y-1">
                <span className="text-[10px] font-bold text-[#71817D] uppercase">SendGrid Mail</span>
                <span className="text-sm font-bold text-[#172B2A] block font-mono">SENDGRID_API_KEY</span>
                <p className="text-[11px] text-[#71817D]">Enterprise-grade delivery network for high-volume investor updates.</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#F6FAF8] border border-[#E4EEEA] space-y-1">
                <span className="text-[10px] font-bold text-[#71817D] uppercase">Amazon SES / SMTP</span>
                <span className="text-sm font-bold text-[#172B2A] block font-mono">SMTP_HOST / PORT</span>
                <p className="text-[11px] text-[#71817D]">Standard TLS encrypted SMTP relay with pooled connections.</p>
              </div>
            </div>
          </div>

          {/* DNS Configuration Guide (SPF, DKIM, DMARC) */}
          <div className="bg-white p-6 rounded-3xl border border-[#E4EEEA] shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-bold text-[#172B2A] flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#087F5B]" />
                <span>Domain Verification &amp; Anti-Spam (SPF / DKIM / DMARC)</span>
              </h3>
              <p className="text-xs text-[#71817D] mt-0.5">
                Ensure 100% inbox placement and prevent spoofing by publishing these DNS records in your domain manager.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              {/* SPF Record */}
              <div className="p-4 bg-[#F6FAF8] rounded-2xl border border-[#E4EEEA] space-y-1">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-[#172B2A]">1. SPF (Sender Policy Framework) — TXT Record</span>
                  <span className="text-[10px] text-[#087F5B] bg-[#DDF5EC] px-2 py-0.2 rounded-full">Root (@)</span>
                </div>
                <div className="font-mono bg-white p-2.5 rounded-xl border border-[#E4EEEA] text-[#087F5B] font-bold break-all">
                  v=spf1 include:resend.com include:_spf.google.com include:zoho.com ~all
                </div>
              </div>

              {/* DMARC Record */}
              <div className="p-4 bg-[#F6FAF8] rounded-2xl border border-[#E4EEEA] space-y-1">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-[#172B2A]">2. DMARC Enforcement — TXT Record</span>
                  <span className="text-[10px] text-[#087F5B] bg-[#DDF5EC] px-2 py-0.2 rounded-full">_dmarc.kretz.site</span>
                </div>
                <div className="font-mono bg-white p-2.5 rounded-xl border border-[#E4EEEA] text-[#087F5B] font-bold break-all">
                  v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@kretz.site; pct=100
                </div>
              </div>

              {/* DKIM Instructions */}
              <div className="p-4 bg-[#F6FAF8] rounded-2xl border border-[#E4EEEA] space-y-1">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-[#172B2A]">3. DKIM (DomainKeys Identified Mail) — CNAME Selectors</span>
                  <span className="text-[10px] text-[#087F5B] bg-[#DDF5EC] px-2 py-0.2 rounded-full">3 CNAME Records</span>
                </div>
                <p className="text-[#71817D]">
                  Generate your custom 2048-bit DKIM selector key inside your Resend or SendGrid dashboard and publish the 3 matching CNAME records to authenticate cryptographic signatures.
                </p>
              </div>
            </div>
          </div>

          {/* Developer Integration Quick Guide */}
          <div className="bg-[#172B2A] text-white p-6 rounded-3xl border border-[#087F5B]/30 space-y-3">
            <h3 className="text-sm font-bold text-[#DDF5EC] flex items-center gap-2">
              <Code className="w-4 h-4 text-[#087F5B]" />
              <span>How to Trigger Emails in Application Code</span>
            </h3>
            <p className="text-xs text-[#A0A8A5] leading-relaxed">
              Import <code>executeEmailCommand</code> or <code>sendEmail</code> directly into any server route or business service:
            </p>
            <div className="bg-black/30 p-3 rounded-xl font-mono text-xs text-[#B7E36A] overflow-x-auto">
              <code>{`await executeEmailCommand({
  command: 'send_transaction_receipt',
  recipient: user.email,
  payload: {
    user_name: user.fullName,
    amount: '€10,000.00',
    property_title: property.title,
    tokens: '100 Tokens',
    transaction_id: 'TX-492104'
  },
  idempotencyKey: 'idemp-tx-492104'
});`}</code>
            </div>
          </div>
        </div>
      )}

      {/* Log Inspection Detail Modal */}
      {selectedLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-[#E4EEEA] space-y-4">
            <div className="flex items-center justify-between border-b border-[#E4EEEA] pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#087F5B]">Audit Log Entry</span>
                <h3 className="text-base font-bold text-[#172B2A]">{selectedLogModal.id}</h3>
              </div>
              <button onClick={() => setSelectedLogModal(null)} className="font-bold text-gray-500 hover:text-black cursor-pointer">✕</button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-[#F0F4F2]">
                <span className="text-[#71817D]">Recipient:</span>
                <span className="font-mono font-bold text-[#172B2A]">{selectedLogModal.recipient}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#F0F4F2]">
                <span className="text-[#71817D]">Subject:</span>
                <span className="font-bold text-[#172B2A] text-right">{selectedLogModal.subject}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#F0F4F2]">
                <span className="text-[#71817D]">Command:</span>
                <span className="font-mono text-[#087F5B] font-bold">{selectedLogModal.commandName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#F0F4F2]">
                <span className="text-[#71817D]">Delivery Latency:</span>
                <span className="font-mono">{selectedLogModal.deliveryTimeMs}ms</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#F0F4F2]">
                <span className="text-[#71817D]">Idempotency Key:</span>
                <span className="font-mono text-[10px]">{selectedLogModal.idempotencyKey || 'None'}</span>
              </div>
              {selectedLogModal.error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800">
                  <span className="font-bold block">Delivery Error:</span>
                  <span>{selectedLogModal.error}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-[#E4EEEA]">
              <button
                onClick={() => setSelectedLogModal(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
