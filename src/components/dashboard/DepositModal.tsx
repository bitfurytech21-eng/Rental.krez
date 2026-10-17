import React, { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { ledger, CryptoNetworkConfig } from '../../lib/ledger';
import { formatCurrency } from '../../lib/utils';
import {
  ArrowDownLeft,
  CheckCircle2,
  Building2,
  Coins,
  Copy,
  Check,
  CreditCard,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  QrCode,
  Sparkles,
  ArrowRight,
  Shield,
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

  const [method, setMethod] = useState<'sepa' | 'crypto' | 'instant'>('sepa');
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
      } else if (method === 'crypto') {
        paymentMethodTitle = `Crypto Transfer - ${cryptoToken} (${selectedNetworkConfig.name || cryptoNetwork})`;
        currency = cryptoToken;
        metadata.network = selectedNetworkConfig.network || cryptoNetwork;
        metadata.treasuryAddress = selectedNetworkConfig.walletAddress;
        metadata.declaredTxHash = declaredTxHash.trim() || undefined;
      } else {
        paymentMethodTitle = 'Instant Card / SEPA Instant Gateway';
        currency = 'EUR';
        metadata.gateway = 'Stripe / CaixaBank 3D-Secure 2.0';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div 
        className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-[#E3E8E3] relative my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={resetModal}
          className="absolute top-5 right-5 text-[#69736F] hover:text-[#18211F] p-2 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
        >
          ✕
        </button>

        {/* State A: Success Confirmation */}
        {submittedTx ? (
          <div className="text-center space-y-6 py-4 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#27845D] flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold mb-2">
                <Clock className="w-3.5 h-3.5" />
                <span>Status: Awaiting Admin Confirmation</span>
              </div>
              <h3 className="text-2xl font-black text-[#18211F] tracking-tight">
                Deposit Request Submitted!
              </h3>
              <p className="text-xs text-[#69736F] mt-1.5 max-w-md mx-auto">
                Your deposit request has been registered in the platform treasury queue. Once our compliance team confirms receipt of the transfer, funds will be immediately credited to your wallet.
              </p>
            </div>

            {/* Transaction Receipt Card */}
            <div className="p-5 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] text-left text-xs space-y-2.5">
              <div className="flex justify-between items-center pb-2 border-b border-[#E3E8E3]">
                <span className="text-[#69736F]">Deposit Reference:</span>
                <span className="font-mono font-bold text-[#18211F]">{submittedTx.reference}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-[#E3E8E3]">
                <span className="text-[#69736F]">Amount:</span>
                <span className="font-black text-[#18211F] text-sm">{formatCurrency(submittedTx.amount)} {submittedTx.currency}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-[#E3E8E3]">
                <span className="text-[#69736F]">Method:</span>
                <span className="font-semibold text-[#18211F] truncate max-w-[220px]">{submittedTx.paymentMethod}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#69736F]">Investor:</span>
                <span className="font-semibold text-[#18211F]">{user.fullName} ({user.email})</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                onClick={() => {
                  resetModal();
                  if (onNavigateAdmin) {
                    onNavigateAdmin();
                  } else {
                    window.location.href = '/admin#deposits';
                  }
                }}
                className="w-full py-3 px-4 rounded-xl bg-[#182D2A] hover:bg-[#24423C] text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all"
              >
                <Shield className="w-4 h-4 text-[#B7E36A]" />
                <span>Go to Admin Panel to Approve</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  resetModal();
                  if (onNavigateTransactions) {
                    onNavigateTransactions();
                  }
                }}
                className="w-full py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#18211F] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <span>View in Ledger</span>
              </button>
            </div>
          </div>
        ) : (
          /* State B: Deposit Form */
          <div className="space-y-6">
            {/* Header */}
            <div className="text-left space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#27845D] text-[10px] font-bold uppercase tracking-wider">
                <ShieldCheck className="w-3 h-3" />
                <span>Institutional Custody · 1:1 EUR Backed</span>
              </div>
              <h2 className="text-2xl font-black text-[#18211F] tracking-tight">
                Deposit Funds to Wallet
              </h2>
              <p className="text-xs text-[#69736F]">
                Fund your liquidity account to purchase tokenized SPV notes and receive monthly rental distributions.
              </p>
            </div>

            {/* Method Tabs */}
            <div className="grid grid-cols-3 gap-2 p-1 bg-[#EEF1EC] rounded-2xl">
              <button
                type="button"
                onClick={() => setMethod('sepa')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  method === 'sepa'
                    ? 'bg-white text-[#18211F] shadow-xs'
                    : 'text-[#69736F] hover:text-[#18211F]'
                }`}
              >
                <Building2 className="w-4 h-4 text-emerald-700" />
                <span>Bank Wire (SEPA)</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('crypto')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  method === 'crypto'
                    ? 'bg-white text-[#18211F] shadow-xs'
                    : 'text-[#69736F] hover:text-[#18211F]'
                }`}
              >
                <Coins className="w-4 h-4 text-amber-600" />
                <span>Crypto Treasury</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('instant')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  method === 'instant'
                    ? 'bg-white text-[#18211F] shadow-xs'
                    : 'text-[#69736F] hover:text-[#18211F]'
                }`}
              >
                <CreditCard className="w-4 h-4 text-blue-600" />
                <span>Instant Card</span>
              </button>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="p-3.5 rounded-2xl bg-red-50 text-red-800 text-xs font-bold border border-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleDepositSubmit} className="space-y-5 text-left">
              {/* Amount Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#18211F]">
                  Deposit Amount (€ EUR)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#69736F]">€</span>
                  <input
                    type="number"
                    min="100"
                    step="50"
                    value={amount || ''}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    placeholder="Enter amount..."
                    className="w-full pl-8 pr-4 py-3 rounded-2xl border border-[#E3E8E3] focus:border-[#182D2A] focus:outline-none text-base font-bold text-[#18211F]"
                    required
                  />
                </div>

                {/* Quick Amount Buttons */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {[1000, 2500, 5000, 10000, 25000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmount(preset)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
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
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#18211F]">CaixaBank Institutional Account</span>
                      <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
                        SEPA Direct
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[#69736F]">Beneficiary:</span>
                        <span className="font-bold text-[#18211F]">{paymentConfig.traditional.beneficiary}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-[#69736F]">Bank Name:</span>
                        <span className="font-bold text-[#18211F]">{paymentConfig.traditional.bankName}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-[#69736F]">IBAN:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-[#18211F]">{paymentConfig.traditional.iban}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(paymentConfig.traditional.iban, setCopiedIban)}
                            className="p-1 rounded text-gray-500 hover:text-black cursor-pointer"
                            title="Copy IBAN"
                          >
                            {copiedIban ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-[#69736F]">BIC / SWIFT:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-[#18211F]">{paymentConfig.traditional.bic}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(paymentConfig.traditional.bic, setCopiedSwift)}
                            className="p-1 rounded text-gray-500 hover:text-black cursor-pointer"
                            title="Copy BIC"
                          >
                            {copiedSwift ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 mt-2">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="block text-[10px] uppercase font-bold text-amber-900 tracking-wider">
                              Payment Transfer Reference (Mandatory)
                            </span>
                            <span className="font-mono font-black text-amber-950 text-sm">{uniqueDepositRef}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(uniqueDepositRef, setCopiedRef)}
                            className="btn btn-secondary btn-sm py-1 px-2.5 text-[11px] bg-white border-amber-300 text-amber-950 font-bold flex items-center gap-1 cursor-pointer"
                          >
                            {copiedRef ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            {copiedRef ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                        <p className="text-[10px] text-amber-800 mt-1">
                          You must include this reference in your banking transfer note to ensure direct automated crediting.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#69736F] mb-1">
                      Bank Wire Note / Transaction Reference (Optional)
                    </label>
                    <input
                      type="text"
                      value={senderReference}
                      onChange={(e) => setSenderReference(e.target.value)}
                      placeholder={`e.g. ${uniqueDepositRef} or CaixaBank Wire Ref`}
                      className="w-full px-4 py-2.5 rounded-xl border border-[#E3E8E3] text-xs focus:outline-none focus:border-[#182D2A]"
                    />
                  </div>
                </div>
              )}

              {/* METHOD 2: CRYPTO TREASURY */}
              {method === 'crypto' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#69736F] mb-1">Select Stablecoin / Asset</label>
                      <select
                        value={cryptoToken}
                        onChange={(e) => {
                          const t = e.target.value;
                          setCryptoToken(t);
                          const matching = enabledNetworks.filter(n => n.token === t);
                          if (matching[0]) setCryptoNetwork(matching[0].name);
                        }}
                        className="w-full px-3 py-2.5 rounded-xl border border-[#E3E8E3] text-xs font-bold focus:outline-none focus:border-[#182D2A]"
                      >
                        {availableTokens.map((t) => (
                          <option key={t} value={t}>{t} (Treasury)</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#69736F] mb-1">Blockchain Network</label>
                      <select
                        value={cryptoNetwork}
                        onChange={(e) => setCryptoNetwork(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-[#E3E8E3] text-xs font-bold focus:outline-none focus:border-[#182D2A]"
                      >
                        {currentTokenNetworks.map((net) => (
                          <option key={net.id} value={net.name}>
                            {net.name} ({net.network})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#18211F]">Dedicated Treasury Address</span>
                      <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
                        {selectedNetworkConfig.network || cryptoNetwork}
                      </span>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-[#E3E8E3] flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-[#18211F] break-all select-all">
                        {selectedNetworkConfig.walletAddress}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(selectedNetworkConfig.walletAddress, setCopiedAddress)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer shrink-0"
                        title="Copy Wallet Address"
                      >
                        {copiedAddress ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>

                    <p className="text-[10px] text-[#828D89]">
                      Send only {cryptoToken} on {selectedNetworkConfig.name || cryptoNetwork} to this address. Cross-chain errors may result in permanent capital loss.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#69736F] mb-1">
                      Blockchain Tx Hash / Transaction ID (Optional)
                    </label>
                    <input
                      type="text"
                      value={declaredTxHash}
                      onChange={(e) => setDeclaredTxHash(e.target.value)}
                      placeholder="0x... or transfer transaction identifier"
                      className="w-full px-4 py-2.5 rounded-xl border border-[#E3E8E3] text-xs font-mono focus:outline-none focus:border-[#182D2A]"
                    />
                  </div>
                </div>
              )}

              {/* METHOD 3: INSTANT CARD / SIMULATED */}
              {method === 'instant' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 text-xs space-y-2">
                    <div className="flex items-center gap-2 text-blue-900 font-bold">
                      <CreditCard className="w-4 h-4 text-blue-700" />
                      <span>Instant Institutional Card Gateway</span>
                    </div>
                    <p className="text-blue-800 text-[11px]">
                      Instant deposit gateway with CaixaBank 3D-Secure 2.0. Perfect for immediate allocation and testing without wire delays.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#69736F] mb-1">Cardholder Name</label>
                    <input
                      type="text"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-[#E3E8E3] text-xs font-bold focus:outline-none focus:border-[#182D2A]"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Receipt / Transfer Slip Upload */}
              <div className="p-3.5 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#18211F] flex items-center gap-1.5">
                    <UploadCloud className="w-4 h-4 text-[#27845D]" />
                    <span>Attach Payment Proof / Wire Slip (Optional)</span>
                  </span>
                  <span className="text-[10px] text-[#69736F]">JPG, PNG, PDF</span>
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
                  <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-emerald-300">
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-semibold text-[#18211F] text-xs truncate max-w-xs">{receiptFileName}</span>
                      <span className="text-[10px] text-gray-500 shrink-0">({(receiptFileSize / 1024).toFixed(0)} KB)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setReceiptBase64('');
                        setReceiptFileName('');
                        setReceiptFileSize(0);
                      }}
                      className="text-xs font-bold text-red-600 hover:underline cursor-pointer ml-2"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2.5 px-3 rounded-xl border border-dashed border-[#CBD5E1] bg-white hover:bg-slate-50 text-[#69736F] hover:text-[#18211F] text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <UploadCloud className="w-3.5 h-3.5 text-[#27845D]" />
                    <span>Upload Wire Transfer Confirmation Slip / Screenshot</span>
                  </button>
                )}
                <p className="text-[10px] text-[#828D89]">
                  Uploading your bank receipt accelerates admin approval and credit to your account.
                </p>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || amount <= 0}
                  className="w-full py-3.5 px-6 rounded-2xl bg-[#182D2A] hover:bg-[#24423C] text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <ArrowDownLeft className="w-4 h-4 text-[#B7E36A]" />
                      <span>Submit Deposit Request (€{amount.toLocaleString()})</span>
                    </>
                  )}
                </button>
                <p className="text-[10px] text-center text-[#828D89] mt-2">
                  Deposits are held in CaixaBank segregated client accounts in compliance with EU MiCA and CNMV regulations.
                </p>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
