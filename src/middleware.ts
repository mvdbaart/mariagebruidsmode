import { defineMiddleware } from "astro:middleware";
import { clearAuthCookies, getAdminAuthFromCookies } from "./lib/serverAuth";
import { getActiveRedirects } from "./lib/redirects";
import { shouldLog404, logNotFound } from "./lib/notFoundLogger";

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function normalizeOrigin(raw: string | null): string | null {
  if (!raw) return null;
  try {
    return new URL(raw).origin.toLowerCase();
  } catch {
    return null;
  }
}

function getAllowedOrigins(url: URL, request: Request): Set<string> {
  const allowed = new Set<string>();
  allowed.add(url.origin.toLowerCase());

  const siteUrl = (import.meta.env.SITE_URL as string | undefined)?.trim();
  if (siteUrl) {
    const normalized = normalizeOrigin(siteUrl);
    if (normalized) allowed.add(normalized);
  }

  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto');
  if (forwardedHost) {
    const proto = (forwardedProto || url.protocol.replace(':', '') || 'https').split(',')[0].trim();
    const host = forwardedHost.split(',')[0].trim();
    const normalized = normalizeOrigin(`${proto}://${host}`);
    if (normalized) allowed.add(normalized);
  }

  return allowed;
}

function isValidAdminApiCsrfRequest(request: Request, url: URL): boolean {
  const method = request.method.toUpperCase();
  if (SAFE_METHODS.has(method)) return true;

  const requestOrigin =
    normalizeOrigin(request.headers.get('origin')) ||
    normalizeOrigin(request.headers.get('referer'));
  if (!requestOrigin) return false;

  const allowedOrigins = getAllowedOrigins(url, request);
  return allowedOrigins.has(requestOrigin);
}

export const onRequest = defineMiddleware(async ({ url, redirect, cookies, request }, next) => {
  // Normalize path: strip trailing slash (keep bare "/")
  const path = url.pathname.replace(/\/$/, '') || '/';

  // Only run redirect logic for non-admin, non-api paths
  if (!url.pathname.startsWith('/admin') && !url.pathname.startsWith('/api')) {
    try {
      const redirects = await getActiveRedirects();

      // 1. Exact match
      const exact = redirects.exact.get(path);
      if (exact) {
        return new Response(null, {
          status: exact.status,
          headers: { Location: exact.to },
        });
      }

      // 2. Prefix match (sorted longest-first, so most specific wins)
      const prefix = redirects.prefixes.find(p => path.startsWith(p.from));
      if (prefix) {
        return new Response(null, {
          status: prefix.status,
          headers: { Location: prefix.to },
        });
      }
    } catch {
      // Redirect lookup failure must not break the site
    }
  }

  // CSRF protection for admin API mutating requests
  if (url.pathname.startsWith('/api/admin')) {
    if (!isValidAdminApiCsrfRequest(request, url)) {
      return new Response(JSON.stringify({ error: 'Invalid request origin.' }), {
        status: 403,
        headers: { 'content-type': 'application/json' },
      });
    }
  }

  // Admin auth guard
  if (url.pathname.startsWith('/admin')) {
    const adminAuth = await getAdminAuthFromCookies(cookies);
    if (!adminAuth) {
      clearAuthCookies(cookies);
      return redirect('/login');
    }
  }

  const response = await next();

  // 404 monitor: log non-asset 404s so we can spot missing redirects
  if (
    response.status === 404 &&
    !url.pathname.startsWith('/admin') &&
    !url.pathname.startsWith('/api') &&
    shouldLog404(url.pathname)
  ) {
    // Fire-and-forget: logging must never delay or break the response
    logNotFound(url.pathname, request).catch(() => {});
  }

  return response;
});
