import React, { useEffect, useState, useMemo } from 'react';
import { Search, Building2, FileText, ArrowRight, X, TrendingUp, CreditCard, LayoutDashboard, Settings } from 'lucide-react';
import { Property } from '../../types/property';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: string) => void;
  onSelectProperty: (property: Property) => void;
  properties: Property[];
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onSelectProperty,
  properties,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          setQuery('');
          setSelectedIndex(0);
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const navigationItems = useMemo(
    () => [
      { id: 'overview', label: 'Overview', category: 'Navigation', icon: LayoutDashboard },
      { id: 'marketplace', label: 'Marketplace (Explorer)', category: 'Navigation', icon: Building2 },
      { id: 'my-properties', label: 'My Properties', category: 'Navigation', icon: TrendingUp },
      { id: 'transactions', label: 'Transactions History', category: 'Navigation', icon: CreditCard },
      { id: 'income', label: 'Income & Yield Analytics', category: 'Navigation', icon: TrendingUp },
      { id: 'documents', label: 'Documents Vault', category: 'Navigation', icon: FileText },
      { id: 'settings', label: 'Account & Security Settings', category: 'Navigation', icon: Settings },
    ],
    []
  );

  const filteredNav = useMemo(() => {
    if (!query.trim()) return navigationItems;
    return navigationItems.filter((item) =>
      item.label.toLowerCase().includes(query.toLowerCase())
    );
  }, [navigationItems, query]);

  const filteredProperties = useMemo(() => {
    if (!query.trim()) return properties.slice(0, 4);
    return properties
      .filter(
        (p) =>
          p.title.toLowerCase().includes(query.toLowerCase()) ||
          p.location.toLowerCase().includes(query.toLowerCase()) ||
          p.type?.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, 5);
  }, [properties, query]);

  const allItems = useMemo(() => {
    const items: Array<{
      type: 'nav' | 'property';
      id: string;
      title: string;
      subtitle?: string;
      rawProperty?: Property;
    }> = [];

    filteredNav.forEach((n) => {
      items.push({
        type: 'nav',
        id: n.id,
        title: n.label,
        subtitle: 'Page view',
      });
    });

    filteredProperties.forEach((p) => {
      items.push({
        type: 'property',
        id: p.id,
        title: p.title,
        subtitle: `${p.location} • ${p.estimatedAnnualYield}% p.a. • €${p.tokenPrice}/token`,
        rawProperty: p,
      });
    });

    return items;
  }, [filteredNav, filteredProperties]);

  const handleSelect = (index: number) => {
    const item = allItems[index];
    if (!item) return;
    if (item.type === 'nav') {
      onNavigateTab(item.id);
    } else if (item.type === 'property' && item.rawProperty) {
      onSelectProperty(item.rawProperty);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[600px] rounded-[12px] bg-white dark:bg-[#111A2C] border border-[#E2E8F0] dark:border-[#1E293B] shadow-2xl overflow-hidden text-[#0F172A] dark:text-[#E2E8F0] transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#E2E8F0] dark:border-[#1E293B]">
          <Search className="w-[18px] h-[18px] text-[#64748B] dark:text-[#94A3B8]" strokeWidth={1.5} />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex((prev) => (prev + 1) % (allItems.length || 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex((prev) => (prev - 1 + (allItems.length || 1)) % (allItems.length || 1));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                handleSelect(selectedIndex);
              }
            }}
            placeholder="Search pages, properties, or transactions... (Esc to close)"
            className="flex-1 bg-transparent border-none text-[14px] text-[#0F172A] dark:text-[#E2E8F0] placeholder:text-[#64748B] dark:placeholder:text-[#94A3B8] focus:outline-none focus:ring-0"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-[8px] text-[#64748B] dark:text-[#94A3B8] hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] transition-colors"
          >
            <X className="w-[18px] h-[18px]" strokeWidth={1.5} />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-[360px] overflow-y-auto p-2 divide-y divide-[#E2E8F0]/50 dark:divide-[#1E293B]/50">
          {allItems.length === 0 ? (
            <div className="p-8 text-center text-[14px] text-[#64748B] dark:text-[#94A3B8]">
              No results found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <div className="space-y-1">
              {allItems.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={`${item.type}-${item.id}`}
                    onClick={() => handleSelect(idx)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-[8px] text-left text-[14px] transition-colors ${
                      isSelected
                        ? 'bg-[#0F4C81]/10 dark:bg-[#14B8A6]/10 text-[#0F4C81] dark:text-[#14B8A6]'
                        : 'text-[#0F172A] dark:text-[#E2E8F0] hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B]/40'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0 ${
                          item.type === 'property'
                            ? 'bg-[#14B8A6]/10 text-[#14B8A6]'
                            : 'bg-[#0F4C81]/10 text-[#0F4C81] dark:text-[#14B8A6]'
                        }`}
                      >
                        {item.type === 'property' ? (
                          <Building2 className="w-[18px] h-[18px]" strokeWidth={1.5} />
                        ) : (
                          <LayoutDashboard className="w-[18px] h-[18px]" strokeWidth={1.5} />
                        )}
                      </div>
                      <div className="truncate">
                        <div className="font-medium text-[14px] truncate">{item.title}</div>
                        {item.subtitle && (
                          <div className="text-[12px] text-[#64748B] dark:text-[#94A3B8] truncate tabular-nums">
                            {item.subtitle}
                          </div>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="w-[18px] h-[18px] text-[#64748B] dark:text-[#94A3B8] shrink-0" strokeWidth={1.5} />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#F8FAFC] dark:bg-[#0B1220] border-t border-[#E2E8F0] dark:border-[#1E293B] text-[12px] text-[#64748B] dark:text-[#94A3B8]">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-white dark:bg-[#111A2C] border border-[#E2E8F0] dark:border-[#1E293B] font-mono">↑↓</span>
            <span>to navigate</span>
            <span className="px-1.5 py-0.5 rounded bg-white dark:bg-[#111A2C] border border-[#E2E8F0] dark:border-[#1E293B] font-mono">↵</span>
            <span>to select</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="px-1.5 py-0.5 rounded bg-white dark:bg-[#111A2C] border border-[#E2E8F0] dark:border-[#1E293B] font-mono">ESC</span>
            <span>to close</span>
          </div>
        </div>
      </div>
    </div>
  );
};
