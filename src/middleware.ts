import { defineMiddleware } from "astro:middleware";
import { clearAuthCookies, getAdminAuthFromCookies } from "./lib/serverAuth";

export const onRequest = defineMiddleware(async ({ url, redirect, cookies }, next) => {
  // If the user attempts to access the admin area
  if (url.pathname.startsWith('/admin')) {
    const adminAuth = await getAdminAuthFromCookies(cookies);
    if (!adminAuth) {
      clearAuthCookies(cookies);
      return redirect('/login');
    }
  }

  return next();
});
