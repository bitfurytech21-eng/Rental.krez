import React, { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { ledger } from '../../lib/ledger';
import { formatCurrency } from '../../lib/utils';
import { isValidIBAN } from '../../lib/validation';
import { ButtonLoader } from '../common/ButtonLoader';
import { ArrowUpRight, ShieldAlert, CheckCircle2, Building2, Coins, Sparkles, AlertCircle } from 'lucide-react';

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onNavigateProfile: () => void;
}

export const WithdrawalModal: React.FC<WithdrawalModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onNavigateProfile
}) => {
  const { user, refreshUser } = useAuth();
  const [method, setMethod] = useState<'sepa' | 'crypto'>('sepa');
  const [amount, setAmount] = useState<number>(100);
  const [iban, setIban] = useState<string>(user?.bankIban || 'ES9121000418450200051829');
  const [cryptoToken, setCryptoToken] = useState<string>('USDT');
  const [cryptoNetwork, setCryptoNetwork] = useState<string>('Ethereum (ERC20)');
  const [cryptoAddress, setCryptoAddress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen || !user) return null;

  const isKYCVerified = user.kycStatus === 'verified';

  const networkChoices: Record<string, string[]> = {
    USDT: ['Ethereum (ERC20)', 'Tron (TRC20)', 'Polygon POS', 'BNB Smart Chain (BEP20)'],
    USDC: ['Polygon POS', 'Ethereum (ERC20)', 'Solana SPL', 'Arbitrum One'],
    ETH: ['Ethereum (ERC20)', 'Arbitrum One', 'Optimism', 'Base'],
    BTC: ['Bitcoin Native SegWit', 'BNB Smart Chain (BEP20)'],
    SOL: ['Solana SPL']
  };

  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isKYCVerified) {
      setError('Regulatory compliance requires identity verification (KYC) before withdrawing funds.');
      return;
    }

    if (amount <= 0) {
      setError('Withdrawal amount must be greater than €0.00.');
      return;
    }

    if (amount > user.walletBalance) {
      setError(`Requested amount (€${amount.toFixed(2)}) exceeds available wallet balance (€${user.walletBalance.toFixed(2)}).`);
      return;
    }

    if (method === 'sepa') {
      if (!iban || iban.trim().length < 8) {
        setError('Please provide a valid European IBAN format.');
        return;
      }
    } else {
      if (!cryptoAddress || cryptoAddress.trim().length < 16) {
        setError('Please provide a valid destination cryptocurrency wallet address.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (method === 'sepa') {
        await ledger.requestWithdrawal(user.id, amount, 'SEPA Bank Wire', { 
          bankIban: iban.trim().toUpperCase() 
        });
      } else {
        await ledger.requestWithdrawal(user.id, amount, `Crypto ${cryptoToken} (${cryptoNetwork})`, {
          cryptoAddress: cryptoAddress.trim(),
          network: cryptoNetwork,
          token: cryptoToken
        });
      }

      refreshUser();
      setSuccess(true);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Withdrawal request failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="dash-card rounded-2xl w-[92vw] sm:w-full max-w-[440px] max-h-[82vh] sm:max-h-[85vh] p-3.5 sm:p-4 shadow-2xl border relative animate-in zoom-in-95 duration-150 my-auto overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center pb-2.5 mb-2.5 border-b border-[#303030]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#1D1D1D] text-[#FF4D4D] border border-[#303030] flex items-center justify-center shrink-0">
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Withdraw Funds</h3>
              <p className="text-[11px] text-[#999999]">Transfer capital to your bank account or crypto wallet</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-[#999999] hover:text-white text-lg font-bold p-1 cursor-pointer transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {!isKYCVerified ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#1D1D1D] text-[#FF9F43] border border-[#303030] flex items-center justify-center mx-auto">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-white">Identity Verification Required</h4>
            <p className="text-xs text-[#999999] max-w-xs mx-auto leading-relaxed">
              In adherence to European AML/CFT regulations, withdrawals can only be processed to verified investor accounts.
            </p>

            <div className="pt-2 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateProfile();
                }}
                className="w-full py-2.5 rounded-xl bg-white hover:bg-[#E5E5E5] text-black text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
              >
                <span>Submit Verification Documents in Profile</span>
              </button>

              <button 
                type="button" 
                onClick={onClose} 
                className="w-full py-2 rounded-xl bg-[#151515] hover:bg-[#252525] border border-[#303030] text-white text-xs font-medium cursor-pointer transition-colors"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        ) : !success ? (
          <form onSubmit={handleWithdrawalSubmit} className="space-y-3">
            {/* Method Toggle: SEPA vs Crypto */}
            <div className="flex bg-[#101010] p-0.5 rounded-xl border border-[#303030]">
              <button
                type="button"
                onClick={() => setMethod('sepa')}
                className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  method === 'sepa'
                    ? 'bg-white text-black shadow-xs'
                    : 'text-[#999999] hover:text-white'
                }`}
              >
                <Building2 className={`w-3.5 h-3.5 ${method === 'sepa' ? 'text-black' : 'text-[#999999]'}`} />
                SEPA Bank Wire
              </button>
              <button
                type="button"
                onClick={() => setMethod('crypto')}
                className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  method === 'crypto'
                    ? 'bg-white text-black shadow-xs'
                    : 'text-[#999999] hover:text-white'
                }`}
              >
                <Coins className={`w-3.5 h-3.5 ${method === 'crypto' ? 'text-black' : 'text-[#999999]'}`} />
                Crypto Wallet
              </button>
            </div>

            {/* Available Balance Box */}
            <div className="bg-[#1D1D1D] p-2.5 rounded-xl border border-[#303030] flex justify-between items-center text-xs">
              <span className="text-[#999999] text-[11px]">Available for Withdrawal:</span>
              <span className="text-sm font-extrabold text-white">{formatCurrency(user.walletBalance)}</span>
            </div>

            {/* Withdrawal Amount */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-white block">Withdrawal Amount (EUR)</label>
              <div className="relative">
                <input
                  type="number"
                  min={10}
                  max={user.walletBalance}
                  step={10}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  required
                  className="font-bold text-sm w-full pr-14 py-2 px-3 rounded-lg bg-[#1D1D1D] border border-[#303030] text-white focus:outline-none focus:border-white"
                />
                <button
                  type="button"
                  onClick={() => setAmount(user.walletBalance)}
                  className="absolute right-2.5 top-2.5 text-[10px] font-bold text-[#00D2FF] hover:underline cursor-pointer"
                >
                  MAX
                </button>
              </div>
            </div>

            {/* Method-specific fields */}
            {method === 'sepa' ? (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-white block">Destination European Bank IBAN</label>
                <input
                  type="text"
                  value={iban}
                  onChange={(e) => setIban(e.target.value)}
                  placeholder="ES91 2100 0418 ..."
                  required
                  className="font-mono text-xs uppercase py-2 px-3 rounded-lg bg-[#1D1D1D] border border-[#303030] text-white w-full focus:outline-none focus:border-white"
                />
                <span className="text-[10px] text-[#999999] mt-0.5 block leading-tight">
                  Beneficiary name must match verified account: <strong className="text-white">{user.fullName}</strong>
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-white mb-0.5">Asset / Token</label>
                    <select
                      value={cryptoToken}
                      onChange={(e) => {
                        const token = e.target.value;
                        setCryptoToken(token);
                        const nets = networkChoices[token] || ['Ethereum (ERC20)'];
                        setCryptoNetwork(nets[0]);
                      }}
                      className="w-full text-xs font-bold p-2 rounded-lg bg-[#1D1D1D] border border-[#303030] text-white focus:outline-none focus:border-white"
                    >
                      <option value="USDT" className="bg-[#151515] text-white">USDT (Tether)</option>
                      <option value="USDC" className="bg-[#151515] text-white">USDC (USD Coin)</option>
                      <option value="ETH" className="bg-[#151515] text-white">ETH (Ethereum)</option>
                      <option value="BTC" className="bg-[#151515] text-white">BTC (Bitcoin)</option>
                      <option value="SOL" className="bg-[#151515] text-white">SOL (Solana)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-white mb-0.5">Network</label>
                    <select
                      value={cryptoNetwork}
                      onChange={(e) => setCryptoNetwork(e.target.value)}
                      className="w-full text-xs font-bold p-2 rounded-lg bg-[#1D1D1D] border border-[#303030] text-white focus:outline-none focus:border-white"
                    >
                      {(networkChoices[cryptoToken] || ['Ethereum (ERC20)']).map(net => (
                        <option key={net} value={net} className="bg-[#151515] text-white">{net}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-white text-[11px] block">Destination {cryptoToken} Wallet Address ({cryptoNetwork})</label>
                  <input
                    type="text"
                    value={cryptoAddress}
                    onChange={(e) => setCryptoAddress(e.target.value)}
                    placeholder="0x... or wallet address"
                    required
                    className="font-mono text-xs py-2 px-3 rounded-lg bg-[#1D1D1D] border border-[#303030] text-white w-full focus:outline-none focus:border-white"
                  />
                  <span className="text-[9px] text-[#999999] mt-0.5 block leading-tight">
                    Verify the network carefully. Transfers sent to incompatible networks cannot be reversed.
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div className="p-2.5 rounded-xl bg-[#1D1D1D] text-[#FF4D4D] text-[11px] font-medium border border-[#FF4D4D]/40 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="p-2.5 rounded-xl bg-[#1D1D1D] border border-[#303030] text-[10px] text-[#D0D0D0] leading-tight space-y-1">
              <p>• <strong className="text-white">Processing:</strong> {method === 'sepa' ? '1–2 European banking business days' : '15–30 minutes blockchain confirmation'}.</p>
              <p>• <strong className="text-white">Fee:</strong> €0.00 (Zero withdrawal fee charged).</p>
            </div>

            <div className="pt-1 flex flex-col gap-1.5">
              <button
                type="submit"
                disabled={isSubmitting || user.walletBalance <= 0 || amount <= 0 || amount > user.walletBalance}
                className="w-full py-2.5 rounded-xl bg-white hover:bg-[#E5E5E5] text-black text-xs font-bold flex items-center justify-center cursor-pointer transition-colors disabled:opacity-50"
              >
                {isSubmitting ? (
                  <ButtonLoader text="Processing Withdrawal..." />
                ) : (
                  `Confirm Withdrawal of ${formatCurrency(amount)}`
                )}
              </button>
              <button 
                type="button" 
                onClick={onClose} 
                className="w-full py-2 rounded-xl bg-[#151515] hover:bg-[#252525] border border-[#303030] text-white text-xs font-medium cursor-pointer transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="text-center py-6 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-[#1D1D1D] text-[#2ECC71] border border-[#303030] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-xl font-bold text-white">Withdrawal Request Registered</h4>
            <p className="text-xs text-[#D0D0D0] max-w-xs mx-auto leading-relaxed">
              Your withdrawal of <strong className="text-white">{formatCurrency(amount)}</strong> via {method === 'sepa' ? 'SEPA Bank Wire' : `${cryptoToken} (${cryptoNetwork})`} has been safely locked on the ledger and sent to compliance administration.
            </p>
            <div className="bg-[#1D1D1D] p-3.5 rounded-2xl border border-[#303030] text-left text-xs space-y-1 font-mono">
              <div className="flex justify-between">
                <span className="text-[#999999]">Destination:</span>
                <span className="font-bold text-white truncate max-w-[200px]">
                  {method === 'sepa' ? iban : cryptoAddress}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#999999]">Status:</span>
                <span className="font-bold text-[#FF9F43]">Pending Admin Approval</span>
              </div>
            </div>
            <button 
              onClick={() => {
                setSuccess(false);
                onClose();
              }} 
              className="w-full py-2.5 rounded-xl bg-white hover:bg-[#E5E5E5] text-black text-xs font-bold mt-4 cursor-pointer transition-colors"
            >
              Return to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
