/**
 * Cloudflare Workers entry placeholder.
 * The production Express API lives in apps/api/server.ts and apps/api/src/*.
 * To deploy on Workers, adapt routes to a fetch-based framework (Hono) here.
 */
export default {
  async fetch(_request: Request): Promise<Response> {
    return Response.json(
      { ok: false, error: 'Workers adapter not implemented; use Express API (apps/api) or migrate routes to Hono here.' },
      { status: 501 }
    );
  },
};
