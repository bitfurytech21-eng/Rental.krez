import React, { useState } from 'react';
import {
  ArrowDownToLine, Building2, Wallet, Copy, Check, CheckCircle2,
  ShieldAlert, AlertTriangle, ArrowRight, ArrowLeft, Info, Lock
} from 'lucide-react';
import { useAuth } from '../../../lib/auth';
import { useToast } from '../../../context/ToastContext';
import { ledger } from '../../../lib/ledger';
import { Transaction } from '../../../types/transaction';
import { formatCurrency } from '../../../lib/utils';
import { SharedTransactionHistory } from '../SharedTransactionHistory';

interface DepositPageProps {
  transactions: Transaction[];
  onOpenKyc: () => void;
  onNavigateTab: (tab: string) => void;
}

export const DepositPage: React.FC<DepositPageProps> = ({
  transactions,
  onOpenKyc,
  onNavigateTab,
}) => {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const paymentConfig = ledger.getPaymentConfig();

  const isKycVerified = user?.kycStatus === 'verified';
  const availableBalance = user?.walletBalance || 15000;
  const investedBalance = user?.investedBalance || 63600;
  const pendingBalance = user?.pendingBalance || 0;

  // Stepper state (1: Amount, 2: Method, 3: Review, 4: Confirmation)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form states
  const [amount, setAmount] = useState<number>(1000);
  const [currency, setCurrency] = useState<'EUR' | 'USD' | 'USDC' | 'USDT'>('EUR');
  const [method, setMethod] = useState<'usdc_bep20' | 'usdt_bep20' | 'bank'>('bank');

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [termsConfirmed, setTermsConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedReference, setConfirmedReference] = useState<string>('');

  const usdcAddress = paymentConfig.cryptoNetworks.find(n => n.token === 'USDC')?.walletAddress || '0x71C8135C0e41B3fA128912389128f9A19b28A0bf';
  const usdtAddress = paymentConfig.cryptoNetworks.find(n => n.token === 'USDT')?.walletAddress || '0x71C8135C0e41B3fA128912389128f9A19b28A0bf';
  const bankDetails = paymentConfig.traditional;

  const fee = 0; // Zero fee for deposits
  const totalCredited = amount;
  const estimatedArrival = '1–3 Business Days (Subject to Admin Verification)';

  const getMethodLabel = () => {
    switch (method) {
      case 'usdc_bep20': return 'USDC (BEP-20)';
      case 'usdt_bep20': return 'USDT (BEP-20)';
      case 'bank': return 'Bank Transfer';
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    toast.success(`Copied ${label} to clipboard`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleConfirmDeposit = async () => {
    setIsSubmitting(true);
    try {
      const ref = `DEP-${currency}-${Math.floor(100000 + Math.random() * 900000)}`;
      if (user?.id) {
        ledger.deposit(
          user.id,
          amount,
          currency,
          getMethodLabel(),
          ref
        );
      }
      if (refreshUser) await refreshUser();
      setConfirmedReference(ref);
      setStep(4);
      toast.success('Deposit request submitted! Awaiting administrator confirmation.');
    } catch {
      toast.error('Failed to submit deposit request. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter recent deposits
  const recentDeposits = transactions.filter((t) => t.type === 'deposit').slice(0, 3);

  return (
    <div className="space-y-6 text-[#0F172A] dark:text-[#E2E8F0]">
      {/* Top Balance Strip */}
      <div className="p-[20px] rounded-[12px] bg-white dark:bg-[#111A2C] border border-[#E2E8F0] dark:border-[#1E293B] shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ArrowDownToLine className="w-5 h-5 text-[#0F4C81] dark:text-[#14B8A6]" />
            <h2 className="text-[20px] font-semibold">Deposit Capital</h2>
          </div>
          <p className="text-[12px] text-[#64748B] dark:text-[#94A3B8]">
            Fund your account via USDC (BEP-20), USDT (BEP-20), or Bank Transfer. All deposits undergo manual admin approval.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-[12px]">
          <div className="p-3 rounded-[8px] bg-[#F8FAFC] dark:bg-[#0B1220] border border-[#E2E8F0] dark:border-[#1E293B]">
            <span className="text-[#64748B] dark:text-[#94A3B8] block">Available to Invest</span>
            <span className="text-[16px] font-bold tabular-nums text-[#16A34A]">
              {formatCurrency(availableBalance)}
            </span>
          </div>
          <div className="p-3 rounded-[8px] bg-[#F8FAFC] dark:bg-[#0B1220] border border-[#E2E8F0] dark:border-[#1E293B]">
            <span className="text-[#64748B] dark:text-[#94A3B8] block">Pending Approvals</span>
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
          <h3 className="text-[18px] font-bold">Identity Verification Required for Deposits</h3>
          <p className="text-[14px] text-[#64748B] dark:text-[#94A3B8]">
            Compliance regulations require accredited identity verification before capital can be deposited and approved into escrow.
          </p>
          <button
            onClick={onOpenKyc}
            className="px-6 py-2.5 rounded-[8px] bg-[#0F4C81] text-white font-semibold text-[14px] hover:bg-[#0F4C81]/90 cursor-pointer"
          >
            Complete KYC Verification Now
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
                { s: 2, label: 'Method' },
                { s: 3, label: 'Review' },
                { s: 4, label: 'Confirmation' },
              ].map((st) => (
                <div key={st.s} className="flex items-center gap-1.5">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold ${
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
                    className={`text-[12px] font-medium hidden sm:inline ${
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
                  <h3 className="text-[16px] font-semibold mb-1">Enter Deposit Amount</h3>
                  <p className="text-[12px] text-[#64748B] dark:text-[#94A3B8]">
                    Specify the capital you wish to transfer for investment balance credit.
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
                      max={250000}
                      value={amount}
                      onChange={(e) => setAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="flex-1 bg-transparent text-[32px] font-bold tabular-nums focus:outline-none text-[#0F172A] dark:text-[#E2E8F0]"
                    />
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value as any)}
                      className="px-3 py-1.5 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111A2C] font-semibold text-[13px] focus:outline-none cursor-pointer"
                    >
                      <option value="EUR">EUR (€)</option>
                      <option value="USD">USD ($)</option>
                      <option value="USDC">USDC</option>
                      <option value="USDT">USDT</option>
                    </select>
                  </div>

                  {/* Limits indicator */}
                  <div className="flex justify-between text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                    <span>Minimum deposit: €50.00</span>
                    <span>Maximum single deposit: €250,000.00</span>
                  </div>
                </div>

                {/* Quick Chips */}
                <div>
                  <label className="block text-[12px] font-medium text-[#64748B] mb-1.5">
                    Quick Selection
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[500, 1000, 5000, 10000].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setAmount(val)}
                        className={`py-2 text-center text-[12px] font-semibold rounded-[8px] border transition-colors cursor-pointer ${
                          amount === val
                            ? 'border-[#0F4C81] dark:border-[#14B8A6] bg-[#0F4C81]/10 text-[#0F4C81] dark:text-[#14B8A6]'
                            : 'border-[#E2E8F0] dark:border-[#1E293B] hover:bg-[#F8FAFC]'
                        }`}
                      >
                        +{currency === 'EUR' ? '€' : '$'}{val.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={amount < 50}
                  onClick={() => setStep(2)}
                  className="w-full py-3 rounded-[8px] bg-[#0F4C81] hover:bg-[#0F4C81]/90 text-white text-[14px] font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  Continue to Method <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Step 2: Allowed Method Selector */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-[16px] font-semibold mb-1">Select Payment Method</h3>
                  <p className="text-[12px] text-[#64748B] dark:text-[#94A3B8]">
                    Approved payment methods for capital deposit.
                  </p>
                </div>

                {/* Method selector tabs */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'bank', label: 'Bank Transfer', fee: '€0' },
                    { id: 'usdc_bep20', label: 'USDC (BEP-20)', fee: 'Gas' },
                    { id: 'usdt_bep20', label: 'USDT (BEP-20)', fee: 'Gas' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMethod(m.id as any)}
                      className={`p-3 text-center rounded-[8px] border transition-colors cursor-pointer ${
                        method === m.id
                          ? 'border-[#0F4C81] dark:border-[#14B8A6] bg-[#0F4C81]/10 text-[#0F4C81] dark:text-[#14B8A6] font-semibold'
                          : 'border-[#E2E8F0] dark:border-[#1E293B] hover:bg-[#F8FAFC]'
                      }`}
                    >
                      <div className="text-[13px] font-semibold">{m.label}</div>
                      <div className="text-[10px] text-[#64748B]">Fee: {m.fee}</div>
                    </button>
                  ))}
                </div>

                {/* Method Specific Details */}
                {method === 'bank' && (
                  <div className="p-4 rounded-[8px] bg-[#F8FAFC] dark:bg-[#0B1220] border border-[#E2E8F0] dark:border-[#1E293B] space-y-2 text-[12px]">
                    <div className="font-semibold text-[13px] border-b border-[#E2E8F0] dark:border-[#1E293B] pb-1 flex justify-between">
                      <span>Escrow Wire Details</span>
                      <span className="text-[11px] font-mono text-[#0F4C81] dark:text-[#14B8A6]">{bankDetails.bankName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#64748B]">Beneficiary:</span>
                      <span className="font-semibold">{bankDetails.beneficiary}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#64748B]">IBAN:</span>
                      <div className="flex items-center gap-1 font-mono font-semibold">
                        <span>{bankDetails.iban}</span>
                        <button
                          onClick={() => handleCopy(bankDetails.iban, 'IBAN')}
                          className="p-1 hover:bg-[#E2E8F0] rounded cursor-pointer"
                        >
                          {copiedField === 'IBAN' ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#64748B]">SWIFT/BIC:</span>
                      <span className="font-mono font-semibold">{bankDetails.bic}</span>
                    </div>
                    <p className="text-[11px] text-[#64748B] pt-1">
                      Include your full legal name in the reference. Submissions remain Pending until Admin verifies proof and approves.
                    </p>
                  </div>
                )}

                {method === 'usdc_bep20' && (
                  <div className="p-4 rounded-[8px] bg-[#F8FAFC] dark:bg-[#0B1220] border border-[#E2E8F0] dark:border-[#1E293B] space-y-3 text-[12px]">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">USDC Deposit Address</span>
                      <span className="px-2 py-0.5 rounded bg-[#0F4C81]/10 text-[#0F4C81] dark:text-[#14B8A6] text-[10px] font-bold uppercase">
                        BNB Smart Chain (BEP-20)
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded bg-white dark:bg-[#111A2C] border border-[#E2E8F0] dark:border-[#1E293B] font-mono text-[11px] break-all">
                      <span>{usdcAddress}</span>
                      <button
                        onClick={() => handleCopy(usdcAddress, 'USDC Address')}
                        className="p-1.5 hover:bg-[#E2E8F0] rounded cursor-pointer shrink-0 ml-2"
                      >
                        {copiedField === 'USDC Address' ? <Check className="w-4 h-4 text-[#16A34A]" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>

                    <div className="text-[11px] text-[#F59E0B] flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Send only USDC on BEP-20 (BNB Smart Chain). Requires Admin approval after transfer.</span>
                    </div>
                  </div>
                )}

                {method === 'usdt_bep20' && (
                  <div className="p-4 rounded-[8px] bg-[#F8FAFC] dark:bg-[#0B1220] border border-[#E2E8F0] dark:border-[#1E293B] space-y-3 text-[12px]">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">USDT Deposit Address</span>
                      <span className="px-2 py-0.5 rounded bg-[#0F4C81]/10 text-[#0F4C81] dark:text-[#14B8A6] text-[10px] font-bold uppercase">
                        BNB Smart Chain (BEP-20)
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded bg-white dark:bg-[#111A2C] border border-[#E2E8F0] dark:border-[#1E293B] font-mono text-[11px] break-all">
                      <span>{usdtAddress}</span>
                      <button
                        onClick={() => handleCopy(usdtAddress, 'USDT Address')}
                        className="p-1.5 hover:bg-[#E2E8F0] rounded cursor-pointer shrink-0 ml-2"
                      >
                        {copiedField === 'USDT Address' ? <Check className="w-4 h-4 text-[#16A34A]" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>

                    <div className="text-[11px] text-[#F59E0B] flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Send only USDT on BEP-20 (BNB Smart Chain). Requires Admin approval after transfer.</span>
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
                    Review Order
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Review */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-[16px] font-semibold mb-1">Review Deposit Summary</h3>
                  <p className="text-[12px] text-[#64748B] dark:text-[#94A3B8]">
                    Verify settlement details before submitting deposit request.
                  </p>
                </div>

                <div className="p-4 rounded-[8px] bg-[#F8FAFC] dark:bg-[#0B1220] border border-[#E2E8F0] dark:border-[#1E293B] space-y-2 text-[13px]">
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Deposit Amount:</span>
                    <span className="font-bold tabular-nums">{formatCurrency(amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Payment Channel:</span>
                    <span className="font-semibold">{getMethodLabel()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Initial Status:</span>
                    <span className="font-bold text-[#F59E0B] uppercase">Pending Admin Approval</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Estimated Arrival:</span>
                    <span className="font-semibold">{estimatedArrival}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-[#E2E8F0] dark:border-[#1E293B] text-[15px] font-bold">
                    <span>Net Credited Upon Approval:</span>
                    <span className="text-[#16A34A] tabular-nums">{formatCurrency(totalCredited)}</span>
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
                    I confirm that I have sent the funds to the provided details and understand approval is managed by system administration.
                  </span>
                </label>

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
                    disabled={isSubmitting || !termsConfirmed}
                    onClick={handleConfirmDeposit}
                    className="flex-1 py-2.5 rounded-[8px] bg-[#0F4C81] text-white text-[14px] font-semibold hover:bg-[#0F4C81]/90 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Deposit Request'}
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Confirmation */}
            {step === 4 && (
              <div className="text-center space-y-4 py-4">
                <div className="w-14 h-14 rounded-full bg-[#F59E0B]/10 text-[#F59E0B] mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-[20px] font-bold">Deposit Submitted for Admin Approval</h3>
                <p className="text-[13px] text-[#64748B] max-w-sm mx-auto">
                  Reference ID: <span className="font-mono font-bold text-[#0F4C81]">{confirmedReference}</span>. Status is <span className="font-bold text-[#F59E0B]">Pending</span>. Funds will credit automatically upon administrator approval.
                </p>

                <div className="flex gap-3 justify-center pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-4 py-2 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E293B] text-[13px] font-semibold cursor-pointer"
                  >
                    New Deposit
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigateTab('marketplace')}
                    className="px-5 py-2 rounded-[8px] bg-[#0F4C81] text-white text-[13px] font-semibold hover:bg-[#0F4C81]/90 cursor-pointer"
                  >
                    Browse Assets
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Summary Card (360px) */}
          <div className="w-full lg:w-[360px] p-5 rounded-[12px] bg-white dark:bg-[#111A2C] border border-[#E2E8F0] dark:border-[#1E293B] shadow-[0_1px_3px_rgba(0,0,0,0.06)] space-y-4">
            <h3 className="text-[16px] font-semibold border-b border-[#E2E8F0] dark:border-[#1E293B] pb-2">
              Deposit Order Breakdown
            </h3>

            <div className="space-y-2 text-[12px]">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Selected Amount:</span>
                <span className="font-bold tabular-nums">{formatCurrency(amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Fee:</span>
                <span className="font-semibold text-[#16A34A]">€0.00</span>
              </div>
              <div className="flex justify-between font-bold text-[14px] pt-1 border-t border-[#E2E8F0] dark:border-[#1E293B]">
                <span>Total Credited:</span>
                <span className="text-[#16A34A] tabular-nums">{formatCurrency(totalCredited)}</span>
              </div>
            </div>

            <div className="p-3 rounded-[8px] bg-[#F8FAFC] dark:bg-[#0B1220] border border-[#E2E8F0] dark:border-[#1E293B] text-[11px] text-[#64748B] space-y-1">
              <div className="font-semibold text-[#0F172A] dark:text-[#E2E8F0]">Approval Workflow</div>
              <p>
                All incoming bank transfers and BEP-20 crypto deposits require manual verification by system administrators before wallet crediting.
              </p>
            </div>

            {/* Recent Deposits List */}
            <div className="space-y-2 pt-2 border-t border-[#E2E8F0] dark:border-[#1E293B]">
              <div className="text-[12px] font-semibold">Recent Deposit Activity</div>
              {recentDeposits.length === 0 ? (
                <div className="text-[12px] text-[#64748B] py-2 text-center">No recent deposits.</div>
              ) : (
                recentDeposits.map((dep) => (
                  <div key={dep.id} className="flex items-center justify-between text-[12px] p-2 rounded bg-[#F8FAFC] dark:bg-[#0B1220]">
                    <div>
                      <div className="font-semibold">{dep.paymentMethod}</div>
                      <div className="text-[10px] text-[#64748B]">{dep.createdAt.split('T')[0]}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-[#16A34A] tabular-nums">+{formatCurrency(dep.amount)}</div>
                      <span className={`text-[10px] uppercase font-bold ${
                        dep.status === 'completed' ? 'text-[#16A34A]' : dep.status === 'pending' ? 'text-[#F59E0B]' : 'text-[#DC2626]'
                      }`}>{dep.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Shared History Section below form */}
      <SharedTransactionHistory transactions={transactions} title="Deposit & Cashflow History" />
    </div>
  );
};
