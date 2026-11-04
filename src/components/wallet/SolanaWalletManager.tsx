import React, { useState, useEffect, useCallback } from 'react';
import {
  connectSolanaWallet,
  disconnectSolanaWallet,
  fetchSolanaBalance,
  fetchSolanaUsdcBalance,
  getSolanaExplorerUrl,
  getSolscanUrl,
  getSolanaProvider,
  isValidSolanaAddress,
  signSolanaOwnershipProof,
  SOLANA_USDC_MINT_ADDRESS,
  SOLANA_SPL_TOKEN_PROGRAM_ID,
  SOLANA_TOKEN_2022_PROGRAM_ID,
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
  Layers,
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
    cluster: 'mainnet-beta',
    solBalance: null,
    usdcBalance: null,
    providerName: savedSolAddress ? 'Whitelisted Custody Address' : null,
  }));

  const [manualAddressInput, setManualAddressInput] = useState('');
  const [manualAddressError, setManualAddressError] = useState<string | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isFetchingBalance, setIsFetchingBalance] = useState(false);
  const [rpcError, setRpcError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
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
        setWalletState((prev) => ({ ...prev, solBalance: null, usdcBalance: null }));
        return;
      }
      setIsFetchingBalance(true);
      setRpcError(null);
      try {
        const [solRes, usdcRes] = await Promise.all([
          fetchSolanaBalance(address, cluster),
          cluster === 'mainnet-beta' ? fetchSolanaUsdcBalance(address, cluster) : Promise.resolve(null),
        ]);
        setWalletState((prev) => ({
          ...prev,
          solBalance: solRes.sol,
          usdcBalance: usdcRes ? usdcRes.usdc : null,
        }));
      } catch (err: any) {
        setRpcError(err?.message || `Could not query Solana ${cluster} RPC.`);
        setWalletState((prev) => ({ ...prev, solBalance: null, usdcBalance: null }));
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
        showToast(
          `${nextState.providerName} wallet connected (${nextState.address.slice(0, 6)}...${nextState.address.slice(-4)}).`,
          'success'
        );
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
      setManualAddressError(
        'Enter a valid Base58 Solana public key (32–44 characters, e.g., 7xKXtg...gAsU).'
      );
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
      usdcBalance: null,
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

  const copyValue = (val: string, label: string) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(val);
    showToast(`${label} copied to clipboard.`, 'info');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSignRealProof = async () => {
    if (isSigning) return;
    setIsSigning(true);
    setRpcError(null);
    try {
      const statement = `L'Agence Real Estate Custody Attestation\nInvestor: ${user?.email || 'guest'}\nCluster: ${walletState.cluster}\nUSDC Settlement Mint: ${SOLANA_USDC_MINT_ADDRESS}\nTimestamp: ${new Date().toISOString()}`;
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
    <div
      className={`bg-white dark:bg-[#0D1522] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 ${className}`}
    >
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#0B1B30] text-[#BEE179] border border-[#1D3860] flex items-center justify-center font-bold shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                Solana Settlement &amp; Non-Custodial Wallet Gateway
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                SPL &amp; Token-2022 Ready
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live Solana JSON-RPC SOL &amp; USDC balance verification and Ed25519 custody attestation
            </p>
          </div>
        </div>

        {/* Cluster Selector */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <label
            htmlFor="solana-cluster-select"
            className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase"
          >
            Cluster:
          </label>
          <select
            id="solana-cluster-select"
            value={walletState.cluster}
            onChange={(e) =>
              setWalletState((prev) => ({ ...prev, cluster: e.target.value as SolanaCluster }))
            }
            className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E3A34]"
          >
            <option value="mainnet-beta">Mainnet-Beta</option>
            <option value="devnet">Solana Devnet</option>
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
              className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-100 font-bold text-[11px] shrink-0 inline-flex items-center gap-1 transition-colors cursor-pointer"
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
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`w-2 h-2 rounded-full ${
                    walletState.isInjectedExtension ? 'bg-emerald-600' : 'bg-blue-600'
                  }`}
                />
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {walletState.providerName || 'Solana Address'}
                </span>
                {user?.kycStatus === 'verified' && (
                  <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800">
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
                  onClick={() => copyValue(walletState.address!, 'Solana wallet address')}
                  aria-label="Copy Solana Address"
                  className="p-1.5 rounded-md hover:bg-slate-200/70 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                  title="Copy Solana Address"
                >
                  {copiedKey === walletState.address ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
                <a
                  href={getSolanaExplorerUrl(walletState.address, 'address', walletState.cluster)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="View address on Solana Explorer"
                  className="p-1.5 rounded-md text-[#1E3A34] dark:text-[#BEE179] hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                  title="View on Solana Explorer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0 flex-wrap">
              <div className="text-right font-mono">
                <div className="flex items-center justify-end gap-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">On-Chain SOL</span>
                  <button
                    type="button"
                    onClick={() => refreshRpcBalance(walletState.address, walletState.cluster)}
                    disabled={isFetchingBalance}
                    aria-label="Refresh on-chain SOL balance"
                    className="p-0.5 text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
                    title="Refresh live RPC balance"
                  >
                    <RefreshCw className={`w-3 h-3 ${isFetchingBalance ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                  {isFetchingBalance
                    ? 'Querying...'
                    : walletState.solBalance !== null
                    ? `${walletState.solBalance} SOL`
                    : 'RPC Unavailable'}
                </span>
              </div>

              {walletState.cluster === 'mainnet-beta' && (
                <div className="text-right font-mono pl-3 border-l border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Mainnet USDC
                  </span>
                  <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                    {isFetchingBalance
                      ? 'Querying...'
                      : walletState.usdcBalance !== null && walletState.usdcBalance !== undefined
                      ? `${walletState.usdcBalance.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })} USDC`
                      : '0.00 USDC'}
                  </span>
                </div>
              )}

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
                    ? `Connect ${detectedExtension.name} to verify live Mainnet SOL & USDC balances and sign cryptographic proofs.`
                    : 'Connect Phantom / Solflare / Backpack, or whitelist a public Solana address for read-only SOL & USDC tracking.'}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={handleConnectExtension}
                  disabled={isConnecting}
                  className="px-3.5 py-2 rounded-xl bg-[#0B1B30] hover:bg-[#142D4C] disabled:opacity-60 text-white font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Wallet className="w-3.5 h-3.5 text-[#BEE179]" />
                  <span>
                    {isConnecting
                      ? 'Connecting...'
                      : detectedExtension
                      ? `Connect ${detectedExtension.name}`
                      : 'Detect Wallet'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowManualForm((prev) => !prev);
                    setManualAddressError(null);
                  }}
                  className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Whitelist Address</span>
                </button>
              </div>
            </div>

            {showManualForm && (
              <form
                onSubmit={handleSaveManualAddress}
                className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2"
              >
                <label
                  htmlFor="manual-solana-pubkey"
                  className="block text-[11px] font-bold text-slate-700 dark:text-slate-300"
                >
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
                    className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1E3A34]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-[#1E3A34] hover:bg-[#152925] text-white text-xs font-bold transition-colors shrink-0 cursor-pointer"
                  >
                    Save &amp; Query RPC
                  </button>
                </div>
                {manualAddressError && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                    {manualAddressError}
                  </p>
                )}
              </form>
            )}
          </div>
        )}
      </div>

      {/* Configured Solana Mainnet Infrastructure Reference Strip */}
      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 space-y-2.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
            <Layers className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
            <span>Configured Solana Mainnet Infrastructure</span>
          </div>
          <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
            USDC = Settlement &amp; Distribution Mint (Not SPV Share Contract)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-[11px]">
          {[
            {
              label: 'USDC Stablecoin Mint',
              role: 'Subscriptions & Rental Distributions',
              address: SOLANA_USDC_MINT_ADDRESS,
            },
            {
              label: 'SPL Token Program',
              role: 'Balances, Minting & Transfers',
              address: SOLANA_SPL_TOKEN_PROGRAM_ID,
            },
            {
              label: 'Token-2022 Program',
              role: 'Transfer Hooks & Allowlist Compliance',
              address: SOLANA_TOKEN_2022_PROGRAM_ID,
            },
          ].map((prog) => (
            <div
              key={prog.address}
              className="p-2.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-1.5"
            >
              <div>
                <div className="font-bold text-slate-900 dark:text-slate-100">{prog.label}</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">{prog.role}</div>
              </div>
              <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800 font-mono text-[10px]">
                <span className="truncate text-slate-700 dark:text-slate-300" title={prog.address}>
                  {prog.address.slice(0, 6)}...{prog.address.slice(-6)}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => copyValue(prog.address, prog.label)}
                    className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                    title={`Copy ${prog.label} address`}
                    aria-label={`Copy ${prog.label} address`}
                  >
                    {copiedKey === prog.address ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                  <a
                    href={getSolanaExplorerUrl(prog.address, 'address', 'mainnet-beta')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-emerald-700 dark:text-emerald-400"
                    title={`Verify ${prog.label} on Solana Explorer`}
                    aria-label={`Verify ${prog.label} on Solana Explorer`}
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Platform SPV Property Positions List */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Allocated SPV Property Positions ({investments.length})
          </h4>
        </div>

        {investments.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
            No property units held in your investor registry yet. Acquire fractional SPV positions in the Marketplace to populate custody records.
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
                    <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-bold block">
                      SPV Cert: {inv.certificateId || inv.id.toUpperCase()}
                    </span>
                  </div>

                  <span className="text-[9.5px] font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded shrink-0 tabular-nums">
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
                    <span className="text-slate-400 block text-[9px] uppercase">Underwritten Yield</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {formatPercent(inv.estimatedAnnualYield)} p.a.
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1">
                  <span className="truncate max-w-[190px]">
                    Ledger Ref: {inv.transactionHash || 'Recorded'}
                  </span>
                  {walletState.address && isValidSolanaAddress(walletState.address) && (
                    <a
                      href={getSolscanUrl(walletState.address, 'account', walletState.cluster)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-700 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1"
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

      {/* Cryptographic Ownership Attestation Tool */}
      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-[#1E3A34] dark:text-[#BEE179]" />
            <span className="font-bold text-slate-900 dark:text-slate-100">
              Cryptographic Wallet Attestation
            </span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-[11px]">
            {walletState.isInjectedExtension
              ? `Sign an off-chain Ed25519 custody ownership message with ${walletState.providerName}.`
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
            className="px-3.5 py-1.5 rounded-xl bg-[#0B1B30] hover:bg-[#142D4C] text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
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
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Message Signed by{' '}
              {signedProof.signerAddress.slice(0, 6)}...{signedProof.signerAddress.slice(-4)}
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
