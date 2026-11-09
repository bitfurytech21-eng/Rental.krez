/**
 * Kretz API server entry (apps/api).
 * Serves /api/v1 routes. In local dev it can mount Vite from apps/web.
 */

import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

dotenv.config({ path: path.resolve(dirname(fileURLToPath(import.meta.url)), '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');
const webRoot = path.resolve(repoRoot, 'apps/web');

async function runServer() {
  const [{ default: v1Routes }, { correlationAndTimingMiddleware, authenticateToken, validateCsrf, errorHandler }, { logger }, { validateAdminEnvironment }] = await Promise.all([
    import('./src/routes'),
    import('./src/middleware'),
    import('./src/logger'),
    import('./src/adminAuth'),
  ]);

  process.on('uncaughtException', (err: any) => console.error('[server] Uncaught Exception:', err?.message || err));
  process.on('unhandledRejection', (reason: any) => console.error('[server] Unhandled Rejection:', (reason as any)?.message || reason));

  async function startServer() {
    const app = express();
    const server = http.createServer(app);
    const portArgIndex = process.argv.indexOf('--port');
    const portArg = portArgIndex !== -1 && process.argv[portArgIndex + 1] ? parseInt(process.argv[portArgIndex + 1], 10) : null;
    const isProd = process.env.NODE_ENV === 'production';
    const PORT = portArg || (process.env.PORT ? parseInt(process.env.PORT, 10) : 3000);

    app.use(express.json({ limit: '2mb' }));
    app.use(express.urlencoded({ extended: true, limit: '2mb' }));

    const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean);
    app.use((req, res, next) => {
      const origin = req.headers.origin;
      if (origin) {
        let sameOrigin = false;
        try { sameOrigin = new URL(origin).host === req.headers.host; } catch (_) {}
        const allowed = !isProd || sameOrigin || allowedOrigins.includes(origin.replace(/\/$/, ''));
        res.header('Vary', 'Origin');
        if (allowed) {
          res.header('Access-Control-Allow-Origin', origin);
          res.header('Access-Control-Allow-Credentials', 'true');
          res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
          res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Request-Id, X-CSRF-Token, X-XSRF-Token');
          res.header('Access-Control-Expose-Headers', 'X-Request-Id, X-CSRF-Token');
        } else if (req.method === 'OPTIONS') return res.sendStatus(403);
      }
      if (req.method === 'OPTIONS') return res.sendStatus(origin ? 200 : 204);
      next();
    });

    app.use((req, res, next) => {
      if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] && req.headers['x-forwarded-proto'] !== 'https') {
        return res.redirect(301, `https://${req.headers.host}${req.url}`);
      }
      next();
    });

    const adminEnv = validateAdminEnvironment();
    logger.log({ level: 'info', category: 'security', requestId: 'server-boot', eventType: 'ADMIN_AUTH_VALIDATION', outcome: 'success', message: `Administrator auth initialized: ${adminEnv.mode}`, metadata: { mode: adminEnv.mode } });

    app.use(correlationAndTimingMiddleware);
    app.use(authenticateToken);
    app.use(validateCsrf);

    app.get(['/api/health', '/api/v1/health'], (req: Request, res: Response) => {
      const metrics = logger.computeMetrics();
      res.json({ status: metrics.healthy ? 'healthy' : 'degraded', platform: 'Kretz API', version: '1.0.0', apiVersion: 'v1', timestamp: new Date().toISOString(), uptimeSeconds: metrics.uptimeSeconds, requestId: (req as any).id });
    });

    app.get(['/zoho-domain-verification.html', '/zoho-domain-verification_8faa2c8b.html'], (_req: Request, res: Response) => {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(200).send('38305949');
    });

    app.use('/api/v1', v1Routes);
    app.use('/api', v1Routes);
    app.use('/auth', (req, res, next) => { req.url = '/auth' + req.url; v1Routes(req, res, next); });
    app.use(['/api', '/auth'], errorHandler);

    const webDist = path.resolve(webRoot, 'dist');
    const webIndex = path.resolve(webRoot, 'index.html');
    const webPublic = path.resolve(webRoot, 'public');

    if (!isProd && process.env.SERVE_WEB === 'true') {
      try {
        const { createServer: createViteServer } = await import('vite');
        const vite = await createViteServer({
          root: webRoot,
          server: { middlewareMode: true, host: '0.0.0.0', port: PORT, hmr: false, ws: false, watch: null },
          appType: 'custom',
        });
        app.use(vite.middlewares);
        if (fs.existsSync(webPublic)) app.use(express.static(webPublic));
        app.use('*', async (req, res, next) => {
          const url = req.originalUrl;
          if (url.startsWith('/api') || url.startsWith('/auth')) return next();
          try {
            let template = fs.readFileSync(webIndex, 'utf-8');
            template = await vite.transformIndexHtml(url, template);
            res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
          } catch (e) { next(e); }
        });
      } catch (e) {
        console.warn('[server] Vite middleware unavailable, serving API only:', (e as any)?.message);
      }
    } else if (fs.existsSync(webDist)) {
      app.use(express.static(webDist));
      app.get('*', (req, res) => {
        if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/auth')) return res.status(404).json({ success: false, error: 'Endpoint not found', code: 'NOT_FOUND' });
        res.sendFile(path.resolve(webDist, 'index.html'));
      });
    } else {
      app.get('*', (req, res) => {
        if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/auth')) return res.status(404).json({ success: false, error: 'Endpoint not found', code: 'NOT_FOUND' });
        res.status(200).json({ ok: true, message: 'Kretz API running. Build apps/web or set SERVE_WEB=true for frontend.', requestId: (req as any).id });
      });
    }

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`[server] Port ${PORT} in use. Retrying in 1s...`);
        setTimeout(() => { try { server.close(); } catch (_) {} server.listen(PORT, '0.0.0.0'); }, 1000);
      } else console.error('[server] error:', err);
    });
    const shutdown = () => { try { server.close(() => process.exit(0)); } catch (_) { process.exit(0); } setTimeout(() => process.exit(0), 1000); };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    server.listen(PORT, '0.0.0.0', () => {
      logger.log({ level: 'info', category: 'system', requestId: 'req-boot', eventType: 'SERVER_LISTENING', outcome: 'success', message: `Kretz API running on ${PORT}` });
      console.log(`> Kretz API running on http://0.0.0.0:${PORT}`);
    });
  }

  startServer().catch((err) => { console.error('Failed to start server:', err); setTimeout(() => startServer().catch(console.error), 2000); });
}

runServer();
