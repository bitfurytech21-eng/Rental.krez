export const MIN_DEPOSIT_EUR = 100;
export const MAX_DEPOSIT_EUR = 5_000_000;
export const MIN_WITHDRAWAL_EUR = 250;
export const MAX_COMPLIANCE_DOC_BYTES = 15 * 1024 * 1024;

export function validateDepositAmount(raw: string | number): { valid: boolean; value: number; error?: string } {
  const value = typeof raw === 'number' ? raw : Number(String(raw).replace(/,/g, '.'));
  if (!Number.isFinite(value) || value <= 0) {
    return { valid: false, value: 0, error: 'Enter a valid positive EUR amount.' };
  }
  if (value < MIN_DEPOSIT_EUR) {
    return { valid: false, value, error: `Minimum deposit is €${MIN_DEPOSIT_EUR}.` };
  }
  if (value > MAX_DEPOSIT_EUR) {
    return { valid: false, value, error: `Single deposits cannot exceed €${MAX_DEPOSIT_EUR.toLocaleString('en-IE')}.` };
  }
  return { valid: true, value: Math.round(value * 100) / 100 };
}

export function validateWithdrawalAmount(
  raw: string | number,
  availableBalance: number
): { valid: boolean; value: number; error?: string } {
  const value = typeof raw === 'number' ? raw : Number(String(raw).replace(/,/g, '.'));
  if (!Number.isFinite(value) || value <= 0) {
    return { valid: false, value: 0, error: 'Enter a valid positive EUR amount.' };
  }
  if (value < MIN_WITHDRAWAL_EUR) {
    return { valid: false, value, error: `Minimum withdrawal is €${MIN_WITHDRAWAL_EUR}.` };
  }
  if (value > availableBalance) {
    return { valid: false, value, error: `Amount exceeds your available balance of €${availableBalance.toFixed(2)}.` };
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
