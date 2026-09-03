// -----------------------------------------------------------------------------
// Backend origin resolution
// -----------------------------------------------------------------------------
// Normal case: set VITE_API_URL (e.g. in frontend/.env) and everything just
// uses that.
//
// Devtunnel / port-forwarding case (VS Code "Ports" panel, Codespaces, etc.):
// each forwarded port gets its own public hostname, typically of the form
// "<tunnel-id>-<port>.<region>.devtunnels.ms". If the page itself was loaded
// through a forwarded port (e.g. the Vite dev server on 5173), then
// "http://127.0.0.1:8000" is meaningless to whoever's browser is loading the
// page — 127.0.0.1 resolves to *their* machine, not the host machine — so
// requests silently fail ("Unable to connect to the server"). When no
// explicit VITE_API_URL is set, we detect this pattern from the current
// hostname and swap in the backend's port (8000) to build the right forwarded
// URL instead of falling back to localhost.
function inferApiOrigin() {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/api\/v1\/?$/, '');
  }

  if (typeof window !== 'undefined') {
    const { hostname, protocol } = window.location;
    // Matches devtunnels.ms-style forwarded hostnames: "<id>-<port>.<rest>"
    const tunnelMatch = hostname.match(/^(.+)-(\d+)\.(.+\.devtunnels\.ms)$/);
    if (tunnelMatch) {
      const [, tunnelId, , rest] = tunnelMatch;
      return `${protocol}//${tunnelId}-8000.${rest}`;
    }
    // Codespaces-style forwarded hostnames: "<id>-<port>.app.github.dev"
    const codespacesMatch = hostname.match(/^(.+)-(\d+)\.(app\.github\.dev)$/);
    if (codespacesMatch) {
      const [, prefix, , rest] = codespacesMatch;
      return `${protocol}//${prefix}-8000.${rest}`;
    }
  }

  return 'http://127.0.0.1:8000';
}

// Base origin of the backend server (no /api/v1 suffix), e.g. http://127.0.0.1:8000
export const API_ORIGIN = inferApiOrigin();

/**
 * Attachment file_url values may be either:
 *  - absolute (S3 upload succeeded): "https://bucket.s3.amazonaws.com/xyz.png"
 *  - relative (local storage fallback): "/static/uploads/xyz.png"
 *
 * Relative URLs are relative to the FastAPI backend, not the frontend dev
 * server / SPA origin, so they must be resolved against API_ORIGIN before
 * being used in an <img src> or <a href> — otherwise the browser requests
 * them from the frontend's own origin and gets a 404 / broken image.
 */
export function resolveFileUrl(url) {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
}
