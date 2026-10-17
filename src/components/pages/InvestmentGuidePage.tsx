import React, { useState } from 'react';
import { ShieldCheck, KeyRound, Lock, Smartphone, Laptop, CheckCircle2, AlertTriangle, ArrowRight, BookOpen, Sparkles, HelpCircle } from 'lucide-react';

interface InvestmentGuidePageProps {
  onNavigateHome: () => void;
  onNavigateLogin: () => void;
}

export const InvestmentGuidePage: React.FC<InvestmentGuidePageProps> = ({
  onNavigateHome,
  onNavigateLogin,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'setup' | 'faq'>('overview');

  return (
    <div className="bg-[#F6F7F4] min-h-screen py-12">
      <div className="container max-w-[1000px] mx-auto px-4 space-y-12">
        {/* Breadcrumb & Header */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#E3E8E3] text-xs font-semibold text-[#182D2A] shadow-sm">
            <BookOpen className="w-3.5 h-3.5 text-[#27845D]" />
            <span>Official Investor Security & Passkey Guide</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-[#18211F] tracking-tight leading-tight">
            Passkeys & Access Keys: Secure Real Estate Investing
          </h1>
          <p className="text-base text-[#69736F] max-w-2xl leading-relaxed">
            Inspired by advanced institutional web3 security standards (comparable to Reental's passkey framework), discover how cryptographic passkeys protect your tokenized property portfolio against phishing, SIM-swaps, and unauthorized access.
          </p>
        </div>

        {/* Quick Nav Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-[#E3E8E3] pb-4">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'overview'
                ? 'bg-[#182D2A] text-white shadow-sm'
                : 'bg-white text-[#69736F] hover:text-[#18211F] border border-[#E3E8E3]'
            }`}
          >
            1. What Are Passkeys?
          </button>
          <button
            onClick={() => setActiveTab('setup')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'setup'
                ? 'bg-[#182D2A] text-white shadow-sm'
                : 'bg-white text-[#69736F] hover:text-[#18211F] border border-[#E3E8E3]'
            }`}
          >
            2. Step-by-Step Setup Guide
          </button>
          <button
            onClick={() => setActiveTab('faq')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'faq'
                ? 'bg-[#182D2A] text-white shadow-sm'
                : 'bg-white text-[#69736F] hover:text-[#18211F] border border-[#E3E8E3]'
            }`}
          >
            3. Security FAQ & Best Practices
          </button>
        </div>

        {/* Main Content Sections */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fade-in">
            <div className="bg-white p-8 rounded-3xl border border-[#E3E8E3] shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-[#27845D] flex items-center justify-center font-bold">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#18211F]">The Evolution of Investor Security</h2>
                  <p className="text-xs text-[#69736F]">Eliminating passwords forever using W3C WebAuthn standards</p>
                </div>
              </div>

              <div className="text-sm text-[#69736F] space-y-4 leading-relaxed">
                <p>
                  Traditional passwords are the weakest link in digital asset management. They can be guessed, phished through fraudulent domain lookalikes, or leaked in enterprise database breaches. When dealing with tokenized real estate investments, monthly rental yield distributions, and fractional deed ownership, supreme account security is non-negotiable.
                </p>
                <p>
                  A <strong className="text-[#18211F]">Passkey</strong> is a digital replacement for passwords that enables fast, ultra-secure sign-ins to your investment dashboard. Based on public-key cryptography, your private biometric key never leaves your trusted hardware device (such as your iPhone, Android, Mac, or Windows PC), making credential theft or remote phishing mathematically impossible.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                <div className="p-5 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-sm">
                    <Lock className="w-4 h-4 text-[#27845D]" />
                  </div>
                  <h3 className="text-sm font-bold text-[#18211F]">100% Phishing-Proof</h3>
                  <p className="text-xs text-[#69736F]">Passkeys are cryptographically bound to our official domain. Fake login pages cannot trick your browser.</p>
                </div>

                <div className="p-5 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-sm">
                    <Smartphone className="w-4 h-4 text-[#27845D]" />
                  </div>
                  <h3 className="text-sm font-bold text-[#18211F]">Biometric Instant Access</h3>
                  <p className="text-xs text-[#69736F]">Access your portfolio in less than a second using Face ID, Touch ID, or Windows Hello biometrics.</p>
                </div>

                <div className="p-5 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-sm">
                    <KeyRound className="w-4 h-4 text-[#27845D]" />
                  </div>
                  <h3 className="text-sm font-bold text-[#18211F]">SIM-Swap Resistant</h3>
                  <p className="text-xs text-[#69736F]">Unlike SMS two-factor codes that can be intercepted by telecom hackers, passkeys rely on secure hardware enclaves.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'setup' && (
          <div className="space-y-8 animate-fade-in">
            <div className="bg-white p-8 rounded-3xl border border-[#E3E8E3] shadow-sm space-y-6">
              <h2 className="text-xl font-bold text-[#18211F]">How to Enable and Use Passkeys on Your Account</h2>
              <p className="text-xs text-[#69736F]">Follow these 3 simple steps to secure your real estate portfolio with passkeys:</p>

              <div className="space-y-6">
                <div className="flex gap-4 items-start p-5 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3]">
                  <div className="w-8 h-8 rounded-full bg-[#182D2A] text-white flex items-center justify-center font-bold text-xs shrink-0">
                    1
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-[#18211F]">Navigate to Your Security Profile</h3>
                    <p className="text-xs text-[#69736F]">
                      Log into your investor dashboard, head to the <strong className="text-[#18211F]">Profile & Security</strong> tab, and locate the Biometrics & Passkeys section.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start p-5 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3]">
                  <div className="w-8 h-8 rounded-full bg-[#182D2A] text-white flex items-center justify-center font-bold text-xs shrink-0">
                    2
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-[#18211F]">Register Your Device Authenticator</h3>
                    <p className="text-xs text-[#69736F]">
                      Click "Register Passkey". Your device's operating system (Apple iCloud Keychain, Google Password Manager, or Windows Hello) will prompt you to confirm with your fingerprint, face scan, or device PIN.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start p-5 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3]">
                  <div className="w-8 h-8 rounded-full bg-[#182D2A] text-white flex items-center justify-center font-bold text-xs shrink-0">
                    3
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-[#18211F]">Authorize Investments Securely</h3>
                    <p className="text-xs text-[#69736F]">
                      Whenever you sign in or confirm a property token allocation, your passkey securely signs the transaction without ever transmitting your private credentials over the internet.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-center">
                <button
                  onClick={onNavigateLogin}
                  className="btn btn-primary text-xs font-bold px-8 py-3 flex items-center gap-2"
                >
                  Access Investor Portal & Security Settings
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'faq' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white p-8 rounded-3xl border border-[#E3E8E3] shadow-sm space-y-6">
              <h2 className="text-xl font-bold text-[#18211F]">Frequently Asked Questions on Passkeys</h2>

              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-1.5">
                  <h3 className="font-bold text-[#18211F] text-sm">What happens if I lose my phone or change devices?</h3>
                  <p className="text-[#69736F] leading-relaxed">
                    Passkeys are automatically synced across your secure cloud ecosystem (iCloud Keychain for Apple devices or Google Password Manager for Android/Chrome). If you switch devices, your passkey securely migrates with your verified account.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-1.5">
                  <h3 className="font-bold text-[#18211F] text-sm">Are passkeys mandatory for investing?</h3>
                  <p className="text-[#69736F] leading-relaxed">
                    While standard email/password authentication is supported for retail browsing, accounts holding over €50,000 in tokenized real estate or participating in private allocations are strongly encouraged to enable passkey verification for heightened security.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-1.5">
                  <h3 className="font-bold text-[#18211F] text-sm">Can anyone access my biometrics?</h3>
                  <p className="text-[#69736F] leading-relaxed">
                    Never. Your biometric data (fingerprint or facial geometry) is processed strictly within your device's secure hardware enclave (Secure Enclave or TPM chip). Neither our servers nor any third party ever see or store your biometrics.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Navigation CTA */}
        <div className="bg-[#182D2A] text-white p-8 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md">
          <div className="space-y-2 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[#B7E36A] text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" /> Institutional Grade Protection
            </div>
            <h3 className="text-xl font-bold">Ready to invest in tokenized luxury real estate?</h3>
            <p className="text-xs text-white/70 max-w-md">
              Explore verified high-yield properties across Paris, Courchevel, the French Riviera, and Dubai with complete security.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onNavigateHome}
              className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/20"
            >
              Back to Home
            </button>
            <button
              onClick={onNavigateLogin}
              className="px-6 py-3 rounded-xl bg-[#B7E36A] text-[#182D2A] text-xs font-bold hover:bg-[#a6d157] transition-all shadow-sm"
            >
              Get Started Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
