import React, { useState } from 'react';
import { FAQ_DATA, FAQItem } from '../../data/faq';
import { ChevronDown, HelpCircle, ArrowRight } from 'lucide-react';

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
    <section className="section section--soft" id="faq">
      <div className="container">
        <div className="section-heading">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#E3E8E3] text-xs font-semibold text-[#182D2A] mb-3">
            <HelpCircle className="w-3.5 h-3.5 text-[#27845D]" />
            <span>Got Questions?</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#18211F] mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-base text-[#69736F]">
            Everything you need to know about fractional property investing, distributions, and investor protections.
          </p>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                activeCategory === cat
                  ? 'bg-[#182D2A] text-white shadow-sm'
                  : 'bg-white text-[#69736F] hover:text-[#18211F] border border-[#E3E8E3]'
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
                className="bg-white border border-[#E3E8E3] rounded-2xl overflow-hidden transition-all shadow-sm"
              >
                <button
                  onClick={() => toggle(item.id)}
                  className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 font-bold text-[#18211F] hover:text-[#27845D] transition-colors"
                >
                  <span className="text-base">{item.question}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-[#69736F] shrink-0 transition-transform duration-200 ${
                      isOpen ? 'transform rotate-180 text-[#182D2A]' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-6 pb-6 text-sm text-[#69736F] leading-relaxed border-t border-gray-100 pt-3">
                    <p>{item.answer}</p>
                    <div className="mt-3 text-[11px] font-semibold text-[#27845D]">
                      Category: {item.category}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom prompt */}
        <div className="text-center mt-10">
          <p className="text-sm text-[#69736F] mb-3">
            Still have questions regarding tax residency or specific legal frameworks?
          </p>
          <div className="flex justify-center gap-3">
            {onNavigateContact && (
              <button
                onClick={onNavigateContact}
                className="btn btn-secondary btn-sm"
              >
                Contact Investment Desk
              </button>
            )}
            {onNavigateFAQ && (
              <button
                onClick={onNavigateFAQ}
                className="btn btn-primary btn-sm flex items-center gap-1.5"
              >
                <span>Read Full Knowledge Base</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
