/**
 * notFoundLogger.ts
 *
 * Logs 404 responses to `redirect_404_log` in Supabase.
 * All writes are fire-and-forget: logging failures must never affect the site.
 */

import { getServiceRoleClient } from './serverAuth';
import { getSuggestions, type Suggestion } from './redirects';

// ---------------------------------------------------------------------------
// Filter: skip assets and internal paths
// ---------------------------------------------------------------------------

const IGNORE_EXTENSIONS =
  /\.(css|js|mjs|ico|png|jpg|jpeg|gif|svg|webp|woff|woff2|ttf|eot|otf|map|txt|xml|json|pdf|zip|gz)$/i;

const IGNORE_PREFIXES = [
  '/_astro/',
  '/wp-content/',
  '/wp-includes/',
  '/__',
  '/favicon',
  '/robots',
  '/sitemap',
  '/admin/',
  '/api/',
];

export function shouldLog404(path: string): boolean {
  if (IGNORE_EXTENSIONS.test(path)) return false;
  if (IGNORE_PREFIXES.some((p) => path.startsWith(p))) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Log a 404 hit (fire-and-forget)
// ---------------------------------------------------------------------------

/**
 * Log a 404 hit for `path`.
 *
 * Call without `await` from middleware — errors are swallowed so they never
 * surface to the visitor.
 */
export async function logNotFound(
  path: string,
  request: Request
): Promise<void> {
  if (!shouldLog404(path)) return;

  let url: URL;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  const queryString = url.search || null;
  const referer = request.headers.get('referer');
  const userAgent = request.headers.get('user-agent');
  const suggestions: Suggestion[] = getSuggestions(path);

  try {
    const supabase = getServiceRoleClient();
    await supabase.rpc('upsert_404_log', {
      p_path: path,
      p_query_string: queryString,
      p_referer: referer,
      p_user_agent: userAgent,
      p_suggestions: suggestions,
    });
  } catch {
    // Logging failure must never break the site
  }
}
