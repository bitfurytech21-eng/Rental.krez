import React, { useState } from 'react';
import { Crown, ShieldCheck, CheckCircle2, ArrowRight, Building2, TrendingUp, Users, Headphones, Lock, Sparkles, PhoneCall } from 'lucide-react';

interface WealthPageProps {
  onExplore: () => void;
  onContact: () => void;
}

export const WealthPage: React.FC<WealthPageProps> = ({ onExplore, onContact }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    investmentCapacity: '€50,000 - €250,000',
    country: 'Spain',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email) return;
    setSubmitted(true);
  };

  const perks = [
    {
      icon: Headphones,
      title: 'Dedicated Wealth Executive',
      description: 'Direct priority communication channel with a personal senior account manager for portfolio structuring and asset allocation.',
    },
    {
      icon: Sparkles,
      title: 'Early Allocation Access',
      description: 'Get exclusive 48-hour advance access and guaranteed token allocations on high-yield prime European and US properties before public release.',
    },
    {
      icon: TrendingUp,
      title: 'Institutional Yield Optimization',
      description: 'Customized multi-property diversification strategies targeting 12% to 15% net annualized returns with monthly cashflow compounding.',
    },
    {
      icon: ShieldCheck,
      title: 'Advanced SPV & Tax Structuring',
      description: 'Tailored legal assistance for high-net-worth investors, family offices, and corporate entities setting up tax-efficient SPV holdings.',
    },
    {
      icon: Crown,
      title: 'Exclusive Investor Events',
      description: 'VIP invitations to private real estate site visits, quarterly economic outlook webinars, and networking dinners with global founders.',
    },
    {
      icon: Lock,
      title: 'Priority P2P Liquidity Desk',
      description: 'Direct facilitation for secondary market token liquidity transfers and bulk private-party sales without public waiting periods.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F6F7F4] text-[#18211F]">
      {/* Hero Section */}
      <section className="bg-[#031914] text-white py-20 lg:py-28 relative overflow-hidden max-w-full">
        <div className="absolute top-0 right-1/4 w-72 sm:w-[600px] h-72 sm:h-[600px] max-w-full bg-[#00FF9D]/10 rounded-full blur-[140px] pointer-events-none" />
        
        <div className="container max-w-[1240px] mx-auto px-4 relative z-10">
          <div className="max-w-3xl space-y-6 text-left">
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-emerald-950 border border-emerald-500/35 text-[#00FF9D] text-xs font-bold shadow-lg">
              <Crown className="w-4 h-4 text-[#00FF9D]" />
              <span>Kretz Wealth • Private Investor Service</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.08]">
              Exclusive Advisory & Private Portfolio Management for <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00FF9D] to-teal-300">High-Net-Worth Investors</span>
            </h1>

            <p className="text-base sm:text-lg text-emerald-100/80 max-w-2xl leading-relaxed font-normal">
              Designed for accredited investors, family offices, and committed participants with portfolios starting from €50,000. Access customized institutional allocations, dedicated executive advisory, and priority liquidity.
            </p>

            <div className="flex flex-wrap gap-4 pt-4">
              <a
                href="#wealth-form"
                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-[#00E676] to-[#00C853] hover:from-[#00FF9D] hover:to-[#00E676] text-[#031914] font-extrabold text-sm shadow-xl shadow-[#00E676]/25 transition-all flex items-center gap-2"
              >
                <span>Request Wealth Advisory</span>
                <ArrowRight className="w-4 h-4" />
              </a>
              <button
                onClick={onExplore}
                className="px-7 py-4 rounded-2xl bg-emerald-950/80 hover:bg-emerald-900/80 border border-emerald-500/40 text-white font-bold text-sm backdrop-blur-md transition-all cursor-pointer"
              >
                Explore Marketplace
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Perks Grid */}
      <section className="py-20 container max-w-[1240px] mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#E3E8E3] text-xs font-semibold text-[#182D2A]">
            <span>Privileged Services</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#18211F]">
            The Kretz Wealth Advantage
          </h2>
          <p className="text-sm text-[#69736F]">
            Elevate your real estate tokenization experience with VIP privileges tailored for serious capital growth.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {perks.map((perk, idx) => {
            const Icon = perk.icon;
            return (
              <div
                key={idx}
                className="bg-white p-8 rounded-3xl border border-[#E3E8E3] shadow-sm hover:shadow-xl transition-all duration-300 group space-y-4"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#EEF1EC] text-[#182D2A] group-hover:bg-[#182D2A] group-hover:text-[#00FF9D] flex items-center justify-center transition-colors">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-[#18211F]">{perk.title}</h3>
                <p className="text-sm text-[#69736F] leading-relaxed">{perk.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Consultation Request Form Section */}
      <section className="py-20 bg-[#031914] text-white relative overflow-hidden max-w-full" id="wealth-form">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 sm:w-[700px] h-60 sm:h-[400px] max-w-full bg-[#00FF9D]/10 rounded-full blur-[150px] pointer-events-none" />

        <div className="container max-w-[1240px] mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-6 space-y-6 text-left">
              <span className="text-xs font-bold text-[#00FF9D] uppercase tracking-wider block">Priority Concierge</span>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
                Schedule a 1-on-1 Consultation with our Wealth Desk
              </h2>
              <p className="text-base text-emerald-100/80 leading-relaxed">
                Fill out the confidential consultation request. A dedicated senior wealth executive will reach out within 24 hours to review your investment goals and discuss custom property allocations.
              </p>

              <div className="space-y-4 pt-4 text-sm font-semibold text-emerald-200">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#00FF9D]" />
                  <span>Strict confidentiality & GDPR compliant data security</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#00FF9D]" />
                  <span>Custom portfolio simulations & projected cashflow models</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#00FF9D]" />
                  <span>Direct assistance for company & SPV investments</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="bg-[#06241D] border border-emerald-500/30 p-8 rounded-3xl shadow-2xl backdrop-blur-xl">
                {submitted ? (
                  <div className="text-center py-12 space-y-4">
                    <div className="w-16 h-16 rounded-full bg-[#00E676]/20 border border-[#00FF9D] text-[#00FF9D] flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-bold text-white">Consultation Requested!</h3>
                    <p className="text-sm text-emerald-100/80 max-w-sm mx-auto">
                      Thank you, <span className="font-bold text-white">{formData.fullName}</span>. Your dedicated wealth executive will contact you shortly at <span className="font-bold text-white">{formData.email}</span>.
                    </p>
                    <button
                      onClick={() => setSubmitted(false)}
                      className="mt-4 px-6 py-2.5 rounded-xl bg-emerald-950 text-[#00FF9D] text-xs font-bold border border-emerald-500/30 hover:bg-emerald-900 transition-colors"
                    >
                      Submit Another Request
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4 text-left">
                    <h3 className="text-xl font-extrabold text-white mb-2">Request Wealth Advisory</h3>
                    
                    <div>
                      <label className="block text-xs font-semibold text-emerald-300 uppercase mb-1">Full Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Alexander Vance"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-[#031914] border border-emerald-900 text-white placeholder-emerald-700 text-sm focus:outline-none focus:border-[#00FF9D]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-emerald-300 uppercase mb-1">Email Address</label>
                        <input
                          type="email"
                          required
                          placeholder="name@example.com"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl bg-[#031914] border border-emerald-900 text-white placeholder-emerald-700 text-sm focus:outline-none focus:border-[#00FF9D]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-emerald-300 uppercase mb-1">Phone Number</label>
                        <input
                          type="tel"
                          placeholder="+34 600 000 000"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl bg-[#031914] border border-emerald-900 text-white placeholder-emerald-700 text-sm focus:outline-none focus:border-[#00FF9D]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-emerald-300 uppercase mb-1">Target Capital Capacity</label>
                        <select
                          value={formData.investmentCapacity}
                          onChange={(e) => setFormData({ ...formData, investmentCapacity: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl bg-[#031914] border border-emerald-900 text-white text-sm focus:outline-none focus:border-[#00FF9D]"
                        >
                          <option>€50,000 - €250,000</option>
                          <option>€250,000 - €1,000,000</option>
                          <option>€1,000,000+</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-emerald-300 uppercase mb-1">Country of Tax Residency</label>
                        <input
                          type="text"
                          value={formData.country}
                          onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl bg-[#031914] border border-emerald-900 text-white text-sm focus:outline-none focus:border-[#00FF9D]"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-4 rounded-xl bg-gradient-to-r from-[#00E676] to-[#00C853] hover:from-[#00FF9D] hover:to-[#00E676] text-[#031914] font-extrabold text-sm transition-all shadow-lg shadow-[#00E676]/20 flex items-center justify-center gap-2 cursor-pointer mt-4"
                    >
                      <PhoneCall className="w-4 h-4" />
                      <span>Book Confidential Consultation</span>
                    </button>
                  </form>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
};
