import React, { useState } from 'react';
import {
  ArrowUpFromLine, Building2, Wallet, Copy, Check, CheckCircle2,
  ShieldAlert, AlertTriangle, ArrowRight, ArrowLeft, Info, Lock, Clock, X
} from 'lucide-react';
import { useAuth } from '../../../lib/auth';
import { useToast } from '../../../context/ToastContext';
import { ledger } from '../../../lib/ledger';
import { Transaction } from '../../../types/transaction';
import { formatCurrency } from '../../../lib/utils';
import { SharedTransactionHistory } from '../SharedTransactionHistory';

interface WithdrawalPageProps {
  transactions: Transaction[];
  onOpenKyc: () => void;
  onNavigateTab: (tab: string) => void;
}

export const WithdrawalPage: React.FC<WithdrawalPageProps> = ({
  transactions,
  onOpenKyc,
  onNavigateTab,
}) => {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const paymentConfig = ledger.getPaymentConfig();

  const isKycVerified = user?.kycStatus === 'verified';
  const availableBalance = user?.walletBalance || 12450;
  const investedBalance = user?.investedBalance || 63600;
  const pendingBalance = user?.pendingBalance || 0;

  // Stepper state (1: Amount, 2: Destination, 3: Security, 4: Review, 5: Confirmation)
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Form states
  const [amount, setAmount] = useState<number>(500);
  const [currency, setCurrency] = useState<'EUR' | 'USD' | 'USDC' | 'USDT'>('EUR');
  const [destinationMethod, setDestinationMethod] = useState<'bank' | 'usdc_bep20' | 'usdt_bep20'>('bank');

  // Destination Details
  const [selectedBank, setSelectedBank] = useState<string>('caixa');
  const [customIban, setCustomIban] = useState<string>(user?.bankIban || '');
  const [bep20Address, setBep20Address] = useState<string>(
    user?.cryptoDepositAddress || '0x71C8135C0e41B3fA128912389128f9A19b28A0bf'
  );

  // Security Step
  const [twoFaCode, setTwoFaCode] = useState<string>('');
  const [termsConfirmed, setTermsConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedReference, setConfirmedReference] = useState<string>('');

  const fee = 0; // Zero fee for standard processing
  const netReceived = Math.max(0, amount - fee);
  const estimatedArrival = '1–3 Business Days (Awaiting Admin Approval)';

  const getMethodLabel = () => {
    switch (destinationMethod) {
      case 'usdc_bep20': return 'USDC (BEP-20)';
      case 'usdt_bep20': return 'USDT (BEP-20)';
      case 'bank': return 'Bank Transfer';
    }
  };

  const handleSetMax = () => {
    setAmount(availableBalance);
  };

  const handleCancelPendingUser = (txId: string) => {
    try {
      if (user?.id) {
        ledger.cancelTransaction(user.id, txId);
        if (refreshUser) refreshUser();
        toast.success(`Withdrawal request cancelled. Funds returned to Available balance.`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel withdrawal');
    }
  };

  const handleConfirmWithdrawal = async () => {
    if (amount > availableBalance) {
      toast.error('Withdrawal amount exceeds available balance.');
      return;
    }
    if (amount < 50) {
      toast.error('Minimum withdrawal amount is €50.00.');
      return;
    }

    setIsSubmitting(true);
    try {
      const ref = `WTH-${currency}-${Math.floor(100000 + Math.random() * 900000)}`;
      if (user?.id) {
        ledger.withdraw(
          user.id,
          amount,
          currency,
          getMethodLabel(),
          ref
        );
      }
      if (refreshUser) await refreshUser();
      setConfirmedReference(ref);
      setStep(5);
      toast.success('Withdrawal request submitted! Funds moved to Pending.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit withdrawal request. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // User's active pending withdrawals
  const pendingWithdrawalTxs = transactions.filter((t) => t.type === 'withdrawal' && t.status === 'pending');

  return (
    <div className="space-y-6 text-[#0F172A] dark:text-[#E2E8F0]">
      {/* Top Balance Strip */}
      <div className="p-[20px] rounded-[12px] bg-white dark:bg-[#111A2C] border border-[#E2E8F0] dark:border-[#1E293B] shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ArrowUpFromLine className="w-5 h-5 text-[#0F4C81] dark:text-[#14B8A6]" />
            <h2 className="text-[20px] font-semibold">Withdraw Capital</h2>
          </div>
          <p className="text-[12px] text-[#64748B] dark:text-[#94A3B8]">
            Transfer liquid funds to your bank account or BEP-20 wallet address. All withdrawals are approved by Admin.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-[12px]">
          <div className="p-3 rounded-[8px] bg-[#F8FAFC] dark:bg-[#0B1220] border border-[#E2E8F0] dark:border-[#1E293B]">
            <span className="text-[#64748B] dark:text-[#94A3B8] block">Available to Withdraw</span>
            <span className="text-[16px] font-bold tabular-nums text-[#16A34A]">
              {formatCurrency(availableBalance)}
            </span>
          </div>
          <div className="p-3 rounded-[8px] bg-[#F8FAFC] dark:bg-[#0B1220] border border-[#E2E8F0] dark:border-[#1E293B]">
            <span className="text-[#64748B] dark:text-[#94A3B8] block">Locked in Pending</span>
            <span className="text-[16px] font-bold tabular-nums text-[#F59E0B]">
              {formatCurrency(pendingBalance)}
            </span>
          </div>
          <div className="p-3 rounded-[8px] bg-[#F8FAFC] dark:bg-[#0B1220] border border-[#E2E8F0] dark:border-[#1E293B]">
            <span className="text-[#64748B] dark:text-[#94A3B8] block">Total Equity</span>
            <span className="text-[16px] font-bold tabular-nums text-[#0F4C81] dark:text-[#14B8A6]">
              {formatCurrency(investedBalance)}
            </span>
          </div>
        </div>
      </div>

      {/* KYC Lock Overlay Check */}
      {!isKycVerified ? (
        <div className="p-8 rounded-[12px] bg-white dark:bg-[#111A2C] border border-[#E2E8F0] dark:border-[#1E293B] shadow-[0_1px_3px_rgba(0,0,0,0.06)] text-center space-y-4 max-w-[640px] mx-auto">
          <div className="w-12 h-12 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] mx-auto flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="text-[18px] font-bold">Identity Verification Required for Cashouts</h3>
          <p className="text-[14px] text-[#64748B] dark:text-[#94A3B8]">
            Complete verification to withdraw funds from your institutional custody wallet.
          </p>
          <button
            onClick={onOpenKyc}
            className="px-6 py-2.5 rounded-[8px] bg-[#0F4C81] text-white font-semibold text-[14px] hover:bg-[#0F4C81]/90 cursor-pointer"
          >
            Complete Verification to Withdraw
          </button>
        </div>
      ) : (
        /* Two Column Main Content Layout */
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Main Form Card (max-w 560px) */}
          <div className="w-full lg:max-w-[560px] p-6 rounded-[12px] bg-white dark:bg-[#111A2C] border border-[#E2E8F0] dark:border-[#1E293B] shadow-[0_1px_3px_rgba(0,0,0,0.06)] space-y-6">
            {/* Stepper Header */}
            <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#1E293B] pb-4">
              {[
                { s: 1, label: 'Amount' },
                { s: 2, label: 'Destination' },
                { s: 3, label: 'Security' },
                { s: 4, label: 'Review' },
                { s: 5, label: 'Confirm' },
              ].map((st) => (
                <div key={st.s} className="flex items-center gap-1">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                      step === st.s
                        ? 'bg-[#0F4C81] text-white dark:bg-[#14B8A6] dark:text-[#0B1220]'
                        : step > st.s
                        ? 'bg-[#16A34A] text-white'
                        : 'bg-[#E2E8F0] dark:bg-[#1E293B] text-[#64748B]'
                    }`}
                  >
                    {step > st.s ? '✓' : st.s}
                  </div>
                  <span
                    className={`text-[11px] font-medium hidden sm:inline ${
                      step === st.s ? 'font-bold text-[#0F172A] dark:text-[#E2E8F0]' : 'text-[#64748B]'
                    }`}
                  >
                    {st.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Step 1: Amount */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-[16px] font-semibold mb-1">Enter Withdrawal Amount</h3>
                  <p className="text-[12px] text-[#64748B] dark:text-[#94A3B8]">
                    Available cash balance: <span className="font-bold text-[#16A34A]">{formatCurrency(availableBalance)}</span>
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-3 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#0B1220]">
                    <span className="text-[20px] font-bold text-[#0F4C81] dark:text-[#14B8A6]">
                      {currency === 'EUR' ? '€' : '$'}
                    </span>
                    <input
                      type="number"
                      min={50}
                      max={availableBalance}
                      value={amount}
                      onChange={(e) => setAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="flex-1 bg-transparent text-[32px] font-bold tabular-nums focus:outline-none text-[#0F172A] dark:text-[#E2E8F0]"
                    />
                    <button
                      type="button"
                      onClick={handleSetMax}
                      className="px-2.5 py-1 rounded-[6px] bg-[#0F4C81]/10 text-[#0F4C81] dark:text-[#14B8A6] text-[11px] font-bold uppercase hover:bg-[#0F4C81]/20 cursor-pointer"
                    >
                      MAX
                    </button>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value as any)}
                      className="px-2.5 py-1.5 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111A2C] font-semibold text-[13px] focus:outline-none cursor-pointer"
                    >
                      <option value="EUR">EUR (€)</option>
                      <option value="USD">USD ($)</option>
                      <option value="USDC">USDC</option>
                      <option value="USDT">USDT</option>
                    </select>
                  </div>

                  {/* Limits and Validation */}
                  <div className="flex justify-between text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                    <span>Minimum withdrawal: €50.00</span>
                    {amount > availableBalance ? (
                      <span className="text-[#DC2626] font-semibold">Exceeds available balance</span>
                    ) : (
                      <span>Available: €{availableBalance.toLocaleString()}</span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={amount < 50 || amount > availableBalance}
                  onClick={() => setStep(2)}
                  className="w-full py-3 rounded-[8px] bg-[#0F4C81] hover:bg-[#0F4C81]/90 text-white text-[14px] font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  Continue to Destination <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Step 2: Allowed Destination Tabs */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-[16px] font-semibold mb-1">Select Payout Destination</h3>
                  <p className="text-[12px] text-[#64748B] dark:text-[#94A3B8]">
                    Choose where your capital should be transferred.
                  </p>
                </div>

                {/* Destination Selector Tabs */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'bank', label: 'Bank Transfer', fee: '€0' },
                    { id: 'usdc_bep20', label: 'USDC (BEP-20)', fee: 'Gas' },
                    { id: 'usdt_bep20', label: 'USDT (BEP-20)', fee: 'Gas' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setDestinationMethod(m.id as any)}
                      className={`p-3 text-center rounded-[8px] border transition-colors cursor-pointer ${
                        destinationMethod === m.id
                          ? 'border-[#0F4C81] dark:border-[#14B8A6] bg-[#0F4C81]/10 text-[#0F4C81] dark:text-[#14B8A6] font-semibold'
                          : 'border-[#E2E8F0] dark:border-[#1E293B] hover:bg-[#F8FAFC]'
                      }`}
                    >
                      <div className="text-[13px] font-semibold">{m.label}</div>
                      <div className="text-[10px] text-[#64748B]">Fee: {m.fee}</div>
                    </button>
                  ))}
                </div>

                {/* Destination Details */}
                {destinationMethod === 'bank' && (
                  <div className="p-4 rounded-[8px] bg-[#F8FAFC] dark:bg-[#0B1220] border border-[#E2E8F0] dark:border-[#1E293B] space-y-3">
                    <div className="text-[13px] font-semibold">Bank Payout Details</div>
                    <select
                      value={selectedBank}
                      onChange={(e) => setSelectedBank(e.target.value)}
                      className="w-full px-3 py-2 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111A2C] text-[13px] font-mono"
                    >
                      <option value="caixa">CaixaBank – ES91 2100 0418 **** **** 1829 (Default)</option>
                      <option value="custom">Custom Bank IBAN</option>
                    </select>

                    {selectedBank === 'custom' && (
                      <input
                        type="text"
                        placeholder="Enter IBAN (e.g. ES91 2100...)"
                        value={customIban}
                        onChange={(e) => setCustomIban(e.target.value)}
                        className="w-full px-3 py-2 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E293B] font-mono text-[12px] bg-white dark:bg-[#111A2C]"
                      />
                    )}
                    <p className="text-[11px] text-[#64748B]">
                      Funds arrive in 1–3 business days following Admin verification and wire execution.
                    </p>
                  </div>
                )}

                {(destinationMethod === 'usdc_bep20' || destinationMethod === 'usdt_bep20') && (
                  <div className="p-4 rounded-[8px] bg-[#F8FAFC] dark:bg-[#0B1220] border border-[#E2E8F0] dark:border-[#1E293B] space-y-3 text-[12px]">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">
                        {destinationMethod === 'usdc_bep20' ? 'USDC (BEP-20)' : 'USDT (BEP-20)'} Destination Wallet
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[#0F4C81]/10 text-[#0F4C81] dark:text-[#14B8A6] text-[10px] font-bold uppercase">
                        BNB Smart Chain (BEP-20)
                      </span>
                    </div>

                    <input
                      type="text"
                      value={bep20Address}
                      onChange={(e) => setBep20Address(e.target.value)}
                      placeholder="0x..."
                      className="w-full px-3 py-2 rounded border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111A2C] font-mono text-[11px]"
                    />

                    <div className="flex items-center gap-1 text-[11px] text-[#16A34A] font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Address formatted for BEP-20 (BNB Smart Chain)</span>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="py-2.5 px-4 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E293B] text-[13px] font-semibold cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="flex-1 py-2.5 rounded-[8px] bg-[#0F4C81] text-white text-[13px] font-semibold hover:bg-[#0F4C81]/90 cursor-pointer"
                  >
                    Proceed to Security
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Security Step */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-[16px] font-semibold mb-1">Security Verification (2FA)</h3>
                  <p className="text-[12px] text-[#64748B] dark:text-[#94A3B8]">
                    Enter the 6-digit authentication code sent to your registered device.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-[12px] font-medium text-[#64748B]">
                    Authenticator / SMS Code (6 Digits)
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={twoFaCode}
                    onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-3 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#0B1220] font-mono text-[24px] tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-[#0F4C81]"
                  />
                  <p className="text-[11px] text-[#64748B] text-center">
                    Enter any 6 digits for testing verification.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="py-2.5 px-4 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E293B] text-[13px] font-semibold cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={twoFaCode.length < 6}
                    onClick={() => setStep(4)}
                    className="flex-1 py-2.5 rounded-[8px] bg-[#0F4C81] text-white text-[13px] font-semibold hover:bg-[#0F4C81]/90 disabled:opacity-50 cursor-pointer"
                  >
                    Verify & Review
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Review */}
            {step === 4 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-[16px] font-semibold mb-1">Review Withdrawal Order</h3>
                  <p className="text-[12px] text-[#64748B] dark:text-[#94A3B8]">
                    Confirm your transfer details. Submitting locks funds into Pending balance until Admin approves.
                  </p>
                </div>

                <div className="p-4 rounded-[8px] bg-[#F8FAFC] dark:bg-[#0B1220] border border-[#E2E8F0] dark:border-[#1E293B] space-y-2 text-[13px]">
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Withdrawal Amount:</span>
                    <span className="font-bold tabular-nums">{formatCurrency(amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Destination Method:</span>
                    <span className="font-semibold">{getMethodLabel()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Balance Lock:</span>
                    <span className="font-semibold text-[#F59E0B]">Moved Available → Pending</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Estimated Arrival:</span>
                    <span className="font-semibold">{estimatedArrival}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-[#E2E8F0] dark:border-[#1E293B] text-[15px] font-bold">
                    <span>Net Received:</span>
                    <span className="text-[#0F4C81] dark:text-[#14B8A6] tabular-nums">
                      {formatCurrency(netReceived)}
                    </span>
                  </div>
                </div>

                <label className="flex items-start gap-2 cursor-pointer text-[12px]">
                  <input
                    type="checkbox"
                    checked={termsConfirmed}
                    onChange={(e) => setTermsConfirmed(e.target.checked)}
                    className="mt-0.5 rounded border-[#E2E8F0] text-[#0F4C81]"
                  />
                  <span className="text-[#64748B]">
                    I confirm that this destination is owned under my legal identity and understand Admin approval is required.
                  </span>
                </label>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="py-2.5 px-4 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E293B] text-[13px] font-semibold cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting || !termsConfirmed}
                    onClick={handleConfirmWithdrawal}
                    className="flex-1 py-2.5 rounded-[8px] bg-[#0F4C81] text-white text-[14px] font-semibold hover:bg-[#0F4C81]/90 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? 'Submitting...' : 'Confirm & Lock Funds'}
                  </button>
                </div>
              </div>
            )}

            {/* Step 5: Confirmation */}
            {step === 5 && (
              <div className="text-center space-y-5 py-4">
                <div className="w-14 h-14 rounded-full bg-[#F59E0B]/10 text-[#F59E0B] mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-[20px] font-bold">Withdrawal Submitted</h3>
                <p className="text-[13px] text-[#64748B] max-w-sm mx-auto">
                  Reference ID: <span className="font-mono font-bold text-[#0F4C81]">{confirmedReference}</span>. Funds are locked in <span className="font-bold text-[#F59E0B]">Pending</span> balance awaiting Admin review.
                </p>

                <div className="p-4 rounded-[8px] bg-[#F8FAFC] dark:bg-[#0B1220] border border-[#E2E8F0] dark:border-[#1E293B] space-y-3">
                  <div className="text-[12px] font-semibold text-left">Real-Time Status</div>
                  <div className="grid grid-cols-3 gap-1 text-[11px] font-semibold">
                    <div className="p-2 rounded bg-[#F59E0B]/15 text-[#F59E0B]">● Awaiting Confirmation</div>
                    <div className="p-2 rounded bg-[#E2E8F0] dark:bg-[#1E293B] text-[#64748B]">Admin Review</div>
                    <div className="p-2 rounded bg-[#E2E8F0] dark:bg-[#1E293B] text-[#64748B]">Completed</div>
                  </div>
                </div>

                <div className="flex gap-3 justify-center pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-4 py-2 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E293B] text-[13px] font-semibold cursor-pointer"
                  >
                    New Withdrawal
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigateTab('transactions')}
                    className="px-5 py-2 rounded-[8px] bg-[#0F4C81] text-white text-[13px] font-semibold hover:bg-[#0F4C81]/90 cursor-pointer"
                  >
                    View Transactions
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Summary Card (360px) */}
          <div className="w-full lg:w-[360px] p-5 rounded-[12px] bg-white dark:bg-[#111A2C] border border-[#E2E8F0] dark:border-[#1E293B] shadow-[0_1px_3px_rgba(0,0,0,0.06)] space-y-4">
            <h3 className="text-[16px] font-semibold border-b border-[#E2E8F0] dark:border-[#1E293B] pb-2">
              Withdrawal Breakdown
            </h3>

            <div className="space-y-2 text-[12px]">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Requested Amount:</span>
                <span className="font-bold tabular-nums">{formatCurrency(amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Processing Fee:</span>
                <span className="font-semibold text-[#16A34A]">€0.00</span>
              </div>
              <div className="flex justify-between font-bold text-[14px] pt-1 border-t border-[#E2E8F0] dark:border-[#1E293B]">
                <span>Net Received:</span>
                <span className="text-[#0F4C81] dark:text-[#14B8A6] tabular-nums">{formatCurrency(netReceived)}</span>
              </div>
            </div>

            <div className="p-3 rounded-[8px] bg-[#F8FAFC] dark:bg-[#0B1220] border border-[#E2E8F0] dark:border-[#1E293B] text-[11px] text-[#64748B] space-y-1">
              <div className="font-semibold text-[#0F172A] dark:text-[#E2E8F0]">Lock-up & Cancellation Policy</div>
              <p>
                Funds remain locked in your Pending balance while awaiting Admin approval. You may cancel any Pending request at any time before Admin processing to instantly restore funds to your Available balance.
              </p>
            </div>

            {/* Pending Withdrawals List with User Cancel Option */}
            <div className="space-y-2 pt-2 border-t border-[#E2E8F0] dark:border-[#1E293B]">
              <div className="flex items-center justify-between text-[12px] font-semibold">
                <span>Your Pending Cashouts</span>
                <span className="text-[10px] text-[#64748B]">{pendingWithdrawalTxs.length} active</span>
              </div>

              {pendingWithdrawalTxs.length === 0 ? (
                <div className="text-[12px] text-[#64748B] py-2 text-center">No active pending withdrawals.</div>
              ) : (
                pendingWithdrawalTxs.map((w) => (
                  <div key={w.id} className="p-2.5 rounded bg-[#F8FAFC] dark:bg-[#0B1220] border border-[#E2E8F0] dark:border-[#1E293B] flex items-center justify-between text-[12px]">
                    <div>
                      <div className="font-semibold text-[#F59E0B] tabular-nums">-{formatCurrency(w.amount)}</div>
                      <div className="text-[10px] text-[#64748B]">{w.paymentMethod} • {w.createdAt.split('T')[0]}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCancelPendingUser(w.id)}
                      className="px-2 py-1 rounded bg-[#DC2626]/10 text-[#DC2626] font-semibold text-[10px] hover:bg-[#DC2626]/20 transition-colors cursor-pointer"
                      title="Cancel pending request and restore funds to Available balance"
                    >
                      Cancel
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Shared History Section below form */}
      <SharedTransactionHistory transactions={transactions} title="Withdrawal & Cashout History" />
    </div>
  );
};
