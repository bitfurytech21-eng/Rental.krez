/**
 * Safe UI error text. Preserve useful diagnostics while masking credential-like
 * assignments, bearer/JWT values, and standalone six-digit verification codes.
 */
export function safeErrorMessage(error: unknown, fallback: string): string {
  const raw = error instanceof Error ? error.message : '';
  if (!raw) return fallback;
  const safe = raw
    .replace(/\bBearer\s+[A-Za-z0-9._~+\/-]+=*/gi, 'Bearer [redacted]')
    .replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, '[redacted token]')
    .replace(/(?:password|passphrase|passcode|otp|verification[_ -]?code|security[_ -]?code|access[_ -]?token|refresh[_ -]?token|authorization)\s*[:=]\s*["']?[^,\s;'"<>]+/gi, '[redacted]')
    .replace(/\b\d{6}\b/g, '[redacted]');
  return safe.trim() || fallback;
}
