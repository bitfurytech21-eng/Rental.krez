/**
 * Kretz Full-Stack Express Server & Architecture Entry Point
 * 
 * Provides:
 * - Versioned REST API under /api/v1
 * - Correlation Request IDs (X-Request-Id)
 * - Structured JSON logging & system monitoring
 * - Security middleware, rate limiting, and RBAC authentication
 * - Backwards-compatible aliases for legacy integrations
 */

import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import v1Routes from './routes';
import { correlationAndTimingMiddleware, authenticateToken, errorHandler } from './middleware';
import { logger } from './logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Body Parsers
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// CORS & Preflight
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

// Correlation ID & Request Access Timing
app.use(correlationAndTimingMiddleware);

// Extract JWT/Bearer authentication context
app.use(authenticateToken);

// Health check endpoint
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

// Mount /api/v1 primary namespace
app.use('/api/v1', v1Routes);

// Backwards-compatibility mount for legacy /api routes
app.use('/api', v1Routes);

// Centralized error handling
app.use(errorHandler);

// If run directly (e.g. node / tsx server/index.ts)
if (process.env.NODE_ENV !== 'test' && !process.env.VITE_DEV_SERVER) {
  // Can listen if standalone
  const server = app.listen(PORT, () => {
    logger.log({
      level: 'info',
      category: 'system',
      requestId: 'req-boot',
      eventType: 'SERVER_LISTENING',
      outcome: 'success',
      message: `Kretz API Server listening on port ${PORT} (/api/v1)`
    });
  });
}

export default app;
