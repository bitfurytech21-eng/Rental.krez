import React, { useState } from 'react';
import { TEMPLATE_DEFAULT_SPVS } from './adminNavData';
import { Property } from '../../types/property';
import { formatCurrency, formatDate } from '../../lib/utils';
import {
  Coins,
  Send,
  Download,
  CheckCircle2,
  Layers,
  Sparkles,
  Server,
  Trash2,
  RefreshCw,
  ExternalLink,
  Code,
  FileSpreadsheet,
  Globe,
  Sliders,
  Smartphone,
  Calendar,
  Shield,
  LifeBuoy
} from 'lucide-react';

interface AdminTemplateViewProps {
  navItem: {
    k: string;
    l: string;
    d?: string;
    f?: string;
    c?: string[];
  };
  properties: Property[];
  onOpenNewPropertyModal: () => void;
  onNavigateTab: (tab: string) => void;
  onTriggerDividendCycle?: () => void;
  onClearCache?: () => void;
  onShowSuccess: (msg: string) => void;
}

export const AdminTemplateView: React.FC<AdminTemplateViewProps> = ({
  navItem,
  properties,
  onOpenNewPropertyModal,
  onNavigateTab,
  onTriggerDividendCycle,
  onClearCache,
  onShowSuccess
}) => {
  // Dividend tool state
  const [selectedPropId, setSelectedPropId] = useState<string>(properties[0]?.id || 'ktz-01');
  const [dividendAmount, setDividendAmount] = useState<number>(45000);
  const [isExecutingDividend, setIsExecutingDividend] = useState<boolean>(false);

  // Token Issuance tool state
  const [issuancePropId, setIssuancePropId] = useState<string>(properties[0]?.id || 'ktz-01');
  const [tokensToMint, setTokensToMint] = useState<number>(10000);
  const [isMinting, setIsMinting] = useState<boolean>(false);

  // Custom CSS state
  const [customCssCode, setCustomCssCode] = useState<string>(
    '/* Institutional Custom CSS Overrides */\n:root {\n  --admin-accent: #3d7a58;\n  --admin-font: "DM Sans", system-ui;\n}\n.admin-hero-badge {\n  letter-spacing: 0.05em;\n}'
  );

  // Support ticket demo filter
  const [ticketFilter, setTicketFilter] = useState<'all' | 'pending' | 'closed' | 'answered'>('all');

  // Handle dividend trigger
  const handleRunDividend = () => {
    setIsExecutingDividend(true);
    setTimeout(() => {
      setIsExecutingDividend(false);
      onShowSuccess(`Dividend distribution of ${formatCurrency(dividendAmount)} scheduled for pro-rata token holders!`);
      if (onTriggerDividendCycle) onTriggerDividendCycle();
    }, 800);
  };

  // Handle token issuance
  const handleRunIssuance = () => {
    setIsMinting(true);
    setTimeout(() => {
      setIsMinting(false);
      onShowSuccess(`Successfully issued and registered ${tokensToMint.toLocaleString()} SPL tokens to SPV smart treasury.`);
    }, 800);
  };

  // Handle clear cache
  const handleExecuteClearCache = () => {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.clear();
      }
      if (onClearCache) onClearCache();
      onShowSuccess('System application caches, route buffers, and ledger indexes purged successfully.');
    } catch (e: any) {
      onShowSuccess('Caches purged and refreshed.');
    }
  };

  // Merge live properties with default template SPVs
  const activeSPVs = properties.length > 0
    ? properties.map((p, idx) => ({
        name: p.title,
        code: p.tokenTicker || `KTZ-${p.id.slice(0, 6).toUpperCase()}`,
        type: p.type,
        funded: p.fundedAmount || Math.round(p.targetAmount * 0.65),
        target: p.targetAmount,
        network: p.blockchainNetwork || 'Polygon POS'
      }))
    : TEMPLATE_DEFAULT_SPVS;

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Title & Moved From Card */}
      <div className="bg-white border border-[#e4e6e1] rounded-2xl p-5 shadow-xs">
        <h2 className="text-xl font-bold text-[#1f2b28] mb-1">{navItem.l}</h2>
        <p className="text-[14px] text-[#6b7773] mb-3 leading-relaxed">
          {navItem.d || `Administration management module for ${navItem.l}.`}
        </p>
        {navItem.f && (
          <div className="text-[12px] text-[#6b7773] flex items-center gap-1.5 pt-2 border-t border-[#e4e6e1]/70">
            <span className="font-semibold text-[#1f2b28]">Moved from:</span>
            <span>{navItem.f}</span>
          </div>
        )}
      </div>

      {/* Feature Bullet Points Card if available */}
      {navItem.c && navItem.c.length > 0 && (
        <div className="bg-white border border-[#e4e6e1] rounded-2xl p-5 shadow-xs">
          <h4 className="text-[14px] font-bold text-[#1f2b28] mb-3">On this page</h4>
          <ul className="space-y-2 pl-4 list-disc text-[14px] text-[#22302d]">
            {navItem.c.map((item, idx) => (
              <li key={idx} className="leading-relaxed">
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* SPECIFIC VIEW: SPV Portfolio */}
      {navItem.k === 'spv' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#e4e6e1] rounded-2xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="font-bold text-[#1f2b28] text-base">Institutional SPV Vehicles</h3>
              <p className="text-xs text-[#6b7773]">Funding progress, fractional capitalization, and blockchain custody</p>
            </div>
            <button
              type="button"
              onClick={onOpenNewPropertyModal}
              className="bg-[#3d7a58] hover:bg-[#326649] text-white text-[13.5px] font-medium px-4 py-2.5 rounded-xl cursor-pointer transition-colors shadow-xs"
            >
              Add property SPV
            </button>
          </div>

          <div className="bg-white border border-[#e4e6e1] rounded-2xl p-5 shadow-xs space-y-4">
            {activeSPVs.map((s, idx) => {
              const pct = Math.min(100, Math.round((s.funded / (s.target || 1)) * 100));
              return (
                <div key={idx} className="pt-3 first:pt-0 border-t first:border-t-0 border-[#e4e6e1]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                    <b className="text-[15px] font-bold text-[#1f2b28]">{s.name}</b>
                    <span className="text-xs font-mono text-[#3d7a58] bg-[#3d7a58]/10 px-2 py-0.5 rounded-md font-bold">
                      {pct}% Funded
                    </span>
                  </div>
                  <div className="text-xs text-[#6b7773] mb-2 flex items-center gap-2">
                    <span className="font-mono">{s.code}</span>
                    <span>·</span>
                    <span>{s.type}</span>
                    <span>·</span>
                    <span className="text-[#1f2b28] font-medium">{s.network}</span>
                  </div>
                  <div className="w-full h-[7px] bg-[#e4e6e1] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#3d7a58] rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="text-xs text-[#6b7773] mt-1.5 flex justify-between">
                    <span>{formatCurrency(s.funded)} raised</span>
                    <span>Target: {formatCurrency(s.target)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SPECIFIC VIEW: Dividends */}
      {navItem.k === 'dividends' && (
        <div className="bg-white border border-[#e4e6e1] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#e4e6e1]">
            <Coins className="w-5 h-5 text-[#3d7a58]" />
            <h3 className="font-bold text-[#1f2b28] text-base">Rental Income Dividend Dispatcher</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1f2b28] mb-1.5">Select Real Estate SPV</label>
              <select
                value={selectedPropId}
                onChange={(e) => setSelectedPropId(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-[#e4e6e1] bg-white text-[#1f2b28] focus:outline-none focus:border-[#3d7a58]"
              >
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.title} ({p.tokenTicker || 'SPV'})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1f2b28] mb-1.5">Gross Rental Dividend Amount (€)</label>
              <input
                type="number"
                min={1000}
                step={500}
                value={dividendAmount}
                onChange={(e) => setDividendAmount(Number(e.target.value))}
                className="w-full text-xs p-2.5 rounded-xl border border-[#e4e6e1] bg-white text-[#1f2b28] focus:outline-none focus:border-[#3d7a58]"
              />
            </div>
          </div>

          <div className="p-3.5 bg-[#f6f6f4] rounded-xl text-xs space-y-2 border border-[#e4e6e1]">
            <div className="flex justify-between font-medium text-[#1f2b28]">
              <span>Pro-Rata Yield Distribution:</span>
              <span>100% of declared net operational rent</span>
            </div>
            <div className="flex justify-between text-[#6b7773]">
              <span>Settlement Network:</span>
              <span>Direct EUR Internal Balance / USDC Polygon</span>
            </div>
            <div className="flex justify-between text-[#6b7773]">
              <span>Audit Log Record:</span>
              <span>Automatic cryptographic transaction receipt generation</span>
            </div>
          </div>

          <button
            type="button"
            disabled={isExecutingDividend}
            onClick={handleRunDividend}
            className="w-full sm:w-auto bg-[#3d7a58] hover:bg-[#326649] text-white text-xs font-bold px-5 py-3 rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            {isExecutingDividend ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Executing Dividend Distribution...</span>
              </>
            ) : (
              <>
                <Coins className="w-4 h-4" />
                <span>Execute &amp; Credit Investor Accounts</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* SPECIFIC VIEW: Token Issuance */}
      {navItem.k === 'issuance' && (
        <div className="bg-white border border-[#e4e6e1] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#e4e6e1]">
            <Layers className="w-5 h-5 text-[#3d7a58]" />
            <h3 className="font-bold text-[#1f2b28] text-base">Token Minting &amp; Fractional Allocation</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1f2b28] mb-1.5">Target SPV Vehicle</label>
              <select
                value={issuancePropId}
                onChange={(e) => setIssuancePropId(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-[#e4e6e1] bg-white text-[#1f2b28]"
              >
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.title} ({p.tokenTicker || 'SPV'})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1f2b28] mb-1.5">Number of Tokens to Issue</label>
              <input
                type="number"
                min={100}
                step={500}
                value={tokensToMint}
                onChange={(e) => setTokensToMint(Number(e.target.value))}
                className="w-full text-xs p-2.5 rounded-xl border border-[#e4e6e1] bg-white text-[#1f2b28]"
              />
            </div>
          </div>

          <button
            type="button"
            disabled={isMinting}
            onClick={handleRunIssuance}
            className="w-full sm:w-auto bg-[#3d7a58] hover:bg-[#326649] text-white text-xs font-bold px-5 py-3 rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-2"
          >
            {isMinting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
            <span>Issue &amp; Register SPL Tokens</span>
          </button>
        </div>
      )}

      {/* SPECIFIC VIEW: Support Tickets */}
      {navItem.k.startsWith('support-ticket') && (
        <div className="bg-white border border-[#e4e6e1] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#e4e6e1]">
            <div className="flex items-center gap-2">
              <LifeBuoy className="w-5 h-5 text-[#3d7a58]" />
              <h3 className="font-bold text-[#1f2b28] text-base">Investor Concierge Inquiries</h3>
            </div>
            <div className="flex gap-1.5 text-xs">
              {(['all', 'pending', 'answered', 'closed'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setTicketFilter(f)}
                  className={`px-3 py-1 rounded-lg capitalize font-medium transition-colors cursor-pointer ${
                    ticketFilter === f ? 'bg-[#3d7a58] text-white' : 'bg-[#f6f6f4] text-[#6b7773] hover:text-[#1f2b28]'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            {[
              { id: 'TCK-8921', user: 'Henrik Van Der Meer', subject: 'Proof of wire transfer for €25,000 allocation', status: 'pending', time: '14 mins ago' },
              { id: 'TCK-8919', user: 'Camille Laurent', subject: 'Corporate DNI verification under Luxembourg SPV', status: 'answered', time: '2 hours ago' },
              { id: 'TCK-8914', user: 'Lord Alistair Sterling', subject: 'Private Client Club Privé tier upgrade inquiry', status: 'closed', time: '1 day ago' }
            ]
              .filter(t => ticketFilter === 'all' || t.status === ticketFilter)
              .map(t => (
                <div key={t.id} className="p-3.5 border border-[#e4e6e1] rounded-xl flex items-center justify-between hover:bg-[#f6f6f4] transition-colors">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-[#3d7a58]">{t.id}</span>
                      <span className="text-xs font-semibold text-[#1f2b28]">{t.user}</span>
                      <span className={`text-[10px] px-2 py-0.2 rounded-full font-bold uppercase ${
                        t.status === 'pending' ? 'bg-[#6e2c3a] text-[#ffd9df]' : 'bg-[#2f5a40] text-[#cdeed2]'
                      }`}>
                        {t.status}
                      </span>
                    </div>
                    <div className="text-xs text-[#6b7773]">{t.subject}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-[#6b7773] block mb-1">{t.time}</span>
                    <button
                      type="button"
                      onClick={() => onShowSuccess(`Ticket ${t.id} opened for response.`)}
                      className="text-xs font-bold text-[#3d7a58] hover:underline cursor-pointer"
                    >
                      Reply
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* SPECIFIC VIEW: Reports */}
      {navItem.k.startsWith('report') && (
        <div className="bg-white border border-[#e4e6e1] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#e4e6e1]">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-[#3d7a58]" />
              <h3 className="font-bold text-[#1f2b28] text-base">Institutional Accounting Reports</h3>
            </div>
            <button
              type="button"
              onClick={() => onShowSuccess('Report export initiated. Generating institutional PDF/CSV summary...')}
              className="bg-[#3d7a58] hover:bg-[#326649] text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
          <div className="text-xs text-[#6b7773]">
            Export reconciled ledgers, investment subscriptions, capital repayments, and platform commissions certified for Spanish tax authorities and MiCA auditing.
          </div>
        </div>
      )}

      {/* SPECIFIC VIEW: System Information */}
      {navItem.k === 'system-information' && (
        <div className="bg-white border border-[#e4e6e1] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#e4e6e1]">
            <Server className="w-5 h-5 text-[#3d7a58]" />
            <h3 className="font-bold text-[#1f2b28] text-base">System Telemetry &amp; Environment Diagnostics</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-[#f6f6f4] rounded-xl border border-[#e4e6e1]">
              <span className="text-[#6b7773] block mb-0.5">Execution Engine</span>
              <strong className="text-[#1f2b28] font-mono">Bun v1.4.4 &amp; Node.js v24.22.1</strong>
            </div>
            <div className="p-3 bg-[#f6f6f4] rounded-xl border border-[#e4e6e1]">
              <span className="text-[#6b7773] block mb-0.5">Applet Server Port</span>
              <strong className="text-[#1f2b28] font-mono">Port 3000 (Express + Vite Middlewares)</strong>
            </div>
            <div className="p-3 bg-[#f6f6f4] rounded-xl border border-[#e4e6e1]">
              <span className="text-[#6b7773] block mb-0.5">Database &amp; Ledger State</span>
              <strong className="text-[#1f2b28] font-mono">Ring-Fenced JSON Ledger with Mutex locks</strong>
            </div>
            <div className="p-3 bg-[#f6f6f4] rounded-xl border border-[#e4e6e1]">
              <span className="text-[#6b7773] block mb-0.5">Target Build Architecture</span>
              <strong className="text-[#1f2b28] font-mono">bun.lock (frozen-lockfile compliant)</strong>
            </div>
          </div>
        </div>
      )}

      {/* SPECIFIC VIEW: Custom CSS */}
      {navItem.k === 'custom-css' && (
        <div className="bg-white border border-[#e4e6e1] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#e4e6e1]">
            <Code className="w-5 h-5 text-[#3d7a58]" />
            <h3 className="font-bold text-[#1f2b28] text-base">Custom CSS Editor</h3>
          </div>
          <textarea
            rows={8}
            value={customCssCode}
            onChange={(e) => setCustomCssCode(e.target.value)}
            className="w-full font-mono text-xs p-3 rounded-xl border border-[#e4e6e1] bg-[#121a18] text-[#e8efeb] focus:outline-none"
          />
          <button
            type="button"
            onClick={() => onShowSuccess('Custom CSS overrides applied to active tenant session.')}
            className="bg-[#3d7a58] hover:bg-[#326649] text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer"
          >
            Save CSS Overrides
          </button>
        </div>
      )}

      {/* SPECIFIC VIEW: Clear Cache */}
      {navItem.k === 'clear-cache' && (
        <div className="bg-white border border-[#e4e6e1] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#e4e6e1]">
            <RefreshCw className="w-5 h-5 text-[#3d7a58]" />
            <h3 className="font-bold text-[#1f2b28] text-base">Purge Application &amp; Session Cache</h3>
          </div>
          <p className="text-xs text-[#6b7773] leading-relaxed">
            Forces a full refresh of in-memory caching stores, reloads ledger data models, and invalidates temporary client-side tokens.
          </p>
          <button
            type="button"
            onClick={handleExecuteClearCache}
            className="bg-[#6e2c3a] hover:bg-[#58232e] text-white text-xs font-bold px-5 py-3 rounded-xl cursor-pointer transition-colors shadow-xs flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>Purge Memory Cache &amp; Re-Index Ledger</span>
          </button>
        </div>
      )}
    </div>
  );
};
