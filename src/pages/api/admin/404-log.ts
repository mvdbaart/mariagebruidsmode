import type { APIRoute } from 'astro';
import { getAdminAuthFromCookies, getServiceRoleClient } from '../../../lib/serverAuth';

export const GET: APIRoute = async ({ cookies, url }) => {
  const adminAuth = await getAdminAuthFromCookies(cookies);
  if (!adminAuth) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const limit = Math.min(Number(url.searchParams.get('limit') ?? 100), 500);
  const offset = Number(url.searchParams.get('offset') ?? 0);

  const supabase = getServiceRoleClient();
  const { data, error, count } = await supabase
    .from('redirect_404_log')
    .select('*', { count: 'exact' })
    .order('hit_count', { ascending: false })
    .order('last_seen_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ data, total: count }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};

/** DELETE /api/admin/404-log — clear entire log (maintenance action) */
export const DELETE: APIRoute = async ({ cookies }) => {
  const adminAuth = await getAdminAuthFromCookies(cookies);
  if (!adminAuth) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const supabase = getServiceRoleClient();
  // Delete all rows; safer than TRUNCATE since RLS is enabled
  const { error } = await supabase
    .from('redirect_404_log')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(null, { status: 204 });
};
