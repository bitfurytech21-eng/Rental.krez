/**
 * Kretz Full-Stack Server
 * Mounts Express API (/api/v1) and Vite dev middlewares on port 3000
 */

import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import v1Routes from './server/routes';
import { correlationAndTimingMiddleware, authenticateToken, errorHandler } from './server/middleware';
import { logger } from './server/logger';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  // Body Parsers
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  // CORS & Security Headers
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Request-Id');
    res.header('Access-Control-Expose-Headers', 'X-Request-Id');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Correlation IDs and Request Timing
  app.use(correlationAndTimingMiddleware);

  // Authentication Context
  app.use(authenticateToken);

  // Health endpoint
  app.get('/api/health', (req: Request, res: Response) => {
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
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {}
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);

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
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
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
  process.exit(1);
});
