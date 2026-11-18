import { PORTAL_PLACEHOLDER_CONFIG } from '../config/portalConfig';
import { formatEuro } from './format';

export const MAX_COMPLIANCE_DOC_BYTES = 15 * 1024 * 1024;

export function validateDepositAmount(
  raw: string | number,
  limits?: { minDepositEur?: number; maxDepositEur?: number }
): { valid: boolean; value: number; error?: string } {
  const minEur = limits?.minDepositEur ?? PORTAL_PLACEHOLDER_CONFIG.limits.minDepositEur;
  const maxEur = limits?.maxDepositEur ?? PORTAL_PLACEHOLDER_CONFIG.limits.maxDepositEur;
  const value = typeof raw === 'number' ? raw : Number(String(raw).replace(/,/g, '.'));
  if (!Number.isFinite(value) || value <= 0) {
    return { valid: false, value: 0, error: 'Enter a valid positive EUR amount.' };
  }
  if (value < minEur) {
    return { valid: false, value, error: `Minimum deposit is ${formatEuro(minEur)}.` };
  }
  if (value > maxEur) {
    return {
      valid: false,
      value,
      error: `Single deposits cannot exceed ${formatEuro(maxEur)}.`,
    };
  }
  return { valid: true, value: Math.round(value * 100) / 100 };
}

export function validateWithdrawalAmount(
  raw: string | number,
  availableBalance: number,
  minEurOverride?: number
): { valid: boolean; value: number; error?: string } {
  const minEur = minEurOverride ?? PORTAL_PLACEHOLDER_CONFIG.limits.minWithdrawalEur;
  const value = typeof raw === 'number' ? raw : Number(String(raw).replace(/,/g, '.'));
  if (!Number.isFinite(value) || value <= 0) {
    return { valid: false, value: 0, error: 'Enter a valid positive EUR amount.' };
  }
  if (value < minEur) {
    return { valid: false, value, error: `Minimum withdrawal is ${formatEuro(minEur)}.` };
  }
  if (value > availableBalance) {
    return {
      valid: false,
      value,
      error: `Amount exceeds your available balance of ${formatEuro(availableBalance)}.`,
    };
  }
  return { valid: true, value: Math.round(value * 100) / 100 };
}

export function validateIban(iban: string): { valid: boolean; clean: string; error?: string } {
  const clean = iban.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (clean.length < 15 || clean.length > 34) {
    return { valid: false, clean, error: 'Enter a valid IBAN between 15 and 34 alphanumeric characters.' };
  }
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(clean)) {
    return { valid: false, clean, error: 'IBAN must begin with a 2-letter country code and 2 check digits.' };
  }
  const rearranged = `${clean.slice(4)}${clean.slice(0, 4)}`;
  let remainder = 0;
  for (let i = 0; i < rearranged.length; i += 1) {
    const ch = rearranged.charCodeAt(i);
    const digits = ch >= 65 && ch <= 90 ? String(ch - 55) : rearranged[i];
    for (let j = 0; j < digits.length; j += 1) {
      remainder = (remainder * 10 + Number(digits[j])) % 97;
    }
  }
  if (remainder !== 1) {
    return { valid: false, clean, error: 'IBAN checksum is invalid. Please double-check the characters.' };
  }
  return { valid: true, clean };
}

export function validateCryptoAddress(address: string): { valid: boolean; clean: string; error?: string } {
  const clean = address.trim();
  if (!clean) {
    return { valid: false, clean, error: 'Enter a valid destination wallet address.' };
  }
  const isEvm = /^0x[a-fA-F0-9]{40}$/.test(clean);
  const isSol = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(clean);
  if (!isEvm && !isSol) {
    return { valid: false, clean, error: 'Enter a valid ERC-20 (0x...) or Solana wallet address.' };
  }
  return { valid: true, clean };
}

export function validateComplianceFile(file: File): { valid: boolean; error?: string } {
  const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
  const extOk = /\.(pdf|jpe?g|png)$/i.test(file.name);
  if (!allowedMimes.includes(file.type) && !extOk) {
    return { valid: false, error: 'Unsupported file format. Please select a PDF, JPG, or PNG document.' };
  }
  if (file.size <= 0 || file.size > MAX_COMPLIANCE_DOC_BYTES) {
    return { valid: false, error: 'Document must be smaller than 15 MB.' };
  }
  return { valid: true };
}

export function normalizeAccountOwnerName(name: string): string {
  return String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function namesMatchAccountOwner(legalName: string, holderName: string): boolean {
  const a = normalizeAccountOwnerName(legalName);
  const b = normalizeAccountOwnerName(holderName);
  return Boolean(a && b && a === b);
}
