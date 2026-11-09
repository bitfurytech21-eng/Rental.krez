/**
 * Standalone API entry (no Vite middleware). Re-exports route app for Workers-compatible adapters if needed.
 */
import express from 'express';
import dotenv from 'dotenv';
import v1Routes from './routes';
import { correlationAndTimingMiddleware, authenticateToken, validateCsrf, errorHandler } from './middleware';
import { logger } from './logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(correlationAndTimingMiddleware);
app.use(authenticateToken);
app.use(validateCsrf);
app.get('/api/health', (_req, res) => {
  const metrics = logger.computeMetrics();
  res.json({ status: metrics.healthy ? 'healthy' : 'degraded', apiVersion: 'v1', uptimeSeconds: metrics.uptimeSeconds });
});
app.use('/api/v1', v1Routes);
app.use('/api', v1Routes);
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => logger.log({ level: 'info', category: 'system', requestId: 'req-boot', eventType: 'SERVER_LISTENING', outcome: 'success', message: `API on ${PORT}` }));
}

export default app;
