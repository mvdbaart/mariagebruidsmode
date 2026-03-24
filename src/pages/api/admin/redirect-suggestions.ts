import type { APIRoute } from 'astro';
import { getAdminAuthFromCookies, getServiceRoleClient } from '../../../lib/serverAuth';

export const GET: APIRoute = async ({ cookies, url }) => {
  const adminAuth = await getAdminAuthFromCookies(cookies);
  if (!adminAuth) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const status = url.searchParams.get('status') ?? 'pending';
  const validStatuses = ['pending', 'approved', 'rejected', 'all'];
  if (!validStatuses.includes(status)) {
    return new Response(JSON.stringify({ error: 'Ongeldige status' }), { status: 400 });
  }

  const supabase = getServiceRoleClient();
  let query = supabase
    .from('redirect_suggestions')
    .select('*')
    .order('confidence', { ascending: false })
    .order('created_at', { ascending: false });

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
