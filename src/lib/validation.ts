export function isValidEmail(email: string): boolean {
  const clean = email.trim();
  if (clean.length < 5 || clean.length > 254) return false;
  const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return re.test(clean);
}

export interface PasswordChecklist {
  minLength: boolean;
  maxLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasDigit: boolean;
}

export function getPasswordChecklist(password: string): PasswordChecklist {
  return {
    minLength: password.length >= 12,
    maxLength: password.length <= 128,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasDigit: /[0-9]/.test(password),
  };
}

export function isValidPassword(password: string): { valid: boolean; reason?: string } {
  if (!password || password.length < 8) {
    return { valid: false, reason: 'Password must be at least 8 characters long.' };
  }
  if (password.length > 128) {
    return { valid: false, reason: 'Password must not exceed 128 characters.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one uppercase letter (A-Z).' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one lowercase letter (a-z).' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one number (0-9).' };
  }
  return { valid: true };
}

export function isValidIBAN(iban: string): boolean {
  const clean = iban.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (clean.length < 15 || clean.length > 34) return false;
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(clean)) return false;

  const rearranged = `${clean.slice(4)}${clean.slice(0, 4)}`;
  let remainder = 0;
  for (let i = 0; i < rearranged.length; i += 1) {
    const ch = rearranged.charCodeAt(i);
    const digits = ch >= 65 && ch <= 90 ? String(ch - 55) : rearranged[i];
    for (let j = 0; j < digits.length; j += 1) {
      remainder = (remainder * 10 + Number(digits[j])) % 97;
    }
  }
  return remainder === 1;
}

export function isValidCryptoAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address.trim());
}
