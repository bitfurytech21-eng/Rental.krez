import React, { useState } from 'react';
import { FAQ_DATA, FAQItem } from '../../data/faq';
import { ChevronDown, Search, HelpCircle, Mail } from 'lucide-react';

interface FAQPageProps {
  onContact: () => void;
}

export const FAQPage: React.FC<FAQPageProps> = ({ onContact }) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({ 'faq-1': true, 'faq-2': true });

  const categories = ['All', 'General', 'Investment', 'Yields', 'Deposits & Withdrawals', 'Security & Legal'];

  const filtered = FAQ_DATA.filter((item) => {
    if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return item.question.toLowerCase().includes(q) || item.answer.toLowerCase().includes(q);
    }
    return true;
  });

  const toggle = (id: string) => {
    setOpenIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="bg-[#0B1B30] text-white min-h-screen py-12">
      <div className="container space-y-10">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#122846] border border-[#1D3B66] text-xs font-bold text-[#BEE179]">
            <HelpCircle className="w-3.5 h-3.5 text-[#BEE179]" />
            <span>Knowledge Base & Support</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#BEE179] tracking-tight drop-shadow-xs">
            Frequently Asked Questions
          </h1>
          <p className="text-sm sm:text-base text-[#D1E2F7] font-medium leading-relaxed">
            Clear, verifiable answers regarding property tokenization, SPV legal ownership, deposits, withdrawals, and tax considerations.
          </p>

          {/* Search Bar */}
          <div className="relative max-w-lg mx-auto pt-2">
            <Search className="w-4 h-4 absolute left-4 top-5 text-[#8EA7C7]" />
            <input
              type="text"
              placeholder="Search topics (e.g., yields, withdrawals, KYC, taxes)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-[#102442] border border-[#1D3860] rounded-2xl shadow-sm text-sm text-white placeholder-[#8EA7C7] focus:outline-none focus:border-[#BEE179]"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap justify-center gap-2">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCategory(c)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === c
                  ? 'bg-[#BEE179] text-[#0B1B30] shadow-md'
                  : 'bg-[#132745] text-slate-200 border border-[#23406D] hover:text-white'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* FAQ Items */}
        <div className="max-w-3xl mx-auto space-y-3">
          {filtered.length === 0 ? (
            <div className="bg-[#102442] p-8 rounded-2xl border border-[#1D3860] text-center text-xs text-[#8EA7C7]">
              No questions found matching "{search}".
            </div>
          ) : (
            filtered.map((item) => {
              const isOpen = !!openIds[item.id];
              return (
                <div
                  key={item.id}
                  className="bg-[#102442] border border-[#1D3860] rounded-2xl overflow-hidden shadow-sm"
                >
                  <button
                    onClick={() => toggle(item.id)}
                    className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 font-bold text-white hover:text-[#BEE179] transition-colors cursor-pointer"
                  >
                    <span className="text-sm sm:text-base">{item.question}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-[#8EA7C7] shrink-0 transition-transform ${
                        isOpen ? 'rotate-180 text-[#BEE179]' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-6 text-xs sm:text-sm text-[#D1E2F7] leading-relaxed border-t border-[#1D3860] pt-3">
                      <p>{item.answer}</p>
                      <div className="mt-3 text-[11px] font-semibold text-[#BEE179]">
                        Topic: {item.category}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Support Banner */}
        <div className="max-w-xl mx-auto bg-[#102442] p-6 rounded-2xl border border-[#1D3860] text-center shadow-sm space-y-3">
          <Mail className="w-6 h-6 text-[#BEE179] mx-auto" />
          <h4 className="text-base font-bold text-white">Need custom assistance?</h4>
          <p className="text-xs text-[#8EA7C7]">
            Our compliance and real estate investor relations team responds within 24 business hours.
          </p>
          <button onClick={onContact} className="px-5 py-2.5 rounded-xl bg-[#BEE179] hover:bg-[#AEDB5B] text-[#0B1B30] text-xs font-bold transition-all cursor-pointer">
            Contact Investor Desk
          </button>
        </div>
      </div>
    </div>
  );
};
