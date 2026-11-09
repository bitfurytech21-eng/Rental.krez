/**
 * Hono app (Cloudflare Workers / fetch runtime).
 * Core migrated routes first; 501 fallback for unmigrated legacy surface.
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import core from './hono-routes-core';

type Bindings = { API_VERSION?: string; ALLOWED_ORIGINS?: string };
const app = new Hono<{ Bindings: Bindings }>();

function corsOrigin(origin: string, allowed: string[], allowAll: boolean) {
  if (!origin) return '*';
  if (allowed.length > 0) return allowed.includes(origin) ? origin : '';
  return allowAll ? origin : '';
}

app.use('/api/*', async (c, next) => {
  const allowed = (c.env?.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const allowAll = allowed.length === 0 && c.env?.API_VERSION !== 'production-strict';
  return cors({
    origin: (o) => corsOrigin(o, allowed, allowAll),
    allowHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-CSRF-Token', 'X-XSRF-Token'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['X-Request-Id', 'X-CSRF-Token'],
    credentials: true,
  })(c, next);
});
app.use('/auth/*', async (c, next) => {
  const allowed = (c.env?.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  return cors({
    origin: (o) => corsOrigin(o, allowed, allowed.length === 0),
    allowHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-XSRF-Token'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['X-Request-Id', 'X-CSRF-Token'],
    credentials: true,
  })(c, next);
});

app.route('/', core);

app.notFound((c) => c.json({ success: false, error: 'Not found.', apiVersion: c.env?.API_VERSION || 'v1', path: new URL(c.req.url).pathname }, 404));
app.onError((err, c) => {
  console.error('[worker]', err?.message || err);
  return c.json({ success: false, error: 'Internal server error.', apiVersion: c.env?.API_VERSION || 'v1', requestId: c.req.header('x-request-id') || undefined }, 500);
});
app.all('/api/*', (c) => c.json({
  success: false,
  error: 'Endpoint not yet migrated to Workers/Hono runtime. Deploy Express API (apps/api/server.ts) for full legacy surface, or migrate this route into apps/api/src/hono-routes-core.ts.',
  apiVersion: c.env?.API_VERSION || 'v1', path: new URL(c.req.url).pathname,
}, 501));
app.all('/auth/*', (c) => c.json({ success: false, error: 'Auth endpoint not yet migrated to Workers/Hono runtime.' }, 501));

export default app;
