/**
 * Cloudflare Workers fetch entry (Hono).
 */
import app from './hono-app';

export default {
  fetch: app.fetch,
};
