import React, { useState } from 'react';
import { Settings, Save, Building2, Coins, ShieldAlert, Check, Bell, ToggleLeft, ToggleRight } from 'lucide-react';
import { ledger, PaymentConfig } from '../../lib/ledger';

interface AdminSettingsViewProps {
  paymentConfig: PaymentConfig;
  onRefreshAll: () => void;
  onQuickSuccess: (msg: string) => void;
  onQuickError: (msg: string) => void;
}

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({
  paymentConfig,
  onRefreshAll,
  onQuickSuccess,
  onQuickError,
}) => {
  const [usdcAddress, setUsdcAddress] = useState(
    paymentConfig.cryptoNetworks.find((n) => n.token === 'USDC')?.walletAddress || '0x71C8135C0e41B3fA128912389128f9A19b28A0bf'
  );
  const [usdtAddress, setUsdtAddress] = useState(
    paymentConfig.cryptoNetworks.find((n) => n.token === 'USDT')?.walletAddress || '0x71C8135C0e41B3fA128912389128f9A19b28A0bf'
  );

  const [beneficiary, setBeneficiary] = useState(paymentConfig.traditional.beneficiary);
  const [iban, setIban] = useState(paymentConfig.traditional.iban);
  const [bic, setBic] = useState(paymentConfig.traditional.bic);
  const [bankName, setBankName] = useState(paymentConfig.traditional.bankName);
  const [supportEmail, setSupportEmail] = useState(paymentConfig.traditional.supportEmail);
  const [instructions, setInstructions] = useState(paymentConfig.traditional.instructions);

  const [minDeposit, setMinDeposit] = useState(50);
  const [maxDeposit, setMaxDeposit] = useState(250000);
  const [minWithdrawal, setMinWithdrawal] = useState(50);
  const [maxWithdrawal, setMaxWithdrawal] = useState(100000);

  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [depositApprovedTemplate, setDepositApprovedTemplate] = useState(
    'Your deposit request of {amount} {currency} ({reference}) has been approved and credited to your available balance.'
  );
  const [withdrawalCompletedTemplate, setWithdrawalCompletedTemplate] = useState(
    'Your withdrawal request of {amount} {currency} ({reference}) has been processed and executed. TX: {txHash}'
  );

  const [isSaving, setIsSaving] = useState(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updatedConfig: PaymentConfig = {
        traditional: {
          beneficiary,
          iban,
          bic,
          bankName,
          supportEmail,
          instructions,
        },
        cryptoNetworks: [
          {
            id: 'net-usdc-bep20',
            name: 'BNB Smart Chain (BEP-20)',
            token: 'USDC',
            network: 'BNB Smart Chain (BEP-20)',
            walletAddress: usdcAddress,
            contractEnd: '8ac76a',
            enabled: true,
          },
          {
            id: 'net-usdt-bep20',
            name: 'BNB Smart Chain (BEP-20)',
            token: 'USDT',
            network: 'BNB Smart Chain (BEP-20)',
            walletAddress: usdtAddress,
            contractEnd: '55d398',
            enabled: true,
          },
        ],
      };

      ledger.updatePaymentConfig(updatedConfig);
      onRefreshAll();
      onQuickSuccess('System payment settings and BEP-20 treasury addresses updated successfully!');
    } catch (err: any) {
      onQuickError(err.message || 'Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSaveSettings} className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between bg-white dark:bg-[#111A2C] p-6 rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] shadow-sm">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-600" />
            System Payment &amp; Escrow Configuration
          </h2>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">
            Configure BEP-20 treasury deposit addresses, bank wire escrow details, and min/max limits fed to user screens.
          </p>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50 transition"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
        </button>
      </div>

      {/* BEP-20 Treasury Deposit Addresses */}
      <div className="bg-white dark:bg-[#111A2C] p-6 rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] shadow-sm space-y-4">
        <h3 className="text-sm font-bold flex items-center gap-2 border-b border-[#E2E8F0] dark:border-[#1E293B] pb-3">
          <Coins className="w-4 h-4 text-emerald-600" />
          BEP-20 Treasury Deposit Addresses (BNB Smart Chain)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1.5">
            <label className="block font-semibold">USDC (BEP-20) Deposit Address</label>
            <input
              type="text"
              value={usdcAddress}
              onChange={(e) => setUsdcAddress(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#0B1220] font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block font-semibold">USDT (BEP-20) Deposit Address</label>
            <input
              type="text"
              value={usdtAddress}
              onChange={(e) => setUsdtAddress(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#0B1220] font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Bank Transfer Escrow Configuration */}
      <div className="bg-white dark:bg-[#111A2C] p-6 rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] shadow-sm space-y-4">
        <h3 className="text-sm font-bold flex items-center gap-2 border-b border-[#E2E8F0] dark:border-[#1E293B] pb-3">
          <Building2 className="w-4 h-4 text-emerald-600" />
          Escrow Bank Wire Details
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1.5">
            <label className="block font-semibold">Beneficiary Name</label>
            <input
              type="text"
              value={beneficiary}
              onChange={(e) => setBeneficiary(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#0B1220] focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block font-semibold">Bank Name</label>
            <input
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#0B1220] focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block font-semibold">IBAN</label>
            <input
              type="text"
              value={iban}
              onChange={(e) => setIban(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#0B1220] font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block font-semibold">SWIFT / BIC</label>
            <input
              type="text"
              value={bic}
              onChange={(e) => setBic(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#0B1220] font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="space-y-1.5 text-xs">
          <label className="block font-semibold">Transfer Instructions for Investors</label>
          <textarea
            rows={2}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            className="w-full p-3 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#0B1220] focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Transaction Limits */}
      <div className="bg-white dark:bg-[#111A2C] p-6 rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] shadow-sm space-y-4">
        <h3 className="text-sm font-bold flex items-center gap-2 border-b border-[#E2E8F0] dark:border-[#1E293B] pb-3">
          <ShieldAlert className="w-4 h-4 text-emerald-600" />
          Min / Max Limits Per Method
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="space-y-1.5">
            <label className="block font-semibold">Min Deposit (€)</label>
            <input
              type="number"
              value={minDeposit}
              onChange={(e) => setMinDeposit(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#0B1220] tabular-nums"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block font-semibold">Max Deposit (€)</label>
            <input
              type="number"
              value={maxDeposit}
              onChange={(e) => setMaxDeposit(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#0B1220] tabular-nums"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block font-semibold">Min Withdrawal (€)</label>
            <input
              type="number"
              value={minWithdrawal}
              onChange={(e) => setMinWithdrawal(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#0B1220] tabular-nums"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block font-semibold">Max Withdrawal (€)</label>
            <input
              type="number"
              value={maxWithdrawal}
              onChange={(e) => setMaxWithdrawal(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#0B1220] tabular-nums"
            />
          </div>
        </div>
      </div>

      {/* Maintenance Mode & Notification Templates */}
      <div className="bg-white dark:bg-[#111A2C] p-6 rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] shadow-sm space-y-4">
        <h3 className="text-sm font-bold flex items-center gap-2 border-b border-[#E2E8F0] dark:border-[#1E293B] pb-3">
          <Bell className="w-4 h-4 text-emerald-600" />
          Notification Templates &amp; Maintenance Toggle
        </h3>

        <div className="flex items-center justify-between p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#0B1220] border border-[#E2E8F0] dark:border-[#1E293B] text-xs">
          <div>
            <span className="font-bold block">Platform Maintenance Mode</span>
            <span className="text-[#64748B]">Pause user deposits and withdrawals temporarily</span>
          </div>

          <button
            type="button"
            onClick={() => setMaintenanceMode(!maintenanceMode)}
            className="p-1 text-emerald-600 cursor-pointer"
          >
            {maintenanceMode ? <ToggleRight className="w-8 h-8 text-amber-500" /> : <ToggleLeft className="w-8 h-8 text-gray-400" />}
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div className="space-y-1.5">
            <label className="block font-semibold">Deposit Approved Notification Template</label>
            <input
              type="text"
              value={depositApprovedTemplate}
              onChange={(e) => setDepositApprovedTemplate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#0B1220]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block font-semibold">Withdrawal Completed Notification Template</label>
            <input
              type="text"
              value={withdrawalCompletedTemplate}
              onChange={(e) => setWithdrawalCompletedTemplate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#0B1220]"
            />
          </div>
        </div>
      </div>
    </form>
  );
};
