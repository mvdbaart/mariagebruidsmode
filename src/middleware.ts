import { defineMiddleware } from "astro:middleware";
import { clearAuthCookies, getAdminAuthFromCookies } from "./lib/serverAuth";
import { getActiveRedirects } from "./lib/redirects";

export const onRequest = defineMiddleware(async ({ url, redirect, cookies }, next) => {
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

  // Admin auth guard
  if (url.pathname.startsWith('/admin')) {
    const adminAuth = await getAdminAuthFromCookies(cookies);
    if (!adminAuth) {
      clearAuthCookies(cookies);
      return redirect('/login');
    }
  }

  return next();
});
