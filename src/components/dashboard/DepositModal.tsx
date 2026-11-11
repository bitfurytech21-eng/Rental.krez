import React, { useState, useRef, useMemo } from 'react';
import { useAuth } from '../../lib/auth';
import { ledger } from '../../lib/ledger';
import { formatCurrency } from '../../lib/utils';
import { ButtonLoader } from '../common/ButtonLoader';
import { printTransactionReceipt } from '../../lib/printService';
import { AnimatedBankingTransferGraphic } from '../visuals/AnimatedBankingTransferGraphic';
import {
  ArrowDownLeft,
  CheckCircle2,
  Building2,
  Coins,
  Copy,
  Check,
  ShieldCheck,
  AlertCircle,
  Clock,
  UploadCloud,
  Printer,
  ChevronRight,
  ChevronLeft,
  Info
} from 'lucide-react';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onNavigateAdmin?: () => void;
  onNavigateTransactions?: () => void;
}

export type DepositStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const DepositModal: React.FC<DepositModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onNavigateTransactions
}) => {
  const { user, refreshUser } = useAuth();
  const paymentConfig = ledger.getPaymentConfig();

  // Step state (1 to 7)
  const [step, setStep] = useState<DepositStep>(1);

  // Form State preserved across steps
  const [method, setMethod] = useState<'sepa' | 'crypto'>('sepa');
  const [amount, setAmount] = useState<number>(5000);
  const [senderName] = useState<string>(user?.fullName || '');
  const [senderReference, setSenderReference] = useState<string>('');
  
  // Crypto payment option is streamlined strictly to USDC (BEP20) on BNB Smart Chain
  const cryptoToken = 'USDC';
  const cryptoNetwork = 'BNB Smart Chain (BEP20)';
  const [declaredTxHash, setDeclaredTxHash] = useState<string>('');

  // Receipt upload state
  const [receiptBase64, setReceiptBase64] = useState<string>('');
  const [receiptFileName, setReceiptFileName] = useState<string>('');
  const [receiptFileSize, setReceiptFileSize] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Status & submission states
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedTx, setSubmittedTx] = useState<any | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  // Copy feedback state
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Unique reference for tracking wire transfers (Stable for current session)
  const uniqueDepositRef = useMemo(() => {
    return `DEP-EUR-${Math.floor(100000 + Math.random() * 900000)}`;
  }, []);

  if (!isOpen || !user) return null;

  // Single canonical USDC (BEP20) configuration from payment config
  const selectedNetworkConfig = paymentConfig.cryptoNetworks.find(n => n.token === 'USDC' && n.name.includes('BEP20')) || paymentConfig.cryptoNetworks[0] || {
    id: 'net-usdc-bep20',
    name: 'BNB Smart Chain (BEP20)',
    token: 'USDC',
    network: 'BNB Smart Chain (BEP20)',
    walletAddress: user.cryptoDepositAddress || '0x8336A3f49125bAD02101B405699ac87e40D473BB',
    contractEnd: '8ac76a',
    contractAddress: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
    enabled: true
  };

  // Currency unit label based on payment method
  const currencySymbol = method === 'sepa' ? '€' : cryptoToken;

  const copyToClipboard = (text: string, fieldName: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const handleReceiptFile = (file: File) => {
    if (file.size > 15 * 1024 * 1024) {
      setError('Receipt file size exceeds 15MB limit.');
      return;
    }
    setError(null);
    setReceiptFileName(file.name);
    setReceiptFileSize(file.size);
    const reader = new FileReader();
    reader.onload = (e) => {
      setReceiptBase64(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Step 5 Submit: Submit deposit details to ledger (Creates Pending transaction)
  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (amount < 100 || amount > 1000000) {
      setError('Deposit amount must be between 100 and 1,000,000.');
      return;
    }

    setIsSubmitting(true);
    try {
      let paymentMethodTitle = '';
      let currency = method === 'sepa' ? 'EUR' : cryptoToken;
      let externalRef = senderReference.trim() || uniqueDepositRef;
      let metadata: Record<string, any> = {
        senderName: senderName || user.fullName,
        timestamp: new Date().toISOString()
      };

      if (method === 'sepa') {
        paymentMethodTitle = `SEPA Bank Wire Transfer (${paymentConfig.traditional.bankName} Escrow)`;
        metadata.bank = paymentConfig.traditional.bankName;
        metadata.iban = paymentConfig.traditional.iban;
        metadata.depositRef = externalRef;
      } else {
        paymentMethodTitle = 'Crypto Transfer - USDC (BEP20)';
        metadata.network = 'BNB Smart Chain (BEP20)';
        metadata.token = 'USDC';
        metadata.treasuryAddress = selectedNetworkConfig.walletAddress;
        metadata.declaredTxHash = declaredTxHash.trim() || undefined;
      }

      if (receiptBase64) {
        metadata.receiptUrl = receiptBase64;
        metadata.receiptFile = receiptBase64;
        metadata.receiptFileName = receiptFileName || 'deposit_receipt.pdf';
        metadata.receiptFileSize = receiptFileSize;
        metadata.notes = `Attached payment receipt: ${receiptFileName}`;
      }

      const tx = await ledger.processDeposit(
        user.id,
        amount,
        currency,
        paymentMethodTitle,
        externalRef,
        metadata
      );

      setSubmittedTx(tx);
      // Advance to Step 6 (Verification)
      setStep(6);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit deposit request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 6 Verification Approval: Execute actual verification clearance and credit account balance
  const handleCompleteVerification = async () => {
    if (!submittedTx) return;
    setIsVerifying(true);
    setError(null);
    try {
      const updatedTx = await ledger.reviewDeposit(submittedTx.id, true);
      setSubmittedTx(updatedTx || { ...submittedTx, status: 'completed' });
      refreshUser();
      onSuccess();
      // Advance to Step 7 (Completion)
      setStep(7);
    } catch (err: any) {
      setError(err?.message || 'Failed to verify deposit.');
    } finally {
      setIsVerifying(false);
    }
  };

  const resetModal = () => {
    setStep(1);
    setSubmittedTx(null);
    setError(null);
    setReceiptBase64('');
    setReceiptFileName('');
    setSenderReference('');
    setDeclaredTxHash('');
    onClose();
  };

  // QR code URL generator for crypto address
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(selectedNetworkConfig.walletAddress)}&color=ffffff&bgcolor=151515`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-[#090A0A] rounded-[22px] w-full max-w-[620px] max-h-[90vh] flex flex-col shadow-2xl border border-[#303030] relative overflow-hidden animate-in zoom-in-95 duration-150 text-[#F5F5F2]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="p-3 sm:p-4 pb-2.5 border-b border-[#303030] shrink-0 bg-[#141515]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#202020] border border-[#303030] text-[#55BDE8] flex items-center justify-center">
                <ArrowDownLeft className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-[#F5F5F2] tracking-tight leading-none">
                  Deposit Funds Wizard
                </h2>
                <span className="text-[11px] text-[#A5A6A5]">Step {step} of 7</span>
              </div>
            </div>

            <button
              onClick={resetModal}
              className="text-[#A5A6A5] hover:text-[#F5F5F2] p-1 rounded-lg hover:bg-[#202020] transition-colors cursor-pointer shrink-0"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* 7-Step Compact Progress Indicator Ribbon */}
          <div className="grid grid-cols-7 gap-1 pt-1">
            {[
              { num: 1, label: 'Method' },
              { num: 2, label: 'Amount' },
              { num: 3, label: 'Details' },
              { num: 4, label: 'Transfer' },
              { num: 5, label: 'Submit' },
              { num: 6, label: 'Verify' },
              { num: 7, label: 'Done' }
            ].map((s) => {
              const isActive = step === s.num;
              const isPassed = step > s.num;

              return (
                <div key={s.num} className="flex flex-col items-center gap-0.5">
                  <div className={`h-1.5 w-full rounded-full transition-all duration-300 ${
                    isPassed
                      ? 'bg-[#43C98B]'
                      : isActive
                      ? 'bg-[#55BDE8]'
                      : 'bg-[#303030]'
                  }`} />
                  <span className={`text-[12px] font-semibold truncate ${
                    isActive ? 'text-[#55BDE8]' : isPassed ? 'text-[#43C98B]' : 'text-[#777979]'
                  }`}>
                    {s.num}. {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-4 text-left flex-1 bg-[#090A0A]">
          {/* Error Banner */}
          {error && (
            <div className="p-3 rounded-xl bg-[#141515] text-[#E47E80] text-xs font-semibold border border-[#E47E80]/30 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#E47E80] shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: PAYMENT METHOD */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <h3 className="text-sm font-bold text-[#F5F5F2]">1. Select Payment Method</h3>
              <AnimatedBankingTransferGraphic type="deposit" amount={amount} currency="EUR" className="my-3" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* SEPA Card */}
                <div
                  onClick={() => setMethod('sepa')}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer space-y-3 ${
                    method === 'sepa'
                      ? 'bg-[#141515] border-[#55BDE8] shadow-lg'
                      : 'bg-[#141515] border-[#303030] hover:border-[#404040]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-[#202020] border border-[#303030] text-[#55BDE8] flex items-center justify-center">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      method === 'sepa' ? 'border-[#55BDE8] bg-[#55BDE8]' : 'border-[#777979]'
                    }`}>
                      {method === 'sepa' && <span className="w-1.5 h-1.5 rounded-full bg-[#090A0A]" />}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#F5F5F2]">Bank Wire (SEPA)</h4>
                    <p className="text-xs text-[#A5A6A5] mt-0.5">{paymentConfig.traditional.bankName} Institutional Escrow</p>
                  </div>
                </div>

                {/* Crypto Card */}
                <div
                  onClick={() => setMethod('crypto')}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer space-y-3 ${
                    method === 'crypto'
                      ? 'bg-[#141515] border-[#55BDE8] shadow-lg'
                      : 'bg-[#141515] border-[#303030] hover:border-[#404040]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-[#202020] border border-[#303030] text-[#43C98B] flex items-center justify-center">
                      <Coins className="w-4 h-4" />
                    </div>
                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      method === 'crypto' ? 'border-[#55BDE8] bg-[#55BDE8]' : 'border-[#777979]'
                    }`}>
                      {method === 'crypto' && <span className="w-1.5 h-1.5 rounded-full bg-[#090A0A]" />}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#F5F5F2]">USDC (BEP20) Transfer</h4>
                    <p className="text-xs text-[#A5A6A5] mt-0.5">BNB Smart Chain Instant Settlement</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="h-[48px] bg-[#F5F5F2] hover:bg-[#E2E2DF] text-[#090A0A] text-xs font-bold px-6 rounded-[14px] flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-[0.98]"
                >
                  <span>Continue</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: DEPOSIT AMOUNT */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <h3 className="text-sm font-bold text-[#F5F5F2]">2. Deposit Amount</h3>

              <div className="space-y-3.5">
                {/* Amount Input with Currency Separator */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#A5A6A5]">
                    Amount ({currencySymbol})
                  </label>
                  <div className="relative flex items-center bg-[#202020] border border-[#303030] rounded-xl overflow-hidden focus-within:border-[#55BDE8] transition-all h-[60px] sm:h-[68px]">
                    <div className="px-4 text-xl sm:text-2xl font-bold font-mono text-[#A5A6A5] bg-[#141515] h-full flex items-center border-r border-[#303030] select-none shrink-0">
                      {currencySymbol}
                    </div>
                    <input
                      type="number"
                      min="100"
                      max="1000000"
                      step="50"
                      value={amount || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || (!val.startsWith('-') && !val.startsWith('+'))) {
                          setAmount(parseFloat(val) || 0);
                        }
                      }}
                      placeholder="0.00"
                      className="w-full h-full bg-transparent px-4 text-2xl sm:text-[32px] font-bold font-mono tabular-nums text-[#F5F5F2] focus:outline-none placeholder:text-[#777979]"
                    />
                  </div>
                </div>

                {/* Quick Amount Selection Grid */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-[#777979] block">Suggested Amounts</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[500, 1000, 5000, 10000, 25000].map((preset) => {
                      const isSelected = amount === preset;
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setAmount(preset)}
                          className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer font-mono tabular-nums flex items-center justify-center ${
                            isSelected
                              ? 'bg-[#F5F5F2] text-[#090A0A] border-[#F5F5F2] shadow-md scale-[1.02]'
                              : 'bg-[#141515] text-[#A5A6A5] border-[#303030] hover:text-[#F5F5F2] hover:border-[#404040]'
                          }`}
                        >
                          {currencySymbol === '€' ? formatCurrency(preset) : `${preset.toLocaleString()} ${currencySymbol}`}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Compact Limits Panel */}
                <div className="p-3 rounded-xl bg-[#141515] border border-[#303030] grid grid-cols-2 gap-2 text-xs">
                  <div className="flex flex-col">
                    <span className="text-[11px] text-[#777979]">Minimum Deposit</span>
                    <span className="font-mono font-bold text-[#F5F5F2] text-sm mt-0.5">
                      {currencySymbol === '€' ? '€100.00' : `100 ${currencySymbol}`}
                    </span>
                  </div>
                  <div className="flex flex-col border-l border-[#303030] pl-3">
                    <span className="text-[11px] text-[#777979]">Maximum Deposit</span>
                    <span className="font-mono font-bold text-[#F5F5F2] text-sm mt-0.5">
                      {currencySymbol === '€' ? '€1,000,000.00' : `1,000,000 ${currencySymbol}`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="h-[48px] sm:h-[50px] bg-[#141515] hover:bg-[#1D1E1E] text-[#F5F5F2] border border-[#303030] text-xs font-bold px-5 rounded-[14px] flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  disabled={amount < 100 || amount > 1000000}
                  onClick={() => setStep(3)}
                  className="h-[48px] sm:h-[50px] bg-[#F5F5F2] hover:bg-[#E2E2DF] text-[#090A0A] text-xs font-bold px-6 rounded-[14px] flex items-center gap-1.5 cursor-pointer shadow-md transition-all disabled:opacity-50"
                >
                  <span>Continue</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PAYMENT INSTRUCTIONS */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <h3 className="text-sm font-bold text-[#F5F5F2]">3. Payment Instructions</h3>

              {method === 'sepa' ? (
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-[#141515] border border-[#303030] space-y-3 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-[#303030]">
                      <span className="font-bold text-[#F5F5F2]">{paymentConfig.traditional.bankName} Escrow Account</span>
                      <span className="text-[10px] font-semibold text-[#55BDE8] bg-[#55BDE8]/10 border border-[#55BDE8]/20 px-2 py-0.5 rounded-full">
                        SEPA Direct Wire
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-[#777979]">Beneficiary Name:</span>
                        <span className="font-semibold text-[#F5F5F2]">{paymentConfig.traditional.beneficiary}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-[#777979]">Bank / Payment Provider:</span>
                        <span className="font-semibold text-[#F5F5F2]">{paymentConfig.traditional.bankName}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-[#777979]">IBAN:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-[#F5F5F2]">{paymentConfig.traditional.iban}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(paymentConfig.traditional.iban, 'iban')}
                            className="p-1 rounded bg-[#202020] border border-[#303030] text-[#A5A6A5] hover:text-[#F5F5F2] cursor-pointer"
                          >
                            {copiedField === 'iban' ? <Check className="w-3 h-3 text-[#43C98B]" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-[#777979]">BIC / SWIFT:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-[#F5F5F2]">{paymentConfig.traditional.bic}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(paymentConfig.traditional.bic, 'bic')}
                            className="p-1 rounded bg-[#202020] border border-[#303030] text-[#A5A6A5] hover:text-[#F5F5F2] cursor-pointer"
                          >
                            {copiedField === 'bic' ? <Check className="w-3 h-3 text-[#43C98B]" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>

                      {paymentConfig.traditional.address && (
                        <div className="flex justify-between items-center">
                          <span className="text-[#777979]">Provider Address:</span>
                          <span className="font-semibold text-[#F5F5F2] text-right max-w-[65%]">{paymentConfig.traditional.address}</span>
                        </div>
                      )}

                      {paymentConfig.traditional.country && (
                        <div className="flex justify-between items-center">
                          <span className="text-[#777979]">Country:</span>
                          <span className="font-semibold text-[#F5F5F2]">{paymentConfig.traditional.country}</span>
                        </div>
                      )}
                    </div>

                    <div className="p-3 bg-[#090A0A] rounded-xl border border-[#E7B96D]/40 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] uppercase font-bold text-[#E7B96D] tracking-wider">
                          Mandatory Payment Reference
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(uniqueDepositRef, 'ref')}
                          className="py-0.5 px-2 text-[10px] bg-[#141515] border border-[#303030] text-[#F5F5F2] font-bold rounded flex items-center gap-1 cursor-pointer hover:bg-[#202020]"
                        >
                          {copiedField === 'ref' ? <Check className="w-3 h-3 text-[#43C98B]" /> : <Copy className="w-3 h-3" />}
                          {copiedField === 'ref' ? 'Copied' : 'Copy Reference'}
                        </button>
                      </div>
                      <span className="font-mono font-black text-white text-sm block">{uniqueDepositRef}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Single Designated Option Banner */}
                  <div className="p-4 rounded-2xl bg-[#141515] border border-[#303030] space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[#303030]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#202020] border border-[#303030] text-[#43C98B] flex items-center justify-center font-bold text-xs">
                          $
                        </div>
                        <div>
                          <span className="font-bold text-[#F5F5F2] text-sm block">USDC (BEP20)</span>
                          <span className="text-[10px] text-[#A5A6A5]">BNB Smart Chain Network</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-[#43C98B] bg-[#43C98B]/10 border border-[#43C98B]/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        BEP20 Mainnet
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-[#777979]">Supported Token:</span>
                        <span className="font-semibold text-[#F5F5F2]">USD Coin (USDC)</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#777979]">Settlement Network:</span>
                        <span className="font-semibold text-[#55BDE8]">BNB Smart Chain (BEP20)</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#777979]">Contract Address:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] text-[#A5A6A5]">0x8ac76a...580d</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard('0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d', 'contract')}
                            className="p-1 rounded bg-[#202020] border border-[#303030] text-[#A5A6A5] hover:text-[#F5F5F2] cursor-pointer"
                            title="Copy Contract Address"
                          >
                            {copiedField === 'contract' ? <Check className="w-3 h-3 text-[#43C98B]" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#141515] border border-[#303030] space-y-3">
                    <div className="flex items-start gap-4">
                      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-[#090A0A] border border-[#303030] p-1.5 shrink-0 overflow-hidden">
                        <img src={qrCodeUrl} alt="Deposit QR Code" className="w-full h-full object-contain rounded-lg" />
                      </div>

                      <div className="flex-1 space-y-2 text-xs">
                        <span className="font-bold text-[#F5F5F2] block">Verified BEP20 Treasury Address</span>
                        <div className="p-2 bg-[#090A0A] rounded-xl border border-[#303030] flex items-center justify-between gap-1">
                          <span className="font-mono text-[10px] text-[#F5F5F2] font-bold break-all select-all">
                            {selectedNetworkConfig.walletAddress}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(selectedNetworkConfig.walletAddress, 'wallet')}
                            className="p-1.5 rounded bg-[#141515] hover:bg-[#202020] text-[#F5F5F2] cursor-pointer shrink-0"
                            title="Copy Address"
                          >
                            {copiedField === 'wallet' ? <Check className="w-3.5 h-3.5 text-[#43C98B]" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <p className="text-[10px] text-[#E7B96D] leading-tight">
                          Transfer only <strong>USDC</strong> via <strong>BNB Smart Chain (BEP20)</strong>. Tokens transferred via other networks cannot be recovered.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="h-[48px] sm:h-[50px] bg-[#141515] hover:bg-[#1D1E1E] text-[#F5F5F2] border border-[#303030] text-xs font-bold px-5 rounded-[14px] flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="h-[48px] sm:h-[50px] bg-[#F5F5F2] hover:bg-[#E2E2DF] text-[#090A0A] text-xs font-bold px-6 rounded-[14px] flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
                >
                  <span>Continue</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: PAYMENT ACTION & GUIDANCE */}
          {step === 4 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <h3 className="text-sm font-bold text-[#F5F5F2]">4. Transfer Action</h3>

              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-[#141515] border border-[#303030] space-y-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#55BDE8]/10 text-[#55BDE8] border border-[#55BDE8]/20 flex items-center justify-center font-bold text-xs">
                      1
                    </div>
                    <div>
                      <h4 className="font-bold text-[#F5F5F2]">Open External Application</h4>
                      <p className="text-[11px] text-[#A5A6A5]">Log into your mobile banking or wallet app.</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#55BDE8]/10 text-[#55BDE8] border border-[#55BDE8]/20 flex items-center justify-center font-bold text-xs">
                      2
                    </div>
                    <div>
                      <h4 className="font-bold text-[#F5F5F2]">Initiate Transfer</h4>
                      <p className="text-[11px] text-[#A5A6A5]">
                        Send exact amount: <strong className="text-[#F5F5F2] font-mono">{currencySymbol === '€' ? formatCurrency(amount) : `${amount.toLocaleString()} ${currencySymbol}`}</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#55BDE8]/10 text-[#55BDE8] border border-[#55BDE8]/20 flex items-center justify-center font-bold text-xs">
                      3
                    </div>
                    <div>
                      <h4 className="font-bold text-[#F5F5F2]">Include Reference Concept</h4>
                      <p className="text-[11px] text-[#A5A6A5]">
                        Include <strong className="text-[#E7B96D] font-mono">{uniqueDepositRef}</strong> in the transfer note.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#141515] border border-[#303030] space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#E7B96D]">
                    <Info className="w-4 h-4 text-[#E7B96D]" />
                    <span>Security Notice</span>
                  </div>
                  <p className="text-xs text-[#A5A6A5] leading-relaxed">
                    Wallet balance updates automatically after platform verification in Step 6.
                  </p>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="h-[48px] sm:h-[50px] bg-[#141515] hover:bg-[#1D1E1E] text-[#F5F5F2] border border-[#303030] text-xs font-bold px-5 rounded-[14px] flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStep(5)}
                  className="h-[48px] sm:h-[50px] bg-[#F5F5F2] hover:bg-[#E2E2DF] text-[#090A0A] text-xs font-bold px-6 rounded-[14px] flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
                >
                  <span>Proceed to Submission</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: PAYMENT SUBMISSION & PROOF */}
          {step === 5 && (
            <form onSubmit={handleDepositSubmit} className="space-y-4 animate-in fade-in duration-200">
              <h3 className="text-sm font-bold text-[#F5F5F2]">5. Submission &amp; Proof</h3>

              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-[#141515] border border-[#303030] space-y-2 text-xs">
                  <div className="flex justify-between items-center pb-1.5 border-b border-[#303030]">
                    <span className="text-[#777979]">Method:</span>
                    <span className="font-bold text-[#F5F5F2]">{method === 'sepa' ? `SEPA Bank Wire (${paymentConfig.traditional.bankName} Escrow)` : 'USDC (BEP20) Transfer'}</span>
                  </div>
                  <div className="flex justify-between items-center pb-1.5 border-b border-[#303030]">
                    <span className="text-[#777979]">Deposit Amount:</span>
                    <span className="font-bold font-mono text-[#F5F5F2] text-sm">
                      {currencySymbol === '€' ? formatCurrency(amount) : `${amount.toLocaleString()} ${currencySymbol}`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#777979]">Mandatory Reference:</span>
                    <span className="font-bold font-mono text-[#E7B96D]">{uniqueDepositRef}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[#A5A6A5]">
                    {method === 'sepa' ? 'Bank Transfer Reference / Wire Note' : 'BscScan Transaction Hash (TxID / TxHash)'}
                  </label>
                  <input
                    type="text"
                    value={method === 'sepa' ? senderReference : declaredTxHash}
                    onChange={(e) => {
                      if (method === 'sepa') setSenderReference(e.target.value);
                      else setDeclaredTxHash(e.target.value);
                    }}
                    placeholder={method === 'sepa' ? `e.g. ${uniqueDepositRef}` : '0x... (BNB Smart Chain TxHash)'}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#202020] border border-[#303030] text-xs font-mono text-[#F5F5F2] placeholder:text-[#777979] focus:outline-none focus:border-[#55BDE8]"
                  />
                </div>

                <div className="p-3.5 rounded-2xl bg-[#141515] border border-[#303030] space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#F5F5F2] flex items-center gap-1.5">
                      <UploadCloud className="w-4 h-4 text-[#55BDE8]" />
                      <span>Attach Transfer Receipt (Optional)</span>
                    </span>
                    <span className="text-[10px] text-[#777979]">PDF, JPG, PNG</span>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleReceiptFile(e.target.files[0]);
                      }
                    }}
                  />

                  {receiptFileName ? (
                    <div className="flex items-center justify-between p-2.5 bg-[#202020] rounded-xl border border-[#303030]">
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckCircle2 className="w-4 h-4 text-[#43C98B] shrink-0" />
                        <span className="font-semibold text-[#F5F5F2] text-xs truncate max-w-[220px]">{receiptFileName}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setReceiptBase64('');
                          setReceiptFileName('');
                          setReceiptFileSize(0);
                        }}
                        className="text-xs font-bold text-[#E47E80] hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-2 px-3 rounded-xl border border-dashed border-[#303030] bg-[#202020] hover:bg-[#252525] text-[#A5A6A5] hover:text-[#F5F5F2] text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <UploadCloud className="w-4 h-4 text-[#55BDE8]" />
                      <span>Upload Receipt Slip</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="pt-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="h-[48px] sm:h-[50px] bg-[#141515] hover:bg-[#1D1E1E] text-[#F5F5F2] border border-[#303030] text-xs font-bold px-5 rounded-[14px] flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-[48px] sm:h-[50px] bg-[#F5F5F2] hover:bg-[#E2E2DF] text-[#090A0A] text-xs font-bold px-6 rounded-[14px] flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <ButtonLoader text="Submitting..." />
                  ) : (
                    <>
                      <span>Submit Payment</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 6: VERIFICATION STAGE */}
          {step === 6 && submittedTx && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <h3 className="text-sm font-bold text-[#F5F5F2]">6. Transaction Verification</h3>

              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-[#141515] border border-[#303030] space-y-3 text-xs">
                  {/* Stage 1: Awaiting Payment */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#E7B96D]/15 text-[#E7B96D] border border-[#E7B96D]/30 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <h4 className="font-bold text-[#F5F5F2]">Awaiting Payment</h4>
                        <span className="text-[10px] text-[#43C98B] font-bold">Completed</span>
                      </div>
                    </div>
                  </div>

                  {/* Stage 2: Payment Detected */}
                  <div className="flex items-center gap-3 pt-2 border-t border-[#303030]">
                    <div className="w-8 h-8 rounded-full bg-[#55BDE8]/15 text-[#55BDE8] border border-[#55BDE8]/30 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <h4 className="font-bold text-[#F5F5F2]">Payment Detected</h4>
                        <span className="text-[10px] text-[#55BDE8] font-bold">Active</span>
                      </div>
                    </div>
                  </div>

                  {/* Stage 3: Under Verification */}
                  <div className="flex items-center gap-3 pt-2 border-t border-[#303030]">
                    <div className="w-8 h-8 rounded-full bg-[#E7B96D]/15 text-[#E7B96D] border border-[#E7B96D]/30 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <h4 className="font-bold text-[#F5F5F2]">Under Verification</h4>
                        <span className="text-[10px] text-[#E7B96D] font-bold">In Progress</span>
                      </div>
                    </div>
                  </div>

                  {/* Stage 4: Verified */}
                  <div className="flex items-center gap-3 pt-2 border-t border-[#303030]">
                    <div className="w-8 h-8 rounded-full bg-[#202020] text-[#777979] flex items-center justify-center shrink-0">
                      <Check className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <h4 className="font-bold text-[#777979]">Verified &amp; Credited</h4>
                        <span className="text-[10px] text-[#777979]">Pending</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#141515] border border-[#303030] space-y-3">
                  <button
                    type="button"
                    disabled={isVerifying}
                    onClick={handleCompleteVerification}
                    className="w-full py-3 px-4 rounded-xl bg-[#43C98B] hover:bg-[#3bb87f] text-[#090A0A] font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all"
                  >
                    {isVerifying ? (
                      <ButtonLoader text="Verifying Transfer..." />
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 text-[#090A0A]" />
                        <span>Verify &amp; Credit Wallet ({currencySymbol === '€' ? formatCurrency(submittedTx.amount) : `${submittedTx.amount} ${submittedTx.currency}`})</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 7: COMPLETION & RECEIPT */}
          {step === 7 && submittedTx && (
            <div className="space-y-4 animate-in zoom-in-95 duration-200">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-[#43C98B]/15 border border-[#43C98B]/30 text-[#43C98B] flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-[#F5F5F2]">
                  7. Deposit Verified &amp; Credited
                </h3>
                <p className="text-xs text-[#A5A6A5] max-w-sm mx-auto leading-relaxed">
                  Funds added to wallet balance successfully.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#141515] border border-[#303030] text-xs space-y-2">
                <div className="flex justify-between items-center pb-2 border-b border-[#303030]">
                  <span className="text-[#777979]">Transaction ID:</span>
                  <span className="font-mono font-bold text-[#F5F5F2]">{submittedTx.id}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-[#303030]">
                  <span className="text-[#777979]">Deposit Reference:</span>
                  <span className="font-mono font-bold text-[#43C98B]">{submittedTx.reference}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-[#303030]">
                  <span className="text-[#777979]">Credit Amount:</span>
                  <span className="font-mono font-bold text-[#F5F5F2] text-sm">
                    {currencySymbol === '€' ? formatCurrency(submittedTx.amount) : `${submittedTx.amount} ${submittedTx.currency}`}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#777979]">Status:</span>
                  <span className="font-bold text-[#43C98B] bg-[#43C98B]/10 px-2 py-0.5 rounded text-[10px]">Verified &amp; Settled</span>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    printTransactionReceipt({
                      receiptId: submittedTx.reference || submittedTx.id,
                      transactionHash: submittedTx.txHash || `0x${submittedTx.id.replace(/-/g, '').slice(0, 32)}`,
                      date: new Date().toLocaleDateString('en-US'),
                      userName: user.fullName,
                      userEmail: user.email,
                      propertyTitle: `Deposit via ${submittedTx.paymentMethod}`,
                      tokensPurchased: 1,
                      tokenPrice: submittedTx.amount,
                      totalPaid: submittedTx.amount,
                      paymentMethod: submittedTx.paymentMethod,
                      status: 'Completed'
                    });
                  }}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#141515] hover:bg-[#1D1E1E] border border-[#303030] text-[#F5F5F2] font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Printer className="w-4 h-4 text-[#55BDE8]" />
                  <span>Print Receipt</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    resetModal();
                    if (onNavigateTransactions) onNavigateTransactions();
                  }}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#F5F5F2] hover:bg-[#E2E2DF] text-[#090A0A] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-md"
                >
                  <span>View in Ledger</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
