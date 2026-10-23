import React, { useState } from 'react';
import { Shield, Key, Bell, User, Check, Lock, Eye, EyeOff } from 'lucide-react';
import {
  getActivePassGateCode,
  updatePassGateMasterCode,
  resetPassGateToDefault,
  lockPassGate,
  PRIMARY_DEFAULT_PASSCODE,
} from '../../lib/passGate';

export const AdminAccountSettings: React.FC = () => {
  const [saved, setSaved] = useState(false);
  const [adminName, setAdminName] = useState('Platform Administrator');
  const [adminEmail, setAdminEmail] = useState('admin@lagence.com');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);

  // Pass Gate State
  const [passGateCode, setPassGateCode] = useState(getActivePassGateCode);
  const [showPasscode, setShowPasscode] = useState(false);
  const [passcodeSavedMsg, setPasscodeSavedMsg] = useState<string | null>(null);

  const handleUpdatePasscode = () => {
    if (!passGateCode.trim()) {
      setPasscodeSavedMsg('Passcode cannot be empty.');
      return;
    }
    const success = updatePassGateMasterCode(passGateCode.trim());
    if (success) {
      setPasscodeSavedMsg('Executive Pass Gate passcode updated successfully.');
      setTimeout(() => setPasscodeSavedMsg(null), 3500);
    }
  };

  const handleResetPasscode = () => {
    resetPassGateToDefault();
    setPassGateCode(PRIMARY_DEFAULT_PASSCODE);
    setPasscodeSavedMsg(`Passcode reset to standard default (${PRIMARY_DEFAULT_PASSCODE}).`);
    setTimeout(() => setPasscodeSavedMsg(null), 3500);
  };

  const handleLockNow = () => {
    lockPassGate();
  };

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
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#18211F] flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#27845D]" />
              <span>Admin Pass Gate Security (https://kretzdespain.com/admin)</span>
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
              Pass Gate Enforced
            </span>
          </div>

          <p className="text-xs text-[#52605C] leading-relaxed">
            All direct requests to <code className="bg-slate-100 text-[#182D2A] px-1.5 py-0.5 rounded font-mono text-[11px]">/admin</code> require a verified executive passcode checkpoint before granting access to client deposits, financial vaults, and custody overrides.
          </p>

          <div className="p-4 bg-[#F8FAF8] rounded-xl border border-[#E3E8E3] space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#52605C] mb-1.5">
                  Executive Pass Gate Code
                </label>
                <div className="relative">
                  <input
                    type={showPasscode ? 'text' : 'password'}
                    value={passGateCode}
                    onChange={(e) => setPassGateCode(e.target.value)}
                    placeholder="Enter new pass gate code"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E3E8E3] text-xs font-mono font-medium text-[#18211F] pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasscode(!showPasscode)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    {showPasscode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">
                  Default recognized code: <span className="font-mono font-semibold text-emerald-700">kretz2026</span>
                </p>
              </div>

              <div className="flex flex-col justify-end gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleUpdatePasscode}
                    className="flex-1 py-2 px-3 bg-[#182D2A] hover:bg-[#27845D] text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Update Passcode
                  </button>
                  <button
                    type="button"
                    onClick={handleResetPasscode}
                    className="py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                    title="Reset to default code kretz2026"
                  >
                    Reset Default
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleLockNow}
                  className="w-full py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-700" />
                  <span>Lock Admin Pass Gate Now</span>
                </button>
              </div>
            </div>

            {passcodeSavedMsg && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>{passcodeSavedMsg}</span>
              </div>
            )}
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
