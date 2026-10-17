import React, { useState } from 'react';
import { 
  Sparkles, 
  Calculator, 
  RefreshCw, 
  FileSpreadsheet, 
  BellRing, 
  Repeat, 
  Calendar, 
  ShieldCheck, 
  ChevronRight, 
  X, 
  Download, 
  Check, 
  Info,
  ArrowDown,
  Maximize2,
  Minimize2,
  ArrowDownLeft,
  TrendingUp,
  Building2,
  Wallet,
  History,
  ChevronLeft
} from 'lucide-react';
import { User } from '../../types/user';
import { formatCurrency } from '../../lib/utils';

export type ShortcutAction = 
  | 'calculator'
  | 'fx-converter'
  | 'yield-calendar'
  | 'auto-reinvest'
  | 'tax-statement'
  | 'deal-alerts';

interface ShortcutsHubProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: string) => void;
  onOpenDeposit?: () => void;
  onOpenWithdraw?: () => void;
}

export const ShortcutsHub: React.FC<ShortcutsHubProps> = ({
  user,
  isOpen,
  onClose,
  onNavigateTab,
  onOpenDeposit,
  onOpenWithdraw,
}) => {
  const [activeTool, setActiveTool] = useState<ShortcutAction | null>(null);

  const shortcutCategories = [
    {
      category: 'Smart Yield Simulators',
      items: [
        {
          id: 'calculator' as ShortcutAction,
          title: 'ROI & APY Calculator',
          description: 'Simulate compound earnings',
          icon: Calculator,
          color: 'from-emerald-500 to-teal-700',
          badge: '12% IRR',
        },
        {
          id: 'yield-calendar' as ShortcutAction,
          title: 'Rental Payout Schedule',
          description: 'Upcoming rent dividend dates',
          icon: Calendar,
          color: 'from-blue-500 to-indigo-700',
          badge: 'Nov 1',
        },
        {
          id: 'auto-reinvest' as ShortcutAction,
          title: 'Auto-Reinvest (DRIP)',
          description: 'Compound monthly rent automatically',
          icon: Repeat,
          color: 'from-purple-500 to-violet-700',
          badge: 'Active',
        },
      ]
    },
    {
      category: 'Treasury & Compliance',
      items: [
        {
          id: 'fx-converter' as ShortcutAction,
          title: 'Live FX & Crypto Rates',
          description: 'Zero-spread conversion rates',
          icon: RefreshCw,
          color: 'from-amber-500 to-orange-700',
          badge: 'Live',
        },
        {
          id: 'tax-statement' as ShortcutAction,
          title: 'Fiscal Tax Statement',
          description: 'EU Modelo 210 withholding report',
          icon: FileSpreadsheet,
          color: 'from-slate-600 to-slate-900',
          badge: '2026',
        },
        {
          id: 'deal-alerts' as ShortcutAction,
          title: 'VIP Deal Whitelist',
          description: 'Advance alerts for 12%+ IRR drops',
          icon: BellRing,
          color: 'from-rose-500 to-pink-700',
          badge: 'VIP',
        },
      ]
    }
  ];

  if (!isOpen && !activeTool) return null;

  return (
    <>
      {/* Light subtle backdrop: click outside to dismiss, full clear view of dashboard */}
      <div 
        className="fixed inset-0 z-50 bg-black/15 transition-opacity" 
        onClick={() => {
          setActiveTool(null);
          onClose();
        }} 
      />

      {/* Brought DOWN to the bottom for an unobstructed clear view of the dashboard */}
      {isOpen && !activeTool && (
        <div className="fixed bottom-20 md:bottom-6 right-3 sm:right-6 z-50 w-[calc(100%-24px)] sm:w-[325px] max-w-sm dash-card rounded-2xl shadow-2xl border overflow-hidden animate-in slide-in-from-bottom-3 duration-200 flex flex-col max-h-[75vh]">
          {/* Header */}
          <div className="px-3.5 py-2.5 bg-gradient-to-r from-[#0d221d] to-[#13302a] text-white flex items-center justify-between border-b border-[#1E3E37]">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[#10B981] text-[#0A1614] flex items-center justify-center font-black shrink-0 shadow-xs">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="font-bold text-xs text-white flex items-center gap-1.5 leading-tight">
                  Power Shortcuts
                  <span className="text-[8px] font-bold px-1.5 py-0.2 rounded-full bg-[#10B981]/25 text-[#34D399] border border-[#10B981]/40">
                    Pro
                  </span>
                </h3>
                <p className="text-[9px] text-[#A0A8A5] leading-tight">Brought down for a clear view</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-6 h-6 rounded-lg hover:bg-white/10 text-white/70 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Close shortcuts hub"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Instant Quick Actions Row */}
          <div className="px-2.5 py-2 dash-inner border-b border-inherit/20 grid grid-cols-3 gap-1.5">
            {onOpenDeposit && (
              <button
                onClick={() => {
                  onClose();
                  onOpenDeposit();
                }}
                className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold shadow-xs transition-colors cursor-pointer"
                title="Instant Deposit Funds"
              >
                <ArrowDownLeft className="w-3 h-3" />
                <span>Deposit</span>
              </button>
            )}
            {onNavigateTab && (
              <button
                onClick={() => {
                  onClose();
                  onNavigateTab('properties');
                }}
                className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg dash-card hover:bg-white/5 border border-inherit/30 text-[10px] font-bold dash-text transition-colors cursor-pointer"
                title="Explore Properties"
              >
                <TrendingUp className="w-3 h-3 text-emerald-400" />
                <span>Explore</span>
              </button>
            )}
            {onNavigateTab && (
              <button
                onClick={() => {
                  onClose();
                  onNavigateTab('portfolio');
                }}
                className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg dash-card hover:bg-white/5 border border-inherit/30 text-[10px] font-bold dash-text transition-colors cursor-pointer"
                title="My Real Estate Portfolio"
              >
                <Building2 className="w-3 h-3 text-emerald-400" />
                <span>Portfolio</span>
              </button>
            )}
          </div>

          {/* List of Financial Shortcuts */}
          <div className="p-2 overflow-y-auto space-y-2 divide-y border-inherit/20 flex-1">
            {shortcutCategories.map((cat, idx) => (
              <div key={idx} className={idx > 0 ? 'pt-2' : ''}>
                <div className="text-[9px] font-bold uppercase tracking-wider dash-muted mb-1 px-1">
                  {cat.category}
                </div>
                <div className="space-y-0.5">
                  {cat.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTool(item.id);
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl border border-transparent hover:border-inherit/30 hover:bg-white/5 transition-all group text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${item.color} text-white flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform`}>
                            <Icon className="w-3 h-3" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-[11px] dash-text group-hover:text-emerald-400 transition-colors truncate block">
                              {item.title}
                            </span>
                            <p className="text-[9px] dash-muted truncate">
                              {item.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 pl-1">
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded dash-inner dash-muted group-hover:text-emerald-400 transition-colors">
                            {item.badge}
                          </span>
                          <ChevronRight className="w-3 h-3 dash-muted group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-3 py-2 dash-inner border-t border-inherit/20 flex items-center justify-between text-[9px] dash-muted">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              SEPA & Polygon Active
            </span>
            <span className="font-semibold dash-text">Instant · 0% fee</span>
          </div>
        </div>
      )}

      {/* Render Active Tool in Brought Down, Pocket-Sized Compact Preview */}
      {activeTool && (
        <ToolModalContainer 
          tool={activeTool} 
          user={user} 
          onClose={() => {
            setActiveTool(null);
            onClose();
          }} 
          onBack={() => setActiveTool(null)}
        />
      )}
    </>
  );
};

// Tool Modal Container: Brought DOWN to bottom for a completely clear view
export const ToolModalContainer: React.FC<{
  tool: ShortcutAction;
  user: User;
  onClose: () => void;
  onBack?: () => void;
}> = ({ tool, user, onClose, onBack }) => {
  const [isDockedDown, setIsDockedDown] = useState(false);

  const getToolTitle = () => {
    switch (tool) {
      case 'calculator': return 'Yield & ROI Simulator';
      case 'fx-converter': return 'Live FX & Crypto';
      case 'yield-calendar': return 'Rental Payout Calendar';
      case 'auto-reinvest': return 'Auto-Reinvest (DRIP)';
      case 'tax-statement': return 'Fiscal Tax Statement';
      case 'deal-alerts': return 'Deal Whitelist Alerts';
      default: return 'Quick Tool';
    }
  };

  return (
    <div className="fixed bottom-20 md:bottom-6 right-3 sm:right-6 z-50 animate-in slide-in-from-bottom-3 duration-200">
      {isDockedDown ? (
        /* Minimized Docked Bar at bottom edge */
        <div className="dash-card border shadow-2xl rounded-2xl px-3.5 py-2 flex items-center gap-2.5 text-xs">
          <div className="w-5 h-5 rounded-md bg-[#10B981] text-[#0A1614] flex items-center justify-center font-black shrink-0 shadow-xs">
            <Sparkles className="w-3 h-3" />
          </div>
          <div className="min-w-0 pr-1">
            <span className="font-bold dash-text block text-[11px] leading-tight truncate max-w-[150px]">
              {getToolTitle()}
            </span>
            <span className="text-[9px] text-emerald-400 font-semibold block leading-tight">
              Docked Down · Clear View Active
            </span>
          </div>
          <div className="flex items-center gap-1 border-l border-inherit/30 pl-2">
            <button
              onClick={() => setIsDockedDown(false)}
              className="px-2 py-1 rounded-md bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
              title="Expand tool preview"
            >
              <Maximize2 className="w-2.5 h-2.5" />
              <span>Open</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-white/10 dash-muted transition-colors cursor-pointer"
              title="Close tool"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      ) : (
        /* Brought Down Tool Preview Modal */
        <div className="dash-card w-[calc(100%-24px)] sm:w-[335px] max-w-sm rounded-2xl shadow-2xl border overflow-hidden flex flex-col max-h-[76vh] animate-in zoom-in-95 duration-150">
          {/* Top Bar with Back and Bring Down buttons for clear view */}
          <div className="bg-[#0d221d] px-3 py-1.5 flex items-center justify-between border-b border-[#1E3E37] text-[10px] text-slate-300">
            <div className="flex items-center gap-2">
              {onBack && (
                <button
                  onClick={onBack}
                  title="All Shortcuts"
                  aria-label="Back"
                  className="w-5 h-5 rounded-md bg-[#11221F] hover:bg-[#1A3832] border border-[#1E3E37] text-[#34D399] flex items-center justify-center cursor-pointer transition-colors shrink-0"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
              )}
              <span className="flex items-center gap-1 text-[9px] text-[#34D399] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-pulse"></span>
                Brought Down
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsDockedDown(true)}
                className="flex items-center gap-1 text-[9px] text-slate-300 hover:text-white transition-colors cursor-pointer px-1.5 py-0.5 rounded hover:bg-white/10"
                title="Dock down to bottom bar for a completely clear view"
              >
                <ArrowDown className="w-2.5 h-2.5" />
                <span>Dock Down</span>
              </button>
              <button
                onClick={onClose}
                className="w-5 h-5 rounded hover:bg-white/10 text-white/70 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {tool === 'calculator' && <RoiCalculatorTool onClose={onClose} />}
            {tool === 'fx-converter' && <FxConverterTool onClose={onClose} />}
            {tool === 'yield-calendar' && <YieldCalendarTool onClose={onClose} />}
            {tool === 'auto-reinvest' && <AutoReinvestTool user={user} onClose={onClose} />}
            {tool === 'tax-statement' && <TaxStatementTool user={user} onClose={onClose} />}
            {tool === 'deal-alerts' && <DealAlertsTool onClose={onClose} />}
          </div>
        </div>
      )}
    </div>
  );
};


// 1. Compound Yield & ROI Calculator (Trimmed Compact Interface)
const RoiCalculatorTool: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [initialAmount, setInitialAmount] = useState<number>(5000);
  const [years, setYears] = useState<number>(5);
  const [annualApy, setAnnualApy] = useState<number>(11.5);
  const [autoReinvest, setAutoReinvest] = useState<boolean>(true);

  const rate = annualApy / 100;
  let finalValue = initialAmount;
  let totalInterest = 0;

  if (autoReinvest) {
    finalValue = initialAmount * Math.pow(1 + rate / 12, 12 * years);
    totalInterest = finalValue - initialAmount;
  } else {
    totalInterest = initialAmount * rate * years;
    finalValue = initialAmount + totalInterest;
  }

  const monthlyPayout = (initialAmount * rate) / 12;

  return (
    <div className="flex flex-col h-full overflow-hidden text-xs">
      {/* Header */}
      <div className="px-3 py-2 bg-gradient-to-r from-[#0A1614] to-[#152B27] text-white flex items-center justify-between border-b border-[#1F3D37]">
        <div className="flex items-center gap-2">
          <div className="w-5.5 h-5.5 rounded-md bg-[#34D399] text-[#0A1614] flex items-center justify-center font-bold shrink-0">
            <Calculator className="w-3 h-3" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white leading-tight">Yield & ROI Simulator</h3>
            <p className="text-[9px] text-slate-300 leading-tight">Project compound earnings</p>
          </div>
        </div>
        <button onClick={onClose} className="w-5 h-5 rounded hover:bg-white/10 text-white/70 flex items-center justify-center cursor-pointer">
          <X className="w-3 h-3" />
        </button>
      </div>

      <div className="p-2.5 overflow-y-auto space-y-2.5 flex-1">
        {/* Results Summary Box */}
        <div className="dash-inner border border-emerald-500/30 rounded-lg p-2 flex items-center justify-between">
          <div>
            <span className="text-[9px] uppercase font-bold text-emerald-400 tracking-wider">Projected Total</span>
            <div className="text-base font-black text-emerald-400 tracking-tight">
              {formatCurrency(finalValue)}
            </div>
            <p className="text-[9px] text-emerald-300">
              Gain: <strong className="font-bold">+{formatCurrency(totalInterest)}</strong> ({((totalInterest / initialAmount) * 100).toFixed(1)}%)
            </p>
          </div>
          <div className="text-right border-l border-inherit/30 pl-2">
            <span className="text-[9px] dash-muted block">Monthly Rent</span>
            <span className="text-[11px] font-bold dash-text">{formatCurrency(monthlyPayout)}/mo</span>
            <span className="text-[8.5px] dash-muted block mt-0.5">{annualApy}% APY</span>
          </div>
        </div>

        {/* Sliders */}
        <div className="space-y-2">
          <div>
            <div className="flex justify-between text-[10px] font-bold dash-text mb-0.5">
              <span>Capital</span>
              <span className="text-emerald-400">{formatCurrency(initialAmount)}</span>
            </div>
            <input
              type="range"
              min="500"
              max="50000"
              step="500"
              value={initialAmount}
              onChange={(e) => setInitialAmount(Number(e.target.value))}
              className="w-full accent-[#059669] h-1 bg-slate-700/40 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[8px] dash-muted">
              <span>€500</span>
              <span>€25k</span>
              <span>€50k</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[10px] font-bold dash-text mb-0.5">
              <span>Duration</span>
              <span className="text-emerald-400">{years} {years === 1 ? 'Year' : 'Years'}</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
              className="w-full accent-[#059669] h-1 bg-slate-700/40 rounded-lg cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-[10px] font-bold dash-text mb-0.5">
              <span>Target Net IRR</span>
              <span className="text-emerald-400">{annualApy}%</span>
            </div>
            <input
              type="range"
              min="8"
              max="16"
              step="0.5"
              value={annualApy}
              onChange={(e) => setAnnualApy(Number(e.target.value))}
              className="w-full accent-[#059669] h-1 bg-slate-700/40 rounded-lg cursor-pointer"
            />
          </div>

          <div className="p-2 rounded-lg dash-inner border border-inherit/20 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold dash-text block">Auto-Compounding (DRIP)</span>
              <span className="text-[8.5px] dash-muted">Reinvest monthly payouts</span>
            </div>
            <button
              type="button"
              onClick={() => setAutoReinvest(!autoReinvest)}
              className={`w-7 h-4 rounded-full transition-colors relative cursor-pointer ${
                autoReinvest ? 'bg-[#059669]' : 'bg-slate-700/60'
              }`}
            >
              <div className={`w-3 h-3 rounded-full bg-white shadow-xs absolute top-0.5 transition-transform ${
                autoReinvest ? 'right-0.5' : 'left-0.5'
              }`} />
            </button>
          </div>
        </div>

        <div className="p-1.5 dash-inner rounded-lg border border-emerald-500/30 text-[9px] text-emerald-400 flex items-center gap-1.5">
          <Info className="w-3 h-3 shrink-0 text-emerald-400" />
          <span>Yields distribute on the 1st of every month.</span>
        </div>
      </div>

      <div className="px-3 py-1.5 dash-inner border-t border-inherit/20 flex justify-end">
        <button onClick={onClose} className="btn btn-primary text-[10px] font-bold py-1 px-3.5 cursor-pointer">
          Done
        </button>
      </div>
    </div>
  );
};

// 2. Live FX & Crypto Rate Converter (Trimmed Compact Interface)
const FxConverterTool: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [amount, setAmount] = useState<number>(1000);
  const [fromCurrency, setFromCurrency] = useState<string>('EUR');
  const [toCurrency, setToCurrency] = useState<string>('USDT');

  const ratesToEur: Record<string, number> = {
    EUR: 1.0,
    USDT: 0.92,
    USDC: 0.92,
    BTC: 62450.0,
    ETH: 3120.0,
    SOL: 142.5,
  };

  const calculateConversion = () => {
    const amountInEur = amount * (ratesToEur[fromCurrency] || 1);
    const converted = amountInEur / (ratesToEur[toCurrency] || 1);
    return converted;
  };

  const convertedValue = calculateConversion();

  return (
    <div className="flex flex-col h-full overflow-hidden text-xs">
      <div className="px-3 py-2 bg-gradient-to-r from-[#0A1614] to-[#152B27] text-white flex items-center justify-between border-b border-[#1F3D37]">
        <div className="flex items-center gap-2">
          <div className="w-5.5 h-5.5 rounded-md bg-[#34D399] text-[#0A1614] flex items-center justify-center font-bold shrink-0">
            <RefreshCw className="w-3 h-3" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white leading-tight">Live FX & Crypto</h3>
            <p className="text-[9px] text-slate-300 leading-tight">Zero-spread conversion rates</p>
          </div>
        </div>
        <button onClick={onClose} className="w-5 h-5 rounded hover:bg-white/10 text-white/70 flex items-center justify-center cursor-pointer">
          <X className="w-3 h-3" />
        </button>
      </div>

      <div className="p-2.5 overflow-y-auto space-y-2 flex-1">
        <div className="space-y-1.5">
          {/* From */}
          <div className="p-2 rounded-lg dash-inner border border-inherit/20">
            <span className="text-[9px] font-bold dash-muted block mb-0.5">You Convert</span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="1"
                value={amount}
                onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
                className="w-full text-sm font-bold bg-transparent outline-none dash-text"
              />
              <select
                value={fromCurrency}
                onChange={(e) => setFromCurrency(e.target.value)}
                className="dash-card border border-inherit/30 rounded px-1.5 py-0.5 text-[10px] font-bold dash-text"
              >
                {Object.keys(ratesToEur).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* To */}
          <div className="p-2 rounded-lg dash-inner border border-emerald-500/30">
            <span className="text-[9px] font-bold text-emerald-400 block mb-0.5">Estimated Output</span>
            <div className="flex items-center gap-1.5">
              <div className="w-full text-sm font-black text-emerald-400 truncate">
                {convertedValue > 1 ? convertedValue.toFixed(4) : convertedValue.toFixed(6)}
              </div>
              <select
                value={toCurrency}
                onChange={(e) => setToCurrency(e.target.value)}
                className="dash-card border border-emerald-500/30 rounded px-1.5 py-0.5 text-[10px] font-bold dash-text"
              >
                {Object.keys(ratesToEur).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Rates Table */}
        <div className="rounded-lg border border-inherit/20 overflow-hidden text-[10px]">
          <div className="px-2 py-1 dash-inner border-b border-inherit/20 font-bold dash-text text-[8.5px] uppercase">
            Market Benchmark
          </div>
          <div className="divide-y divide-inherit/20">
            <div className="px-2 py-1 flex justify-between">
              <span className="dash-muted">1 EUR</span>
              <span className="font-semibold dash-text">1.087 USDT</span>
            </div>
            <div className="px-2 py-1 flex justify-between">
              <span className="dash-muted">1 BTC</span>
              <span className="font-semibold dash-text">€62,450.00</span>
            </div>
            <div className="px-2 py-1 flex justify-between">
              <span className="dash-muted">1 ETH</span>
              <span className="font-semibold dash-text">€3,120.00</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-3 py-1.5 dash-inner border-t border-inherit/20 flex justify-end">
        <button onClick={onClose} className="btn btn-primary text-[10px] font-bold py-1 px-3.5 cursor-pointer">
          Close
        </button>
      </div>
    </div>
  );
};

// 3. Rental Distribution Calendar (Trimmed Compact Interface)
const YieldCalendarTool: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const payouts = [
    { date: 'Nov 1', property: 'Gran Vía Luxury Suites (Madrid)', amount: '€142.50', status: 'Upcoming' },
    { date: 'Nov 1', property: 'Eixample Boutique Residence (Barcelona)', amount: '€98.20', status: 'Upcoming' },
    { date: 'Dec 1', property: 'Gran Vía Luxury Suites (Madrid)', amount: '€142.50', status: 'Scheduled' },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden text-xs">
      <div className="px-3 py-2 bg-gradient-to-r from-[#0A1614] to-[#152B27] text-white flex items-center justify-between border-b border-[#1F3D37]">
        <div className="flex items-center gap-2">
          <div className="w-5.5 h-5.5 rounded-md bg-[#34D399] text-[#0A1614] flex items-center justify-center font-bold shrink-0">
            <Calendar className="w-3 h-3" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white leading-tight">Rental Payout Schedule</h3>
            <p className="text-[9px] text-slate-300 leading-tight">Monthly dividend distribution</p>
          </div>
        </div>
        <button onClick={onClose} className="w-5 h-5 rounded hover:bg-white/10 text-white/70 flex items-center justify-center cursor-pointer">
          <X className="w-3 h-3" />
        </button>
      </div>

      <div className="p-2.5 overflow-y-auto space-y-2 flex-1">
        <div className="p-2 rounded-lg dash-inner border border-emerald-500/30 flex items-center justify-between">
          <div>
            <span className="font-bold dash-text block text-[10px]">Next: Nov 1, 2026</span>
            <span className="text-[9px] text-emerald-400">~€240.70 to wallet</span>
          </div>
          <span className="px-1.5 py-0.5 bg-emerald-600 text-white rounded font-bold text-[8.5px]">
            In 17 Days
          </span>
        </div>

        <div className="space-y-1">
          {payouts.map((item, idx) => (
            <div key={idx} className="p-1.5 rounded-lg border border-inherit/20 dash-inner hover:opacity-90 flex items-center justify-between transition-colors">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-5.5 h-5.5 rounded dash-card dash-text border border-inherit/20 flex items-center justify-center font-bold text-[8.5px] shrink-0">
                  {item.date}
                </div>
                <div className="min-w-0">
                  <span className="font-semibold text-[10px] dash-text truncate block">{item.property}</span>
                  <span className="text-[8px] dash-muted">{item.status}</span>
                </div>
              </div>
              <span className="font-bold text-[10px] text-emerald-400 pl-1 shrink-0">{item.amount}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="px-3 py-1.5 dash-inner border-t border-inherit/20 flex justify-end">
        <button onClick={onClose} className="btn btn-primary text-[10px] font-bold py-1 px-3.5 cursor-pointer">
          Close
        </button>
      </div>
    </div>
  );
};

// 4. Auto-Reinvest (DRIP) Tool (Trimmed Compact Interface - matches user preview screenshot)
const AutoReinvestTool: React.FC<{ user: User; onClose: () => void }> = ({ user, onClose }) => {
  const [enabled, setEnabled] = useState(true);
  const [allocation, setAllocation] = useState('highest-irr');
  const [minThreshold, setMinThreshold] = useState('50');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 800);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden text-xs">
      <div className="px-3 py-2 bg-gradient-to-r from-[#0A1614] to-[#152B27] text-white flex items-center justify-between border-b border-[#1F3D37]">
        <div className="flex items-center gap-2">
          <div className="w-5.5 h-5.5 rounded-md bg-[#34D399] text-[#0A1614] flex items-center justify-center font-bold shrink-0">
            <Repeat className="w-3 h-3" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white leading-tight">Auto-Reinvest (DRIP)</h3>
            <p className="text-[9px] text-slate-300 leading-tight">Compound monthly rental payouts</p>
          </div>
        </div>
        <button onClick={onClose} className="w-5 h-5 rounded hover:bg-white/10 text-white/70 flex items-center justify-center cursor-pointer">
          <X className="w-3 h-3" />
        </button>
      </div>

      <div className="p-2.5 overflow-y-auto space-y-2 flex-1">
        <div className="p-2 rounded-lg dash-inner border border-inherit/20 flex items-center justify-between">
          <div>
            <strong className="text-[10px] dash-text block">Automated Compounding</strong>
            <span className="text-[8.5px] dash-muted">Auto-buy tokens with rent dividends</span>
          </div>
          <button
            type="button"
            onClick={() => setEnabled(!enabled)}
            className={`w-7 h-4 rounded-full transition-colors relative cursor-pointer ${
              enabled ? 'bg-[#059669]' : 'bg-slate-700/60'
            }`}
          >
            <div className={`w-3 h-3 rounded-full bg-white shadow-xs absolute top-0.5 transition-transform ${
              enabled ? 'right-0.5' : 'left-0.5'
            }`} />
          </button>
        </div>

        {enabled && (
          <div className="space-y-2">
            <div>
              <label className="text-[9px] font-bold dash-text block mb-0.5">
                Strategy
              </label>
              <select
                value={allocation}
                onChange={(e) => setAllocation(e.target.value)}
                className="w-full dash-inner border border-inherit/30 rounded-lg p-1.5 text-[10px] font-semibold dash-text"
              >
                <option value="highest-irr">Highest Net IRR Assets (11.5% - 14.8%)</option>
                <option value="equal-split">Equal Distribution Across Portfolio</option>
                <option value="cash-cushion">50% Reinvest, 50% Cash IBAN Reserve</option>
              </select>
            </div>

            <div>
              <label className="text-[9px] font-bold dash-text block mb-0.5">
                Minimum Trigger (€)
              </label>
              <input
                type="number"
                value={minThreshold}
                onChange={(e) => setMinThreshold(e.target.value)}
                className="w-full dash-inner border border-inherit/30 rounded-lg p-1.5 text-[10px] font-semibold dash-text"
                placeholder="50"
              />
              <span className="text-[8px] dash-muted mt-0.5 block">
                Triggers when dividend balance reaches €{minThreshold}.
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="px-3 py-1.5 dash-inner border-t border-inherit/20 flex justify-between items-center">
        <span className="text-[9px] dash-muted">Can pause anytime</span>
        <button 
          onClick={handleSave} 
          disabled={saved}
          className="btn btn-primary text-[10px] font-bold py-1 px-3.5 flex items-center gap-1 cursor-pointer"
        >
          {saved ? <><Check className="w-3 h-3" /> Saved</> : 'Save'}
        </button>
      </div>
    </div>
  );
};

// 5. Fiscal Tax Statement Tool (Trimmed Compact Interface)
const TaxStatementTool: React.FC<{ user: User; onClose: () => void }> = ({ user, onClose }) => {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = () => {
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
      const content = `REALTYFUND PRO - OFFICIAL FISCAL STATEMENT
Fiscal Year: 2026
Investor: ${user.fullName} (${user.email})
KYC Status: ${user.kycStatus.toUpperCase()}
Generated: ${new Date().toISOString()}
--------------------------------------------------
Total Capital Invested: €${user.investedBalance.toFixed(2)}
Liquid Balance: €${user.walletBalance.toFixed(2)}
Gross Rental Dividends (2026): €1,248.60
Withholding Tax Deducted (19% EU Treaty): €237.23
Net Disbursed Income: €1,011.37
--------------------------------------------------
Tax Jurisdiction: European Union Real Estate SPV Directive
Issuer: RealtyFund SPV S.L. Madrid, Spain.`;

      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `RealtyFund_Tax_Statement_2026_${user.fullName.replace(/\s+/g, '_')}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 700);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden text-xs">
      <div className="px-3 py-2 bg-gradient-to-r from-[#0A1614] to-[#152B27] text-white flex items-center justify-between border-b border-[#1F3D37]">
        <div className="flex items-center gap-2">
          <div className="w-5.5 h-5.5 rounded-md bg-[#34D399] text-[#0A1614] flex items-center justify-center font-bold shrink-0">
            <FileSpreadsheet className="w-3 h-3" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white leading-tight">Fiscal Tax Report (2026)</h3>
            <p className="text-[9px] text-slate-300 leading-tight">Audit-ready EU tax statement</p>
          </div>
        </div>
        <button onClick={onClose} className="w-5 h-5 rounded hover:bg-white/10 text-white/70 flex items-center justify-center cursor-pointer">
          <X className="w-3 h-3" />
        </button>
      </div>

      <div className="p-2.5 overflow-y-auto space-y-2 flex-1">
        <div className="p-2 rounded-lg dash-inner border border-inherit/20 divide-y divide-inherit/20 text-[10px]">
          <div className="flex justify-between pb-1">
            <span className="dash-muted">Investor</span>
            <span className="font-semibold dash-text">{user.fullName}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="dash-muted">Gross Dividends</span>
            <span className="font-bold text-emerald-400">€1,248.60</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="dash-muted">Withholding (19%)</span>
            <span className="font-semibold dash-text">€237.23</span>
          </div>
          <div className="flex justify-between pt-1">
            <span className="font-bold dash-text">Net Income</span>
            <span className="font-black text-emerald-400 text-[11px]">€1,011.37</span>
          </div>
        </div>

        <div className="p-1.5 dash-inner rounded-lg border border-sky-500/30 text-[9px] text-sky-400 flex items-center gap-1.5">
          <ShieldCheck className="w-3 h-3 shrink-0 text-sky-400" />
          <span>EU Modelo 210 cryptographic verification hash.</span>
        </div>
      </div>

      <div className="px-3 py-1.5 dash-inner border-t border-inherit/20 flex justify-end gap-1.5">
        <button onClick={onClose} className="btn btn-secondary text-[10px] py-1 px-2.5 cursor-pointer">
          Cancel
        </button>
        <button 
          onClick={handleDownload} 
          disabled={downloading}
          className="btn btn-primary text-[10px] font-bold py-1 px-3 flex items-center gap-1 cursor-pointer"
        >
          <Download className="w-3 h-3" />
          {downloading ? '...' : 'Download'}
        </button>
      </div>
    </div>
  );
};

// 6. Deal Alerts & Whitelist Tool (Trimmed Compact Interface)
const DealAlertsTool: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [minIrr, setMinIrr] = useState('11.0');
  const [telegramAlert, setTelegramAlert] = useState(true);
  const [emailAlert, setEmailAlert] = useState(true);
  const [saved, setSaved] = useState(false);

  return (
    <div className="flex flex-col h-full overflow-hidden text-xs">
      <div className="px-3 py-2 bg-gradient-to-r from-[#0A1614] to-[#152B27] text-white flex items-center justify-between border-b border-[#1F3D37]">
        <div className="flex items-center gap-2">
          <div className="w-5.5 h-5.5 rounded-md bg-[#34D399] text-[#0A1614] flex items-center justify-center font-bold shrink-0">
            <BellRing className="w-3 h-3" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white leading-tight">Deal Alerts & Whitelist</h3>
            <p className="text-[9px] text-slate-300 leading-tight">VIP early access to prime tranches</p>
          </div>
        </div>
        <button onClick={onClose} className="w-5 h-5 rounded hover:bg-white/10 text-white/70 flex items-center justify-center cursor-pointer">
          <X className="w-3 h-3" />
        </button>
      </div>

      <div className="p-2.5 overflow-y-auto space-y-2 flex-1">
        <div className="p-2 rounded-lg dash-inner border border-amber-500/30 text-[10px] text-amber-300">
          <strong>Whitelist Privilege:</strong> Notified 48h before launch.
        </div>

        <div>
          <div className="flex justify-between text-[10px] font-bold dash-text mb-0.5">
            <span>Minimum Net IRR</span>
            <span className="text-emerald-400">{minIrr}%</span>
          </div>
          <input
            type="range"
            min="9.0"
            max="15.0"
            step="0.5"
            value={minIrr}
            onChange={(e) => setMinIrr(e.target.value)}
            className="w-full accent-[#059669] h-1 bg-slate-700/40 rounded-lg cursor-pointer"
          />
        </div>

        <div className="space-y-1 pt-0.5">
          <label className="flex items-center gap-1.5 p-1.5 rounded-lg border border-inherit/20 dash-inner hover:opacity-90 cursor-pointer">
            <input 
              type="checkbox" 
              checked={emailAlert} 
              onChange={(e) => setEmailAlert(e.target.checked)} 
              className="accent-[#059669] rounded" 
            />
            <div>
              <span className="text-[10px] font-bold dash-text block">Email Priority</span>
              <span className="text-[8px] dash-muted">48h advance private allocation</span>
            </div>
          </label>

          <label className="flex items-center gap-1.5 p-1.5 rounded-lg border border-inherit/20 dash-inner hover:opacity-90 cursor-pointer">
            <input 
              type="checkbox" 
              checked={telegramAlert} 
              onChange={(e) => setTelegramAlert(e.target.checked)} 
              className="accent-[#059669] rounded" 
            />
            <div>
              <span className="text-[10px] font-bold dash-text block">Telegram Push</span>
              <span className="text-[8px] dash-muted">Instant ping when pool opens</span>
            </div>
          </label>
        </div>
      </div>

      <div className="px-3 py-1.5 dash-inner border-t border-inherit/20 flex justify-end">
        <button 
          onClick={() => {
            setSaved(true);
            setTimeout(() => { setSaved(false); onClose(); }, 700);
          }} 
          className="btn btn-primary text-[10px] font-bold py-1 px-3.5 cursor-pointer"
        >
          {saved ? 'Saved' : 'Save'}
        </button>
      </div>
    </div>
  );
};
