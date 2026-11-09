/**
 * Hono app (Cloudflare Workers / fetch runtime).
 * Implements the API surface used by the web client. Node-only/Express-only
 * legacy handlers (SMTP fs, Express router internals) remain in Express entries.
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { ALL_KRETZ_MEMBERS } from '../../../packages/database/src/kretzTeam';
import { BLOG_POSTS } from '../../../packages/database/src/blogPosts';
import { dailyPaymentService } from './dailyPaymentService';
import { generatePropertyPaymentsCsv } from '../../../packages/validation/src/distributionService';

type Bindings = {
  API_VERSION?: string;
  ALLOWED_ORIGINS?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('/api/*', async (c, next) => {
  const allowed = (c.env?.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const origin = c.req.header('origin');
  const corsMw = cors({
    origin: (o) => {
      if (!o) return '*';
      if (allowed.length === 0) return o;
      return allowed.includes(o) ? o : '';
    },
    allowHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-CSRF-Token', 'X-XSRF-Token'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['X-Request-Id'],
    credentials: true,
  });
  return corsMw(c, next);
});

app.use('/auth/*', async (c, next) => cors({ origin: '*', credentials: true })(c, next));

app.get('/api/health', (c) => c.json({ status: 'healthy', platform: 'Kretz API (Workers/Hono)', version: '1.0.0', apiVersion: c.env?.API_VERSION || 'v1', timestamp: new Date().toISOString() }));
app.get('/api/v1/health', (c) => c.json({ status: 'healthy', platform: 'Kretz API (Workers/Hono)', version: '1.0.0', apiVersion: c.env?.API_VERSION || 'v1', timestamp: new Date().toISOString() }));

app.get('/api/v1/blog', (c) => {
  const category = c.req.query('category') || 'All';
  const search = c.req.query('q') || '';
  let posts = [...BLOG_POSTS];
  if (category !== 'All') posts = posts.filter(p => p.category === category);
  if (search) {
    const term = search.toLowerCase();
    posts = posts.filter(p => p.title.toLowerCase().includes(term) || p.excerpt.toLowerCase().includes(term) || p.tags?.some((t: string) => t.toLowerCase().includes(term)));
  }
  posts.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  return c.json({ success: true, data: posts, apiVersion: 'v1' });
});
app.get('/api/blog', (c) => app.fetch(new Request(new URL('/api/v1/blog?' + new URL(c.req.url).searchParams.toString(), c.req.url), c.req.raw), c.env, c.executionCtx));

app.get('/api/v1/blog/:slug', (c) => {
  const post = BLOG_POSTS.find(p => p.slug === c.req.param('slug'));
  if (!post) return c.json({ success: false, error: 'Blog post not found', apiVersion: 'v1' }, 404);
  return c.json({ success: true, data: post, apiVersion: 'v1' });
});

app.get('/api/v1/team', (c) => c.json({ success: true, data: ALL_KRETZ_MEMBERS, apiVersion: 'v1' }));

app.post('/api/v1/translate', async (c) => {
  try {
    const mod = await import('./translationController');
    // Express handler expects (req,res); in Workers we expose a fetch-style fallback via module contract if present.
    if (typeof (mod as any).translateFetch === 'function') return (mod as any).translateFetch(c.req.raw);
  } catch {}
  return c.json({ success: false, error: 'Translation service not available in Workers runtime; use Express API deployment.', apiVersion: 'v1' }, 501);
});

app.get('/api/v1/admin/distributions/records', (c) => {
  const records = dailyPaymentService.getRecords({ propertyId: c.req.query('propertyId') || undefined, userId: c.req.query('userId') || undefined });
  if (c.req.query('format') === 'csv') {
    return new Response(generatePropertyPaymentsCsv(records), { headers: { 'Content-Type': 'text/csv; charset=utf-8' } });
  }
  return c.json({ success: true, data: records, apiVersion: 'v1' });
});
app.get('/api/v1/distributions/export', (c) => {
  const records = dailyPaymentService.getRecords({ propertyId: c.req.query('propertyId') || undefined });
  if ((c.req.query('format') || 'csv') === 'json') return c.json(records);
  return new Response(generatePropertyPaymentsCsv(records, c.req.query('propertyId') || 'All Properties'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="distributions-${c.req.query('propertyId') || 'all'}.csv"`,
    },
  });
});

app.all('/api/*', (c) => c.json({
  success: false,
  error: 'Endpoint not yet migrated to Workers/Hono runtime. Deploy Express API (apps/api/server.ts) for full legacy surface, or migrate this route into apps/api/src/hono-app.ts.',
  apiVersion: c.env?.API_VERSION || 'v1',
  path: new URL(c.req.url).pathname,
}, 501));
app.all('/auth/*', (c) => c.json({ success: false, error: 'Auth endpoint not yet migrated to Workers/Hono runtime.' }, 501));

export default app;
