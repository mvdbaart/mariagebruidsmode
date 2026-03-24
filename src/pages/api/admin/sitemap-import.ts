import type { APIRoute } from 'astro';
import { getAdminAuthFromCookies } from '../../../lib/serverAuth';
import { importFromSitemap } from '../../../lib/sitemapImporter';
import { invalidateRedirectCache } from '../../../lib/redirects';

export const POST: APIRoute = async ({ cookies, request }) => {
  const adminAuth = await getAdminAuthFromCookies(cookies);
  if (!adminAuth) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  let sitemapUrl: string | undefined;
  try {
    const body = await request.json().catch(() => ({}));
    if (typeof body?.url === 'string' && body.url.startsWith('https://')) {
      sitemapUrl = body.url;
    }
  } catch {
    // Use default
  }

  try {
    const result = await importFromSitemap(sitemapUrl);

    // Invalidate cache so newly added redirects take effect immediately
    if (result.approved > 0) {
      invalidateRedirectCache();
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }
};
