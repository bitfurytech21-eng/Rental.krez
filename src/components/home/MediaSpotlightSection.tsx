import React, { useState } from 'react';
import { Play, Tv, ArrowRight, ShieldCheck, Sparkles, Building2, TrendingUp, Globe, ExternalLink } from 'lucide-react';

interface MediaSpotlightSectionProps {
  onNavigateNews?: () => void;
  onNavigateContact?: () => void;
  onNavigateProperties?: () => void;
}

export const MediaSpotlightSection: React.FC<MediaSpotlightSectionProps> = ({
  onNavigateNews,
  onNavigateContact,
  onNavigateProperties,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  const youtubeVideoId = 'dwmIqvREPz8';
  const embedUrl = `https://www.youtube-nocookie.com/embed/${youtubeVideoId}?autoplay=1&rel=0&modestbranding=1&autohide=1`;

  return (
    <section className="py-16 sm:py-24 bg-[#12201D] text-white border-t border-b border-[#1E3631] relative overflow-hidden text-left">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#27845D]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-10 w-80 h-80 bg-[#B7E36A]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="container max-w-[1240px] mx-auto px-4 sm:px-6 relative z-10">
        
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-6 mb-8 sm:mb-12">
          <div className="space-y-3.5 max-w-3xl">
            {/* Eyebrow Label */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#182C27] border border-[#23423B] text-[#B7E36A] text-[11px] sm:text-xs font-bold uppercase tracking-wider">
              <Tv className="w-3.5 h-3.5 text-[#B7E36A]" />
              <span>MEDIA &amp; INDUSTRY SPOTLIGHT</span>
            </div>

            {/* Main Heading */}
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-snug sm:leading-tight">
              Inside the Future of Real Estate: Perspectives, Innovation &amp; Market Transformation
            </h2>

            {/* Description */}
            <p className="text-sm sm:text-base text-[#9DB2AE] leading-relaxed max-w-2xl font-normal">
              Discover an industry-focused conversation exploring the ideas, technologies, and evolving perspectives shaping the real-estate sector. Explore the developments influencing property markets and the future of real-estate investment.
            </p>

            {/* Tags */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-[#B7E36A]">
              <span>#RealEstate</span>
              <span>#PropertyInvestment</span>
              <span>#Innovation</span>
              <span>#MarketInsights</span>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex items-center gap-3 shrink-0 pt-1 lg:pt-0">
            {onNavigateNews && (
              <button
                onClick={onNavigateNews}
                className="btn py-2.5 sm:py-3 px-4 sm:px-5 text-xs font-bold bg-[#182C27] text-[#B7E36A] hover:bg-[#23423B] border border-[#27845D]/40 hover:border-[#B7E36A]/40 rounded-xl flex items-center gap-2 cursor-pointer transition-all shadow-xs"
              >
                <Tv className="w-4 h-4 text-[#B7E36A]" />
                <span>Explore Media &amp; Industry Features</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Embedded YouTube Video Container */}
        <div className="bg-[#0A1613] rounded-2xl sm:rounded-3xl border border-[#1E3631] overflow-hidden shadow-2xl p-2 sm:p-4">
          <div className="relative aspect-video w-full rounded-xl sm:rounded-2xl overflow-hidden bg-black shadow-inner border border-black/40">
            {isPlaying ? (
              <iframe
                src={embedUrl}
                title="Inside the Future of Real Estate: Perspectives, Innovation & Market Transformation"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full border-0 rounded-xl sm:rounded-2xl"
              />
            ) : (
              <div className="relative w-full h-full group cursor-pointer" onClick={() => setIsPlaying(true)}>
                <img
                  src={`https://i.ytimg.com/vi/${youtubeVideoId}/hqdefault.jpg`}
                  alt="Inside the Future of Real Estate"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                
                {/* Play button overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#B7E36A] text-[#12201D] flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-300">
                    <Play className="w-7 h-7 sm:w-8 sm:h-8 fill-current ml-1" />
                  </div>
                </div>

                {/* Video Info Badge */}
                <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 flex items-center justify-between text-white">
                  <div>
                    <span className="text-xs text-[#B7E36A] font-bold uppercase tracking-wider block">
                      MEDIA FEATURE
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-white">
                      Inside the Future of Real Estate: Perspectives, Innovation &amp; Market Transformation
                    </h3>
                  </div>
                  <span className="px-3 py-1 bg-black/60 backdrop-blur-md rounded-lg text-xs font-mono border border-white/20">
                    HD Video
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Refined Metadata & Context Bar */}
          <div className="p-3.5 sm:p-5 bg-[#0E1A17] rounded-xl mt-2.5 sm:mt-3 border border-[#1E3631] flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs text-[#9DB2AE]">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#B7E36A]" />
                <span className="text-white font-medium">Real Estate &amp; Advisory Perspectives</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#B7E36A]" />
                <span className="text-white font-medium">Market Analysis &amp; Industry Trends</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#B7E36A]" />
                <span className="text-white font-medium">Fractional Property &amp; SPV Structuring</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <a
                href={`https://www.youtube.com/watch?v=${youtubeVideoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2 px-3 text-xs font-semibold text-[#9DB2AE] hover:text-white border border-[#23423B] hover:border-[#27845D] rounded-lg transition-colors flex items-center gap-1.5"
              >
                <span>Watch on YouTube</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              {onNavigateProperties && (
                <button
                  onClick={onNavigateProperties}
                  className="btn py-2 px-3.5 text-xs font-bold bg-[#B7E36A] text-[#0A1613] hover:bg-[#C8F07F] rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span>Explore Property Offerings</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
