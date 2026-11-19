import {
  PortalAssignedBankAccount,
  PortalAssignedPaymentMethod,
  PortalConfig,
} from '../types';

export interface DepositDetailRow {
  label: string;
  value: string;
}

export interface NormalizedDepositMethod {
  id: string;
  method: 'bank' | 'usdt';
  isAssignedGate: boolean;
  minimum_amount: number | string;
  maximum_amount: number | string | null;
  name: string;
  token?: string;
  instructions: string;
  network?: string;
  wallet_address?: string;
  contract_address?: string;
  fee_type?: 'none' | 'fixed' | 'percent';
  fee_value?: number;
  detail_rows: DepositDetailRow[];
}

const clean = (val: unknown): string => String(val ?? '').trim();

const isPlaceholderValue = (val: string): boolean =>
  !val || val.startsWith('[Placeholder:');

const normalizeIban = (iban: string): string =>
  iban.replace(/\s+/g, '').toUpperCase();

const normalizeRows = (rows?: Array<{ label: string; value: string }>): DepositDetailRow[] => {
  if (!Array.isArray(rows)) return [];
  const seen = new Set<string>();
  const out: DepositDetailRow[] = [];
  for (const row of rows) {
    const label = clean(row?.label);
    const value = clean(row?.value);
    if (!label || !value || isPlaceholderValue(value)) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ label, value });
  }
  return out;
};

const extractIbanFromRows = (rows: DepositDetailRow[]): string => {
  const match = rows.find((r) => r.label.toLowerCase().includes('iban'));
  return match ? normalizeIban(match.value) : '';
};

const defaultBankInstructions = (): string =>
  'Include your unique payment reference in the SEPA / wire transfer remittance field so treasury can verify and credit your wallet promptly.';

const defaultCryptoInstructions = (token: string, network?: string): string =>
  `Send only ${token} on the ${network || 'specified'} network to the wallet address below, and submit your transaction hash (TXID) after transfer for faster treasury verification.`;

const buildRowsFromTraditional = (
  traditional?: PortalConfig['traditional']
): DepositDetailRow[] => {
  if (!traditional) return [];
  const candidates: Array<[string, string]> = [
    ['Beneficiary', clean(traditional.beneficiary)],
    ['Bank', clean(traditional.bankName)],
    ['IBAN', clean(traditional.iban)],
    ['BIC', clean(traditional.bic)],
    ['Address', clean(traditional.address)],
    ['Country', clean(traditional.country)],
  ];
  return candidates
    .filter(([, v]) => Boolean(v) && !isPlaceholderValue(v))
    .map(([label, value]) => ({ label, value }));
};

const buildRowsFromAssignedAccount = (
  account?: PortalAssignedBankAccount | null
): DepositDetailRow[] => {
  if (!account) return [];
  const existing = normalizeRows(account.detailRows);
  if (existing.length > 0) return existing;
  if (account.method === 'usdt') {
    return [
      account.network ? { label: 'Network', value: clean(account.network) } : null,
      account.walletAddress ? { label: 'Wallet address', value: clean(account.walletAddress) } : null,
    ].filter((row): row is DepositDetailRow => Boolean(row && row.value));
  }
  return [
    account.beneficiary ? { label: 'Beneficiary', value: clean(account.beneficiary) } : null,
    account.bankName ? { label: 'Bank', value: clean(account.bankName) } : null,
    account.iban ? { label: 'IBAN', value: clean(account.iban) } : null,
    account.bic ? { label: 'BIC', value: clean(account.bic) } : null,
    account.reference ? { label: 'Reference', value: clean(account.reference) } : null,
  ].filter((row): row is DepositDetailRow => Boolean(row && row.value && !isPlaceholderValue(row.value)));
};

const mergeRows = (
  primary: DepositDetailRow[],
  supplement: DepositDetailRow[]
): DepositDetailRow[] => {
  const seen = new Set(primary.map((r) => r.label.toLowerCase()));
  const out = [...primary];
  for (const row of supplement) {
    const key = row.label.toLowerCase();
    if (!seen.has(key) && row.value && !isPlaceholderValue(row.value)) {
      seen.add(key);
      out.push(row);
    }
  }
  return out;
};

export function formatDepositMethodTitle(item: Pick<NormalizedDepositMethod, 'method' | 'token' | 'name'>): string {
  if (item.method === 'usdt') {
    const token = clean(item.token) || (clean(item.name).toUpperCase().includes('USDC') ? 'USDC' : 'USDT');
    return `${token} (crypto)`;
  }
  return 'Bank transfer (SEPA)';
}

export function formatDepositFeeSummary(item: Pick<NormalizedDepositMethod, 'fee_type' | 'fee_value'>): string | null {
  const feeValue = Number(item.fee_value || 0);
  if (!item.fee_type || item.fee_type === 'none' || !Number.isFinite(feeValue) || feeValue <= 0) {
    return null;
  }
  if (item.fee_type === 'percent') {
    return `${feeValue}% processing fee`;
  }
  return `${new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(feeValue)} fee`;
}

export function buildFullDepositMethods(params: {
  apiMethods?: PortalAssignedPaymentMethod[];
  assignedPaymentMethods?: PortalAssignedPaymentMethod[];
  assignedBankAccount?: PortalAssignedBankAccount | null;
  assignedUsdtAccount?: PortalAssignedBankAccount | null;
  portalConfig?: PortalConfig | null;
}): NormalizedDepositMethod[] {
  const {
    apiMethods = [],
    assignedPaymentMethods = [],
    assignedBankAccount = null,
    assignedUsdtAccount = null,
    portalConfig = null,
  } = params;

  const minEur = Number(portalConfig?.limits?.minDepositEur || 100);
  const maxEur = Number(portalConfig?.limits?.maxDepositEur || 5000000);
  const hasLiveConfig = Boolean(portalConfig && !portalConfig.isPlaceholder);
  const traditional = hasLiveConfig ? portalConfig?.traditional : undefined;
  const traditionalRows = buildRowsFromTraditional(traditional);
  const traditionalIban = traditional?.iban && !isPlaceholderValue(traditional.iban)
    ? normalizeIban(traditional.iban)
    : '';
  const traditionalInstructions = clean(traditional?.instructions);

  const assignedBankRows = buildRowsFromAssignedAccount(assignedBankAccount);
  const assignedBankIban = clean(assignedBankAccount?.iban)
    ? normalizeIban(assignedBankAccount!.iban)
    : extractIbanFromRows(assignedBankRows);

  const sourceAssigned = apiMethods.length > 0 ? apiMethods : assignedPaymentMethods;
  const results: NormalizedDepositMethod[] = [];

  const pushOrEnrich = (candidate: NormalizedDepositMethod) => {
    if (candidate.method === 'bank') {
      const candidateIban = extractIbanFromRows(candidate.detail_rows);
      const existing = results.find((item) => {
        if (item.method !== 'bank') return false;
        if (item.id === candidate.id) return true;
        const itemIban = extractIbanFromRows(item.detail_rows);
        return Boolean(candidateIban && itemIban && candidateIban === itemIban);
      });
      if (existing) {
        existing.detail_rows = mergeRows(existing.detail_rows, candidate.detail_rows);
        if (!existing.instructions && candidate.instructions) {
          existing.instructions = candidate.instructions;
        }
        if (!existing.name && candidate.name) {
          existing.name = candidate.name;
        }
        return;
      }
      results.push(candidate);
      return;
    }

    const candidateWallet = clean(candidate.wallet_address).toLowerCase();
    const candidateNetwork = clean(candidate.network).toLowerCase();
    const existing = results.find((item) => {
      if (item.method !== 'usdt') return false;
      if (item.id === candidate.id) return true;
      const itemWallet = clean(item.wallet_address).toLowerCase();
      const itemNetwork = clean(item.network).toLowerCase();
      return Boolean(candidateWallet && itemWallet && candidateWallet === itemWallet && candidateNetwork === itemNetwork);
    });
    if (existing) {
      if (!existing.network && candidate.network) existing.network = candidate.network;
      if (!existing.wallet_address && candidate.wallet_address) existing.wallet_address = candidate.wallet_address;
      if (!existing.contract_address && candidate.contract_address) existing.contract_address = candidate.contract_address;
      if (!existing.token && candidate.token) existing.token = candidate.token;
      existing.detail_rows = mergeRows(existing.detail_rows, candidate.detail_rows);
      if (!existing.instructions && candidate.instructions) {
        existing.instructions = candidate.instructions;
      }
      return;
    }
    results.push(candidate);
  };

  // 1. Add and enrich assigned payment gates returned from /manual-payments/methods
  for (const raw of sourceAssigned) {
    if (raw.method === 'bank') {
      let detailRows = normalizeRows(raw.detail_rows);
      const matchesAssignedBank =
        assignedBankAccount &&
        (assignedBankAccount.gateId === raw.id ||
          (assignedBankIban && extractIbanFromRows(detailRows) === assignedBankIban) ||
          (detailRows.length === 0 && assignedBankRows.length > 0));
      if (matchesAssignedBank) {
        detailRows = mergeRows(detailRows, assignedBankRows);
      }

      const rawIban = extractIbanFromRows(detailRows);
      const rawNameUpper = clean(raw.name).toUpperCase();
      const traditionalBankUpper = clean(traditional?.bankName).toUpperCase();
      const sharesTraditionalRail =
        Boolean(traditionalIban) &&
        ((rawIban && rawIban === traditionalIban) ||
          detailRows.length === 0 ||
          (traditionalBankUpper && rawNameUpper.includes(traditionalBankUpper)));

      if (sharesTraditionalRail && traditionalRows.length > 0) {
        detailRows = mergeRows(detailRows, traditionalRows);
      }

      const instructions =
        clean(raw.instructions) ||
        (matchesAssignedBank ? clean(assignedBankAccount?.instructions) : '') ||
        (sharesTraditionalRail ? traditionalInstructions : '') ||
        defaultBankInstructions();

      pushOrEnrich({
        id: clean(raw.id),
        method: 'bank',
        isAssignedGate: true,
        minimum_amount: raw.minimum_amount ?? minEur,
        maximum_amount: raw.maximum_amount ?? (maxEur || null),
        name: clean(raw.name) || clean(assignedBankAccount?.gateName) || clean(traditional?.bankName) || 'SEPA Bank Transfer',
        instructions,
        fee_type: raw.fee_type || 'none',
        fee_value: Number(raw.fee_value || 0),
        detail_rows: detailRows,
      });
    } else {
      const token =
        clean(raw.token) ||
        (clean(raw.name).toUpperCase().includes('USDC') ? 'USDC' : 'USDT');
      const network = clean(raw.network) || clean(assignedUsdtAccount?.network);
      const walletAddress = clean(raw.wallet_address) || clean(assignedUsdtAccount?.walletAddress);
      const cryptoRows = mergeRows(normalizeRows(raw.detail_rows), [
        { label: 'Token', value: token },
        ...(network ? [{ label: 'Network', value: network }] : []),
        ...(walletAddress ? [{ label: 'Wallet address', value: walletAddress }] : []),
        ...(clean(raw.contract_address) ? [{ label: 'Contract address', value: clean(raw.contract_address) }] : []),
      ]);
      const instructions =
        clean(raw.instructions) ||
        clean(assignedUsdtAccount?.instructions) ||
        defaultCryptoInstructions(token, network);

      pushOrEnrich({
        id: clean(raw.id),
        method: 'usdt',
        isAssignedGate: true,
        minimum_amount: raw.minimum_amount ?? minEur,
        maximum_amount: raw.maximum_amount ?? (maxEur || null),
        name: clean(raw.name) || `${token} (${network || 'Crypto'})`,
        token,
        network,
        wallet_address: walletAddress,
        contract_address: clean(raw.contract_address) || undefined,
        instructions,
        fee_type: raw.fee_type || 'none',
        fee_value: Number(raw.fee_value || 0),
        detail_rows: cryptoRows,
      });
    }
  }

  // 2. Include assignedBankAccount / assignedUsdtAccount from wallet/profile if absent
  if (assignedBankAccount && (assignedBankRows.length > 0 || clean(assignedBankAccount.iban))) {
    pushOrEnrich({
      id: clean(assignedBankAccount.gateId) || 'assigned-bank',
      method: 'bank',
      isAssignedGate: true,
      minimum_amount: minEur,
      maximum_amount: maxEur || null,
      name: clean(assignedBankAccount.gateName) || clean(assignedBankAccount.bankName) || 'SEPA Bank Transfer',
      instructions: clean(assignedBankAccount.instructions) || traditionalInstructions || defaultBankInstructions(),
      fee_type: 'none',
      fee_value: 0,
      detail_rows: assignedBankRows,
    });
  }

  if (assignedUsdtAccount && clean(assignedUsdtAccount.walletAddress)) {
    const token = clean(assignedUsdtAccount.gateName).toUpperCase().includes('USDC') ? 'USDC' : 'USDT';
    const network = clean(assignedUsdtAccount.network);
    const walletAddress = clean(assignedUsdtAccount.walletAddress);
    pushOrEnrich({
      id: clean(assignedUsdtAccount.gateId) || 'assigned-usdt',
      method: 'usdt',
      isAssignedGate: true,
      minimum_amount: minEur,
      maximum_amount: maxEur || null,
      name: clean(assignedUsdtAccount.gateName) || `${token} (${network || 'Crypto'})`,
      token,
      network,
      wallet_address: walletAddress,
      instructions: clean(assignedUsdtAccount.instructions) || defaultCryptoInstructions(token, network),
      fee_type: 'none',
      fee_value: 0,
      detail_rows: buildRowsFromAssignedAccount(assignedUsdtAccount),
    });
  }

  // 3. Ensure configured platform bank & crypto rails from /payments/config are selectable
  if (hasLiveConfig && traditionalRows.length > 0 && traditionalIban) {
    pushOrEnrich({
      id: clean(traditional?.gateId) || 'platform-sepa',
      method: 'bank',
      isAssignedGate: Boolean(traditional?.gateId),
      minimum_amount: minEur,
      maximum_amount: maxEur || null,
      name: clean(traditional?.gateName) || `Bank Transfer (${clean(traditional?.bankName) || 'SEPA'})`,
      instructions: traditionalInstructions || defaultBankInstructions(),
      fee_type: 'none',
      fee_value: 0,
      detail_rows: traditionalRows,
    });
  }

  if (hasLiveConfig && Array.isArray(portalConfig?.cryptoNetworks)) {
    for (const net of portalConfig.cryptoNetworks) {
      if (net?.enabled === false) continue;
      const walletAddress = clean(net?.walletAddress || net?.address);
      if (!walletAddress || isPlaceholderValue(walletAddress)) continue;
      const token = clean(net?.token || net?.asset) || 'USDT';
      const network = clean(net?.network || net?.name);
      const contractAddress = clean(net?.contractAddress);
      const name = clean(net?.name) || `${token} (${network || 'Crypto'})`;
      const id =
        clean(net?.id) ||
        `platform-crypto-${token.toLowerCase()}-${network.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      const cryptoRows = [
        { label: 'Token', value: token },
        ...(network ? [{ label: 'Network', value: network }] : []),
        { label: 'Wallet address', value: walletAddress },
        ...(contractAddress ? [{ label: 'Contract address', value: contractAddress }] : []),
        ...(clean(net?.memo) ? [{ label: 'Memo / Tag', value: clean(net?.memo) }] : []),
      ];
      pushOrEnrich({
        id,
        method: 'usdt',
        isAssignedGate: false,
        minimum_amount: minEur,
        maximum_amount: maxEur || null,
        name,
        token,
        network,
        wallet_address: walletAddress,
        contract_address: contractAddress || undefined,
        instructions: clean(net?.instructions) || defaultCryptoInstructions(token, network),
        fee_type: 'none',
        fee_value: 0,
        detail_rows: cryptoRows,
      });
    }
  }

  return results;
}
