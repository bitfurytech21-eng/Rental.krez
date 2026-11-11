export function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

export function isValidPassword(password: string): { valid: boolean; reason?: string } {
  if (password.length < 8) {
    return { valid: false, reason: 'Password must be at least 8 characters long.' };
  }
  return { valid: true };
}

export function isValidIBAN(iban: string): boolean {
  const clean = iban.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return clean.length >= 15 && clean.length <= 34;
}

export function isValidCryptoAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address.trim());
}
