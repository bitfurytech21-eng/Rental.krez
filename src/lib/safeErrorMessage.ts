/**
 * Safe UI error text. Never expose credential values from backend or provider
 * errors: passwords, one-time/security codes, tokens, secrets, or auth headers.
 */
export function safeErrorMessage(error: unknown, fallback: string): string {
  const raw = error instanceof Error ? error.message : '';
  if (!raw) return fallback;

  const safe = raw
    .replace(/\\bBearer\\s+[^\\s,;]+/gi, 'Bearer [redacted]')
    .replace(/\\beyJ[A-Za-z0-9_-]{8,}\\.[A-Za-z0-9_-]{8,}\\.[A-Za-z0-9_-]{8,}\\b/g, '[redacted token]')
    .replace(/(?:password|passphrase|passcode|otp|(?:verification|security|email|one[-_ ]time)?[_ -]?code|access[_ -]?token|refresh[_ -]?token|id[_ -]?token|authorization|secret)\\s*[:=]\\s*["']?[^,\\s;'"<>]+/gi, '[redacted]')
    .replace(/([?&](?:access_token|refresh_token|token|code|otp|password)=)[^&#\\s]+/gi, '$1[redacted]')
    .replace(/\\b\\d{4,10}\\b/g, '[redacted]');

  return safe.trim() || fallback;
}
