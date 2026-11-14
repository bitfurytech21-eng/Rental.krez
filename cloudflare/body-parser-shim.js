/**
 * Cloudflare Worker-only shim for Express's optional body-parser dependency.
 *
 * worker.ts installs its own bounded, Worker-compatible request body parser.
 * Express imports body-parser while initializing its exports, even when the
 * parser helpers are never called. Aliasing this dependency prevents the
 * incompatible raw-body/iconv-lite chain from entering the Worker bundle.
 *
 * These middleware factories intentionally fail closed if accidentally used.
 */
function unsupportedParser() {
  return function bodyParserNotSupported(_req, _res, next) {
    next(new Error('Express body-parser middleware is disabled in the Cloudflare Worker. Use the Worker request parser.'));
  };
}

export const json = unsupportedParser;
export const raw = unsupportedParser;
export const text = unsupportedParser;
export const urlencoded = unsupportedParser;
export default { json, raw, text, urlencoded };
