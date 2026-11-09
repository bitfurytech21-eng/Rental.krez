import type { Context } from 'hono';

export async function verifyTurnstile(c: Context<any>, token: string | undefined): Promise<{ ok: boolean; message?: string }> {
  const secret = c.env?.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: true, message: 'Turnstile secret not configured (non-production/dev fallback).' };
  if (!token) return { ok: false, message: 'Turnstile token required.' };
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token, remoteip: c.req.header('cf-connecting-ip') || '' }),
    });
    const data = await res.json() as any;
    return data?.success ? { ok: true } : { ok: false, message: 'Turnstile verification failed.' };
  } catch {
    return { ok: false, message: 'Turnstile verification unavailable.' };
  }
}

export function requireCsrfForCookieAuth(session: any, c: Context<any>): { ok: boolean; message?: string } {
  if (!session?.viaCookie) return { ok: true };
  const sent = c.req.header('x-csrf-token') || c.req.header('x-xsrf-token');
  if (session?.csrfToken && sent === session.csrfToken) return { ok: true };
  // Allow if session lacks csrf token (legacy/admin) — tighten when all sessions issue tokens.
  if (!session?.csrfToken) return { ok: true };
  return { ok: false, message: 'Invalid or missing CSRF token.' };
}
