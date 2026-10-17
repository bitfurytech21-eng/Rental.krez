import React, { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { ledger } from '../../lib/ledger';
import { formatCurrency } from '../../lib/utils';
import { isValidIBAN } from '../../lib/validation';
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
      className="fixed inset-0 bg-black/30 backdrop-blur-[0.5px] z-50 flex items-center sm:items-end justify-center p-3 sm:p-6 sm:pb-8 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dash-card rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl border relative animate-in slide-in-from-bottom-4 duration-200 my-2">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 text-red-400 border border-red-500/30 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold dash-text">Withdraw Funds</h3>
              <p className="text-xs dash-muted">Transfer capital to your bank account or crypto wallet</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="dash-muted hover:opacity-80 text-xl font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {!isKYCVerified ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold dash-text">Identity Verification Required</h4>
            <p className="text-xs dash-muted max-w-xs mx-auto leading-relaxed">
              In adherence to European AML/CFT regulations, withdrawals can only be processed to verified investor accounts.
            </p>

            <div className="pt-2 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateProfile();
                }}
                className="btn btn-primary text-xs font-semibold w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <span>Submit Verification Documents in Profile</span>
              </button>

              <button 
                type="button" 
                onClick={onClose} 
                className="btn btn-secondary text-xs font-medium w-full cursor-pointer"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        ) : !success ? (
          <form onSubmit={handleWithdrawalSubmit} className="space-y-5">
            {/* Method Toggle: SEPA vs Crypto */}
            <div className="flex dash-inner p-1 rounded-2xl border">
              <button
                type="button"
                onClick={() => setMethod('sepa')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  method === 'sepa'
                    ? 'bg-gradient-to-r from-[#059669] to-[#10B981] text-white shadow-sm'
                    : 'dash-muted hover:opacity-90'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                SEPA Bank Wire
              </button>
              <button
                type="button"
                onClick={() => setMethod('crypto')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  method === 'crypto'
                    ? 'bg-gradient-to-r from-[#059669] to-[#10B981] text-white shadow-sm'
                    : 'dash-muted hover:opacity-90'
                }`}
              >
                <Coins className="w-3.5 h-3.5" />
                Crypto Wallet
              </button>
            </div>

            {/* Available Balance Box */}
            <div className="dash-inner p-4 rounded-2xl border flex justify-between items-center text-xs">
              <span className="dash-muted">Available for Withdrawal:</span>
              <span className="text-base font-extrabold text-emerald-400">{formatCurrency(user.walletBalance)}</span>
            </div>

            {/* Withdrawal Amount */}
            <div className="form-field">
              <label>Withdrawal Amount (EUR)</label>
              <div className="relative">
                <input
                  type="number"
                  min={10}
                  max={user.walletBalance}
                  step={10}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  required
                  className="font-bold text-base w-full pr-16"
                />
                <button
                  type="button"
                  onClick={() => setAmount(user.walletBalance)}
                  className="absolute right-3 top-3 text-[11px] font-bold text-[#27845D] hover:underline cursor-pointer"
                >
                  MAX
                </button>
              </div>
            </div>

            {/* Method-specific fields */}
            {method === 'sepa' ? (
              <div className="form-field">
                <label>Destination European Bank IBAN</label>
                <input
                  type="text"
                  value={iban}
                  onChange={(e) => setIban(e.target.value)}
                  placeholder="ES91 2100 0418 ..."
                  required
                  className="font-mono text-xs uppercase"
                />
                <span className="text-[11px] text-[#69736F] mt-1 block">
                  Beneficiary name must match verified account: <strong>{user.fullName}</strong>
                </span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold dash-text mb-1">Asset / Token</label>
                    <select
                      value={cryptoToken}
                      onChange={(e) => {
                        const token = e.target.value;
                        setCryptoToken(token);
                        const nets = networkChoices[token] || ['Ethereum (ERC20)'];
                        setCryptoNetwork(nets[0]);
                      }}
                      className="w-full text-xs font-bold p-2.5 rounded-xl border dash-inner dash-text focus:outline-none focus:border-emerald-500"
                    >
                      <option value="USDT">USDT (Tether)</option>
                      <option value="USDC">USDC (USD Coin)</option>
                      <option value="ETH">ETH (Ethereum)</option>
                      <option value="BTC">BTC (Bitcoin)</option>
                      <option value="SOL">SOL (Solana)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold dash-text mb-1">Network</label>
                    <select
                      value={cryptoNetwork}
                      onChange={(e) => setCryptoNetwork(e.target.value)}
                      className="w-full text-xs font-bold p-2.5 rounded-xl border dash-inner dash-text focus:outline-none focus:border-emerald-500"
                    >
                      {(networkChoices[cryptoToken] || ['Ethereum (ERC20)']).map(net => (
                        <option key={net} value={net}>{net}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-field">
                  <label className="dash-text">Destination {cryptoToken} Wallet Address ({cryptoNetwork})</label>
                  <input
                    type="text"
                    value={cryptoAddress}
                    onChange={(e) => setCryptoAddress(e.target.value)}
                    placeholder="0x... or Tron / Solana / Bitcoin address"
                    required
                    className="font-mono text-xs dash-inner dash-text"
                  />
                  <span className="text-[10px] dash-muted mt-1 block">
                    Verify the network carefully. Transfers sent to incompatible networks cannot be reversed.
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-xl bg-red-500/15 text-red-400 text-xs font-medium border border-red-500/30 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="p-3.5 rounded-2xl dash-inner border text-[11px] dash-muted leading-relaxed space-y-1">
              <p>• <strong>Processing time:</strong> {method === 'sepa' ? '1–2 European banking business days' : '15–30 minutes blockchain confirmation'}.</p>
              <p>• <strong>Fee:</strong> €0.00 (Zero withdrawal fee charged by RealtyFund).</p>
              <p>• <strong>Escrow protection:</strong> Funds are locked on the ledger immediately to prevent duplicate withdrawal attempts.</p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="submit"
                disabled={isSubmitting || user.walletBalance <= 0 || amount <= 0 || amount > user.walletBalance}
                className="btn btn-primary text-xs font-bold w-full py-3 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting to Financial Ledger...' : `Confirm Withdrawal of ${formatCurrency(amount)}`}
              </button>
              <button 
                type="button" 
                onClick={onClose} 
                className="btn btn-secondary text-xs font-medium w-full cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="text-center py-6 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-xl font-bold dash-text">Withdrawal Request Registered</h4>
            <p className="text-xs dash-muted max-w-xs mx-auto leading-relaxed">
              Your withdrawal of <strong>{formatCurrency(amount)}</strong> via {method === 'sepa' ? 'SEPA Bank Wire' : `${cryptoToken} (${cryptoNetwork})`} has been safely locked on the ledger and sent to compliance administration.
            </p>
            <div className="dash-inner p-3.5 rounded-2xl border text-left text-xs space-y-1 font-mono">
              <div className="flex justify-between">
                <span className="dash-muted">Destination:</span>
                <span className="font-bold dash-text truncate max-w-[200px]">
                  {method === 'sepa' ? iban : cryptoAddress}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="dash-muted">Status:</span>
                <span className="font-bold text-amber-500">Pending Admin Approval</span>
              </div>
            </div>
            <button 
              onClick={() => {
                setSuccess(false);
                onClose();
              }} 
              className="btn btn-primary text-xs font-bold w-full mt-4 cursor-pointer"
            >
              Return to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
