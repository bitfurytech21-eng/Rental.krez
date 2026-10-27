import React, { useState } from 'react';
import { Property } from '../../types/property';
import { formatCurrency, formatPercent } from '../../lib/utils';
import {
  X,
  Copy,
  Check,
  Share2,
  Mail,
  MessageSquare,
  Send,
  ExternalLink,
  QrCode,
  Sparkles
} from 'lucide-react';

interface SharePropertyModalProps {
  property: Property;
  isOpen: boolean;
  onClose: () => void;
}

export const SharePropertyModal: React.FC<SharePropertyModalProps> = ({
  property,
  isOpen,
  onClose,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : `https://lagence.site/property/${property.slug}`;

  const defaultMessage = `🏡 ${property.title} – ${property.location}, ${property.country}
📈 Target Yield: ${formatPercent(property.estimatedAnnualYield)} p.a.
💶 Min. Entry: ${formatCurrency(property.minimumInvestment)} | Token Price: ${formatCurrency(property.tokenPrice)}
🛡️ Legal SPV Ownership & Monthly Dividends

Explore the offering details on L'Agence Real Estate:
${shareUrl}`;

  const [customMessage, setCustomMessage] = useState(defaultMessage);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(customMessage);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2500);
  };

  // Social Sharing Launchers
  const shareWhatsApp = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(customMessage)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const shareTwitter = () => {
    const text = `Explore ${property.title} in ${property.location}! Target Yield: ${formatPercent(property.estimatedAnnualYield)} p.a. Min. Investment: ${formatCurrency(property.minimumInvestment)}`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const shareLinkedIn = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const shareTelegram = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(customMessage)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const shareFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const shareEmail = () => {
    const subject = `Investment Opportunity: ${property.title}`;
    const body = `${customMessage}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-[#E3E8E3] overflow-hidden relative animate-in zoom-in-95 duration-150 my-auto text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-[#0B1B30] text-white flex items-center justify-between border-b border-[#1D3860]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#102442] border border-[#1D3860] flex items-center justify-center text-[#BEE179] shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#BEE179] block">
                Share Investment Dossier
              </span>
              <h3 className="text-base font-bold text-white truncate max-w-[260px] sm:max-w-xs">
                {property.title}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#102442] hover:bg-[#1D3860] text-[#A2C2EC] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close Modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5 max-h-[78vh] overflow-y-auto">
          {/* Property Summary Preview Card */}
          <div className="p-3.5 bg-[#F8FAF8] rounded-2xl border border-[#E3E8E3] flex items-center gap-3">
            <img
              src={property.images[0] || property.bannerImage}
              alt={property.title}
              className="w-16 h-16 rounded-xl object-cover border border-[#E3E8E3] shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-[#18211F] truncate">{property.title}</div>
              <div className="text-[11px] text-[#69736F] truncate">{property.location}, {property.country}</div>
              <div className="flex items-center gap-3 mt-1 text-[11px] font-bold">
                <span className="text-[#27845D]">Yield: {formatPercent(property.estimatedAnnualYield)} p.a.</span>
                <span className="text-[#18211F]">Min: {formatCurrency(property.minimumInvestment)}</span>
              </div>
            </div>
          </div>

          {/* Direct Link Section */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#18211F] block uppercase tracking-wider">
              Direct Property Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#F6F7F4] border border-[#E3E8E3] text-xs font-mono text-[#18211F] focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                  copiedLink
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#0B1B30] hover:bg-[#122846] text-[#BEE179] border border-[#1D3860]'
                }`}
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick One-Click Social Share Grid */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#18211F] block uppercase tracking-wider">
              Share via Platform
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {/* WhatsApp */}
              <button
                type="button"
                onClick={shareWhatsApp}
                className="p-2.5 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 text-[#128C7E] flex flex-col items-center justify-center gap-1 cursor-pointer transition-all"
                title="Share on WhatsApp"
              >
                <MessageSquare className="w-4 h-4 text-[#25D366]" />
                <span className="text-[10px] font-bold">WhatsApp</span>
              </button>

              {/* Telegram */}
              <button
                type="button"
                onClick={shareTelegram}
                className="p-2.5 rounded-xl bg-[#0088cc]/10 hover:bg-[#0088cc]/20 border border-[#0088cc]/30 text-[#0088cc] flex flex-col items-center justify-center gap-1 cursor-pointer transition-all"
                title="Share on Telegram"
              >
                <Send className="w-4 h-4 text-[#0088cc]" />
                <span className="text-[10px] font-bold">Telegram</span>
              </button>

              {/* Twitter / X */}
              <button
                type="button"
                onClick={shareTwitter}
                className="p-2.5 rounded-xl bg-slate-900/10 hover:bg-slate-900/20 border border-slate-900/20 text-slate-900 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all"
                title="Share on X (Twitter)"
              >
                <span className="font-mono font-bold text-xs">𝕏</span>
                <span className="text-[10px] font-bold">X / Tweet</span>
              </button>

              {/* LinkedIn */}
              <button
                type="button"
                onClick={shareLinkedIn}
                className="p-2.5 rounded-xl bg-[#0A66C2]/10 hover:bg-[#0A66C2]/20 border border-[#0A66C2]/30 text-[#0A66C2] flex flex-col items-center justify-center gap-1 cursor-pointer transition-all"
                title="Share on LinkedIn"
              >
                <ExternalLink className="w-4 h-4 text-[#0A66C2]" />
                <span className="text-[10px] font-bold">LinkedIn</span>
              </button>

              {/* Facebook */}
              <button
                type="button"
                onClick={shareFacebook}
                className="p-2.5 rounded-xl bg-[#1877F2]/10 hover:bg-[#1877F2]/20 border border-[#1877F2]/30 text-[#1877F2] flex flex-col items-center justify-center gap-1 cursor-pointer transition-all"
                title="Share on Facebook"
              >
                <Share2 className="w-4 h-4 text-[#1877F2]" />
                <span className="text-[10px] font-bold">Facebook</span>
              </button>

              {/* Email */}
              <button
                type="button"
                onClick={shareEmail}
                className="p-2.5 rounded-xl bg-slate-700/10 hover:bg-slate-700/20 border border-slate-700/30 text-slate-800 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all"
                title="Share via Email"
              >
                <Mail className="w-4 h-4 text-slate-700" />
                <span className="text-[10px] font-bold">Email</span>
              </button>
            </div>
          </div>

          {/* Custom Pre-Formatted Message Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#18211F] flex items-center gap-1.5 uppercase tracking-wider">
                <Share2 className="w-3.5 h-3.5 text-[#27845D]" />
                <span>Formatted Message</span>
              </label>
              <button
                type="button"
                onClick={handleCopyMessage}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  copiedMessage ? 'bg-emerald-600 text-white' : 'text-[#27845D] hover:bg-emerald-50'
                }`}
              >
                {copiedMessage ? '✓ Message Copied' : 'Copy Message Text'}
              </button>
            </div>

            <textarea
              rows={5}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="w-full p-3 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] text-xs font-sans text-[#18211F] focus:outline-none focus:border-[#27845D] leading-relaxed resize-none"
            />
          </div>

          {/* Toggle QR Code */}
          <div className="pt-2 border-t border-[#E3E8E3] flex flex-col items-center">
            <button
              type="button"
              onClick={() => setShowQrCode(!showQrCode)}
              className="text-xs font-bold text-[#18211F] hover:text-[#27845D] flex items-center gap-1.5 transition-colors cursor-pointer py-1"
            >
              <QrCode className="w-4 h-4 text-[#27845D]" />
              <span>{showQrCode ? 'Hide QR Code' : 'Display Share QR Code'}</span>
            </button>

            {showQrCode && (
              <div className="mt-3 p-4 bg-white rounded-2xl border border-[#E3E8E3] shadow-md flex flex-col items-center text-center space-y-2 animate-in fade-in duration-150">
                <img src={qrCodeUrl} alt="Property QR Code" className="w-40 h-40 rounded-xl" />
                <p className="text-[11px] text-[#69736F]">Scan with camera to open property page instantly</p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#F8FAF8] border-t border-[#E3E8E3] flex items-center justify-between text-xs text-[#69736F]">
          <span>L'Agence Real Estate · Verified SPV Offering</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#18211F] hover:bg-[#2A3532] text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
