import React, { useState, useEffect } from 'react';
import {
  LifeBuoy,
  Share2,
  FileText,
  Sliders,
  Smartphone,
  Search,
  Languages,
  Code2,
  Trash2,
  CheckCircle2,
  Clock,
  Send,
  Sparkles,
  RefreshCw,
  Server,
  Layers,
  Globe,
  Database,
  Plus,
  Download,
  Copy,
  ExternalLink,
  Shield,
  Eye,
  Coins,
  Archive,
  Tag,
  Settings,
  AlertCircle,
  FileSpreadsheet,
  Check,
  Building,
  Key,
  Users,
  Calendar,
  MessageSquare,
  Lock,
  Palette
} from 'lucide-react';
import { ledger } from '../../lib/ledger';
import { formatCurrency } from '../../lib/utils';

interface TemplateSectionProps {
  sectionKey: string;
  title: string;
  description: string;
  fromLocation: string;
  subPages?: string[];
  onActionSuccess?: (msg: string) => void;
}

export const AdminTemplateSectionView: React.FC<TemplateSectionProps> = ({
  sectionKey,
  title,
  description,
  fromLocation,
  subPages = [],
  onActionSuccess
}) => {
  const triggerSuccess = (msg: string) => {
    if (onActionSuccess) onActionSuccess(msg);
  };

  // -------------------------------------------------------------
  // 1. SUPPORT TICKETS STATE & WORKFLOW
  // -------------------------------------------------------------
  const [tickets, setTickets] = useState<Array<{
    id: string;
    user: string;
    email: string;
    subject: string;
    status: 'pending' | 'answered' | 'closed';
    priority: 'Low' | 'Medium' | 'High';
    date: string;
    category: string;
    messages: Array<{ sender: 'investor' | 'admin'; text: string; time: string }>;
  }>>(() => {
    const saved = localStorage.getItem('kretz_admin_tickets');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [
      {
        id: 'TCK-8041',
        user: 'Baron Henri de Montalembert',
        email: 'henri.montalembert@famille-office.fr',
        subject: 'SPV-PARIS-01 Notary Deed Certificate Request',
        status: 'pending',
        priority: 'High',
        date: 'Today, 10:14 CET',
        category: 'Legal & Custody',
        messages: [
          { sender: 'investor', text: 'Good morning, our family office tax counsel requires the counter-signed notary deed for our €125,000 allocation in Villa Montmorency.', time: '10:14' }
        ]
      },
      {
        id: 'TCK-8039',
        user: 'Elena Rostova',
        email: 'elena.rostova@geneva-wealth.ch',
        subject: 'USDC BEP-20 Settlement Confirmation delay',
        status: 'pending',
        priority: 'Medium',
        date: 'Today, 08:30 CET',
        category: 'Deposits & Crypto',
        messages: [
          { sender: 'investor', text: 'I transferred 50,000 USDC on BNB Smart Chain 45 minutes ago. Transaction hash 0x7c2a... awaiting credit on my dashboard.', time: '08:30' }
        ]
      },
      {
        id: 'TCK-7992',
        user: 'Alexander von Hapsburg',
        email: 'alexander@hapsburg-holdings.at',
        subject: 'Tier 3 Club Privé Access & Concierge Desk',
        status: 'answered',
        priority: 'Medium',
        date: 'Yesterday, 16:45 CET',
        category: 'Club Privé',
        messages: [
          { sender: 'investor', text: 'Could you please confirm if Monaco GP private yacht invitations are included in my Sovereign syndicate membership?', time: 'Yesterday' },
          { sender: 'admin', text: 'Confirmed, Monsieur von Hapsburg. Your credentials have been issued by the private concierge desk.', time: 'Yesterday 17:15' }
        ]
      },
      {
        id: 'TCK-7910',
        user: 'Marc-Antoine Delacroix',
        email: 'm.delacroix@paris-capital.com',
        subject: 'Annual 2025 Tax Dividend Statement (IFU)',
        status: 'closed',
        priority: 'Low',
        date: '08 Nov 2025',
        category: 'Tax & Reporting',
        messages: [
          { sender: 'investor', text: 'Thank you for sending the French IFU tax certificate.', time: '08 Nov' }
        ]
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('kretz_admin_tickets', JSON.stringify(tickets));
  }, [tickets]);

  const [ticketFilter, setTicketFilter] = useState<'all' | 'pending' | 'closed' | 'answered'>(() => {
    if (sectionKey.includes('pending')) return 'pending';
    if (sectionKey.includes('closed')) return 'closed';
    if (sectionKey.includes('answered')) return 'answered';
    return 'all';
  });
  const [activeTicketReply, setActiveTicketReply] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [simName, setSimName] = useState('');
  const [simEmail, setSimEmail] = useState('');
  const [simSubject, setSimSubject] = useState('');
  const [simCategory, setSimCategory] = useState('Deposits & Crypto');
  const [simPriority, setSimPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [simMsg, setSimMsg] = useState('');

  const handleSimulateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simSubject || !simMsg) return;
    const newId = `TCK-${Math.floor(8000 + Math.random() * 999)}`;
    const newTicket = {
      id: newId,
      user: simName || 'Accredited Investor',
      email: simEmail || 'investor@syndicate.eu',
      subject: simSubject,
      status: 'pending' as const,
      priority: simPriority,
      date: 'Just now',
      category: simCategory,
      messages: [{ sender: 'investor' as const, text: simMsg, time: 'Just now' }]
    };
    setTickets([newTicket, ...tickets]);
    setShowSimulateModal(false);
    setSimName('');
    setSimEmail('');
    setSimSubject('');
    setSimMsg('');
    triggerSuccess(`Inbound support ticket #${newId} created and placed in pending queue.`);
  };

  const handleReplyTicket = (id: string) => {
    if (!replyText.trim()) return;
    setTickets(prev => prev.map(t => {
      if (t.id === id) {
        return {
          ...t,
          status: 'answered' as const,
          messages: [...t.messages, { sender: 'admin', text: replyText.trim(), time: 'Just now' }]
        };
      }
      return t;
    }));
    setActiveTicketReply(null);
    setReplyText('');
    triggerSuccess(`Official reply dispatched to investor for ticket #${id}. Status set to Answered.`);
  };

  const handleToggleCloseTicket = (id: string) => {
    setTickets(prev => prev.map(t => {
      if (t.id === id) {
        const nextStatus = t.status === 'closed' ? 'pending' : 'closed';
        return { ...t, status: nextStatus };
      }
      return t;
    }));
    triggerSuccess(`Ticket #${id} status updated.`);
  };

  // -------------------------------------------------------------
  // 2. SPV TOKEN ISSUANCE STATE & WORKFLOW
  // -------------------------------------------------------------
  const [mintedTokens, setMintedTokens] = useState<Array<{
    id: string;
    ticker: string;
    propertyTitle: string;
    network: string;
    contractAddress: string;
    cap: number;
    circulating: number;
    pricePerToken: number;
    date: string;
  }>>(() => {
    const saved = localStorage.getItem('kretz_minted_tokens');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [
      {
        id: 'tok-1',
        ticker: 'KTZ-PARIS-01',
        propertyTitle: 'Hôtel Particulier Victor Hugo',
        network: 'Solana SPL',
        contractAddress: 'SoL94ktzHugo7pWb...Q9mK',
        cap: 1250000,
        circulating: 890000,
        pricePerToken: 1.0,
        date: '14 Oct 2025'
      },
      {
        id: 'tok-2',
        ticker: 'KTZ-ANTIBES-02',
        propertyTitle: 'Villa Cap d\'Antibes Waterfront',
        network: 'BNB Smart Chain (BEP20)',
        contractAddress: '0x8b3f114c029e92d...4Fa2',
        cap: 850000,
        circulating: 640000,
        pricePerToken: 1.0,
        date: '02 Nov 2025'
      },
      {
        id: 'tok-3',
        ticker: 'KTZ-GENEVA-03',
        propertyTitle: 'Geneva Lakeside Private Residence',
        network: 'ERC-3643 (Ethereum)',
        contractAddress: '0x33e891ab01fc12d...8921',
        cap: 2100000,
        circulating: 1450000,
        pricePerToken: 1.0,
        date: '10 Jan 2026'
      }
    ];
  });

  const propertiesList = ledger.getProperties();
  const [selectedPropertyId, setSelectedPropertyId] = useState(propertiesList[0]?.id || '1');
  const [issueTicker, setIssueTicker] = useState('KTZ-MONACO-04');
  const [issueNetwork, setIssueNetwork] = useState('BNB Smart Chain (BEP20)');
  const [issueCap, setIssueCap] = useState('500000');
  const [issueInitialAlloc, setIssueInitialAlloc] = useState('150000');

  const handleIssueTokens = (e: React.FormEvent) => {
    e.preventDefault();
    const prop = propertiesList.find(p => p.id === selectedPropertyId) || propertiesList[0];
    const newToken = {
      id: `tok-${Date.now()}`,
      ticker: issueTicker.toUpperCase(),
      propertyTitle: prop ? prop.title : 'Prime French Riviera SPV',
      network: issueNetwork,
      contractAddress: `0x${Math.random().toString(16).substring(2, 10)}...${Math.random().toString(16).substring(2, 6)}`,
      cap: parseInt(issueCap) || 500000,
      circulating: parseInt(issueInitialAlloc) || 100000,
      pricePerToken: 1.0,
      date: 'Today'
    };
    const updated = [newToken, ...mintedTokens];
    setMintedTokens(updated);
    localStorage.setItem('kretz_minted_tokens', JSON.stringify(updated));
    triggerSuccess(`Successfully issued ${Number(issueCap).toLocaleString()} ${newToken.ticker} tokens on ${issueNetwork}.`);
  };

  // -------------------------------------------------------------
  // 3. RESTORE PROPERTIES & MEDIA ARCHIVE
  // -------------------------------------------------------------
  const [archivedItems, setArchivedItems] = useState<Array<{
    id: string;
    title: string;
    type: 'Property' | 'Media' | 'Document';
    archivedDate: string;
    details: string;
  }>>(() => [
    {
      id: 'arch-1',
      title: 'Château de Courcelles SPV Listing (Draft 02)',
      type: 'Property',
      archivedDate: '04 Feb 2026',
      details: 'Historical 18th-century vineyard estate draft removed during restructuring.'
    },
    {
      id: 'arch-2',
      title: 'Saint-Tropez Drone Showcase 4K Master Video',
      type: 'Media',
      archivedDate: '28 Jan 2026',
      details: 'Aerial footage archive for Villa Pampelonne marketing campaign.'
    },
    {
      id: 'arch-3',
      title: 'Notary Custody Agreement Template v1.2 (Outdated)',
      type: 'Document',
      archivedDate: '15 Jan 2026',
      details: 'Superseded by v2.0 MiCA-compliant custody charter.'
    }
  ]);

  const handleRestoreItem = (id: string, title: string) => {
    setArchivedItems(prev => prev.filter(item => item.id !== id));
    triggerSuccess(`"${title}" restored to active platform database.`);
  };

  const handlePurgeItem = (id: string, title: string) => {
    setArchivedItems(prev => prev.filter(item => item.id !== id));
    triggerSuccess(`"${title}" permanently deleted from archive storage.`);
  };

  // -------------------------------------------------------------
  // 4. REFERRAL & AFFILIATE MANAGEMENT
  // -------------------------------------------------------------
  const [refTier1, setRefTier1] = useState('5.0');
  const [refTier2, setRefTier2] = useState('2.5');
  const [refTier3, setRefTier3] = useState('1.0');
  const [minSyndicateAlloc, setMinSyndicateAlloc] = useState('1000');
  const [cookieExpiryDays, setCookieExpiryDays] = useState('60');
  const [customAffiliateCode, setCustomAffiliateCode] = useState('FAMILY-OFFICE-VIP');
  const [copiedLink, setCopiedLink] = useState(false);

  const handleSaveReferralMatrix = () => {
    triggerSuccess('Affiliate commission tiers and syndicate disbursement matrix updated.');
  };

  const handleCopyAffiliateLink = () => {
    const url = `https://kretz.eu/?ref=${customAffiliateCode.trim() || 'VIP'}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    triggerSuccess('Affiliate referral link copied to clipboard.');
  };

  // -------------------------------------------------------------
  // 5. PLAN & TIME SCHEDULE MANAGE
  // -------------------------------------------------------------
  const [plans, setPlans] = useState([
    { id: 'p1', name: 'Micro Investor Syndicate', min: 500, max: 25000, yieldPa: '8.5%', payout: 'Monthly', status: 'Active' },
    { id: 'p2', name: 'High-Net-Worth Syndicate', min: 25000, max: 250000, yieldPa: '11.2%', payout: 'Monthly', status: 'Active' },
    { id: 'p3', name: 'Sovereign Family Office Tier', min: 250000, max: 2500000, yieldPa: '14.8%', payout: 'Daily Accrual', status: 'Active' }
  ]);
  const [cutoffTime, setCutoffTime] = useState('16:00 CET');
  const [dailyBatchRun, setDailyBatchRun] = useState('00:00 UTC');

  // -------------------------------------------------------------
  // 6. REPORTS & LOG EXPORT
  // -------------------------------------------------------------
  const [reportDateRange, setReportDateRange] = useState('30d');
  const [reportSearch, setReportSearch] = useState('');
  const allLedgerTransactions = ledger.getTransactions();

  const handleExportCSV = () => {
    try {
      const headers = ['ID,Type,Amount,Currency,Status,User,Date,Reference\n'];
      const rows = allLedgerTransactions.map(t =>
        `"${t.id}","${t.type}","${t.amount}","${t.currency}","${t.status}","${t.userId}","${t.createdAt}","${t.reference || ''}"`
      );
      const blob = new Blob([headers.concat(rows).join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kretz-financial-report-${reportDateRange}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      triggerSuccess('Financial report exported to CSV successfully.');
    } catch {
      triggerSuccess('CSV generation failed. Please try again.');
    }
  };

  const handleExportJSON = () => {
    try {
      const jsonStr = JSON.stringify(allLedgerTransactions, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kretz-audit-ledger-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      triggerSuccess('Complete ledger journal exported to JSON.');
    } catch {
      triggerSuccess('JSON export failed.');
    }
  };

  // -------------------------------------------------------------
  // 7. MARKETING & PROMOTIONAL TOOLS
  // -------------------------------------------------------------
  const [activeBannerSize, setActiveBannerSize] = useState<'728x90' | '300x250' | '1080x1920'>('728x90');
  const [copiedBannerCode, setCopiedBannerCode] = useState(false);

  const bannerEmbedSnippet = `<a href="https://kretz.eu?ref=PARTNER" target="_blank">\n  <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=728&q=80" alt="Kretz French Riviera Real Estate Syndicate" />\n</a>`;

  const handleCopyBannerCode = () => {
    navigator.clipboard.writeText(bannerEmbedSnippet);
    setCopiedBannerCode(true);
    setTimeout(() => setCopiedBannerCode(false), 2000);
    triggerSuccess('Banner embed HTML copied to clipboard.');
  };

  // -------------------------------------------------------------
  // 8. SUBSCRIBERS
  // -------------------------------------------------------------
  const [subscribers, setSubscribers] = useState([
    { id: 'sub-1', email: 'family.office@monaco.mc', date: 'Yesterday', tier: 'Sovereign', status: 'Active' },
    { id: 'sub-2', email: 'investments@zurich-wealth.ch', date: '3 days ago', tier: 'High-Net-Worth', status: 'Active' },
    { id: 'sub-3', email: 'lucas.dupont@deloitte.fr', date: '1 week ago', tier: 'Micro Investor', status: 'Active' },
    { id: 'sub-4', email: 'patrimoine@luxembourg-private.lu', date: '2 weeks ago', tier: 'Sovereign', status: 'Active' }
  ]);
  const [newSubEmail, setNewSubEmail] = useState('');
  const [newSubTier, setNewSubTier] = useState('High-Net-Worth');

  const handleAddSubscriber = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubEmail.trim()) return;
    setSubscribers([
      { id: `sub-${Date.now()}`, email: newSubEmail.trim(), date: 'Just now', tier: newSubTier, status: 'Active' },
      ...subscribers
    ]);
    setNewSubEmail('');
    triggerSuccess(`Subscriber "${newSubEmail}" added to platform dispatch list.`);
  };

  const handleRemoveSubscriber = (id: string, email: string) => {
    setSubscribers(prev => prev.filter(s => s.id !== id));
    triggerSuccess(`Subscriber "${email}" unsubscribed.`);
  };

  // -------------------------------------------------------------
  // 9. LANGUAGE & LOCALIZATION
  // -------------------------------------------------------------
  const [languages, setLanguages] = useState([
    { code: 'en', name: 'English (UK / US)', flag: '🇬🇧', coverage: '100%', isDefault: true, active: true },
    { code: 'fr', name: 'Français (French)', flag: '🇫🇷', coverage: '100%', isDefault: false, active: true },
    { code: 'de', name: 'Deutsch (German)', flag: '🇩🇪', coverage: '95%', isDefault: false, active: true },
    { code: 'es', name: 'Español (Spanish)', flag: '🇪🇸', coverage: '92%', isDefault: false, active: true },
    { code: 'ar', name: 'العربية (Arabic)', flag: '🇦🇪', coverage: '88%', isDefault: false, active: false }
  ]);

  const handleSetDefaultLanguage = (code: string) => {
    setLanguages(prev => prev.map(l => ({ ...l, isDefault: l.code === code })));
    triggerSuccess(`Default platform language switched to ${code.toUpperCase()}.`);
  };

  const handleToggleLanguageActive = (code: string) => {
    setLanguages(prev => prev.map(l => l.code === code ? { ...l, active: !l.active } : l));
    triggerSuccess(`Language ${code.toUpperCase()} status updated.`);
  };

  // -------------------------------------------------------------
  // 10. ACTIVE TEMPLATE SELECTOR
  // -------------------------------------------------------------
  const [activeThemeId, setActiveThemeId] = useState<string>(() => {
    return localStorage.getItem('kretz_active_theme') || 'executive';
  });

  const handleSelectTheme = (id: string, name: string) => {
    setActiveThemeId(id);
    localStorage.setItem('kretz_active_theme', id);
    triggerSuccess(`Active template switched to "${name}".`);
  };

  // -------------------------------------------------------------
  // 11. MANAGE PAGES
  // -------------------------------------------------------------
  const [pages, setPages] = useState([
    { path: '/', title: 'Executive Landing & Marketplace', status: 'Live', kycRequired: false },
    { path: '/marketplace', title: 'Fractional SPV Marketplace', status: 'Live', kycRequired: false },
    { path: '/dashboard', title: 'Investor Portfolio Dashboard', status: 'Live', kycRequired: true },
    { path: '/club', title: 'Club Privé Sovereign Concierge', status: 'Live', kycRequired: true },
    { path: '/insights', title: 'Market Intelligence & Notary Insights', status: 'Live', kycRequired: false },
    { path: '/about', title: 'Institutional Governance & Custody', status: 'Live', kycRequired: false }
  ]);

  const handleTogglePageStatus = (path: string) => {
    setPages(prev => prev.map(p => {
      if (p.path === path) {
        const next = p.status === 'Live' ? 'Maintenance' : 'Live';
        return { ...p, status: next };
      }
      return p;
    }));
    triggerSuccess(`Route "${path}" status updated.`);
  };

  // -------------------------------------------------------------
  // 12. SECTION CMS MANAGE
  // -------------------------------------------------------------
  const [selectedSectionKey, setSelectedSectionKey] = useState('Hero');
  const [sectionCmsData, setSectionCmsData] = useState<Record<string, { title: string; subtitle: string; body: string }>>(() => {
    const saved = localStorage.getItem('kretz_section_cms');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return {
      Hero: {
        title: 'Accredited European Real Estate Fractionalization',
        subtitle: 'Notary-governed SPV equity with institutional dividend distribution.',
        body: 'Invest in prime residential and commercial French real estate from €500. Protected by notarial deed in escrow custody.'
      },
      About: {
        title: 'Kretz Capital - Three Decades of Parisian Heritage',
        subtitle: 'The private family office trusted by European high-net-worth investors.',
        body: 'Combining French luxury real estate curation with blockchain ledger transparency and MiCA regulatory oversight.'
      },
      FAQ: {
        title: 'Frequently Asked Questions & Notarial Custody',
        subtitle: 'Everything you need to know about fractional SPV holdings.',
        body: 'Each property is purchased through a dedicated French Société Civile Immobilière (SCI). Investors own registered shares in the SPV.'
      },
      Footer: {
        title: 'Regulatory Disclaimers & Legal Jurisdiction',
        subtitle: 'Registered with the French Commercial Registry (RCS Paris).',
        body: 'Past performance does not guarantee future results. Real estate fractional shares involve liquidity considerations.'
      }
    };
  });

  const handleSaveSectionCms = () => {
    localStorage.setItem('kretz_section_cms', JSON.stringify(sectionCmsData));
    triggerSuccess(`CMS content for section "${selectedSectionKey}" saved and synchronized.`);
  };

  // -------------------------------------------------------------
  // 13. GLOBAL SITE SETTINGS & PLUGINS
  // -------------------------------------------------------------
  const [siteName, setSiteName] = useState('Kretz Private Real Estate Syndicate');
  const [legalEntity, setLegalEntity] = useState('Kretz Capital SAS - Paris, France');
  const [baseCurrency, setBaseCurrency] = useState('EUR');
  const [minInvestGlobal, setMinInvestGlobal] = useState('500');
  const [turnstileEnabled, setTurnstileEnabled] = useState(true);
  const [crispEnabled, setCrispEnabled] = useState(true);
  const [gaMeasurementId, setGaMeasurementId] = useState('G-KRETZ202688');
  const [sentryDsn, setSentryDsn] = useState('https://kretz@sentry.io/450912');
  const [metaTitle, setMetaTitle] = useState('Kretz Real Estate | Luxury European SPV Tokenization');
  const [metaDescription, setMetaDescription] = useState('Fractionalize prime French Riviera and Parisian real estate with notary-backed tokenized shares.');
  const [gdprEnabled, setGdprEnabled] = useState(true);
  const [gdprText, setGdprText] = useState('We use essential cryptographic cookies to secure transactions and ensure MiCA regulatory compliance.');
  const [smsGateway, setSmsGateway] = useState('Twilio');
  const [smsSenderId, setSmsSenderId] = useState('KRETZ-AUTH');
  const [holidayTradingFreeze, setHolidayTradingFreeze] = useState(true);

  // Custom CSS State
  const [customCss, setCustomCss] = useState<string>(() => {
    return localStorage.getItem('kretz_custom_admin_css') || '/* Custom Platform Styles */\n.kretz-custom-accent {\n  color: #3d7a58;\n}';
  });

  const handleSaveCss = () => {
    localStorage.setItem('kretz_custom_admin_css', customCss);
    triggerSuccess('Custom CSS stylesheet saved and applied successfully.');
  };

  const handleClearCache = () => {
    try {
      sessionStorage.clear();
      if ('caches' in window) {
        caches.keys().then((names) => {
          names.forEach((name) => caches.delete(name));
        });
      }
      triggerSuccess('Platform cache cleared successfully. Fresh assets reloaded.');
    } catch {
      triggerSuccess('Client session and component memory purged.');
    }
  };

  // =============================================================
  // RENDER ROUTING BY SECTION KEY
  // =============================================================

  // -------------------------------------------------------------
  // SUPPORT TICKETS
  // -------------------------------------------------------------
  if (sectionKey.startsWith('support-ticket')) {
    const filteredTickets = tickets.filter(t => {
      if (ticketFilter === 'all') return true;
      return t.status === ticketFilter;
    });

    return (
      <div className="space-y-4">
        <div className="p-4 rounded-2xl bg-white border border-[#e4e6e1] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-base font-bold text-[#1f2b28] flex items-center gap-2">
              <LifeBuoy className="w-5 h-5 text-[#3d7a58]" /> Investor Support & Concierge Tickets
            </h2>
            <p className="text-xs text-[#6b7773] mt-0.5">{description}</p>
          </div>
          <button
            onClick={() => setShowSimulateModal(true)}
            className="px-3.5 py-2 rounded-xl bg-[#3d7a58] text-white text-xs font-bold hover:bg-[#2f5a40] transition cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" /> Simulate Inbound Ticket
          </button>
        </div>

        {/* Modal for Simulating New Ticket */}
        {showSimulateModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#e4e6e1] space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-[#1f2b28]">Simulate Inbound Investor Ticket</h3>
                <button onClick={() => setShowSimulateModal(false)} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
              </div>
              <form onSubmit={handleSimulateTicket} className="space-y-3 text-xs">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Investor Full Name</label>
                  <input
                    type="text"
                    required
                    value={simName}
                    onChange={e => setSimName(e.target.value)}
                    placeholder="e.g. Comtesse Diane de Clèves"
                    className="w-full p-2.5 rounded-xl border border-[#e4e6e1] bg-[#f9faf8]"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Investor Email</label>
                  <input
                    type="email"
                    required
                    value={simEmail}
                    onChange={e => setSimEmail(e.target.value)}
                    placeholder="investor@geneva-office.ch"
                    className="w-full p-2.5 rounded-xl border border-[#e4e6e1] bg-[#f9faf8]"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Subject</label>
                  <input
                    type="text"
                    required
                    value={simSubject}
                    onChange={e => setSimSubject(e.target.value)}
                    placeholder="e.g. Dividend wire inquiry for Villa Cap d'Antibes"
                    className="w-full p-2.5 rounded-xl border border-[#e4e6e1] bg-[#f9faf8]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Category</label>
                    <select
                      value={simCategory}
                      onChange={e => setSimCategory(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-[#e4e6e1] bg-[#f9faf8]"
                    >
                      <option>Deposits & Crypto</option>
                      <option>Legal & Custody</option>
                      <option>Tax & Reporting</option>
                      <option>Club Privé</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Priority</label>
                    <select
                      value={simPriority}
                      onChange={e => setSimPriority(e.target.value as any)}
                      className="w-full p-2.5 rounded-xl border border-[#e4e6e1] bg-[#f9faf8]"
                    >
                      <option>Low</option>
                      <option>Medium</option>
                      <option>High</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Inbound Message</label>
                  <textarea
                    rows={3}
                    required
                    value={simMsg}
                    onChange={e => setSimMsg(e.target.value)}
                    placeholder="Details of the investor's inquiry..."
                    className="w-full p-2.5 rounded-xl border border-[#e4e6e1] bg-[#f9faf8]"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSimulateModal(false)}
                    className="px-4 py-2 rounded-xl border border-[#e4e6e1] text-gray-600 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#3d7a58] text-white font-bold hover:bg-[#2f5a40]"
                  >
                    Submit Ticket
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Ticket Filter Bar */}
        <div className="p-5 rounded-2xl bg-white border border-[#e4e6e1] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#e4e6e1]">
            <div className="text-xs text-[#6b7773]">
              Showing <span className="font-bold text-[#1f2b28]">{filteredTickets.length}</span> tickets
            </div>
            <div className="flex items-center gap-1.5 bg-[#f6f6f4] p-1 rounded-xl">
              {(['all', 'pending', 'answered', 'closed'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setTicketFilter(f)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize transition-colors cursor-pointer ${
                    ticketFilter === f ? 'bg-white text-[#1f2b28] shadow-xs' : 'text-[#6b7773] hover:text-[#1f2b28]'
                  }`}
                >
                  {f} {f === 'pending' && tickets.filter(t => t.status === 'pending').length > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full bg-[#6e2c3a] text-[#ffd9df] text-[10px]">
                      {tickets.filter(t => t.status === 'pending').length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {filteredTickets.length === 0 ? (
            <div className="py-12 text-center text-[#6b7773] text-xs space-y-2">
              <LifeBuoy className="w-8 h-8 mx-auto text-gray-300" />
              <p>No support tickets match the "{ticketFilter}" filter.</p>
              <button
                onClick={() => setShowSimulateModal(true)}
                className="mt-2 px-3 py-1.5 rounded-lg bg-[#3d7a58] text-white text-xs font-bold"
              >
                Create a test ticket
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTickets.map(t => (
                <div key={t.id} className="p-4 rounded-xl bg-[#f6f6f4] border border-[#e4e6e1] space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#1f2b28]">{t.id}</span>
                      <span className="text-xs font-bold text-[#1f2b28]">{t.subject}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        t.status === 'pending' ? 'bg-[#6e2c3a] text-[#ffd9df]' : t.status === 'answered' ? 'bg-[#2f5a40] text-[#cdeed2]' : 'bg-[#e4e6e1] text-[#6b7773]'
                      }`}>
                        {t.status}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#6b7773]">{t.date}</span>
                  </div>

                  <div className="text-xs text-[#6b7773] flex flex-wrap gap-x-4">
                    <span>Investor: <strong className="text-[#1f2b28]">{t.user}</strong> ({t.email})</span>
                    <span>Category: <strong>{t.category}</strong></span>
                    <span>Priority: <strong className={t.priority === 'High' ? 'text-rose-600' : 'text-[#1f2b28]'}>{t.priority}</strong></span>
                  </div>

                  {/* Messages Trail */}
                  <div className="mt-2 space-y-1.5 pt-2 border-t border-[#e4e6e1]">
                    {t.messages.map((m, idx) => (
                      <div key={idx} className={`p-2.5 rounded-lg text-xs ${
                        m.sender === 'admin' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-white text-gray-800 border border-gray-200'
                      }`}>
                        <div className="flex justify-between items-center mb-1 text-[10px] text-gray-500 font-semibold">
                          <span>{m.sender === 'admin' ? 'Administrative Desk' : t.user}</span>
                          <span>{m.time}</span>
                        </div>
                        <p>{m.text}</p>
                      </div>
                    ))}
                  </div>

                  {/* Action / Reply composer */}
                  {activeTicketReply === t.id ? (
                    <div className="pt-2 space-y-2">
                      <textarea
                        rows={3}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Type your official administrative response to the investor..."
                        className="w-full p-2.5 rounded-xl border border-[#e4e6e1] text-xs bg-white text-[#1f2b28] focus:outline-none focus:border-[#3d7a58]"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setActiveTicketReply(null)}
                          className="px-3 py-1 text-xs rounded-lg border border-[#e4e6e1] text-[#6b7773] cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleReplyTicket(t.id)}
                          className="px-3 py-1 text-xs font-bold rounded-lg bg-[#3d7a58] text-white flex items-center gap-1 cursor-pointer"
                        >
                          <Send className="w-3 h-3" /> Send Response
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2 flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setActiveTicketReply(t.id);
                          setReplyText('');
                        }}
                        className="px-3 py-1 text-xs font-semibold rounded-lg bg-white border border-[#e4e6e1] text-[#1f2b28] hover:bg-neutral-50 cursor-pointer"
                      >
                        Reply to Ticket
                      </button>
                      <button
                        onClick={() => handleToggleCloseTicket(t.id)}
                        className="px-3 py-1 text-xs font-semibold rounded-lg bg-white border border-[#e4e6e1] text-[#6b7773] hover:text-[#1f2b28] cursor-pointer"
                      >
                        {t.status === 'closed' ? 'Reopen Ticket' : 'Close Ticket'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // SPV TOKEN ISSUANCE DESK
  // -------------------------------------------------------------
  if (sectionKey === 'issuance') {
    return (
      <div className="space-y-5">
        <div className="p-4 rounded-2xl bg-white border border-[#e4e6e1] flex justify-between items-center">
          <div>
            <h2 className="text-base font-bold text-[#1f2b28] flex items-center gap-2">
              <Coins className="w-5 h-5 text-[#3d7a58]" /> Real Estate SPV Tokenization & Issuance Desk
            </h2>
            <p className="text-xs text-[#6b7773] mt-0.5">{description}</p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
            MiCA Compliant
          </span>
        </div>

        {/* Token Issuance Form */}
        <div className="p-5 rounded-2xl bg-white border border-[#e4e6e1] space-y-4">
          <h3 className="text-sm font-bold text-[#1f2b28]">Issue New SPV Fractional Asset Batch</h3>
          <form onSubmit={handleIssueTokens} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Target SPV Property Vehicle</label>
              <select
                value={selectedPropertyId}
                onChange={e => setSelectedPropertyId(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#e4e6e1] bg-[#f9faf8]"
              >
                {propertiesList.map(p => (
                  <option key={p.id} value={p.id}>{p.title} ({p.city || 'France'})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Blockchain Settlement Network</label>
              <select
                value={issueNetwork}
                onChange={e => setIssueNetwork(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#e4e6e1] bg-[#f9faf8]"
              >
                <option>Solana SPL (Fast Finality)</option>
                <option>BNB Smart Chain (BEP20)</option>
                <option>ERC-3643 (Permissioned Ethereum)</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Token Ticker / Symbol</label>
              <input
                type="text"
                value={issueTicker}
                onChange={e => setIssueTicker(e.target.value)}
                placeholder="e.g. KTZ-MONACO-04"
                className="w-full p-2.5 rounded-xl border border-[#e4e6e1] bg-[#f9faf8] font-mono"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Max Supply Token Cap (1 Token = €1.00)</label>
              <input
                type="number"
                value={issueCap}
                onChange={e => setIssueCap(e.target.value)}
                placeholder="500000"
                className="w-full p-2.5 rounded-xl border border-[#e4e6e1] bg-[#f9faf8]"
              />
            </div>
            <div className="md:col-span-2 flex justify-between items-center pt-2">
              <span className="text-gray-500 text-[11px]">
                Smart contract issuance registers directly into notary custody record.
              </span>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#3d7a58] text-white font-bold hover:bg-[#2f5a40] transition cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                <Coins className="w-4 h-4" /> Issue SPV Token Batch
              </button>
            </div>
          </form>
        </div>

        {/* Minted Tokens Table */}
        <div className="p-5 rounded-2xl bg-white border border-[#e4e6e1] space-y-3">
          <h3 className="text-sm font-bold text-[#1f2b28]">Active SPV Token Registry</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[#e4e6e1] text-[#6b7773]">
                  <th className="py-2.5 font-semibold">Ticker</th>
                  <th className="py-2.5 font-semibold">Underlying Property</th>
                  <th className="py-2.5 font-semibold">Network</th>
                  <th className="py-2.5 font-semibold">Contract Address</th>
                  <th className="py-2.5 font-semibold">Cap Supply</th>
                  <th className="py-2.5 font-semibold">Circulating</th>
                  <th className="py-2.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e4e6e1]">
                {mintedTokens.map(tok => (
                  <tr key={tok.id} className="hover:bg-neutral-50/60">
                    <td className="py-3 font-mono font-bold text-[#1f2b28]">{tok.ticker}</td>
                    <td className="py-3 text-gray-800">{tok.propertyTitle}</td>
                    <td className="py-3 text-gray-600">{tok.network}</td>
                    <td className="py-3 font-mono text-gray-500">{tok.contractAddress}</td>
                    <td className="py-3 font-semibold text-gray-800">{tok.cap.toLocaleString()} tokens</td>
                    <td className="py-3 text-emerald-700 font-semibold">{tok.circulating.toLocaleString()} tokens</td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => triggerSuccess(`Allocation window opened for ${tok.ticker}.`)}
                        className="px-2.5 py-1 rounded-lg border border-[#e4e6e1] bg-white text-gray-700 hover:text-black text-[11px] font-semibold cursor-pointer"
                      >
                        Allocate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RESTORE PROPERTIES & MEDIA ARCHIVE
  // -------------------------------------------------------------
  if (sectionKey === 'restore') {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-2xl bg-white border border-[#e4e6e1] flex justify-between items-center">
          <div>
            <h2 className="text-base font-bold text-[#1f2b28] flex items-center gap-2">
              <Archive className="w-5 h-5 text-[#3d7a58]" /> Properties & Media Archival Storage
            </h2>
            <p className="text-xs text-[#6b7773] mt-0.5">{description}</p>
          </div>
          <button
            onClick={() => {
              setArchivedItems([]);
              triggerSuccess('Archival bin emptied completely.');
            }}
            className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold cursor-pointer"
          >
            Empty Trash Bin
          </button>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#e4e6e1] space-y-3">
          <h3 className="text-sm font-bold text-[#1f2b28]">Archived Platform Assets</h3>
          {archivedItems.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400 space-y-2">
              <Archive className="w-8 h-8 mx-auto text-gray-300" />
              <p>Archive is empty. No archived properties or media waiting for restoration.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {archivedItems.map(item => (
                <div key={item.id} className="p-3.5 rounded-xl bg-[#f9faf8] border border-[#e4e6e1] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#1f2b28]">{item.title}</span>
                      <span className="px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 text-[10px] font-bold">
                        {item.type}
                      </span>
                    </div>
                    <p className="text-[#6b7773] mt-0.5">{item.details}</p>
                    <span className="text-[10px] text-gray-400">Archived on {item.archivedDate}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleRestoreItem(item.id, item.title)}
                      className="px-3 py-1.5 rounded-lg bg-[#3d7a58] text-white font-bold hover:bg-[#2f5a40] cursor-pointer"
                    >
                      Restore to Marketplace
                    </button>
                    <button
                      onClick={() => handlePurgeItem(item.id, item.title)}
                      className="px-2.5 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:text-rose-600 cursor-pointer"
                    >
                      Purge
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // REFERRAL MANAGEMENT & PLAN MANAGE
  // -------------------------------------------------------------
  if (sectionKey === 'manage-referral' || sectionKey.startsWith('plan-manage')) {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-2xl bg-white border border-[#e4e6e1]">
          <h2 className="text-base font-bold text-[#1f2b28] flex items-center gap-2">
            <Share2 className="w-5 h-5 text-[#3d7a58]" /> Syndicate Referral Matrix & Plan Configuration
          </h2>
          <p className="text-xs text-[#6b7773] mt-0.5">{description}</p>
        </div>

        {/* Affiliate Matrix Card */}
        <div className="p-5 rounded-2xl bg-white border border-[#e4e6e1] space-y-4 text-xs">
          <div className="flex justify-between items-center pb-2 border-b border-[#e4e6e1]">
            <h3 className="text-sm font-bold text-[#1f2b28]">Multi-Tier Commission Matrix</h3>
            <button
              onClick={handleSaveReferralMatrix}
              className="px-4 py-2 rounded-xl bg-[#3d7a58] text-white font-bold hover:bg-[#2f5a40] cursor-pointer"
            >
              Update Referral Matrix
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3.5 rounded-xl bg-[#f9faf8] border border-[#e4e6e1] space-y-1">
              <label className="block font-bold text-gray-700">Tier 1 Direct Referral</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  value={refTier1}
                  onChange={e => setRefTier1(e.target.value)}
                  className="w-full p-2 rounded-lg border border-gray-300 bg-white font-bold text-emerald-800"
                />
                <span className="font-bold">%</span>
              </div>
              <p className="text-[11px] text-gray-500">Credited on immediate investor allocations.</p>
            </div>
            <div className="p-3.5 rounded-xl bg-[#f9faf8] border border-[#e4e6e1] space-y-1">
              <label className="block font-bold text-gray-700">Tier 2 Secondary Referral</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  value={refTier2}
                  onChange={e => setRefTier2(e.target.value)}
                  className="w-full p-2 rounded-lg border border-gray-300 bg-white font-bold text-emerald-800"
                />
                <span className="font-bold">%</span>
              </div>
              <p className="text-[11px] text-gray-500">Credited on sub-affiliate network allocations.</p>
            </div>
            <div className="p-3.5 rounded-xl bg-[#f9faf8] border border-[#e4e6e1] space-y-1">
              <label className="block font-bold text-gray-700">Tier 3 Syndicate Partner</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  value={refTier3}
                  onChange={e => setRefTier3(e.target.value)}
                  className="w-full p-2 rounded-lg border border-gray-300 bg-white font-bold text-emerald-800"
                />
                <span className="font-bold">%</span>
              </div>
              <p className="text-[11px] text-gray-500">Disbursed to accredited institutional syndicates.</p>
            </div>
          </div>

          {/* Affiliate link test tool */}
          <div className="pt-3 border-t border-[#e4e6e1] space-y-2">
            <h4 className="font-bold text-gray-800">VIP Affiliate Link Generator</h4>
            <div className="flex gap-2">
              <input
                type="text"
                value={customAffiliateCode}
                onChange={e => setCustomAffiliateCode(e.target.value)}
                placeholder="Enter affiliate code"
                className="p-2.5 rounded-xl border border-gray-300 bg-[#f9faf8] text-xs font-mono w-64"
              />
              <button
                onClick={handleCopyAffiliateLink}
                className="px-4 py-2 rounded-xl bg-gray-900 text-white font-bold hover:bg-black flex items-center gap-1.5 cursor-pointer"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedLink ? 'Link Copied' : 'Copy Affiliate Link'}
              </button>
            </div>
          </div>
        </div>

        {/* Investment Plans Matrix */}
        <div className="p-5 rounded-2xl bg-white border border-[#e4e6e1] space-y-3 text-xs">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-[#1f2b28]">Syndicate Investment Tiers & Settlement Schedules</h3>
            <button
              onClick={() => triggerSuccess('New syndicate investment tier created.')}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 cursor-pointer"
            >
              + Add Tier
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#e4e6e1] text-[#6b7773]">
                  <th className="py-2 font-semibold">Tier Plan</th>
                  <th className="py-2 font-semibold">Minimum Alloc</th>
                  <th className="py-2 font-semibold">Max Alloc</th>
                  <th className="py-2 font-semibold">Projected Yield p.a.</th>
                  <th className="py-2 font-semibold">Yield Frequency</th>
                  <th className="py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e4e6e1]">
                {plans.map(p => (
                  <tr key={p.id}>
                    <td className="py-2.5 font-bold text-[#1f2b28]">{p.name}</td>
                    <td className="py-2.5">{formatCurrency(p.min)}</td>
                    <td className="py-2.5">{formatCurrency(p.max)}</td>
                    <td className="py-2.5 font-bold text-emerald-700">{p.yieldPa}</td>
                    <td className="py-2.5">{p.payout}</td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // REPORTS DESK & LOGS EXPORT
  // -------------------------------------------------------------
  if (sectionKey.startsWith('report')) {
    const filteredTx = allLedgerTransactions.filter(t => {
      if (reportSearch) {
        const s = reportSearch.toLowerCase();
        return (t.id && t.id.toLowerCase().includes(s)) || (t.userId && t.userId.toLowerCase().includes(s));
      }
      return true;
    });

    return (
      <div className="space-y-4">
        <div className="p-4 rounded-2xl bg-white border border-[#e4e6e1] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-base font-bold text-[#1f2b28] flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-[#3d7a58]" /> Financial Journal & Audit Reports Desk
            </h2>
            <p className="text-xs text-[#6b7773] mt-0.5">{description}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl bg-[#3d7a58] text-white text-xs font-bold hover:bg-[#2f5a40] transition cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
            <button
              onClick={handleExportJSON}
              className="px-3.5 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-black transition cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" /> Export JSON
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="p-5 rounded-2xl bg-white border border-[#e4e6e1] space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search transaction ID or investor..."
                value={reportSearch}
                onChange={e => setReportSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#e4e6e1] text-xs bg-[#f9faf8]"
              />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-500 font-semibold">Range:</span>
              {(['24h', '7d', '30d', 'all'] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setReportDateRange(r)}
                  className={`px-3 py-1 rounded-lg uppercase font-semibold cursor-pointer ${
                    reportDateRange === r ? 'bg-[#3d7a58] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#e4e6e1] text-[#6b7773]">
                  <th className="py-2.5 font-semibold">Transaction ID</th>
                  <th className="py-2.5 font-semibold">Type</th>
                  <th className="py-2.5 font-semibold">Amount</th>
                  <th className="py-2.5 font-semibold">Investor</th>
                  <th className="py-2.5 font-semibold">Timestamp</th>
                  <th className="py-2.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e4e6e1]">
                {filteredTx.slice(0, 15).map(tx => (
                  <tr key={tx.id} className="hover:bg-neutral-50/60">
                    <td className="py-3 font-mono font-bold text-[#1f2b28]">{tx.id}</td>
                    <td className="py-3 capitalize text-gray-700">{tx.type}</td>
                    <td className="py-3 font-bold text-[#1f2b28]">
                      {formatCurrency(tx.amount || 0, tx.currency || 'EUR')}
                    </td>
                    <td className="py-3 font-mono text-gray-500">{tx.userId}</td>
                    <td className="py-3 text-gray-500">{tx.createdAt}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        tx.status === 'completed' || tx.status === 'approved' ? 'bg-emerald-50 text-emerald-700' :
                        tx.status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // PROMOTIONAL TOOLS & MARKETING
  // -------------------------------------------------------------
  if (sectionKey === 'promotional-tool') {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-2xl bg-white border border-[#e4e6e1]">
          <h2 className="text-base font-bold text-[#1f2b28] flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#3d7a58]" /> Syndicate Marketing & Promotional Kit
          </h2>
          <p className="text-xs text-[#6b7773] mt-0.5">{description}</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#e4e6e1] space-y-4 text-xs">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h3 className="text-sm font-bold text-[#1f2b28]">Campaign Banner Assets</h3>
            <div className="flex gap-2">
              {(['728x90', '300x250', '1080x1920'] as const).map(sz => (
                <button
                  key={sz}
                  onClick={() => setActiveBannerSize(sz)}
                  className={`px-3 py-1 rounded-lg font-semibold cursor-pointer ${
                    activeBannerSize === sz ? 'bg-black text-white' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-neutral-900 text-white flex items-center justify-between">
            <div>
              <p className="font-bold text-sm">French Riviera Luxury Real Estate SPVs</p>
              <p className="text-xs text-neutral-400">Institutional yield • Notary custody • MiCA registered</p>
            </div>
            <button
              onClick={handleCopyBannerCode}
              className="px-4 py-2 rounded-xl bg-[#3d7a58] text-white font-bold hover:bg-[#2f5a40] flex items-center gap-1.5 cursor-pointer"
            >
              {copiedBannerCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedBannerCode ? 'Code Copied' : 'Copy Embed Code'}
            </button>
          </div>

          <div className="space-y-2">
            <label className="block font-bold text-gray-700">Embed Snippet HTML</label>
            <pre className="p-3 rounded-xl bg-[#f6f6f4] border border-[#e4e6e1] font-mono text-[11px] text-gray-800 overflow-x-auto">
              {bannerEmbedSnippet}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // SUBSCRIBERS
  // -------------------------------------------------------------
  if (sectionKey === 'subscribers') {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-2xl bg-white border border-[#e4e6e1] flex justify-between items-center">
          <div>
            <h2 className="text-base font-bold text-[#1f2b28] flex items-center gap-2">
              <Users className="w-5 h-5 text-[#3d7a58]" /> Investor Newsletter & Alert Subscribers
            </h2>
            <p className="text-xs text-[#6b7773] mt-0.5">{description}</p>
          </div>
          <button
            onClick={() => {
              const csv = 'Email,Tier,Status,Date\n' + subscribers.map(s => `"${s.email}","${s.tier}","${s.status}","${s.date}"`).join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'kretz-subscribers.csv';
              document.body.appendChild(a);
              a.click();
              a.remove();
              triggerSuccess('Subscribers list exported.');
            }}
            className="px-3.5 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-black cursor-pointer flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>

        {/* Add Subscriber Form */}
        <div className="p-5 rounded-2xl bg-white border border-[#e4e6e1] space-y-3 text-xs">
          <h3 className="text-sm font-bold text-[#1f2b28]">Add New Subscriber</h3>
          <form onSubmit={handleAddSubscriber} className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              required
              placeholder="investor@familyoffice.eu"
              value={newSubEmail}
              onChange={e => setNewSubEmail(e.target.value)}
              className="flex-1 p-2.5 rounded-xl border border-[#e4e6e1] bg-[#f9faf8]"
            />
            <select
              value={newSubTier}
              onChange={e => setNewSubTier(e.target.value)}
              className="p-2.5 rounded-xl border border-[#e4e6e1] bg-[#f9faf8]"
            >
              <option>Sovereign Family Office</option>
              <option>High-Net-Worth</option>
              <option>Micro Investor</option>
            </select>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#3d7a58] text-white font-bold hover:bg-[#2f5a40] cursor-pointer"
            >
              Add Subscriber
            </button>
          </form>
        </div>

        {/* Subscribers Table */}
        <div className="p-5 rounded-2xl bg-white border border-[#e4e6e1] space-y-3 text-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#e4e6e1] text-[#6b7773]">
                  <th className="py-2.5 font-semibold">Subscriber Email</th>
                  <th className="py-2.5 font-semibold">Investor Tier</th>
                  <th className="py-2.5 font-semibold">Subscribed Date</th>
                  <th className="py-2.5 font-semibold">Status</th>
                  <th className="py-2.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e4e6e1]">
                {subscribers.map(s => (
                  <tr key={s.id}>
                    <td className="py-3 font-semibold text-[#1f2b28]">{s.email}</td>
                    <td className="py-3">{s.tier}</td>
                    <td className="py-3 text-gray-500">{s.date}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleRemoveSubscriber(s.id, s.email)}
                        className="text-rose-600 hover:text-rose-800 text-[11px] font-semibold cursor-pointer"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // LANGUAGE & LOCALIZATION
  // -------------------------------------------------------------
  if (sectionKey === 'language') {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-2xl bg-white border border-[#e4e6e1]">
          <h2 className="text-base font-bold text-[#1f2b28] flex items-center gap-2">
            <Languages className="w-5 h-5 text-[#3d7a58]" /> Multi-Lingual Platform Localization
          </h2>
          <p className="text-xs text-[#6b7773] mt-0.5">{description}</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#e4e6e1] space-y-3 text-xs">
          <div className="flex justify-between items-center pb-2 border-b border-[#e4e6e1]">
            <h3 className="text-sm font-bold text-[#1f2b28]">Configured Languages</h3>
            <button
              onClick={() => triggerSuccess('Auto-translation synchronization initiated.')}
              className="px-3 py-1.5 rounded-xl bg-[#3d7a58] text-white font-bold hover:bg-[#2f5a40] cursor-pointer"
            >
              Sync Missing Keys
            </button>
          </div>
          <div className="space-y-2">
            {languages.map(l => (
              <div key={l.code} className="p-3 rounded-xl bg-[#f9faf8] border border-[#e4e6e1] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{l.flag}</span>
                  <div>
                    <span className="font-bold text-[#1f2b28]">{l.name}</span>
                    <span className="ml-2 font-mono text-gray-500 uppercase text-[10px]">[{l.code}]</span>
                    {l.isDefault && (
                      <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        Default
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 font-semibold">{l.coverage} translated</span>
                  {!l.isDefault && (
                    <button
                      onClick={() => handleSetDefaultLanguage(l.code)}
                      className="px-2.5 py-1 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-[11px] font-semibold cursor-pointer"
                    >
                      Make Default
                    </button>
                  )}
                  <button
                    onClick={() => handleToggleLanguageActive(l.code)}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                      l.active ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {l.active ? 'Active' : 'Disabled'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // ACTIVE TEMPLATE
  // -------------------------------------------------------------
  if (sectionKey === 'active-template') {
    const themes = [
      {
        id: 'executive',
        name: 'Executive Burgundy & Heritage Gold',
        desc: 'Traditional French private banking aesthetic with deep forest slate, burgundy accents, and gold typography.',
        colors: ['#0d161d', '#6e2c3a', '#cfa15c']
      },
      {
        id: 'clean',
        name: 'Minimal Clean Architectural',
        desc: 'High-contrast modern monochrome with Swiss typographic precision and airy whitespace.',
        colors: ['#ffffff', '#1a1a1a', '#e5e7eb']
      },
      {
        id: 'fintech',
        name: 'Hyper-Fintech Terminal',
        desc: 'High-frequency institutional terminal styling with deep sapphire navy and emerald telemetry.',
        colors: ['#0a0f1d', '#10b981', '#3b82f6']
      }
    ];

    return (
      <div className="space-y-4">
        <div className="p-4 rounded-2xl bg-white border border-[#e4e6e1]">
          <h2 className="text-base font-bold text-[#1f2b28] flex items-center gap-2">
            <Palette className="w-5 h-5 text-[#3d7a58]" /> Platform Theme & Active Template
          </h2>
          <p className="text-xs text-[#6b7773] mt-0.5">{description}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {themes.map(t => {
            const isSelected = activeThemeId === t.id;
            return (
              <div
                key={t.id}
                className={`p-5 rounded-2xl border transition-all ${
                  isSelected ? 'bg-white border-[#3d7a58] ring-2 ring-[#3d7a58]/20 shadow-md' : 'bg-[#f9faf8] border-[#e4e6e1]'
                }`}
              >
                <div className="flex justify-between items-center mb-3">
                  <div className="flex gap-1.5">
                    {t.colors.map((c, i) => (
                      <span key={i} className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  {isSelected && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                      Active
                    </span>
                  )}
                </div>
                <h4 className="font-bold text-sm text-[#1f2b28] mb-1">{t.name}</h4>
                <p className="text-gray-500 mb-4 leading-relaxed">{t.desc}</p>
                <button
                  onClick={() => handleSelectTheme(t.id, t.name)}
                  className={`w-full py-2 rounded-xl font-bold cursor-pointer transition ${
                    isSelected ? 'bg-[#3d7a58] text-white' : 'bg-white border border-gray-300 text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  {isSelected ? 'Current Active Theme' : 'Activate Theme'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // MANAGE PAGES & SECTION CMS
  // -------------------------------------------------------------
  if (sectionKey === 'manage-pages' || sectionKey.startsWith('section-manage')) {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-2xl bg-white border border-[#e4e6e1]">
          <h2 className="text-base font-bold text-[#1f2b28] flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#3d7a58]" /> Website Routing & Section CMS Content Editor
          </h2>
          <p className="text-xs text-[#6b7773] mt-0.5">{description}</p>
        </div>

        {/* Section CMS Editor */}
        <div className="p-5 rounded-2xl bg-white border border-[#e4e6e1] space-y-4 text-xs">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2 border-b border-[#e4e6e1]">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-700">Select Section to Edit:</span>
              <select
                value={selectedSectionKey}
                onChange={e => setSelectedSectionKey(e.target.value)}
                className="p-2 rounded-xl border border-gray-300 bg-[#f9faf8] font-bold"
              >
                {Object.keys(sectionCmsData).map(k => (
                  <option key={k} value={k}>{k} Section</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleSaveSectionCms}
              className="px-4 py-2 rounded-xl bg-[#3d7a58] text-white font-bold hover:bg-[#2f5a40] cursor-pointer"
            >
              Save Section Content
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Section Title</label>
              <input
                type="text"
                value={sectionCmsData[selectedSectionKey]?.title || ''}
                onChange={e => setSectionCmsData({
                  ...sectionCmsData,
                  [selectedSectionKey]: { ...sectionCmsData[selectedSectionKey], title: e.target.value }
                })}
                className="w-full p-2.5 rounded-xl border border-gray-300 bg-[#f9faf8]"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Subtitle / Lead</label>
              <input
                type="text"
                value={sectionCmsData[selectedSectionKey]?.subtitle || ''}
                onChange={e => setSectionCmsData({
                  ...sectionCmsData,
                  [selectedSectionKey]: { ...sectionCmsData[selectedSectionKey], subtitle: e.target.value }
                })}
                className="w-full p-2.5 rounded-xl border border-gray-300 bg-[#f9faf8]"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Body Text Content</label>
              <textarea
                rows={4}
                value={sectionCmsData[selectedSectionKey]?.body || ''}
                onChange={e => setSectionCmsData({
                  ...sectionCmsData,
                  [selectedSectionKey]: { ...sectionCmsData[selectedSectionKey], body: e.target.value }
                })}
                className="w-full p-2.5 rounded-xl border border-gray-300 bg-[#f9faf8]"
              />
            </div>
          </div>
        </div>

        {/* Pages Status Table */}
        <div className="p-5 rounded-2xl bg-white border border-[#e4e6e1] space-y-3 text-xs">
          <h3 className="text-sm font-bold text-[#1f2b28]">Platform Route Access & Maintenance Toggles</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#e4e6e1] text-[#6b7773]">
                  <th className="py-2.5 font-semibold">Route Path</th>
                  <th className="py-2.5 font-semibold">Page Title</th>
                  <th className="py-2.5 font-semibold">MiCA Gate</th>
                  <th className="py-2.5 font-semibold">Status</th>
                  <th className="py-2.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e4e6e1]">
                {pages.map(p => (
                  <tr key={p.path}>
                    <td className="py-3 font-mono font-bold text-[#1f2b28]">{p.path}</td>
                    <td className="py-3 text-gray-700">{p.title}</td>
                    <td className="py-3">
                      {p.kycRequired ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-bold">KYC Required</span>
                      ) : (
                        <span className="text-gray-400 text-[11px]">Public</span>
                      )}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        p.status === 'Live' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleTogglePageStatus(p.path)}
                        className="px-2.5 py-1 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-[11px] font-semibold cursor-pointer"
                      >
                        Toggle {p.status === 'Live' ? 'Maintenance' : 'Live'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // SITE SETTINGS, LOGO, PLUGINS, SEO, SMS, HOLIDAYS, GDPR
  // -------------------------------------------------------------
  if (
    sectionKey === 'settings' ||
    sectionKey === 'logo-icon-setting' ||
    sectionKey === 'plugins' ||
    sectionKey === 'seo' ||
    sectionKey.startsWith('sms-manager') ||
    sectionKey === 'holiday-setting' ||
    sectionKey === 'gdpr-cookie'
  ) {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-2xl bg-white border border-[#e4e6e1] flex justify-between items-center">
          <div>
            <h2 className="text-base font-bold text-[#1f2b28] flex items-center gap-2">
              <Settings className="w-5 h-5 text-[#3d7a58]" /> {title}
            </h2>
            <p className="text-xs text-[#6b7773] mt-0.5">{description}</p>
          </div>
          <button
            onClick={() => triggerSuccess(`Settings for "${title}" saved successfully.`)}
            className="px-4 py-2 rounded-xl bg-[#3d7a58] text-white text-xs font-bold hover:bg-[#2f5a40] cursor-pointer"
          >
            Save All Settings
          </button>
        </div>

        {/* Global Settings */}
        {sectionKey === 'settings' && (
          <div className="p-5 rounded-2xl bg-white border border-[#e4e6e1] space-y-4 text-xs">
            <h3 className="text-sm font-bold text-[#1f2b28]">Platform Parameters</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Platform Brand Name</label>
                <input
                  type="text"
                  value={siteName}
                  onChange={e => setSiteName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-300 bg-[#f9faf8]"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Legal Registered Entity</label>
                <input
                  type="text"
                  value={legalEntity}
                  onChange={e => setLegalEntity(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-300 bg-[#f9faf8]"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Base Currency</label>
                <select
                  value={baseCurrency}
                  onChange={e => setBaseCurrency(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-300 bg-[#f9faf8]"
                >
                  <option value="EUR">EUR (€) - European Euro</option>
                  <option value="CHF">CHF (Fr.) - Swiss Franc</option>
                  <option value="USD">USD ($) - US Dollar</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Minimum Fractional Investment (€)</label>
                <input
                  type="number"
                  value={minInvestGlobal}
                  onChange={e => setMinInvestGlobal(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-300 bg-[#f9faf8]"
                />
              </div>
            </div>
          </div>
        )}

        {/* Logo and Icon Setting */}
        {sectionKey === 'logo-icon-setting' && (
          <div className="p-5 rounded-2xl bg-white border border-[#e4e6e1] space-y-4 text-xs">
            <h3 className="text-sm font-bold text-[#1f2b28]">Brand Assets & Favicons</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[#f9faf8] border border-[#e4e6e1] space-y-2">
                <span className="font-bold text-gray-800">Primary Header Logo</span>
                <p className="text-gray-500 text-[11px]">SVG or PNG with transparent background.</p>
                <div className="p-3 bg-neutral-900 rounded-lg flex items-center justify-center">
                  <span className="font-serif text-lg tracking-widest text-[#cfa15c]">K R E T Z</span>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-[#f9faf8] border border-[#e4e6e1] space-y-2">
                <span className="font-bold text-gray-800">SPV Notary Seal Stamp</span>
                <p className="text-gray-500 text-[11px]">Watermark for investor certificates.</p>
                <div className="p-3 bg-neutral-100 rounded-lg flex items-center justify-center">
                  <span className="font-mono text-xs text-neutral-600 font-bold">RCS PARIS • NOTAIRE SCEAU</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Plugins and Integrations */}
        {sectionKey === 'plugins' && (
          <div className="p-5 rounded-2xl bg-white border border-[#e4e6e1] space-y-4 text-xs">
            <h3 className="text-sm font-bold text-[#1f2b28]">Active Security & Analytics Plugins</h3>
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-[#f9faf8] border border-[#e4e6e1] flex items-center justify-between">
                <div>
                  <span className="font-bold text-gray-800">Cloudflare Turnstile Bot Defense</span>
                  <p className="text-gray-500 text-[11px]">Non-intrusive CAPTCHA protection on login and deposit forms.</p>
                </div>
                <button
                  onClick={() => {
                    setTurnstileEnabled(!turnstileEnabled);
                    triggerSuccess(`Turnstile ${!turnstileEnabled ? 'enabled' : 'disabled'}.`);
                  }}
                  className={`px-3 py-1 rounded-lg font-bold cursor-pointer ${
                    turnstileEnabled ? 'bg-emerald-600 text-white' : 'bg-gray-300 text-gray-700'
                  }`}
                >
                  {turnstileEnabled ? 'Active' : 'Disabled'}
                </button>
              </div>
              <div className="p-3.5 rounded-xl bg-[#f9faf8] border border-[#e4e6e1] flex items-center justify-between">
                <div>
                  <span className="font-bold text-gray-800">Crisp Live Concierge Widget</span>
                  <p className="text-gray-500 text-[11px]">Direct private chat for high-net-worth investors.</p>
                </div>
                <button
                  onClick={() => {
                    setCrispEnabled(!crispEnabled);
                    triggerSuccess(`Crisp Concierge ${!crispEnabled ? 'enabled' : 'disabled'}.`);
                  }}
                  className={`px-3 py-1 rounded-lg font-bold cursor-pointer ${
                    crispEnabled ? 'bg-emerald-600 text-white' : 'bg-gray-300 text-gray-700'
                  }`}
                >
                  {crispEnabled ? 'Active' : 'Disabled'}
                </button>
              </div>
              <div className="p-3.5 rounded-xl bg-[#f9faf8] border border-[#e4e6e1] space-y-2">
                <span className="font-bold text-gray-800">Google Analytics 4 Tracking ID</span>
                <input
                  type="text"
                  value={gaMeasurementId}
                  onChange={e => setGaMeasurementId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-300 bg-white font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* SEO */}
        {sectionKey === 'seo' && (
          <div className="p-5 rounded-2xl bg-white border border-[#e4e6e1] space-y-4 text-xs">
            <h3 className="text-sm font-bold text-[#1f2b28]">Search Engine & Social Media Metadata</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Global Meta Title</label>
                <input
                  type="text"
                  value={metaTitle}
                  onChange={e => setMetaTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-300 bg-[#f9faf8]"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Global Meta Description</label>
                <textarea
                  rows={3}
                  value={metaDescription}
                  onChange={e => setMetaDescription(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-300 bg-[#f9faf8]"
                />
              </div>
            </div>
          </div>
        )}

        {/* SMS Manager */}
        {sectionKey.startsWith('sms-manager') && (
          <div className="p-5 rounded-2xl bg-white border border-[#e4e6e1] space-y-4 text-xs">
            <h3 className="text-sm font-bold text-[#1f2b28]">SMS Gateway & Two-Factor Delivery</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">SMS Delivery Route</label>
                <select
                  value={smsGateway}
                  onChange={e => setSmsGateway(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-300 bg-[#f9faf8]"
                >
                  <option>Twilio Global SMS</option>
                  <option>Infobip European Direct</option>
                  <option>AWS SNS Enterprise</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Sender Alpha ID</label>
                <input
                  type="text"
                  value={smsSenderId}
                  onChange={e => setSmsSenderId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-300 bg-[#f9faf8] font-mono"
                />
              </div>
            </div>
            <button
              onClick={() => triggerSuccess('Test SMS dispatched to administrator device.')}
              className="px-4 py-2 rounded-xl bg-gray-900 text-white font-bold hover:bg-black cursor-pointer"
            >
              Send Test 2FA Verification SMS
            </button>
          </div>
        )}

        {/* Holiday Setting */}
        {sectionKey === 'holiday-setting' && (
          <div className="p-5 rounded-2xl bg-white border border-[#e4e6e1] space-y-4 text-xs">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-[#1f2b28]">European Banking & Target2 Settlement Holidays</h3>
                <p className="text-gray-500 text-[11px]">Freezes SEPA settlement cycles during central banking closures.</p>
              </div>
              <button
                onClick={() => {
                  setHolidayTradingFreeze(!holidayTradingFreeze);
                  triggerSuccess(`Bank holiday trading freeze ${!holidayTradingFreeze ? 'enabled' : 'disabled'}.`);
                }}
                className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer ${
                  holidayTradingFreeze ? 'bg-emerald-600 text-white' : 'bg-gray-300 text-gray-700'
                }`}
              >
                {holidayTradingFreeze ? 'Settlement Freeze Active' : 'Off'}
              </button>
            </div>
            <div className="divide-y divide-[#e4e6e1]">
              {[
                { date: '01 Jan 2026', name: 'New Year\'s Day (Target2)' },
                { date: '03 Apr 2026', name: 'Good Friday (European Central Bank)' },
                { date: '06 Apr 2026', name: 'Easter Monday (France / Germany)' },
                { date: '01 May 2026', name: 'Labour Day (National Bank of France)' }
              ].map((h, i) => (
                <div key={i} className="py-2.5 flex justify-between items-center">
                  <span className="font-bold text-gray-800">{h.name}</span>
                  <span className="text-gray-500 font-mono">{h.date}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* GDPR Cookie Consent */}
        {sectionKey === 'gdpr-cookie' && (
          <div className="p-5 rounded-2xl bg-white border border-[#e4e6e1] space-y-4 text-xs">
            <h3 className="text-sm font-bold text-[#1f2b28]">European ePrivacy & GDPR Cookie Banner</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#e4e6e1]">
                <span className="font-bold text-gray-800">Display Cookie Consent Banner to EU Visitors</span>
                <button
                  onClick={() => {
                    setGdprEnabled(!gdprEnabled);
                    triggerSuccess(`GDPR banner ${!gdprEnabled ? 'enabled' : 'disabled'}.`);
                  }}
                  className={`px-3 py-1 rounded-lg font-bold cursor-pointer ${
                    gdprEnabled ? 'bg-emerald-600 text-white' : 'bg-gray-300 text-gray-700'
                  }`}
                >
                  {gdprEnabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Banner Notice Copy</label>
                <textarea
                  rows={3}
                  value={gdprText}
                  onChange={e => setGdprText(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-300 bg-[#f9faf8]"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // CUSTOM CSS
  // -------------------------------------------------------------
  if (sectionKey === 'custom-css') {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-2xl bg-white border border-[#e4e6e1] text-xs">
          <p className="font-semibold text-[#1f2b28] mb-1">{description}</p>
          <span className="text-[11px] text-[#6b7773]">Source: {fromLocation}</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#e4e6e1] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#1f2b28] flex items-center gap-2">
              <Code2 className="w-4 h-4 text-[#3d7a58]" /> Live Custom CSS Injection
            </h3>
            <button
              onClick={handleSaveCss}
              className="px-3.5 py-1.5 rounded-xl bg-[#3d7a58] text-white text-xs font-bold hover:bg-[#2f5a40] cursor-pointer"
            >
              Save & Apply Styles
            </button>
          </div>
          <p className="text-xs text-[#6b7773]">
            Inject custom CSS rules directly into the platform DOM without rebuilding. Styles persist in browser storage.
          </p>
          <textarea
            rows={12}
            value={customCss}
            onChange={(e) => setCustomCss(e.target.value)}
            className="w-full p-3 rounded-xl border border-[#e4e6e1] font-mono text-xs bg-[#1f2b28] text-[#a9d6a0] focus:outline-none"
          />
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // CLEAR CACHE
  // -------------------------------------------------------------
  if (sectionKey === 'clear-cache') {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-2xl bg-white border border-[#e4e6e1] text-xs">
          <p className="font-semibold text-[#1f2b28] mb-1">{description}</p>
          <span className="text-[11px] text-[#6b7773]">Source: {fromLocation}</span>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-[#e4e6e1] text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 mx-auto flex items-center justify-center">
            <Trash2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#1f2b28]">Purge System & Application Cache</h3>
          <p className="text-xs text-[#6b7773] max-w-md mx-auto">
            Clear client-side service worker caches, session tokens, and local cache stores to immediately load fresh platform code and assets.
          </p>
          <button
            onClick={handleClearCache}
            className="px-5 py-2.5 rounded-xl bg-[#6e2c3a] text-white text-xs font-bold hover:bg-[#58232e] cursor-pointer shadow-sm"
          >
            Purge All Platform Caches
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // SYSTEM INFORMATION
  // -------------------------------------------------------------
  if (sectionKey === 'system-information') {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-2xl bg-white border border-[#e4e6e1] text-xs">
          <p className="font-semibold text-[#1f2b28] mb-1">{description}</p>
          <span className="text-[11px] text-[#6b7773]">Source: {fromLocation}</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#e4e6e1] space-y-4">
          <h3 className="text-sm font-bold text-[#1f2b28] flex items-center gap-2">
            <Server className="w-4 h-4 text-[#3d7a58]" /> Runtime & System Environment
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-[#f6f6f4] rounded-xl border border-[#e4e6e1] space-y-1">
              <span className="text-[#6b7773]">Node.js Engine:</span>
              <p className="font-mono font-bold text-[#1f2b28]">Node.js v22.x LTS (ESM + tsx)</p>
            </div>
            <div className="p-3 bg-[#f6f6f4] rounded-xl border border-[#e4e6e1] space-y-1">
              <span className="text-[#6b7773]">Frontend Framework:</span>
              <p className="font-mono font-bold text-[#1f2b28]">React 19 + Vite 8.3 + Tailwind CSS v4</p>
            </div>
            <div className="p-3 bg-[#f6f6f4] rounded-xl border border-[#e4e6e1] space-y-1">
              <span className="text-[#6b7773]">Database & Ledger Engine:</span>
              <p className="font-mono font-bold text-[#1f2b28]">LedgerService (Synchronized in-memory store)</p>
            </div>
            <div className="p-3 bg-[#f6f6f4] rounded-xl border border-[#e4e6e1] space-y-1">
              <span className="text-[#6b7773]">Blockchain Integration:</span>
              <p className="font-mono font-bold text-[#1f2b28]">Solana SPL + BNB Smart Chain (BEP20)</p>
            </div>
          </div>
          <button
            onClick={() => {
              const diag = {
                timestamp: new Date().toISOString(),
                node: 'v22.x',
                framework: 'React 19',
                activeTab: sectionKey,
                ledgerEntries: ledger.getTransactions().length,
                usersCount: ledger.getUsers().length,
                propertiesCount: ledger.getProperties().length
              };
              const blob = new Blob([JSON.stringify(diag, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `kretz-diagnostic-${Date.now()}.json`;
              document.body.appendChild(a);
              a.click();
              a.remove();
              triggerSuccess('System diagnostic log generated and downloaded.');
            }}
            className="px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-black cursor-pointer flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Download Diagnostic Report
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // FALLBACK GENERIC SECTION
  // -------------------------------------------------------------
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl bg-white border border-[#e4e6e1] text-xs">
        <p className="font-semibold text-[#1f2b28] mb-1">{description}</p>
        <span className="text-[11px] text-[#6b7773]">Source: {fromLocation}</span>
      </div>

      {subPages && subPages.length > 0 && (
        <div className="p-5 rounded-2xl bg-white border border-[#e4e6e1] space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#6b7773]">On this page</h4>
          <ul className="space-y-1.5 text-xs text-[#1f2b28]">
            {subPages.map((sub, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3d7a58]"></span>
                <span>{sub}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="p-5 rounded-2xl bg-white border border-[#e4e6e1] space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#6b7773]">Administrative Action Desk</h4>
          <button
            onClick={() => triggerSuccess(`Configuration updated for "${title}".`)}
            className="px-3.5 py-1.5 rounded-xl bg-[#3d7a58] text-white text-xs font-bold hover:bg-[#2f5a40] cursor-pointer"
          >
            Save Changes
          </button>
        </div>
        <p className="text-xs text-[#6b7773]">
          All settings in this section synchronize directly with the central administrative state and investor portal.
        </p>
      </div>
    </div>
  );
};
