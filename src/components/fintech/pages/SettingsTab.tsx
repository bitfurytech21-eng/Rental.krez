import React, { useState } from 'react';
import {
  User, ShieldCheck, CreditCard, Wallet, Bell, Lock,
  CheckCircle2, AlertTriangle, ArrowRight, Save, Smartphone, Key
} from 'lucide-react';
import { useAuth } from '../../../lib/auth';
import { useToast } from '../../../context/ToastContext';
import { ledger } from '../../../lib/ledger';

interface SettingsTabProps {
  onOpenKyc: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ onOpenKyc }) => {
  const { user, refreshUser } = useAuth();
  const toast = useToast();

  const [activeSection, setActiveSection] = useState<'profile' | 'kyc' | 'banks' | 'wallet' | 'notifications' | '2fa'>('profile');

  // Form states
  const [profileForm, setProfileForm] = useState({
    fullName: user?.fullName || 'Predrag Mirkovic',
    email: user?.email || 'investor@kretz.com',
    phone: '+33 6 12 34 56 78',
    country: user?.country || 'France',
    currency: 'EUR',
  });

  const [notificationsForm, setNotificationsForm] = useState({
    yieldPayoutEmail: true,
    instantTradeAlerts: true,
    monthlyDigest: true,
    marketingUpdates: false,
    securitySms: true,
  });

  const [is2FAEnabled, setIs2FAEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      if (user?.id) {
        ledger.updateUserProfile(user.id, {
          fullName: profileForm.fullName,
          country: profileForm.country,
        });
      }
      if (refreshUser) await refreshUser();
      toast.success('Profile settings updated successfully');
    } catch {
      toast.error('Failed to update profile settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-[16px] text-[#0F172A] dark:text-[#E2E8F0]">
      {/* Header */}
      <div className="p-[20px] rounded-[12px] bg-white dark:bg-[#111A2C] border border-[#E2E8F0] dark:border-[#1E293B] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <h2 className="text-[20px] font-semibold">Account & Custody Preferences</h2>
        <p className="text-[12px] text-[#64748B] dark:text-[#94A3B8]">
          Manage institutional accreditation, payout destinations, and cryptographic multi-factor security
        </p>

        {/* Section Tabs */}
        <div className="flex items-center gap-1 border-b border-[#E2E8F0] dark:border-[#1E293B] overflow-x-auto pt-4 pb-1 text-[13px]">
          {[
            { id: 'profile', label: 'Profile', icon: User },
            { id: 'kyc', label: 'KYC & Accreditation', icon: ShieldCheck },
            { id: 'banks', label: 'Bank Accounts', icon: CreditCard },
            { id: 'wallet', label: 'Wallet Custody', icon: Wallet },
            { id: 'notifications', label: 'Notifications', icon: Bell },
            { id: '2fa', label: 'Security & 2FA', icon: Lock },
          ].map((sec) => {
            const Icon = sec.icon;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                  activeSection === sec.id
                    ? 'border-[#0F4C81] dark:border-[#14B8A6] text-[#0F4C81] dark:text-[#14B8A6]'
                    : 'border-transparent text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#E2E8F0]'
                }`}
              >
                <Icon className="w-4 h-4" strokeWidth={1.5} />
                <span>{sec.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Panels */}
      <div className="p-[20px] rounded-[12px] bg-white dark:bg-[#111A2C] border border-[#E2E8F0] dark:border-[#1E293B] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        {/* Profile */}
        {activeSection === 'profile' && (
          <div className="max-w-[560px] space-y-4">
            <h3 className="text-[16px] font-semibold">Personal & Entity Information</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-[12px] font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">
                  Full Legal Name / Entity Representative
                </label>
                <input
                  type="text"
                  value={profileForm.fullName}
                  onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                  className="w-full px-3 py-2 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E293B] bg-transparent text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0F4C81]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={profileForm.email}
                    disabled
                    className="w-full px-3 py-2 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#0B1220] opacity-75 text-[14px]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E293B] bg-transparent text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0F4C81]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">
                    Country of Tax Residency
                  </label>
                  <input
                    type="text"
                    value={profileForm.country}
                    onChange={(e) => setProfileForm({ ...profileForm, country: e.target.value })}
                    className="w-full px-3 py-2 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E293B] bg-transparent text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0F4C81]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">
                    Preferred Reporting Currency
                  </label>
                  <select
                    value={profileForm.currency}
                    onChange={(e) => setProfileForm({ ...profileForm, currency: e.target.value })}
                    className="w-full px-3 py-2 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111A2C] text-[14px] focus:outline-none"
                  >
                    <option value="EUR">EUR (€) - European Standard</option>
                    <option value="USD">USD ($) - US Dollar</option>
                    <option value="GBP">GBP (£) - British Pound</option>
                    <option value="CHF">CHF - Swiss Franc</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-[8px] bg-[#0F4C81] text-white text-[14px] font-semibold hover:bg-[#0F4C81]/90 transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" /> {isSaving ? 'Saving Changes...' : 'Save Profile Changes'}
            </button>
          </div>
        )}

        {/* KYC & Accreditation */}
        {activeSection === 'kyc' && (
          <div className="max-w-[560px] space-y-4">
            <h3 className="text-[16px] font-semibold">Institutional Compliance & Whitelist Status</h3>

            <div className="p-4 rounded-[8px] bg-[#16A34A]/10 border border-[#16A34A]/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-[#16A34A]" />
                <div>
                  <div className="font-semibold text-[14px]">Accredited Investor Verified</div>
                  <div className="text-[12px] text-[#64748B] dark:text-[#94A3B8]">
                    Valid through December 2027 • European AML/MiFID II Tier 1
                  </div>
                </div>
              </div>
              <button
                onClick={onOpenKyc}
                className="px-3 py-1.5 rounded-[8px] border border-[#16A34A] text-[#16A34A] text-[12px] font-semibold hover:bg-[#16A34A]/20"
              >
                Re-Verify
              </button>
            </div>

            <div className="p-4 rounded-[8px] bg-[#F8FAFC] dark:bg-[#0B1220] border border-[#E2E8F0] dark:border-[#1E293B] space-y-2 text-[12px]">
              <div className="flex justify-between">
                <span className="text-[#64748B]">ONCHAINID:</span>
                <span className="font-mono">0x498a...89bf</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Identity Claim Verifier:</span>
                <span>TrustRegistry SA (Luxembourg)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Sanctions & PEP Screening:</span>
                <span className="text-[#16A34A] font-semibold">Clean (Passed)</span>
              </div>
            </div>
          </div>
        )}

        {/* Bank Accounts */}
        {activeSection === 'banks' && (
          <div className="max-w-[560px] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[16px] font-semibold">Connected Bank Accounts (SEPA / Wire)</h3>
              <button
                onClick={() => toast.info('Opened Bank Account Link Flow (SEPA Wire Details)')}
                className="px-3 py-1.5 rounded-[8px] bg-[#0F4C81] text-white text-[12px] font-semibold"
              >
                + Add Bank Account
              </button>
            </div>

            <div className="p-4 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E293B] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#0F4C81]/10 text-[#0F4C81] flex items-center justify-center font-bold text-[14px]">
                    CB
                  </div>
                  <div>
                    <div className="font-semibold text-[14px]">CaixaBank Escrow Account</div>
                    <div className="text-[12px] text-[#64748B] dark:text-[#94A3B8]">
                      IBAN: ES91 •••• •••• •••• 1829 (Primary EUR Payout)
                    </div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-[#16A34A]/10 text-[#16A34A] text-[11px] font-semibold">
                  Default
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Wallet Custody */}
        {activeSection === 'wallet' && (
          <div className="max-w-[560px] space-y-4">
            <h3 className="text-[16px] font-semibold">Connected Web3 Whitelist Wallet</h3>
            <div className="p-4 rounded-[8px] bg-[#F8FAFC] dark:bg-[#0B1220] border border-[#E2E8F0] dark:border-[#1E293B] space-y-3 text-[13px]">
              <div>
                <span className="text-[12px] text-[#64748B] block">Primary BEP-20 Wallet Address</span>
                <span className="font-mono font-semibold text-[14px] text-[#0F4C81] dark:text-[#14B8A6] tabular-nums">
                  0x71C8135C0e41B3fA128912389128f9A19b28A0bf
                </span>
              </div>
              <div className="flex justify-between items-center text-[12px] pt-2 border-t border-[#E2E8F0] dark:border-[#1E293B]">
                <span className="text-[#64748B]">Network:</span>
                <span className="font-medium">BNB Smart Chain (BEP-20)</span>
              </div>
              <div className="flex justify-between items-center text-[12px]">
                <span className="text-[#64748B]">ERC-3643 Whitelist Status:</span>
                <span className="text-[#16A34A] font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Approved by Issuer Smart Contract
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Notifications */}
        {activeSection === 'notifications' && (
          <div className="max-w-[560px] space-y-4">
            <h3 className="text-[16px] font-semibold">Email & Dispatch Alert Rules</h3>

            <div className="space-y-3">
              {[
                { key: 'yieldPayoutEmail', label: 'Monthly Rental Yield Payout Receipts', desc: 'Instant email confirmation when distributions hit your account.' },
                { key: 'instantTradeAlerts', label: 'Security Token Settlement Alerts', desc: 'Notifies when token subscriptions or transfers are confirmed on-chain.' },
                { key: 'monthlyDigest', label: 'Monthly Asset Valuation Statement', desc: 'Summary of property valuations and net asset value (NAV) changes.' },
                { key: 'securitySms', label: 'Critical Security & Authentication SMS', desc: 'Urgent notices for password resets and device sign-ins.' },
              ].map((item) => (
                <label key={item.key} className="flex items-start justify-between gap-4 p-3 rounded-[8px] hover:bg-[#F8FAFC] dark:hover:bg-[#0B1220] cursor-pointer">
                  <div>
                    <div className="font-semibold text-[14px]">{item.label}</div>
                    <div className="text-[12px] text-[#64748B] dark:text-[#94A3B8]">{item.desc}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={(notificationsForm as any)[item.key]}
                    onChange={(e) => setNotificationsForm({ ...notificationsForm, [item.key]: e.target.checked })}
                    className="mt-1 rounded text-[#0F4C81] focus:ring-[#0F4C81]"
                  />
                </label>
              ))}
            </div>

            <button
              onClick={() => toast.success('Notification preferences saved')}
              className="mt-2 px-4 py-2 rounded-[8px] bg-[#0F4C81] text-white text-[13px] font-semibold"
            >
              Save Notification Preferences
            </button>
          </div>
        )}

        {/* Security & 2FA */}
        {activeSection === '2fa' && (
          <div className="max-w-[560px] space-y-4">
            <h3 className="text-[16px] font-semibold">Two-Factor Authentication (2FA) & Credentials</h3>

            <div className="p-4 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E293B] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Smartphone className="w-5 h-5 text-[#0F4C81] dark:text-[#14B8A6]" />
                <div>
                  <div className="font-semibold text-[14px]">Authenticator App (TOTP)</div>
                  <div className="text-[12px] text-[#64748B] dark:text-[#94A3B8]">
                    Google Authenticator, 1Password, or Authy
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setIs2FAEnabled(!is2FAEnabled);
                  toast.success(is2FAEnabled ? '2FA disabled' : '2FA activated');
                }}
                className={`px-3.5 py-1.5 rounded-[8px] text-[12px] font-semibold transition-colors ${
                  is2FAEnabled
                    ? 'bg-[#16A34A]/10 text-[#16A34A] border border-[#16A34A]'
                    : 'bg-[#0F4C81] text-white'
                }`}
              >
                {is2FAEnabled ? 'Enabled' : 'Enable 2FA'}
              </button>
            </div>

            <div className="p-4 rounded-[8px] bg-[#F8FAFC] dark:bg-[#0B1220] border border-[#E2E8F0] dark:border-[#1E293B] space-y-2 text-[12px]">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Active Sessions:</span>
                <span className="font-semibold">Paris, France (Chrome / macOS)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Last Password Change:</span>
                <span>28 days ago</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
