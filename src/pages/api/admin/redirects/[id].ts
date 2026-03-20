import type { APIRoute } from 'astro';
import { getAdminAuthFromCookies, getServiceRoleClient } from '../../../../lib/serverAuth';
import { invalidateRedirectCache } from '../../../../lib/redirects';

export const PUT: APIRoute = async ({ request, cookies, params }) => {
  const adminAuth = await getAdminAuthFromCookies(cookies);
  if (!adminAuth) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ error: 'Ontbrekend id' }), { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Ongeldige JSON' }), { status: 400 });
  }

  const allowed = ['from_path', 'to_path', 'status_code', 'match_type', 'note', 'is_active'];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  if ('from_path' in update && (typeof update.from_path !== 'string' || !(update.from_path as string).startsWith('/'))) {
    return new Response(JSON.stringify({ error: 'from_path moet beginnen met /' }), { status: 400 });
  }

  const supabase = getServiceRoleClient();
  const { data, error } = await supabase
    .from('redirects')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    const msg = error.code === '23505'
      ? 'Er bestaat al een redirect voor dit pad en type.'
      : error.message;
    return new Response(JSON.stringify({ error: msg }), { status: 400 });
  }

  invalidateRedirectCache();
  return new Response(JSON.stringify(data), { status: 200 });
};

export const DELETE: APIRoute = async ({ cookies, params }) => {
  const adminAuth = await getAdminAuthFromCookies(cookies);
  if (!adminAuth) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ error: 'Ontbrekend id' }), { status: 400 });
  }

  const supabase = getServiceRoleClient();
  const { error } = await supabase
    .from('redirects')
    .delete()
    .eq('id', id);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  invalidateRedirectCache();
  return new Response(null, { status: 204 });
};
