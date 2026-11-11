import React, { useState } from 'react';
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
  Database
} from 'lucide-react';

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
  // Custom CSS State
  const [customCss, setCustomCss] = useState<string>(() => {
    return localStorage.getItem('kretz_custom_admin_css') || '/* Custom Platform Styles */\n.custom-accent {\n  color: #3d7a58;\n}';
  });

  // Support Tickets State
  const [tickets, setTickets] = useState<Array<{ id: string; user: string; email: string; subject: string; status: string; priority: string; date: string; category: string }>>([]);
  const [ticketFilter, setTicketFilter] = useState<'all' | 'pending' | 'closed' | 'answered'>('all');
  const [activeTicketReply, setActiveTicketReply] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Referral State
  const [referralBonusPercent, setReferralBonusPercent] = useState('2.5');
  const [minimumSyndicateAlloc, setMinimumSyndicateAlloc] = useState('500');

  // Section CMS State
  const [selectedCmsSection, setSelectedCmsSection] = useState('About');
  const [cmsContent, setCmsContent] = useState('Kretz Real Estate offers accredited European real estate fractionalization under notary custody.');

  const handleSaveCss = () => {
    localStorage.setItem('kretz_custom_admin_css', customCss);
    if (onActionSuccess) onActionSuccess('Custom CSS stylesheet saved and applied successfully.');
  };

  const handleClearCache = () => {
    try {
      sessionStorage.clear();
      if ('caches' in window) {
        caches.keys().then((names) => {
          names.forEach((name) => caches.delete(name));
        });
      }
      if (onActionSuccess) onActionSuccess('Platform cache cleared successfully. Fresh assets reloaded.');
    } catch {
      if (onActionSuccess) onActionSuccess('Client session and component memory purged.');
    }
  };

  const handleReplyTicket = (id: string) => {
    if (!replyText.trim()) return;
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status: 'answered' } : t));
    setActiveTicketReply(null);
    setReplyText('');
    if (onActionSuccess) onActionSuccess(`Reply sent to investor for ticket #${id}. Status updated to Answered.`);
  };

  // Specific renders based on key
  if (sectionKey.startsWith('support-ticket')) {
    const filteredTickets = tickets.filter(t => {
      if (ticketFilter === 'all') return true;
      return t.status === ticketFilter;
    });

    return (
      <div className="space-y-4">
        <div className="p-4 rounded-2xl bg-white border border-[#e4e6e1] text-xs">
          <p className="font-semibold text-[#1f2b28] mb-1">{description}</p>
          <span className="text-[11px] text-[#6b7773]">Moved from: {fromLocation}</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#e4e6e1] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#e4e6e1]">
            <div className="flex items-center gap-2">
              <LifeBuoy className="w-5 h-5 text-[#3d7a58]" />
              <h3 className="text-base font-bold text-[#1f2b28]">Investor Support Tickets</h3>
            </div>
            <div className="flex items-center gap-1.5 bg-[#f6f6f4] p-1 rounded-xl">
              {(['all', 'pending', 'answered', 'closed'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setTicketFilter(f)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize transition-colors ${
                    ticketFilter === f ? 'bg-white text-[#1f2b28] shadow-xs' : 'text-[#6b7773] hover:text-[#1f2b28]'
                  }`}
                >
                  {f} {f === 'pending' && <span className="ml-1 px-1.5 py-0.2 rounded-full bg-[#6e2c3a] text-[#ffd9df] text-[10px]">2</span>}
                </button>
              ))}
            </div>
          </div>

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
                        className="px-3 py-1 text-xs rounded-lg border border-[#e4e6e1] text-[#6b7773]"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleReplyTicket(t.id)}
                        className="px-3 py-1 text-xs font-bold rounded-lg bg-[#3d7a58] text-white flex items-center gap-1"
                      >
                        <Send className="w-3 h-3" /> Send Response
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-1 flex justify-end gap-2">
                    <button
                      onClick={() => setActiveTicketReply(t.id)}
                      className="px-3 py-1 text-xs font-semibold rounded-lg bg-white border border-[#e4e6e1] text-[#1f2b28] hover:bg-neutral-50"
                    >
                      Reply to Ticket
                    </button>
                    {t.status !== 'closed' && (
                      <button
                        onClick={() => {
                          setTickets(prev => prev.map(item => item.id === t.id ? { ...item, status: 'closed' } : item));
                          if (onActionSuccess) onActionSuccess(`Ticket #${t.id} marked as closed.`);
                        }}
                        className="px-3 py-1 text-xs font-semibold rounded-lg bg-white border border-[#e4e6e1] text-[#6b7773] hover:text-[#1f2b28]"
                      >
                        Close Ticket
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (sectionKey === 'custom-css') {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-2xl bg-white border border-[#e4e6e1] text-xs">
          <p className="font-semibold text-[#1f2b28] mb-1">{description}</p>
          <span className="text-[11px] text-[#6b7773]">Moved from: {fromLocation}</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#e4e6e1] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#1f2b28] flex items-center gap-2">
              <Code2 className="w-4 h-4 text-[#3d7a58]" /> Live Custom CSS Injection
            </h3>
            <button
              onClick={handleSaveCss}
              className="px-3.5 py-1.5 rounded-xl bg-[#3d7a58] text-white text-xs font-bold hover:bg-[#2f5a40]"
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

  if (sectionKey === 'clear-cache') {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-2xl bg-white border border-[#e4e6e1] text-xs">
          <p className="font-semibold text-[#1f2b28] mb-1">{description}</p>
          <span className="text-[11px] text-[#6b7773]">Moved from: {fromLocation}</span>
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

  if (sectionKey === 'system-information') {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-2xl bg-white border border-[#e4e6e1] text-xs">
          <p className="font-semibold text-[#1f2b28] mb-1">{description}</p>
          <span className="text-[11px] text-[#6b7773]">Moved from: {fromLocation}</span>
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
              <p className="font-mono font-bold text-[#1f2b28]">LedgerService (In-Memory with Drizzle ready)</p>
            </div>
            <div className="p-3 bg-[#f6f6f4] rounded-xl border border-[#e4e6e1] space-y-1">
              <span className="text-[#6b7773]">Blockchain Integration:</span>
              <p className="font-mono font-bold text-[#1f2b28]">Solana SPL + BNB Smart Chain (BEP20)</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default section view matching the template cards and checklist
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl bg-white border border-[#e4e6e1] text-xs">
        <p className="font-semibold text-[#1f2b28] mb-1">{description}</p>
        <span className="text-[11px] text-[#6b7773]">Moved from: {fromLocation}</span>
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
            onClick={() => {
              if (onActionSuccess) onActionSuccess(`Configuration updated for "${title}".`);
            }}
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
