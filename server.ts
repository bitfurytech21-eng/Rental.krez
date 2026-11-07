/**
 * Kretz Full-Stack Server
 * Mounts Express API (/api/v1) and Vite dev middlewares on port 3000
 */

import express, { Request, Response } from 'express';
import http from 'http';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import v1Routes from './server/routes';
import { correlationAndTimingMiddleware, authenticateToken, validateCsrf, errorHandler } from './server/middleware';
import { logger } from './server/logger';
import { validateAdminEnvironment } from './server/adminAuth';

dotenv.config();

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Global resilience listeners to prevent unexpected dev server process exits
process.on('uncaughtException', (err: any) => {
  console.error('[server] Uncaught Exception caught safely:', err?.message || err);
});

process.on('unhandledRejection', (reason: any) => {
  console.error('[server] Unhandled Rejection caught safely:', reason?.message || reason);
});

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  // Resolve port and environment for both AI Studio dev server and Cloud deployments (Cloud Run, etc.)
  const portArgIndex = process.argv.indexOf('--port');
  const portArg = portArgIndex !== -1 && process.argv[portArgIndex + 1] ? parseInt(process.argv[portArgIndex + 1], 10) : null;
  const isProd = process.env.NODE_ENV === 'production';
  const PORT = portArg || (process.env.PORT ? parseInt(process.env.PORT, 10) : 3000);

  // Body Parsers
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  // CORS & Security Headers with Cookie Credentials and CSRF Exposure
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
    } else {
      res.header('Access-Control-Allow-Origin', '*');
    }
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Request-Id, X-CSRF-Token, X-XSRF-Token');
    res.header('Access-Control-Expose-Headers', 'X-Request-Id, X-CSRF-Token');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Enforce HTTPS in production environments behind proxies
  app.use((req, res, next) => {
    if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] && req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });

  // Startup Administrator Environment Validation
  const adminEnv = validateAdminEnvironment();
  logger.log({
    level: 'info',
    category: 'security',
    requestId: 'server-boot',
    eventType: 'ADMIN_AUTH_VALIDATION',
    outcome: 'success',
    message: `Administrator authentication engine initialized in mode: ${adminEnv.mode}`,
    metadata: { mode: adminEnv.mode, isProduction: process.env.NODE_ENV === 'production' }
  });

  // Correlation IDs and Request Timing
  app.use(correlationAndTimingMiddleware);

  // Authentication Context
  app.use(authenticateToken);

  // CSRF Protection for state-changing operations
  app.use(validateCsrf);

  // Health endpoint
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

  // Versioned API Routes (/api/v1)
  app.use('/api/v1', v1Routes);

  // Legacy API fallback (/api)
  app.use('/api', v1Routes);

  // Error handling for /api routes
  app.use('/api', errorHandler);

  // In development, mount Vite dev server middlewares
  if (!isProd) {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
        hmr: false,
        ws: false,
        watch: null
      },
      appType: 'custom',
    });
    app.use(vite.middlewares);
    app.use(express.static(path.resolve(__dirname, 'public')));

    // Fallback for HTML navigation routes
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      if (url.startsWith('/api')) {
        return next();
      }
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        next(e);
      }
    });
  } else {
    // Production static file serving
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      if (req.originalUrl.startsWith('/api')) {
        return res.status(404).json({ success: false, error: 'Endpoint not found', code: 'NOT_FOUND' });
      }
      const distIndexPath = path.resolve(__dirname, 'dist', 'index.html');
      if (fs.existsSync(distIndexPath)) {
        res.sendFile(distIndexPath);
      } else {
        res.sendFile(path.resolve(__dirname, 'index.html'));
      }
    });
  }

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[server] Port ${PORT} already in use. Retrying in 1s...`);
      setTimeout(() => {
        try {
          server.close();
        } catch (_) {}
        server.listen(PORT, '0.0.0.0');
      }, 1000);
    } else {
      console.error('[server] Unhandled server error:', err);
    }
  });

  const handleShutdown = () => {
    try {
      server.close(() => {
        process.exit(0);
      });
    } catch (_) {
      process.exit(0);
    }
    setTimeout(() => process.exit(0), 1000);
  };

  process.on('SIGTERM', handleShutdown);
  process.on('SIGINT', handleShutdown);

  server.listen(PORT, '0.0.0.0', () => {
    logger.log({
      level: 'info',
      category: 'system',
      requestId: 'req-boot',
      eventType: 'SERVER_LISTENING',
      outcome: 'success',
      message: `Kretz Unified Full-Stack Platform running on port ${PORT} (/api/v1 and frontend)`
    });
    console.log(`> Kretz Unified Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  // Retry instead of immediately exiting the process
  setTimeout(() => {
    startServer().catch((e) => console.error('Secondary start failure:', e));
  }, 2000);
});
