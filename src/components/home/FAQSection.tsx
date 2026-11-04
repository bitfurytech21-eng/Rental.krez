import React, { useState } from 'react';
import { FAQ_DATA } from '../../data/faq';
import { ChevronDown, ArrowRight } from 'lucide-react';

interface FAQSectionProps {
  onNavigateFAQ?: () => void;
  onNavigateContact?: () => void;
}

export const FAQSection: React.FC<FAQSectionProps> = ({ onNavigateFAQ, onNavigateContact }) => {
  const [openId, setOpenId] = useState<string | null>('faq-1');
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const categories = ['All', 'General', 'Investment', 'Yields', 'Security & Legal'];

  const filteredItems = activeCategory === 'All'
    ? FAQ_DATA.slice(0, 6)
    : FAQ_DATA.filter(item => item.category === activeCategory);

  const toggle = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <section className="py-20 sm:py-28 bg-[#0B1B30] text-white border-b border-[#1A3358]" id="faq">
      <div className="container max-w-[1240px] mx-auto px-4 sm:px-6">
        
        {/* Section Heading with Yellow / Lime Accent matching request */}
        <div className="max-w-3xl mx-auto text-center mb-12 space-y-4">
          <p className="text-[11px] font-extrabold text-[#BEE179] tracking-[0.2em] uppercase">
            Inquiries & Clarifications
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-black text-[#BEE179] tracking-tight drop-shadow-xs">
            Frequently Asked Questions
          </h2>
          <p className="text-base text-[#D1E2F7] max-w-2xl mx-auto font-medium leading-relaxed">
            Essential information regarding fractional property ownership, monthly cash distributions, and legal safeguards.
          </p>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition-all cursor-pointer ${
                activeCategory === cat
                  ? 'bg-[#BEE179] text-[#0B1B30] shadow-md'
                  : 'bg-[#132745] text-slate-200 hover:text-white border border-[#23406D]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* FAQ Accordion */}
        <div className="max-w-3xl mx-auto space-y-3">
          {filteredItems.map((item) => {
            const isOpen = openId === item.id;
            return (
              <div
                key={item.id}
                className="bg-[#102442] border border-[#1D3860] rounded-xl overflow-hidden transition-all shadow-sm hover:border-[#BEE179]/50"
              >
                <button
                  onClick={() => toggle(item.id)}
                  className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 font-serif text-base font-bold text-white hover:text-[#BEE179] transition-colors cursor-pointer"
                >
                  <span>{item.question}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-[#8EA7C7] shrink-0 transition-transform duration-200 ${
                      isOpen ? 'transform rotate-180 text-[#BEE179]' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-6 pb-6 text-xs sm:text-sm text-[#D1E2F7] font-medium leading-relaxed border-t border-[#1D3860] pt-4">
                    <p>{item.answer}</p>
                    <div className="mt-3 text-[10px] uppercase tracking-wider font-extrabold text-[#BEE179]">
                      Topic: {item.category}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom prompt */}
        <div className="text-center mt-12 pt-6 border-t border-[#1A3358]">
          <p className="text-sm text-[#D1E2F7] font-medium mb-4">
            Have specific questions regarding cross-border tax treatment or entity structuring?
          </p>
          <div className="flex justify-center items-center gap-3">
            {onNavigateContact && (
              <button
                onClick={onNavigateContact}
                className="py-2.5 px-5 text-xs font-extrabold bg-[#BEE179] hover:bg-[#aed860] text-[#0B1B30] rounded-lg cursor-pointer transition-all shadow-sm flex items-center gap-2"
              >
                <span>Contact Advisory Desk</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#0B1B30] stroke-[2.5]" />
              </button>
            )}
            {onNavigateFAQ && (
              <button
                onClick={onNavigateFAQ}
                className="py-2.5 px-5 text-xs font-bold bg-[#132745] hover:bg-[#1A3258] border border-[#23406D] text-white rounded-lg cursor-pointer transition-all"
              >
                <span>View Full Knowledge Base</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </section>
  );
};
