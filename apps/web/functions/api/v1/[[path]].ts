/**
 * Cloudflare Pages Functions Proxy
 * Proxies /api/v1/* requests from the frontend (Cloudflare Pages) to the
 * backend Workers backend (Cloudflare Workers).
 *
 * This keeps all API traffic same-origin (pages domain) so cookies,
 * CSRF tokens, and CORS work transparently without cross-origin issues.
 *
 * Environment variable required:
 *   WORKERS_BACKEND_URL = https://<worker-name>.<account>.workers.dev
 */

export const onRequest = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);

  const workersUrl = env.WORKERS_BACKEND_URL;
  if (!workersUrl) {
    return new Response(
      JSON.stringify({ success: false, error: 'Workers backend URL not configured. Set WORKERS_BACKEND_URL in Pages environment variables.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Strip trailing slash from workersUrl for clean URL construction
  const base = workersUrl.endsWith('/') ? workersUrl.slice(0, -1) : workersUrl;

  // Construct target URL: workersUrl + original pathname + search
  const targetUrl = new URL(`${base}${url.pathname}${url.search}`);

  // Forward headers (remove host-specific headers that Cloudflare manages)
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('content-length'); // Let the underlying fetch set this

  // Determine body for methods that support it
  const method = request.method;
  const body = method === 'GET' || method === 'HEAD' || method === 'OPTIONS'
    ? undefined
    : request.body;

  const response = await fetch(targetUrl.toString(), {
    method,
    headers,
    body,
    redirect: 'manual', // Don't follow redirects automatically; pass through
  });

  // Build response headers (strip hop-by-hop headers)
  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete('content-length');
  responseHeaders.delete('transfer-encoding');
  responseHeaders.delete('connection');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
};
