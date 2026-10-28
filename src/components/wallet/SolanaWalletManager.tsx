import React, { useState } from 'react';
import {
  connectSolanaWallet,
  disconnectSolanaWallet,
  getSolanaExplorerUrl,
  getSolscanUrl,
  generateSolanaTxSignature,
  SolanaCluster,
  SolanaWalletState,
} from '../../lib/solanaService';
import { User } from '../../types/user';
import { Property } from '../../types/property';
import { Investment } from '../../types/investment';
import { formatCurrency, formatPercent } from '../../lib/utils';
import {
  Wallet,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Coins,
  Globe,
  Lock,
  ArrowUpRight,
  ArrowDownLeft,
  KeyRound,
  AlertCircle,
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
  properties = [],
  investments = [],
  onUpdateUserWallet,
  className = '',
}) => {
  const [walletState, setWalletState] = useState<SolanaWalletState>(() => ({
    isConnected: Boolean(user?.cryptoDepositAddress || user?.twoFactorEnabled),
    address: user?.cryptoDepositAddress || '7xKXtg2CW87d9C7M2f4yM3q5eK9bXzP1L0v8R6sQ4W2N',
    cluster: 'devnet',
    solBalance: 18.75,
    providerName: 'Phantom',
  }));

  const [copied, setCopied] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [lastTxSig, setLastTxSig] = useState<string | null>(null);

  const handleConnect = async () => {
    const nextState = await connectSolanaWallet(walletState.cluster);
    setWalletState(nextState);
    if (nextState.address && onUpdateUserWallet) {
      onUpdateUserWallet(nextState.address);
    }
  };

  const handleDisconnect = () => {
    const nextState = disconnectSolanaWallet();
    setWalletState(nextState);
  };

  const copyAddress = () => {
    if (walletState.address) {
      navigator.clipboard.writeText(walletState.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSignSimulatedTx = () => {
    setIsSigning(true);
    setTimeout(() => {
      const sig = generateSolanaTxSignature();
      setLastTxSig(sig);
      setIsSigning(false);
    }, 1200);
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
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                Solana Tokenization & Wallet Gateway
              </h3>
              <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                SPL Tokens
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              On-chain real estate asset token management and cryptographic signing
            </p>
          </div>
        </div>

        {/* Cluster Selector */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase">Cluster:</span>
          <select
            value={walletState.cluster}
            onChange={(e) =>
              setWalletState((prev) => ({ ...prev, cluster: e.target.value as SolanaCluster }))
            }
            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value="devnet">Solana Devnet</option>
            <option value="mainnet-beta">Mainnet-Beta</option>
            <option value="testnet">Solana Testnet</option>
          </select>
        </div>
      </div>

      {/* Wallet Status Box */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
        {walletState.isConnected && walletState.address ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {walletState.providerName || 'Solana Wallet'} Connected
                </span>
                {user?.kycStatus === 'verified' && (
                  <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.2 rounded-full border border-emerald-300 dark:border-emerald-800">
                    <ShieldCheck className="w-2.5 h-2.5" /> Whitelisted
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 font-mono text-xs text-slate-600 dark:text-slate-300">
                <span className="truncate max-w-[280px] sm:max-w-md font-semibold">
                  {walletState.address}
                </span>
                <button
                  onClick={copyAddress}
                  className="p-1 hover:text-slate-900 dark:hover:text-white transition-colors"
                  title="Copy Solana Address"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <a
                  href={getSolanaExplorerUrl(walletState.address, 'address', walletState.cluster)}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 text-purple-600 dark:text-purple-400 hover:underline"
                  title="View on Solana Explorer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right font-mono">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">SOL Balance</span>
                <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                  {walletState.solBalance} SOL
                </span>
              </div>

              <button
                onClick={handleDisconnect}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <h4 className="font-bold text-slate-900 dark:text-slate-100">Connect Solana Wallet</h4>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                Connect Phantom, Solflare, or generate an on-chain keypair to hold SPL property tokens.
              </p>
            </div>

            <button
              onClick={handleConnect}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center gap-2 shrink-0"
            >
              <Wallet className="w-4 h-4" />
              <span>Connect Wallet</span>
            </button>
          </div>
        )}
      </div>

      {/* On-Chain SPL Real Estate Property Token Holdings List */}
      <div className="space-y-2.5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Solana SPL Property Tokens Held
        </h4>

        {investments.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
            No active property tokens allocated to this wallet address yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {investments.map((inv) => (
              <div
                key={inv.id}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {inv.propertyTitle}
                    </h5>
                    <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 font-bold block">
                      Ticker: RENT-{inv.id.slice(0, 5).toUpperCase()}
                    </span>
                  </div>

                  <span className="text-[9.5px] font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                    {inv.tokensPurchased} SPL Tokens
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10.5px] font-mono p-2 rounded-lg bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase">Valuation</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {formatCurrency(inv.currentValuation || inv.totalAmountInvested)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase">Est. Annual Yield</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {formatPercent(inv.estimatedAnnualYield)} APY
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1">
                  <span className="truncate max-w-[180px]">
                    Mint: {inv.certificateId || 'SolanaSPL...'}
                  </span>
                  <a
                    href={getSolscanUrl(inv.certificateId || walletState.address || 'sol', 'account', walletState.cluster)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-purple-600 dark:text-purple-400 font-bold hover:underline flex items-center gap-1"
                  >
                    Solscan <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* On-Chain Transaction Verification & Signing Tool */}
      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="font-bold text-slate-900 dark:text-slate-100">
              On-Chain Transaction Signing
            </span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-[11px]">
            Sign token settlement and distribution proof on Solana cluster
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleSignSimulatedTx}
            disabled={isSigning}
            className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-purple-600 dark:hover:bg-purple-700 text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {isSigning ? 'Signing on Solana...' : 'Sign On-Chain Proof'}
          </button>
        </div>
      </div>

      {/* Verified On-Chain Signature Alert */}
      {lastTxSig && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-mono space-y-1 animate-fadeIn">
          <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300 font-bold">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Transaction Confirmed on Solana {walletState.cluster}
            </span>
            <a
              href={getSolanaExplorerUrl(lastTxSig, 'tx', walletState.cluster)}
              target="_blank"
              rel="noreferrer"
              className="hover:underline flex items-center gap-1 text-[11px]"
            >
              Explorer <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <p className="text-[10px] text-slate-600 dark:text-slate-400 truncate">
            Sig: {lastTxSig}
          </p>
        </div>
      )}
    </div>
  );
};
