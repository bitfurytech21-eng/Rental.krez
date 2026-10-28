import React, { useState, useEffect, useCallback } from 'react';
import {
  connectSolanaWallet,
  disconnectSolanaWallet,
  fetchSolanaBalance,
  getSolanaExplorerUrl,
  getSolscanUrl,
  getSolanaProvider,
  isValidSolanaAddress,
  signSolanaOwnershipProof,
  SolanaCluster,
  SolanaWalletState,
} from '../../lib/solanaService';
import { User } from '../../types/user';
import { Property } from '../../types/property';
import { Investment } from '../../types/investment';
import { formatCurrency, formatPercent } from '../../lib/utils';
import { useToast } from '../../context/ToastContext';
import { userApi } from '../../lib/api';
import {
  Wallet,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  KeyRound,
  AlertCircle,
  Plus,
} from 'lucide-react';

interface SolanaWalletManagerProps {
  user?: User | null;
  properties?: Property[];
  investments?: Investment[];
  onUpdateUserWallet?: (address: string) => void;
  className?: string;
}

export const SolanaWalletManager: React.FC<SolanaWalletManagerProps> = ({
  user,
  investments = [],
  onUpdateUserWallet,
  className = '',
}) => {
  const { showToast } = useToast();
  const savedSolAddress = isValidSolanaAddress(user?.cryptoDepositAddress)
    ? user!.cryptoDepositAddress!.trim()
    : null;

  const [walletState, setWalletState] = useState<SolanaWalletState>(() => ({
    isConnected: Boolean(savedSolAddress),
    isInjectedExtension: false,
    address: savedSolAddress,
    cluster: 'devnet',
    solBalance: null,
    providerName: savedSolAddress ? 'Whitelisted Custody Address' : null,
  }));

  const [manualAddressInput, setManualAddressInput] = useState('');
  const [manualAddressError, setManualAddressError] = useState<string | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isFetchingBalance, setIsFetchingBalance] = useState(false);
  const [rpcError, setRpcError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [signedProof, setSignedProof] = useState<{
    signatureHex: string;
    signerAddress: string;
    signedAt: string;
    message: string;
  } | null>(null);

  const detectedExtension = typeof window !== 'undefined' ? getSolanaProvider() : null;

  const refreshRpcBalance = useCallback(
    async (address: string | null, cluster: SolanaCluster) => {
      if (!address || !isValidSolanaAddress(address)) {
        setWalletState((prev) => ({ ...prev, solBalance: null }));
        return;
      }
      setIsFetchingBalance(true);
      setRpcError(null);
      try {
        const result = await fetchSolanaBalance(address, cluster);
        setWalletState((prev) => ({ ...prev, solBalance: result.sol }));
      } catch (err: any) {
        setRpcError(err?.message || `Could not query Solana ${cluster} RPC.`);
        setWalletState((prev) => ({ ...prev, solBalance: null }));
      } finally {
        setIsFetchingBalance(false);
      }
    },
    []
  );

  useEffect(() => {
    if (walletState.address && isValidSolanaAddress(walletState.address)) {
      refreshRpcBalance(walletState.address, walletState.cluster);
    }
  }, [walletState.address, walletState.cluster, refreshRpcBalance]);

  const handleConnectExtension = async () => {
    if (isConnecting) return;
    setIsConnecting(true);
    setRpcError(null);
    setSignedProof(null);
    try {
      const nextState = await connectSolanaWallet(walletState.cluster);
      setWalletState(nextState);
      if (nextState.isConnected && nextState.address) {
        if (onUpdateUserWallet) {
          onUpdateUserWallet(nextState.address);
        }
        userApi.updateProfile({ cryptoDepositAddress: nextState.address }).catch(() => {});
        showToast(`${nextState.providerName} wallet connected (${nextState.address.slice(0, 6)}...${nextState.address.slice(-4)}).`, 'success');
      } else if (nextState.error) {
        setRpcError(nextState.error);
        setShowManualForm(true);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSaveManualAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = manualAddressInput.trim();
    if (!isValidSolanaAddress(clean)) {
      setManualAddressError('Enter a valid Base58 Solana public key (32–44 characters, e.g., 7xKXtg...gAsU).');
      return;
    }
    setManualAddressError(null);
    setRpcError(null);
    setWalletState({
      isConnected: true,
      isInjectedExtension: false,
      address: clean,
      cluster: walletState.cluster,
      solBalance: null,
      providerName: 'Whitelisted Custody Address',
    });
    if (onUpdateUserWallet) {
      onUpdateUserWallet(clean);
    }
    try {
      await userApi.updateProfile({ cryptoDepositAddress: clean });
    } catch {}
    setShowManualForm(false);
    setManualAddressInput('');
    showToast('Solana public address whitelisted and saved to your custody profile.', 'success');
  };

  const handleDisconnect = () => {
    const nextState = disconnectSolanaWallet(walletState.cluster);
    setWalletState(nextState);
    setSignedProof(null);
    setRpcError(null);
    showToast('Solana wallet session disconnected.', 'info');
  };

  const copyAddress = () => {
    if (walletState.address) {
      navigator.clipboard.writeText(walletState.address);
      setCopied(true);
      showToast('Solana public address copied to clipboard.', 'info');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSignRealProof = async () => {
    if (isSigning) return;
    setIsSigning(true);
    setRpcError(null);
    try {
      const statement = `L'Agence Real Estate Custody Attestation\nInvestor: ${user?.email || 'guest'}\nCluster: ${walletState.cluster}\nTimestamp: ${new Date().toISOString()}`;
      const proof = await signSolanaOwnershipProof(statement);
      setSignedProof(proof);
      showToast('Cryptographic wallet ownership proof signed.', 'success');
    } catch (err: any) {
      const msg = err?.message || 'Wallet signature cancelled or unavailable.';
      setRpcError(msg);
      showToast(msg, 'error');
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <div className={`bg-white dark:bg-[#0D1522] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 ${className}`}>
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center font-bold shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                Solana Tokenization & Wallet Gateway
              </h3>
              <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                SPL Custody
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live Solana RPC balance verification and cryptographic wallet attestation
            </p>
          </div>
        </div>

        {/* Cluster Selector */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <label htmlFor="solana-cluster-select" className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase">
            Cluster:
          </label>
          <select
            id="solana-cluster-select"
            value={walletState.cluster}
            onChange={(e) =>
              setWalletState((prev) => ({ ...prev, cluster: e.target.value as SolanaCluster }))
            }
            className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="devnet">Solana Devnet</option>
            <option value="mainnet-beta">Mainnet-Beta</option>
            <option value="testnet">Solana Testnet</option>
          </select>
        </div>
      </div>

      {/* Contextual RPC / Extension Status Banner */}
      {rpcError && (
        <div
          role="alert"
          className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-amber-900 dark:text-amber-200"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <span>{rpcError}</span>
          </div>
          {walletState.address && (
            <button
              type="button"
              onClick={() => refreshRpcBalance(walletState.address, walletState.cluster)}
              disabled={isFetchingBalance}
              className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-100 font-bold text-[11px] shrink-0 inline-flex items-center gap-1 transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${isFetchingBalance ? 'animate-spin' : ''}`} />
              Retry RPC
            </button>
          )}
        </div>
      )}

      {/* Wallet Status Box */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
        {walletState.isConnected && walletState.address ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`w-2 h-2 rounded-full ${
                    walletState.isInjectedExtension ? 'bg-emerald-500' : 'bg-blue-500'
                  }`}
                />
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {walletState.providerName || 'Solana Address'}
                </span>
                {user?.kycStatus === 'verified' && (
                  <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                    <ShieldCheck className="w-2.5 h-2.5" /> KYC Whitelisted
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 font-mono text-xs text-slate-600 dark:text-slate-300">
                <span className="truncate max-w-[240px] sm:max-w-md font-semibold">
                  {walletState.address}
                </span>
                <button
                  type="button"
                  onClick={copyAddress}
                  aria-label="Copy Solana Address"
                  className="p-1.5 rounded-md hover:bg-slate-200/70 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
                  title="Copy Solana Address"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <a
                  href={getSolanaExplorerUrl(walletState.address, 'address', walletState.cluster)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="View address on Solana Explorer"
                  className="p-1.5 rounded-md text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors"
                  title="View on Solana Explorer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right font-mono">
                <div className="flex items-center justify-end gap-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">On-Chain SOL</span>
                  <button
                    type="button"
                    onClick={() => refreshRpcBalance(walletState.address, walletState.cluster)}
                    disabled={isFetchingBalance}
                    aria-label="Refresh on-chain SOL balance"
                    className="p-0.5 text-slate-400 hover:text-purple-600 transition-colors disabled:opacity-50"
                    title="Refresh live RPC balance"
                  >
                    <RefreshCw className={`w-3 h-3 ${isFetchingBalance ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                <span className="text-sm font-bold text-purple-600 dark:text-purple-400 tabular-nums">
                  {isFetchingBalance
                    ? 'Querying RPC...'
                    : walletState.solBalance !== null
                    ? `${walletState.solBalance} SOL`
                    : 'RPC Unavailable'}
                </span>
              </div>

              <button
                type="button"
                onClick={handleDisconnect}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100">
                  {detectedExtension
                    ? `${detectedExtension.name} Browser Extension Detected`
                    : 'No Solana Wallet Connected'}
                </h4>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                  {detectedExtension
                    ? `Connect ${detectedExtension.name} to verify live SOL balance and sign cryptographic proofs.`
                    : 'Connect Phantom / Solflare / Backpack, or whitelist a public Solana address for read-only custody tracking.'}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={handleConnectExtension}
                  disabled={isConnecting}
                  className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span>{isConnecting ? 'Connecting...' : detectedExtension ? `Connect ${detectedExtension.name}` : 'Detect Wallet'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowManualForm((prev) => !prev);
                    setManualAddressError(null);
                  }}
                  className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Whitelist Address</span>
                </button>
              </div>
            </div>

            {showManualForm && (
              <form onSubmit={handleSaveManualAddress} className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <label htmlFor="manual-solana-pubkey" className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Public Solana Wallet Address (Base58)
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    id="manual-solana-pubkey"
                    type="text"
                    value={manualAddressInput}
                    onChange={(e) => {
                      setManualAddressInput(e.target.value);
                      if (manualAddressError) setManualAddressError(null);
                    }}
                    placeholder="e.g. 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
                    className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-purple-600 dark:hover:bg-purple-700 text-white text-xs font-bold transition-colors shrink-0"
                  >
                    Save & Query RPC
                  </button>
                </div>
                {manualAddressError && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">{manualAddressError}</p>
                )}
              </form>
            )}
          </div>
        )}
      </div>

      {/* Platform SPL Real Estate Property Token Holdings List */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Allocated Property Token Positions ({investments.length})
          </h4>
        </div>

        {investments.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
            No property tokens held in your investor registry yet. Acquire fractional units in the Marketplace to populate custody records.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {investments.map((inv) => (
              <div
                key={inv.id}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {inv.propertyTitle}
                    </h5>
                    <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 font-bold block">
                      Cert: {inv.certificateId || inv.id.toUpperCase()}
                    </span>
                  </div>

                  <span className="text-[9.5px] font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full shrink-0 tabular-nums">
                    {inv.tokensPurchased} Units
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10.5px] font-mono p-2 rounded-lg bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase">Valuation</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                      {formatCurrency(inv.currentValuation || inv.totalAmountInvested)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase">Est. Annual Yield</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {formatPercent(inv.estimatedAnnualYield)} APY
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1">
                  <span className="truncate max-w-[190px]">
                    Ledger Hash: {inv.transactionHash || 'Recorded'}
                  </span>
                  {walletState.address && isValidSolanaAddress(walletState.address) && (
                    <a
                      href={getSolscanUrl(walletState.address, 'account', walletState.cluster)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-600 dark:text-purple-400 font-bold hover:underline flex items-center gap-1"
                    >
                      Wallet on Solscan <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cryptographic Ownership Attestation Tool (Requires Real Injected Wallet Extension) */}
      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="font-bold text-slate-900 dark:text-slate-100">
              Cryptographic Wallet Attestation
            </span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-[11px]">
            {walletState.isInjectedExtension
              ? `Sign an off-chain custody ownership message with ${walletState.providerName}.`
              : 'Requires an active Phantom, Solflare, or Backpack browser extension to sign messages.'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleSignRealProof}
            disabled={isSigning || !walletState.isInjectedExtension}
            title={
              walletState.isInjectedExtension
                ? 'Request cryptographic signature from your Solana wallet'
                : 'Connect an injected Solana wallet extension first'
            }
            className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-purple-600 dark:hover:bg-purple-700 text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
          >
            {isSigning ? 'Awaiting Wallet Signature...' : 'Sign Custody Proof'}
          </button>
        </div>
      </div>

      {/* Verified Wallet Message Signature Output */}
      {signedProof && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-mono space-y-1">
          <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300 font-bold">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Message Signed by {signedProof.signerAddress.slice(0, 6)}...{signedProof.signerAddress.slice(-4)}
            </span>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400">
              {new Date(signedProof.signedAt).toLocaleTimeString()}
            </span>
          </div>
          <p className="text-[10px] text-slate-600 dark:text-slate-400 break-all">
            Ed25519 Signature: {signedProof.signatureHex}
          </p>
        </div>
      )}
    </div>
  );
};
