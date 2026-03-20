import type { APIRoute } from 'astro';
import { getAdminAuthFromCookies, getServiceRoleClient } from '../../../lib/serverAuth';
import { invalidateRedirectCache } from '../../../lib/redirects';

export const GET: APIRoute = async ({ cookies }) => {
  const adminAuth = await getAdminAuthFromCookies(cookies);
  if (!adminAuth) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const supabase = getServiceRoleClient();
  const { data, error } = await supabase
    .from('redirects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify(data), { status: 200 });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const adminAuth = await getAdminAuthFromCookies(cookies);
  if (!adminAuth) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Ongeldige JSON' }), { status: 400 });
  }

  const { from_path, to_path, status_code, match_type, note, is_active } = body as Record<string, unknown>;

  if (typeof from_path !== 'string' || !from_path.startsWith('/')) {
    return new Response(JSON.stringify({ error: 'from_path moet beginnen met /' }), { status: 400 });
  }
  if (typeof to_path !== 'string' || to_path.trim() === '') {
    return new Response(JSON.stringify({ error: 'to_path is verplicht' }), { status: 400 });
  }

  const supabase = getServiceRoleClient();
  const { data, error } = await supabase
    .from('redirects')
    .insert({
      from_path: from_path.trim(),
      to_path: (to_path as string).trim(),
      status_code: Number(status_code) || 301,
      match_type: match_type === 'prefix' ? 'prefix' : 'exact',
      note: typeof note === 'string' ? note.trim() || null : null,
      is_active: is_active !== false,
    })
    .select()
    .single();

  if (error) {
    const msg = error.code === '23505'
      ? 'Er bestaat al een redirect voor dit pad en type.'
      : error.message;
    return new Response(JSON.stringify({ error: msg }), { status: 400 });
  }

  invalidateRedirectCache();
  return new Response(JSON.stringify(data), { status: 201 });
};
