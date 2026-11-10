import React, { useState } from 'react';
import { Settings, Shield, Palette, FileText, Globe, Clock, Mail, Plug } from 'lucide-react';
export const AdminSiteSettingsTab: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'general' | 'seo' | 'email' | 'sms' | 'plugins' | 'gdpr'>('general');

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E3E8E3] shadow-xs text-left space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-[#182D2A] text-[#B7E36A] flex items-center justify-center border border-[#182D2A]/30">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#18211F]">Site Settings</h2>
                <p className="text-xs text-[#69736F]">
                  Configure platform branding, SEO metadata, email/SMS delivery, plugins, and GDPR compliance controls.
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="px-4 py-2.5 bg-[#182D2A] hover:bg-[#24423C] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Palette className="w-4 h-4" />
            <span>Save All Settings</span>
          </button>
        </div>
      </div>

      {/* Settings Navigation */}
      <div className="bg-white rounded-3xl border border-[#E3E8E3] shadow-xs overflow-hidden">
        <div className="flex border-b border-[#E3E8E3]">
          {[
            { id: 'general', label: 'General', icon: Settings },
            { id: 'seo', label: 'SEO', icon: Globe },
            { id: 'email', label: 'Email Manager', icon: Mail },
            { id: 'sms', label: 'SMS Manager', icon: FileText },
              { id: 'plugins', label: 'Plugins', icon: Plug },
            { id: 'gdpr', label: 'GDPR Cookie', icon: Shield },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id as 'general' | 'seo' | 'email' | 'sms' | 'plugins' | 'gdpr')}
              className={`px-5 py-4 text-xs font-bold border-b-2 transition-all ${
                activeSection === s.id
                  ? 'border-[#182D2A] text-[#182D2A] bg-[#F6F7F4]'
                  : 'border-transparent text-[#69736F] hover:text-[#18211F] hover:bg-gray-50'
              } flex items-center gap-2`}
            >
              <s.icon className="w-4 h-4" />
              <span>{s.label}</span>
            </button>
          ))}
        </div>

        {/* General Settings */}
        {activeSection === 'general' && (
          <div className="p-6 sm:p-8 space-y-8">
            <div className="bg-[#F6F7F4] p-6 rounded-2xl border border-[#E3E8E3]">
              <h3 className="text-base font-bold text-[#18211F] mb-4">Platform Branding</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-xs font-bold text-[#69736F]">Site Title</label>
                  <input
                    defaultValue="Kretz — Tokenized Luxury Real Estate"
                    className="w-full p-2.5 rounded-xl border border-[#E3E8E3] bg-white text-xs font-medium focus:outline-none focus:border-[#182D2A]"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-bold text-[#69736F]">Logo / Favicon URL</label>
                  <input
                    defaultValue="/icon.svg"
                    className="w-full p-2.5 rounded-xl border border-[#E3E8E3] bg-white text-xs font-mono focus:outline-none focus:border-[#182D2A]"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-bold text-[#69736F]">Primary Brand Color</label>
                  <input
                    type="color"
                    defaultValue="#27845D"
                    className="w-12 h-10 rounded-xl border-none bg-transparent cursor-pointer"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-bold text-[#69736F]">Support Email</label>
                  <input
                    type="email"
                    defaultValue="support@kretz.com"
                    className="w-full p-2.5 rounded-xl border border-[#E3E8E3] bg-white text-xs font-medium focus:outline-none focus:border-[#182D2A]"
                  />
                </div>
              </div>
            </div>

            <div className="bg-[#F6F7F4] p-6 rounded-2xl border border-[#E3E8E3]">
              <h3 className="text-base font-bold text-[#18211F] mb-4">Default Feature Toggles</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-[#18211F] text-xs">Demo Mode</span>
                    <p className="text-[10px] text-[#69736F]">Enable demo users and seed data for sandbox environments</p>
                  </div>
                  <button className="w-11 h-6 rounded-full bg-emerald-600 relative transition-colors cursor-pointer">
                    <span className="block w-5 h-5 rounded-full bg-white absolute left-1 top-0.5"></span>
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-[#18211F] text-xs">Public Registration</span>
                    <p className="text-[10px] text-[#69736F]">Allow new investor accounts via the public portal</p>
                  </div>
                  <button className="w-11 h-6 rounded-full bg-emerald-600 relative transition-colors cursor-pointer">
                    <span className="block w-5 h-5 rounded-full bg-white absolute left-1 top-0.5"></span>
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-[#18211F] text-xs">Maintenance Mode</span>
                    <p className="text-[10px] text-[#69736F]">Display maintenance banner across all public pages</p>
                  </div>
                  <button className="w-11 h-6 rounded-full bg-gray-200 relative transition-colors cursor-pointer">
                    <span className="block w-5 h-5 rounded-full bg-gray-400 absolute left-1 top-0.5"></span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SEO Settings */}
        {activeSection === 'seo' && (
          <div className="p-6 sm:p-8 space-y-8">
            <div className="bg-[#F6F7F4] p-6 rounded-2xl border border-[#E3E8E3]">
              <h3 className="text-base font-bold text-[#18211F] mb-4">SEO Metadata</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#69736F]">Meta Title</label>
                  <input defaultValue="Kretz — Institutional Tokenized Real Estate Platform" className="w-full p-2.5 rounded-xl border border-[#E3E8E3] bg-white text-xs font-medium focus:outline-none focus:border-[#182D2A]" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#69736F]">Meta Description</label>
                  <textarea defaultValue="Tokenized luxury real estate investments. Institutional-grade SPV offerings with monthly rental yields and capital appreciation." rows={3} className="w-full p-2.5 rounded-xl border border-[#E3E8E3] bg-white text-xs font-medium focus:outline-none focus:border-[#182D2A]" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#69736F]">Canonical URL</label>
                  <input defaultValue="https://www.kretz.com" className="w-full p-2.5 rounded-xl border border-[#E3E8E3] bg-white text-xs font-mono focus:outline-none focus:border-[#182D2A]" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#69736F]">Open Graph Image</label>
                  <input defaultValue="/og-image.png" className="w-full p-2.5 rounded-xl border border-[#E3E8E3] bg-white text-xs font-mono focus:outline-none focus:border-[#182D2A]" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Email Manager */}
        {activeSection === 'email' && (
          <div className="p-6 sm:p-8 space-y-8">
            <div className="bg-[#F6F7F4] p-6 rounded-2xl border border-[#E3E8E3]">
              <h3 className="text-base font-bold text-[#18211F] mb-4">Email Configuration</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-xs font-bold text-[#69736F]">SMTP Host</label>
                  <input defaultValue="smtp.sendgrid.net" className="w-full p-2.5 rounded-xl border border-[#E3E8E3] bg-white text-xs font-medium focus:outline-none focus:border-[#182D2A]" />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-bold text-[#69736F]">SMTP Port</label>
                  <input type="number" defaultValue={587} className="w-full p-2.5 rounded-xl border border-[#E3E8E3] bg-white text-xs font-medium focus:outline-none focus:border-[#182D2A]" />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-bold text-[#69736F]">From Address</label>
                  <input type="email" defaultValue="noreply@kretz.com" className="w-full p-2.5 rounded-xl border border-[#E3E8E3] bg-white text-xs font-medium focus:outline-none focus:border-[#182D2A]" />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-bold text-[#69736F]">From Name</label>
                  <input defaultValue="Kretz Platform" className="w-full p-2.5 rounded-xl border border-[#E3E8E3] bg-white text-xs font-medium focus:outline-none focus:border-[#182D2A]" />
                </div>
              </div>
            </div>

            <div className="bg-[#F6F7F4] p-6 rounded-2xl border border-[#E3E8E3]">
              <h3 className="text-base font-bold text-[#18211F] mb-4">Email Templates</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#E3E8E3]">
                  <div>
                    <span className="font-bold text-[#18211F] text-xs">Welcome Email</span>
                    <p className="text-[10px] text-[#69736F]">Sent on investor registration</p>
                  </div>
                  <button className="text-xs font-bold text-emerald-700 hover:text-emerald-950 cursor-pointer flex items-center gap-1">Edit</button>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#E3E8E3]">
                  <div>
                    <span className="font-bold text-[#18211F] text-xs">KYC Approved</span>
                    <p className="text-[10px] text-[#69736F]">Sent when identity verification passes</p>
                  </div>
                  <button className="text-xs font-bold text-emerald-700 hover:text-emerald-950 cursor-pointer flex items-center gap-1">Edit</button>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#E3E8E3]">
                  <div>
                    <span className="font-bold text-[#18211F] text-xs">Dividend Notice</span>
                    <p className="text-[10px] text-[#69736F]">Monthly rental yield distribution alert</p>
                  </div>
                  <button className="text-xs font-bold text-emerald-700 hover:text-emerald-950 cursor-pointer flex items-center gap-1">Edit</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SMS Manager */}
        {activeSection === 'sms' && (
          <div className="p-6 sm:p-8 space-y-8">
            <div className="bg-[#F6F7F4] p-6 rounded-2xl border border-[#E3E8E3]">
              <h3 className="text-base font-bold text-[#18211F] mb-4">SMS Gateway Configuration</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#69736F]">Provider</label>
                  <select className="w-full p-2.5 rounded-xl border border-[#E3E8E3] bg-white text-xs font-medium focus:outline-none focus:border-[#182D2A]">
                    <option>Twilio</option>
                    <option>MessageBird</option>
                    <option>Vonage</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#69736F]">Sender ID</label>
                  <input defaultValue="KRETZ" className="w-full p-2.5 rounded-xl border border-[#E3E8E3] bg-white text-xs font-medium focus:outline-none focus:border-[#182D2A]" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#69736F]">Default Country Code</label>
                  <input defaultValue="+33" className="w-full p-2.5 rounded-xl border border-[#E3E8E3] bg-white text-xs font-mono focus:outline-none focus:border-[#182D2A]" />
                </div>
              </div>
            </div>

            <div className="bg-[#F6F7F4] p-6 rounded-2xl border border-[#E3E8E3]">
              <h3 className="text-base font-bold text-[#18211F] mb-4">SMS Templates</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#E3E8E3]">
                  <div>
                    <span className="font-bold text-[#18211F] text-xs">OTP Verification</span>
                    <p className="text-[10px] text-[#69736F]">Two-factor authentication code delivery</p>
                  </div>
                  <button className="text-xs font-bold text-emerald-700 hover:text-emerald-950 cursor-pointer">Edit</button>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#E3E8E3]">
                  <div>
                    <span className="font-bold text-[#18211F] text-xs">Withdrawal Confirmed</span>
                    <p className="text-[10px] text-[#69736F]">Payout execution notification</p>
                  </div>
                  <button className="text-xs font-bold text-emerald-700 hover:text-emerald-950 cursor-pointer">Edit</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Plugins */}
        {activeSection === 'plugins' && (
          <div className="p-6 sm:p-8 space-y-8">
            <div className="bg-[#F6F7F4] p-6 rounded-2xl border border-[#E3E8E3]">
              <h3 className="text-base font-bold text-[#18211F] mb-4">Installed Plugins</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#E3E8E3]">
                  <div>
                    <span className="font-bold text-[#18211F] text-xs">Smartsupp Live Chat</span>
                    <p className="text-[10px] text-[#69736F]">Customer support widget on public site</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">Active</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#E3E8E3]">
                  <div>
                    <span className="font-bold text-[#18211F] text-xs">Cloudflare Turnstile</span>
                    <p className="text-[10px] text-[#69736F]">Bot protection for auth and financial flows</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">Active</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#E3E8E3]">
                  <div>
                    <span className="font-bold text-[#18211F] text-xs">Solana Wallet Adapter</span>
                    <p className="text-[10px] text-[#69736F]">SPL token wallet integration for deposits</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-bold">Inactive</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* GDPR Cookie */}
        {activeSection === 'gdpr' && (
          <div className="p-6 sm:p-8 space-y-8">
            <div className="bg-[#F6F7F4] p-6 rounded-2xl border border-[#E3E8E3]">
              <h3 className="text-base font-bold text-[#18211F] mb-4">GDPR &amp; Cookie Compliance</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#E3E8E3]">
                  <div>
                    <span className="font-bold text-[#18211F] text-xs">Cookie Consent Banner</span>
                    <p className="text-[10px] text-[#69736F]">Display GDPR cookie consent on first visit</p>
                  </div>
                  <button className="w-11 h-6 rounded-full bg-emerald-600 relative transition-colors cursor-pointer">
                    <span className="block w-5 h-5 rounded-full bg-white absolute left-1 top-0.5"></span>
                  </button>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#E3E8E3]">
                  <div>
                    <span className="font-bold text-[#18211F] text-xs">Data Retention Policy</span>
                    <p className="text-[10px] text-[#69736F]">Automatic deletion of inactive investor data after 7 years</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">Enabled</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#E3E8E3]">
                  <div>
                    <span className="font-bold text-[#18211F] text-xs">Right to Erasure Requests</span>
                    <p className="text-[10px] text-[#69736F]">Process GDPR Article 17 deletion requests</p>
                  </div>
                  <button className="text-xs font-bold text-emerald-700 hover:text-emerald-950 cursor-pointer flex items-center gap-1">View Requests</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};