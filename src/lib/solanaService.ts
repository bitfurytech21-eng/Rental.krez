export type SolanaCluster = 'mainnet-beta' | 'devnet' | 'testnet';

export interface SolanaWalletState {
  isConnected: boolean;
  isInjectedExtension: boolean;
  address: string | null;
  cluster: SolanaCluster;
  solBalance: number | null;
  providerName: 'Phantom' | 'Solflare' | 'Backpack' | 'Whitelisted Custody Address' | null;
  error?: string;
}

export interface SolanaTokenInfo {
  mintAddress: string;
  ticker: string;
  decimals: number;
  totalSupply: number;
  circulatingSupply: number;
  propertyId: string;
  propertyTitle: string;
  splProgramId: string;
}

const SOLANA_RPC_ENDPOINTS: Record<SolanaCluster, string[]> = {
  devnet: ['https://api.devnet.solana.com'],
  testnet: ['https://api.testnet.solana.com'],
  'mainnet-beta': [
    'https://solana-rpc.publicnode.com',
    'https://api.mainnet-beta.solana.com',
  ],
};

/**
 * Validates whether a string is a syntactically valid Base58 Solana public key (32-44 chars, no 0/O/I/l).
 */
export function isValidSolanaAddress(address?: string | null): boolean {
  if (!address || typeof address !== 'string') return false;
  const trimmed = address.trim();
  if (trimmed.startsWith('0x')) return false;
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmed);
}

/**
 * Deterministic SPL Reference Identifier for internal registry display (never used as a fake on-chain tx).
 */
export function generateSolanaAddress(seedStr: string): string {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let result = '';
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  for (let i = 0; i < 44; i++) {
    const charIndex = Math.abs((hash + i * 31) % chars.length);
    result += chars[charIndex];
  }
  return result;
}

export function getSolanaExplorerUrl(
  txOrAddress: string,
  type: 'tx' | 'address' = 'tx',
  cluster: SolanaCluster = 'devnet'
): string {
  const clusterParam = cluster === 'mainnet-beta' ? '' : `?cluster=${cluster}`;
  return `https://explorer.solana.com/${type}/${txOrAddress}${clusterParam}`;
}

export function getSolscanUrl(
  txOrAddress: string,
  type: 'tx' | 'account' = 'tx',
  cluster: SolanaCluster = 'devnet'
): string {
  const clusterParam = cluster === 'mainnet-beta' ? '' : `?cluster=${cluster}`;
  return `https://solscan.io/${type}/${txOrAddress}${clusterParam}`;
}

/**
 * Detects real injected Solana wallet browser extensions (Phantom, Solflare, Backpack).
 */
export function getSolanaProvider(): { provider: any; name: 'Phantom' | 'Solflare' | 'Backpack' } | null {
  if (typeof window === 'undefined') return null;
  const win = window as any;

  if (win.phantom?.solana?.isPhantom) {
    return { provider: win.phantom.solana, name: 'Phantom' };
  }
  if (win.solana?.isPhantom) {
    return { provider: win.solana, name: 'Phantom' };
  }
  if (win.solflare?.isSolflare) {
    return { provider: win.solflare, name: 'Solflare' };
  }
  if (win.solana?.isSolflare) {
    return { provider: win.solana, name: 'Solflare' };
  }
  if (win.backpack?.isBackpack) {
    return { provider: win.backpack, name: 'Backpack' };
  }
  return null;
}

/**
 * Queries real on-chain SOL balance via Solana JSON-RPC getBalance.
 */
export async function fetchSolanaBalance(
  address: string,
  cluster: SolanaCluster = 'devnet'
): Promise<{ lamports: number; sol: number; endpoint: string }> {
  if (!isValidSolanaAddress(address)) {
    throw new Error('Invalid Solana Base58 public address.');
  }

  const endpoints = SOLANA_RPC_ENDPOINTS[cluster] || SOLANA_RPC_ENDPOINTS.devnet;
  let lastError: Error | null = null;

  for (const endpoint of endpoints) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getBalance',
          params: [address.trim(), { commitment: 'confirmed' }],
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!response.ok) {
        throw new Error(`Solana RPC HTTP ${response.status}`);
      }

      const json = await response.json();
      if (json.error) {
        throw new Error(json.error.message || 'Solana RPC returned an error');
      }

      const lamports = Number(json?.result?.value ?? 0);
      const sol = Number((lamports / 1_000_000_000).toFixed(6));
      return { lamports, sol, endpoint };
    } catch (err: any) {
      clearTimeout(timer);
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw new Error(
    lastError?.name === 'AbortError'
      ? `Solana ${cluster} RPC request timed out. Check your connection and retry.`
      : `Unable to reach Solana ${cluster} RPC (${lastError?.message || 'network unavailable'}).`
  );
}

/**
 * Connects to a real injected Solana wallet extension (never fabricates a fake wallet or balance).
 */
export async function connectSolanaWallet(
  preferredCluster: SolanaCluster = 'devnet'
): Promise<SolanaWalletState> {
  const detected = getSolanaProvider();

  if (!detected) {
    return {
      isConnected: false,
      isInjectedExtension: false,
      address: null,
      cluster: preferredCluster,
      solBalance: null,
      providerName: null,
      error: 'No Solana wallet extension (Phantom, Solflare, or Backpack) was detected in this browser. Install an extension or register a public Solana address below for read-only custody tracking.',
    };
  }

  try {
    const response = await detected.provider.connect();
    const address = response?.publicKey?.toString?.() || detected.provider?.publicKey?.toString?.();
    if (!address) {
      throw new Error('Wallet extension did not return a public key.');
    }

    let solBalance: number | null = null;
    let balanceError: string | undefined;
    try {
      const bal = await fetchSolanaBalance(address, preferredCluster);
      solBalance = bal.sol;
    } catch (rpcErr: any) {
      balanceError = rpcErr?.message;
    }

    return {
      isConnected: true,
      isInjectedExtension: true,
      address,
      cluster: preferredCluster,
      solBalance,
      providerName: detected.name,
      error: balanceError,
    };
  } catch (err: any) {
    return {
      isConnected: false,
      isInjectedExtension: false,
      address: null,
      cluster: preferredCluster,
      solBalance: null,
      providerName: null,
      error: err?.message || 'Wallet connection request was rejected by the user.',
    };
  }
}

/**
 * Requests a genuine cryptographic off-chain message signature from the connected Solana wallet extension.
 */
export async function signSolanaOwnershipProof(messageText: string): Promise<{
  signatureHex: string;
  signerAddress: string;
  signedAt: string;
  message: string;
}> {
  const detected = getSolanaProvider();
  if (!detected || !detected.provider?.publicKey) {
    throw new Error('Connect an active browser wallet extension (Phantom, Solflare, or Backpack) with signMessage support to sign cryptographic proofs.');
  }
  if (typeof detected.provider.signMessage !== 'function') {
    throw new Error(`${detected.name} wallet does not expose signMessage in this browser context.`);
  }

  const encoded = new TextEncoder().encode(messageText);
  const signed = await detected.provider.signMessage(encoded, 'utf8');
  const sigBytes: Uint8Array = signed?.signature || signed;
  const signatureHex = Array.from(sigBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return {
    signatureHex,
    signerAddress: detected.provider.publicKey.toString(),
    signedAt: new Date().toISOString(),
    message: messageText,
  };
}

export function disconnectSolanaWallet(cluster: SolanaCluster = 'devnet'): SolanaWalletState {
  const detected = getSolanaProvider();
  if (detected?.provider?.disconnect) {
    try {
      detected.provider.disconnect();
    } catch {}
  }
  return {
    isConnected: false,
    isInjectedExtension: false,
    address: null,
    cluster,
    solBalance: null,
    providerName: null,
  };
}
