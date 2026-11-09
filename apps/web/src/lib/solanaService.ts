export type SolanaCluster = 'mainnet-beta' | 'devnet' | 'testnet';

export const SOLANA_USDC_MINT_ADDRESS = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
export const SOLANA_SPL_TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
export const SOLANA_TOKEN_2022_PROGRAM_ID = 'TokenzQdBNbLqP5VEhdKAS6EPFLC1PHnBqCXEPpxuEb';

export interface SolanaWalletState {
  isConnected: boolean;
  isInjectedExtension: boolean;
  address: string | null;
  cluster: SolanaCluster;
  solBalance: number | null;
  usdcBalance?: number | null;
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

export interface SolanaAccountVerificationResult {
  address: string;
  exists: boolean;
  executable: boolean;
  owner: string | null;
  lamports: number;
  verifiedAt: string;
  endpoint?: string;
  error?: string;
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
  cluster: SolanaCluster = 'mainnet-beta'
): string {
  const clusterParam = cluster === 'mainnet-beta' ? '' : `?cluster=${cluster}`;
  return `https://explorer.solana.com/${type}/${txOrAddress}${clusterParam}`;
}

export function getSolscanUrl(
  txOrAddress: string,
  type: 'tx' | 'account' | 'token' = 'tx',
  cluster: SolanaCluster = 'mainnet-beta'
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
  cluster: SolanaCluster = 'mainnet-beta'
): Promise<{ lamports: number; sol: number; endpoint: string }> {
  if (!isValidSolanaAddress(address)) {
    throw new Error('Invalid Solana Base58 public address.');
  }

  const endpoints = SOLANA_RPC_ENDPOINTS[cluster] || SOLANA_RPC_ENDPOINTS['mainnet-beta'];
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
 * Queries real on-chain USDC balance on Solana Mainnet-Beta using Circle's canonical USDC Mint
 * (EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v) via getTokenAccountsByOwner.
 */
export async function fetchSolanaUsdcBalance(
  ownerAddress: string,
  cluster: SolanaCluster = 'mainnet-beta'
): Promise<{ usdc: number; tokenAccountsCount: number; endpoint: string } | null> {
  if (!isValidSolanaAddress(ownerAddress) || cluster !== 'mainnet-beta') {
    return null;
  }

  const endpoints = SOLANA_RPC_ENDPOINTS['mainnet-beta'];
  for (const endpoint of endpoints) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'getTokenAccountsByOwner',
          params: [
            ownerAddress.trim(),
            { mint: SOLANA_USDC_MINT_ADDRESS },
            { encoding: 'jsonParsed', commitment: 'confirmed' },
          ],
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!response.ok) continue;

      const json = await response.json();
      if (json.error) continue;

      const accounts = Array.isArray(json?.result?.value) ? json.result.value : [];
      let totalUsdc = 0;
      for (const acc of accounts) {
        const uiAmount = Number(
          acc?.account?.data?.parsed?.info?.tokenAmount?.uiAmount ?? 0
        );
        if (!Number.isNaN(uiAmount)) {
          totalUsdc += uiAmount;
        }
      }
      return {
        usdc: Number(totalUsdc.toFixed(2)),
        tokenAccountsCount: accounts.length,
        endpoint,
      };
    } catch {
      clearTimeout(timer);
    }
  }

  return null;
}

/**
 * Verifies the 3 canonical Solana Mainnet infrastructure accounts via backend proxy or direct Mainnet RPC.
 */
export async function verifyInfrastructureAccountsOnMainnet(): Promise<
  Record<string, SolanaAccountVerificationResult>
> {
  const targetAddresses = [
    SOLANA_USDC_MINT_ADDRESS,
    SOLANA_SPL_TOKEN_PROGRAM_ID,
    SOLANA_TOKEN_2022_PROGRAM_ID,
  ];

  // 1. Try server-side proxy endpoint first to avoid browser CORS / rate limits
  try {
    const apiRes = await fetch('/api/v1/blockchain/infrastructure?verifyRpc=true');
    if (apiRes.ok) {
      const json = await apiRes.json();
      if (json?.success && json?.data?.rpcVerification) {
        return json.data.rpcVerification;
      }
    }
  } catch {
    // Fall back to direct RPC below
  }

  // 2. Fallback to direct Solana Mainnet-Beta getMultipleAccounts
  const verifiedAt = new Date().toISOString();
  for (const endpoint of SOLANA_RPC_ENDPOINTS['mainnet-beta']) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 3,
          method: 'getMultipleAccounts',
          params: [targetAddresses, { encoding: 'base64', commitment: 'confirmed' }],
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!response.ok) continue;

      const json = await response.json();
      const values = json?.result?.value;
      if (!Array.isArray(values)) continue;

      const map: Record<string, SolanaAccountVerificationResult> = {};
      targetAddresses.forEach((addr, idx) => {
        const info = values[idx];
        map[addr] = {
          address: addr,
          exists: Boolean(info),
          executable: Boolean(info?.executable),
          owner: info?.owner || null,
          lamports: Number(info?.lamports ?? 0),
          verifiedAt,
          endpoint,
        };
      });
      return map;
    } catch {
      clearTimeout(timer);
    }
  }

  throw new Error('Unable to reach Solana Mainnet-Beta RPC to verify program accounts right now.');
}

/**
 * Connects to a real injected Solana wallet extension (never fabricates a fake wallet or balance).
 */
export async function connectSolanaWallet(
  preferredCluster: SolanaCluster = 'mainnet-beta'
): Promise<SolanaWalletState> {
  const detected = getSolanaProvider();

  if (!detected) {
    return {
      isConnected: false,
      isInjectedExtension: false,
      address: null,
      cluster: preferredCluster,
      solBalance: null,
      usdcBalance: null,
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
    let usdcBalance: number | null = null;
    let balanceError: string | undefined;
    try {
      const bal = await fetchSolanaBalance(address, preferredCluster);
      solBalance = bal.sol;
      if (preferredCluster === 'mainnet-beta') {
        const usdcRes = await fetchSolanaUsdcBalance(address, preferredCluster);
        usdcBalance = usdcRes ? usdcRes.usdc : null;
      }
    } catch (rpcErr: any) {
      balanceError = rpcErr?.message;
    }

    return {
      isConnected: true,
      isInjectedExtension: true,
      address,
      cluster: preferredCluster,
      solBalance,
      usdcBalance,
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
      usdcBalance: null,
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

export function disconnectSolanaWallet(cluster: SolanaCluster = 'mainnet-beta'): SolanaWalletState {
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
    usdcBalance: null,
    providerName: null,
  };
}
