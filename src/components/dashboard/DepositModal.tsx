import React, { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { ledger, CryptoNetworkConfig } from '../../lib/ledger';
import { formatCurrency } from '../../lib/utils';
import { ButtonLoader } from '../common/ButtonLoader';
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
  UploadCloud
} from 'lucide-react';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onNavigateAdmin?: () => void;
  onNavigateTransactions?: () => void;
}

export const DepositModal: React.FC<DepositModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onNavigateAdmin,
  onNavigateTransactions
}) => {
  const { user, refreshUser, isAdmin } = useAuth();
  const paymentConfig = ledger.getPaymentConfig();

  const [method, setMethod] = useState<'sepa' | 'crypto'>('sepa');
  const [amount, setAmount] = useState<number>(5000);
  const [senderName, setSenderName] = useState<string>(user?.fullName || '');
  const [senderReference, setSenderReference] = useState<string>('');
  
  // Crypto selection
  const [cryptoToken, setCryptoToken] = useState<string>('USDT');
  const [cryptoNetwork, setCryptoNetwork] = useState<string>('Polygon POS');
  const [declaredTxHash, setDeclaredTxHash] = useState<string>('');

  // Receipt upload state
  const [receiptBase64, setReceiptBase64] = useState<string>('');
  const [receiptFileName, setReceiptFileName] = useState<string>('');
  const [receiptFileSize, setReceiptFileSize] = useState<number>(0);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Status states
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedTx, setSubmittedTx] = useState<any | null>(null);

  // Copy states
  const [copiedIban, setCopiedIban] = useState(false);
  const [copiedSwift, setCopiedSwift] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

  const handleReceiptFile = (file: File) => {
    if (file.size > 15 * 1024 * 1024) {
      setError('Receipt file size exceeds 15MB limit.');
      return;
    }
    setReceiptFileName(file.name);
    setReceiptFileSize(file.size);
    const reader = new FileReader();
    reader.onload = (e) => {
      setReceiptBase64(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen || !user) return null;

  // Unique reference for tracking wire transfers
  const uniqueDepositRef = `DEP-EUR-${Math.floor(100000 + Math.random() * 900000)}`;

  // Find active crypto networks from treasury config
  const enabledNetworks = paymentConfig.cryptoNetworks.filter(n => n.enabled);
  const availableTokens = Array.from(new Set(enabledNetworks.map(n => n.token)));
  const currentTokenNetworks = enabledNetworks.filter(n => n.token === cryptoToken);
  
  const selectedNetworkConfig = currentTokenNetworks.find(n => n.name === cryptoNetwork) || currentTokenNetworks[0] || {
    walletAddress: user.cryptoDepositAddress || paymentConfig.traditional.iban,
    network: 'Polygon',
    token: cryptoToken
  };

  const copyToClipboard = (text: string, setCopied: (v: boolean) => void) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (amount <= 0) {
      setError('Deposit amount must be greater than €0.00.');
      return;
    }

    setIsSubmitting(true);
    try {
      let paymentMethodTitle = '';
      let currency = 'EUR';
      let externalRef = senderReference.trim() || uniqueDepositRef;
      let metadata: Record<string, any> = {
        senderName: senderName || user.fullName,
        timestamp: new Date().toISOString()
      };

      if (method === 'sepa') {
        paymentMethodTitle = 'SEPA Bank Wire Transfer (CaixaBank Escrow)';
        currency = 'EUR';
        metadata.bank = paymentConfig.traditional.bankName;
        metadata.iban = paymentConfig.traditional.iban;
        metadata.depositRef = externalRef;
      } else {
        paymentMethodTitle = `Crypto Transfer - ${cryptoToken} (${selectedNetworkConfig.name || cryptoNetwork})`;
        currency = cryptoToken;
        metadata.network = selectedNetworkConfig.network || cryptoNetwork;
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

      refreshUser();
      setSubmittedTx(tx);
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Failed to submit deposit request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetModal = () => {
    setSubmittedTx(null);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl w-[92vw] sm:w-full max-w-[440px] max-h-[82vh] sm:max-h-[85vh] flex flex-col shadow-2xl border border-[#E3E8E3] relative my-auto overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* State A: Success Confirmation */}
        {submittedTx ? (
          <div className="p-3.5 sm:p-4 text-center space-y-3 animate-in zoom-in-95 duration-200 overflow-y-auto">
            {/* Close Button */}
            <div className="flex justify-end">
              <button
                onClick={resetModal}
                className="text-[#69736F] hover:text-[#18211F] p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="w-11 h-11 rounded-full bg-emerald-100 text-[#27845D] flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold mb-1">
                <Clock className="w-3 h-3" />
                <span>Status: Awaiting Admin Confirmation</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-[#18211F] tracking-tight">
                Deposit Request Submitted!
              </h3>
              <p className="text-[10px] text-[#69736F] mt-1 max-w-sm mx-auto leading-tight">
                Your deposit request has been registered in the platform treasury queue. Once our compliance team confirms receipt of the transfer, funds will be immediately credited to your wallet.
              </p>
            </div>

            {/* Transaction Receipt Card */}
            <div className="p-2.5 sm:p-3 rounded-xl bg-[#F6F7F4] border border-[#E3E8E3] text-left text-[11px] space-y-1.5">
              <div className="flex justify-between items-center pb-1.5 border-b border-[#E3E8E3]">
                <span className="text-[#69736F]">Deposit Reference:</span>
                <span className="font-mono font-bold text-[#18211F]">{submittedTx.reference}</span>
              </div>
              <div className="flex justify-between items-center pb-1.5 border-b border-[#E3E8E3]">
                <span className="text-[#69736F]">Amount:</span>
                <span className="font-black text-[#18211F]">{formatCurrency(submittedTx.amount)} {submittedTx.currency}</span>
              </div>
              <div className="flex justify-between items-center pb-1.5 border-b border-[#E3E8E3]">
                <span className="text-[#69736F]">Method:</span>
                <span className="font-semibold text-[#18211F] truncate max-w-[190px]">{submittedTx.paymentMethod}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#69736F]">Investor:</span>
                <span className="font-semibold text-[#18211F] truncate max-w-[190px]">{user.fullName} ({user.email})</span>
              </div>
            </div>

            {/* Quick Action */}
            <div className="pt-1.5">
              <button
                onClick={() => {
                  resetModal();
                  if (onNavigateTransactions) {
                    onNavigateTransactions();
                  }
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-[#182D2A] hover:bg-[#24423C] text-white font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-all shadow-xs"
              >
                <span>View in Ledger</span>
              </button>
            </div>
          </div>
        ) : (
          /* State B: Deposit Form with Sticky Header & Compact Scrollable Body */
          <>
            {/* Header */}
            <div className="flex items-start justify-between p-3.5 sm:p-4 pb-2.5 border-b border-[#F0F2EE] shrink-0 bg-white">
              <div className="space-y-0.5 pr-2">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-[#27845D] text-[9px] font-bold uppercase tracking-wider">
                  <ShieldCheck className="w-2.5 h-2.5" />
                  <span>Institutional Custody · 1:1 EUR Backed</span>
                </div>
                <h2 className="text-base sm:text-lg font-black text-[#18211F] tracking-tight">
                  Deposit Funds
                </h2>
                <p className="text-[11px] text-[#69736F] leading-tight">
                  Fund your liquidity account to purchase tokenized SPV notes.
                </p>
              </div>

              {/* Close Button */}
              <button
                onClick={resetModal}
                className="text-[#69736F] hover:text-[#18211F] p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer shrink-0 -mr-1"
                aria-label="Close deposit dialog"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="overflow-y-auto p-3.5 sm:p-4 space-y-3 text-left">
              {/* Method Tabs */}
              <div className="grid grid-cols-2 gap-1 p-0.5 bg-[#EEF1EC] rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setMethod('sepa')}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    method === 'sepa'
                      ? 'bg-white text-[#18211F] shadow-xs'
                      : 'text-[#69736F] hover:text-[#18211F]'
                  }`}
                >
                  <Building2 className="w-3 h-3 text-emerald-700" />
                  <span>Bank Wire (SEPA)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMethod('crypto')}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    method === 'crypto'
                      ? 'bg-white text-[#18211F] shadow-xs'
                      : 'text-[#69736F] hover:text-[#18211F]'
                  }`}
                >
                  <Coins className="w-3 h-3 text-amber-600" />
                  <span>Crypto Transfer</span>
                </button>
              </div>

              {/* Error Banner */}
              {error && (
                <div className="p-2.5 rounded-xl bg-red-50 text-red-800 text-[11px] font-bold border border-red-200 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleDepositSubmit} className="space-y-3">
                {/* Amount Selection */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-[#18211F]">
                    Deposit Amount (€ EUR)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#69736F]">€</span>
                    <input
                      type="number"
                      min="100"
                      step="50"
                      value={amount || ''}
                      onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                      placeholder="Enter amount..."
                      className="w-full pl-6 pr-3 py-1.5 rounded-lg border border-[#E3E8E3] focus:border-[#182D2A] focus:outline-none text-xs font-bold text-[#18211F]"
                      required
                    />
                  </div>

                  {/* Quick Amount Buttons */}
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {[1000, 2500, 5000, 10000, 25000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setAmount(preset)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all cursor-pointer ${
                          amount === preset
                            ? 'bg-[#182D2A] text-white border-[#182D2A]'
                            : 'bg-[#F6F7F4] text-[#69736F] border-[#E3E8E3] hover:text-[#18211F]'
                        }`}
                      >
                        {formatCurrency(preset)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* METHOD 1: SEPA BANK WIRE */}
                {method === 'sepa' && (
                  <div className="space-y-2">
                    <div className="p-2.5 sm:p-3 rounded-xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#18211F] text-[11px]">CaixaBank Institutional Account</span>
                        <span className="text-[9px] text-emerald-800 font-bold bg-emerald-100 px-1.5 py-0.5 rounded-full">
                          SEPA Direct
                        </span>
                      </div>

                      <div className="space-y-1.5 text-[10px] sm:text-[11px]">
                        <div className="flex justify-between items-center">
                          <span className="text-[#69736F]">Beneficiary:</span>
                          <span className="font-bold text-[#18211F] truncate max-w-[190px]">{paymentConfig.traditional.beneficiary}</span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-[#69736F]">Bank Name:</span>
                          <span className="font-bold text-[#18211F] truncate max-w-[190px]">{paymentConfig.traditional.bankName}</span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-[#69736F]">IBAN:</span>
                          <div className="flex items-center gap-1">
                            <span className="font-mono font-bold text-[#18211F] text-[10px]">{paymentConfig.traditional.iban}</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(paymentConfig.traditional.iban, setCopiedIban)}
                              className="p-1 rounded text-gray-500 hover:text-black cursor-pointer"
                              title="Copy IBAN"
                            >
                              {copiedIban ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-[#69736F]">BIC / SWIFT:</span>
                          <div className="flex items-center gap-1">
                            <span className="font-mono font-bold text-[#18211F] text-[10px]">{paymentConfig.traditional.bic}</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(paymentConfig.traditional.bic, setCopiedSwift)}
                              className="p-1 rounded text-gray-500 hover:text-black cursor-pointer"
                              title="Copy BIC"
                            >
                              {copiedSwift ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>

                        <div className="p-2 bg-amber-50 rounded-lg border border-amber-200 mt-1">
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="block text-[9px] uppercase font-bold text-amber-900 tracking-wider">
                                Payment Reference (Mandatory)
                              </span>
                              <span className="font-mono font-black text-amber-950 text-[11px]">{uniqueDepositRef}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(uniqueDepositRef, setCopiedRef)}
                              className="py-0.5 px-2 text-[9px] bg-white border border-amber-300 text-amber-950 font-bold rounded flex items-center gap-1 cursor-pointer shadow-2xs hover:bg-amber-100"
                            >
                              {copiedRef ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <Copy className="w-2.5 h-2.5" />}
                              {copiedRef ? 'Copied' : 'Copy'}
                            </button>
                          </div>
                          <p className="text-[9px] text-amber-800 mt-0.5">
                            Include this reference in your bank transfer note.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-[#69736F] mb-0.5">
                        Bank Wire Note / Transaction Reference (Optional)
                      </label>
                      <input
                        type="text"
                        value={senderReference}
                        onChange={(e) => setSenderReference(e.target.value)}
                        placeholder={`e.g. ${uniqueDepositRef} or CaixaBank Wire Ref`}
                        className="w-full px-3 py-1.5 rounded-lg border border-[#E3E8E3] text-xs focus:outline-none focus:border-[#182D2A]"
                      />
                    </div>
                  </div>
                )}

                {/* METHOD 2: CRYPTO TREASURY */}
                {method === 'crypto' && (
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-[#69736F] mb-0.5">Asset</label>
                        <select
                          value={cryptoToken}
                          onChange={(e) => {
                            const t = e.target.value;
                            setCryptoToken(t);
                            const matching = enabledNetworks.filter(n => n.token === t);
                            if (matching[0]) setCryptoNetwork(matching[0].name);
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-[#E3E8E3] text-xs font-bold focus:outline-none focus:border-[#182D2A]"
                        >
                          {availableTokens.map((t) => (
                            <option key={t} value={t}>{t} (Treasury)</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-[#69736F] mb-0.5">Network</label>
                        <select
                          value={cryptoNetwork}
                          onChange={(e) => setCryptoNetwork(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-[#E3E8E3] text-xs font-bold focus:outline-none focus:border-[#182D2A]"
                        >
                          {currentTokenNetworks.map((net) => (
                            <option key={net.id} value={net.name}>
                              {net.name} ({net.network})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#18211F] text-[11px]">Dedicated Treasury Address</span>
                        <span className="text-[9px] text-emerald-800 font-bold bg-emerald-100 px-1.5 py-0.5 rounded-full">
                          {selectedNetworkConfig.network || cryptoNetwork}
                        </span>
                      </div>

                      <div className="p-2 bg-white rounded-lg border border-[#E3E8E3] flex items-center justify-between gap-1.5">
                        <span className="font-mono text-[10px] font-bold text-[#18211F] break-all select-all leading-tight">
                          {selectedNetworkConfig.walletAddress}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(selectedNetworkConfig.walletAddress, setCopiedAddress)}
                          className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer shrink-0"
                          title="Copy Wallet Address"
                        >
                          {copiedAddress ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>

                      <p className="text-[9px] text-[#828D89] leading-tight">
                        Send only {cryptoToken} on {selectedNetworkConfig.name || cryptoNetwork} to this address. Cross-chain errors may result in permanent capital loss.
                      </p>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-[#69736F] mb-0.5">
                        Blockchain Tx Hash / ID (Optional)
                      </label>
                      <input
                        type="text"
                        value={declaredTxHash}
                        onChange={(e) => setDeclaredTxHash(e.target.value)}
                        placeholder="0x... or transfer identifier"
                        className="w-full px-3 py-1.5 rounded-lg border border-[#E3E8E3] text-xs font-mono focus:outline-none focus:border-[#182D2A]"
                      />
                    </div>
                  </div>
                )}



                {/* Receipt / Transfer Slip Upload */}
                <div className="p-2.5 rounded-xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#18211F] text-[11px] flex items-center gap-1">
                      <UploadCloud className="w-3.5 h-3.5 text-[#27845D]" />
                      <span>Attach Payment Slip (Optional)</span>
                    </span>
                    <span className="text-[9px] text-[#69736F]">JPG, PNG, PDF</span>
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
                    <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-emerald-300">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="font-semibold text-[#18211F] text-[11px] truncate max-w-[200px]">{receiptFileName}</span>
                        <span className="text-[9px] text-gray-500 shrink-0">({(receiptFileSize / 1024).toFixed(0)} KB)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setReceiptBase64('');
                          setReceiptFileName('');
                          setReceiptFileSize(0);
                        }}
                        className="text-[10px] font-bold text-red-600 hover:underline cursor-pointer ml-2"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-1.5 px-2.5 rounded-lg border border-dashed border-[#CBD5E1] bg-white hover:bg-slate-50 text-[#69736F] hover:text-[#18211F] text-[10px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <UploadCloud className="w-3 h-3 text-[#27845D]" />
                      <span>Upload Wire Transfer Confirmation Slip</span>
                    </button>
                  )}
                  <p className="text-[9px] text-[#828D89] leading-tight">
                    Uploading your bank receipt accelerates admin approval and credit to your account.
                  </p>
                </div>

                {/* Submit Button */}
                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={isSubmitting || amount <= 0}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#182D2A] hover:bg-[#24423C] text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <ButtonLoader text="Processing Deposit..." />
                    ) : (
                      <>
                        <ArrowDownLeft className="w-3.5 h-3.5 text-[#B7E36A]" />
                        <span>Submit Deposit (€{amount.toLocaleString()})</span>
                      </>
                    )}
                  </button>
                  <p className="text-[9px] text-center text-[#828D89] mt-1.5 leading-tight">
                    Deposits are held in CaixaBank segregated client accounts in compliance with EU MiCA & CNMV.
                  </p>
                </div>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
