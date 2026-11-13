/**
 * Cloudflare Workers entry point for the existing Kretz Express API.
 *
 * Keep the API Worker separate from the Cloudflare Pages frontend.
 * The Node HTTP bridge is the supported Cloudflare adapter for Express.
 */
import express, { Request, Response } from 'express';
import { httpServerHandler } from 'cloudflare:node';
import v1Routes from './server/routes';
import {
  correlationAndTimingMiddleware,
  authenticateToken,
  validateCsrf,
  errorHandler
} from './server/middleware';
import { logger } from './server/logger';
import { validateAdminEnvironment } from './server/adminAuth';

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Credentials are never allowed with a wildcard CORS origin.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    let sameOrigin = false;
    try {
      sameOrigin = new URL(origin).host === req.headers.host;
    } catch {
      sameOrigin = false;
    }

    const allowed = !isProduction || sameOrigin || allowedOrigins.includes(origin.replace(/\/$/, ''));
    res.header('Vary', 'Origin');
    if (allowed) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Request-Id, X-CSRF-Token, X-XSRF-Token'
      );
      res.header('Access-Control-Expose-Headers', 'X-Request-Id, X-CSRF-Token');
    } else if (req.method === 'OPTIONS') {
      return res.sendStatus(403);
    }
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(origin ? 200 : 204);
  }
  next();
});

// Cloudflare terminates TLS at the edge; reject an explicitly insecure forwarded request.
app.use((req, res, next) => {
  if (isProduction && req.headers['x-forwarded-proto'] && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
});

const adminEnvironment = validateAdminEnvironment();
logger.log({
  level: 'info',
  category: 'security',
  requestId: 'worker-boot',
  eventType: 'ADMIN_AUTH_VALIDATION',
  outcome: adminEnvironment.configured ? 'success' : 'warning',
  message: `Administrator authentication mode: ${adminEnvironment.mode}`,
  metadata: { mode: adminEnvironment.mode, isProduction }
});

app.use(correlationAndTimingMiddleware);
app.use(authenticateToken);
app.use(validateCsrf);

app.get(['/api/health', '/api/v1/health'], (req: Request, res: Response) => {
  const metrics = logger.computeMetrics();
  res.json({
    status: metrics.healthy ? 'healthy' : 'degraded',
    platform: 'Kretz Prime Real Estate Platform API',
    version: '1.0.0',
    apiVersion: 'v1',
    timestamp: new Date().toISOString(),
    uptimeSeconds: metrics.uptimeSeconds,
    requestId: (req as any).id
  });
});

app.get(['/zoho-domain-verification.html', '/zoho-domain-verification_8faa2c8b.html'], (_req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send('38305949');
});

// Preserve the existing versioned API, legacy API and direct auth paths.
app.use('/api/v1', v1Routes);
app.use('/api', v1Routes);
app.use('/auth', (req, res, next) => {
  req.url = '/auth' + req.url;
  v1Routes(req, res, next);
});
app.use(['/api', '/auth'], errorHandler);

const server = app.listen(8787);
export default httpServerHandler(server);
