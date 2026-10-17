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
    <div className="bg-[#F6F7F4] min-h-screen py-12">
      <div className="container space-y-10">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#E3E8E3] text-xs font-semibold text-[#182D2A]">
            <HelpCircle className="w-3.5 h-3.5 text-[#27845D]" />
            <span>Knowledge Base & Support</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-[#18211F]">
            Frequently Asked Questions
          </h1>
          <p className="text-sm text-[#69736F]">
            Clear, verifiable answers regarding property tokenization, SPV legal ownership, deposits, withdrawals, and tax considerations.
          </p>

          {/* Search Bar */}
          <div className="relative max-w-lg mx-auto pt-2">
            <Search className="w-4 h-4 absolute left-4 top-5 text-[#69736F]" />
            <input
              type="text"
              placeholder="Search topics (e.g., yields, withdrawals, KYC, taxes)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-[#E3E8E3] rounded-2xl shadow-sm text-sm focus:outline-none focus:border-[#182D2A]"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap justify-center gap-2">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCategory(c)}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                selectedCategory === c
                  ? 'bg-[#182D2A] text-white shadow-sm'
                  : 'bg-white text-[#69736F] hover:text-[#18211F] border border-[#E3E8E3]'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* FAQ Items */}
        <div className="max-w-3xl mx-auto space-y-3">
          {filtered.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-[#E3E8E3] text-center text-xs text-[#69736F]">
              No questions found matching "{search}".
            </div>
          ) : (
            filtered.map((item) => {
              const isOpen = !!openIds[item.id];
              return (
                <div
                  key={item.id}
                  className="bg-white border border-[#E3E8E3] rounded-2xl overflow-hidden shadow-sm"
                >
                  <button
                    onClick={() => toggle(item.id)}
                    className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 font-bold text-[#18211F] hover:text-[#27845D] transition-colors"
                  >
                    <span className="text-sm sm:text-base">{item.question}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-[#69736F] shrink-0 transition-transform ${
                        isOpen ? 'rotate-180 text-[#182D2A]' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-6 text-xs sm:text-sm text-[#69736F] leading-relaxed border-t border-gray-100 pt-3">
                      <p>{item.answer}</p>
                      <div className="mt-3 text-[11px] font-semibold text-[#27845D]">
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
        <div className="max-w-xl mx-auto bg-white p-6 rounded-2xl border border-[#E3E8E3] text-center shadow-sm space-y-3">
          <Mail className="w-6 h-6 text-[#27845D] mx-auto" />
          <h4 className="text-base font-bold text-[#18211F]">Need custom assistance?</h4>
          <p className="text-xs text-[#69736F]">
            Our compliance and real estate investor relations team responds within 24 business hours.
          </p>
          <button onClick={onContact} className="btn btn-secondary btn-sm text-xs font-semibold">
            Contact Investor Desk
          </button>
        </div>
      </div>
    </div>
  );
};
