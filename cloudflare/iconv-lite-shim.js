/**
 * Cloudflare Worker-only iconv-lite shim.
 *
 * Express/body-parser imports raw-body during module initialization, and
 * raw-body imports iconv-lite even though this Worker parses request bodies
 * with its own bounded TextDecoder/URLSearchParams implementation.
 *
 * Keep the package surface available for module initialization, but fail
 * closed if an unused body-parser path ever attempts actual transcoding.
 */
export function encodingExists() {
  return true;
}

export function decode() {
  throw new Error('iconv-lite transcoding is disabled in the Cloudflare Worker.');
}

export function encode() {
  throw new Error('iconv-lite transcoding is disabled in the Cloudflare Worker.');
}

export function getCodec() {
  throw new Error('iconv-lite transcoding is disabled in the Cloudflare Worker.');
}

export default { encodingExists, decode, encode, getCodec };
