import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../lib/auth';
import { MessageSquare, X, Send, Bot, ShieldCheck, Mail, Phone, ExternalLink, ChevronDown, CheckCircle2, Clock } from 'lucide-react';

declare global {
  interface Window {
    smartsupp?: any;
    _smartsupp?: any;
  }
}

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user' | 'agent';
  text: string;
  timestamp: string;
}

export const SmartsuppWidget: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'bot',
      text: 'Hello! Welcome to Kretz Customer Support powered by Smartsupp. How can our European real estate advisors assist you today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync user metadata with Smartsupp SDK if loaded
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window._smartsupp = window._smartsupp || {};
      window._smartsupp.email = 'louisaw311@gmail.com';
      if (window.smartsupp) {
        try {
          window.smartsupp('account:email', 'louisaw311@gmail.com');
          if (user) {
            window.smartsupp('name', user.fullName);
            window.smartsupp('email', user.email);
            window.smartsupp('variables', {
              accountType: user.accountType || 'individual',
              role: user.role,
              kycStatus: user.kycStatus,
              smartsuppOwner: 'louisaw311@gmail.com',
            });
          }
        } catch (e) {
          console.log('Smartsupp SDK sync note:', e);
        }
      }
    }
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const triggerOfficialSmartsupp = () => {
    if (typeof window !== 'undefined' && window.smartsupp) {
      try {
        window.smartsupp('chat:open');
      } catch {
        console.log('Smartsupp native chat open fallback');
      }
    }
  };

  const handleSendMessage = (customText?: string) => {
    const textToSend = customText || inputMessage;
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setInputMessage('');
    setIsTyping(true);

    // Forward to native Smartsupp JS if active
    if (typeof window !== 'undefined' && window.smartsupp) {
      try {
        window.smartsupp('send', 'chat:message', { text: textToSend });
      } catch (e) {
        // Fallthrough
      }
    }

    // Smartsupp Automated Support Responses
    setTimeout(() => {
      setIsTyping(false);
      let reply = "Thank you for reaching out! A Kretz support specialist has received your inquiry. For priority written follow-up, you can also reach us directly at info@kretz.site.";
      
      const lower = textToSend.toLowerCase();
      if (lower.includes('deposit') || lower.includes('sepa') || lower.includes('wire') || lower.includes('fund')) {
        reply = "Deposits can be made via SEPA EUR Wire Transfer or Crypto Stablecoins (USDT/USDC on Polygon POS). Instructions are available in your Dashboard Wallet. Need manual verification? Email info@kretz.site.";
      } else if (lower.includes('dividend') || lower.includes('payout') || lower.includes('monthly') || lower.includes('return')) {
        reply = "Rental dividends are calculated pro-rata and credited directly to your investor wallet balance on the 1st business day of each month.";
      } else if (lower.includes('deed') || lower.includes('notary') || lower.includes('spv') || lower.includes('legal')) {
        reply = "Every property is held in an independent ring-fenced S.L. / SCI SPV with public notary deed registration. Official documents are available under the Documents tab.";
      } else if (lower.includes('email') || lower.includes('contact') || lower.includes('human') || lower.includes('agent')) {
        reply = "Our main investor support desk is info@kretz.site. A senior advisor responds within 15–30 minutes during European business hours.";
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          sender: 'agent',
          text: reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }, 1000);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 select-none">
      {/* Smartsupp Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative bg-[#182D2A] hover:bg-[#24423C] text-white p-3.5 sm:px-5 sm:py-3.5 rounded-full shadow-2xl border border-emerald-500/30 transition-all duration-300 flex items-center gap-3 cursor-pointer hover:scale-105"
          title="Smartsupp Customer Support (info@kretz.site)"
        >
          <div className="relative">
            <MessageSquare className="w-5 h-5 text-[#B7E36A]" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-[#182D2A] animate-pulse" />
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-black tracking-tight leading-none text-white">
              Smartsupp Support
            </span>
            <span className="text-[10px] text-emerald-400 font-semibold leading-tight mt-0.5">
              Online · info@kretz.site
            </span>
          </div>
        </button>
      )}

      {/* Expanded Smartsupp Customer Support Widget */}
      {isOpen && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-[calc(100vw-32px)] sm:w-[380px] max-w-md h-[540px] max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 text-left">
          {/* Smartsupp Header */}
          <div className="bg-[#182D2A] p-4 text-white flex items-center justify-between border-b border-[#24423C]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-[#24423C] border border-emerald-500/30 flex items-center justify-center text-[#B7E36A] relative">
                <Bot className="w-5 h-5" />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-[#182D2A]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-xs text-white">Smartsupp Support</h3>
                  <span className="bg-emerald-500/20 text-[#B7E36A] text-[9px] font-extrabold px-2 py-0.2 rounded-full border border-[#B7E36A]/30">
                    Live
                  </span>
                </div>
                <p className="text-[10px] text-slate-300 flex items-center gap-1 mt-0.5">
                  <Mail className="w-3 h-3 text-[#B7E36A]" />
                  <span>info@kretz.site</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Close Chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Info Ribbon */}
          <div className="bg-[#F6F7F4] px-4 py-2 border-b border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
            <span className="flex items-center gap-1.5 font-semibold text-emerald-800">
              <Clock className="w-3 h-3" />
              <span>Response time: &lt; 2 mins</span>
            </span>
            <button
              onClick={triggerOfficialSmartsupp}
              className="text-[10px] font-bold text-[#182D2A] hover:underline flex items-center gap-1"
            >
              <span>Smartsupp Engine</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </button>
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#FAFBF9]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-[#182D2A] text-white rounded-br-none'
                      : 'bg-white border border-slate-200 text-slate-800 shadow-2xs rounded-bl-none'
                  }`}
                >
                  <p>{msg.text}</p>
                  <span
                    className={`text-[9px] block mt-1 text-right ${
                      msg.sender === 'user' ? 'text-slate-300' : 'text-slate-400'
                    }`}
                  >
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-white p-2.5 rounded-2xl border border-slate-200 w-24">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Chips */}
          <div className="px-3 py-2 bg-white border-t border-slate-100 flex gap-1.5 overflow-x-auto scrollbar-none shrink-0">
            <button
              onClick={() => handleSendMessage('How do rental dividends work?')}
              className="px-2.5 py-1 rounded-full bg-[#F6F7F4] hover:bg-slate-200 text-[10px] font-bold text-slate-700 whitespace-nowrap border border-slate-200 cursor-pointer"
            >
              Dividends & Returns
            </button>
            <button
              onClick={() => handleSendMessage('What is the wire deposit process?')}
              className="px-2.5 py-1 rounded-full bg-[#F6F7F4] hover:bg-slate-200 text-[10px] font-bold text-slate-700 whitespace-nowrap border border-slate-200 cursor-pointer"
            >
              SEPA Wire Info
            </button>
            <button
              onClick={() => handleSendMessage('How to contact support at info@kretz.site?')}
              className="px-2.5 py-1 rounded-full bg-[#F6F7F4] hover:bg-slate-200 text-[10px] font-bold text-slate-700 whitespace-nowrap border border-slate-200 cursor-pointer"
            >
              info@kretz.site Desk
            </button>
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask a question or request assistance..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              className="flex-1 px-3.5 py-2.5 rounded-full border border-slate-200 text-xs bg-[#F9FAF8] focus:outline-none focus:border-[#182D2A]"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim()}
              className="w-9 h-9 rounded-full bg-[#182D2A] hover:bg-[#24423C] disabled:opacity-40 text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          {/* Smartsupp Powered Footer */}
          <div className="bg-[#F6F7F4] py-1.5 px-3 text-center border-t border-slate-200 text-[9px] text-slate-500 font-medium">
            <span>Smartsupp Agent: <strong>louisaw311@gmail.com</strong> · Desk: <a href="mailto:info@kretz.site" className="text-emerald-800 font-bold hover:underline">info@kretz.site</a></span>
          </div>
        </div>
      )}
    </div>
  );
};
