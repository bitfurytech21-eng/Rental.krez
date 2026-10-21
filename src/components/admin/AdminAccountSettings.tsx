import React, { useState } from 'react';
import { Shield, Key, Bell, User, Check, Lock } from 'lucide-react';

export const AdminAccountSettings: React.FC = () => {
  const [saved, setSaved] = useState(false);
  const [adminName, setAdminName] = useState('Platform Administrator');
  const [adminEmail, setAdminEmail] = useState('admin@lagence.com');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-[#18211F] tracking-tight">Admin Console Security & Profile</h2>
        <p className="text-xs text-[#52605C] mt-1">
          Manage administrative privileges, authentication keys, and security controls.
        </p>
      </div>

      {saved && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>Admin settings saved successfully.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white rounded-2xl border border-[#E3E8E3] p-6 space-y-4">
          <h3 className="text-sm font-bold text-[#18211F] flex items-center gap-2">
            <User className="w-4 h-4 text-[#27845D]" />
            <span>Administrator Identity</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#52605C] mb-1.5">Full Name</label>
              <input
                type="text"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E3E8E3] text-xs font-medium text-[#18211F]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#52605C] mb-1.5">Admin Email</label>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E3E8E3] text-xs font-medium text-[#18211F]"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E3E8E3] p-6 space-y-4">
          <h3 className="text-sm font-bold text-[#18211F] flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#27845D]" />
            <span>Security & Governance</span>
          </h3>

          <div className="flex items-center justify-between p-4 bg-[#F8FAF8] rounded-xl border border-[#E3E8E3]">
            <div>
              <div className="text-xs font-bold text-[#18211F]">Hardware 2FA / TOTP Authenticator</div>
              <div className="text-[11px] text-[#52605C]">Enforce YubiKey or Authenticator App for off-market listing approvals</div>
            </div>
            <button
              type="button"
              onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                twoFactorEnabled ? 'bg-[#27845D] text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              {twoFactorEnabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 bg-[#27845D] hover:bg-[#1f6b4b] text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
          >
            Save Admin Settings
          </button>
        </div>
      </form>
    </div>
  );
};
