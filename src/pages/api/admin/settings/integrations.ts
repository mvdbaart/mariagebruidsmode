import type { APIRoute } from 'astro';
import { getAdminAuthFromCookies, getServiceRoleClient } from '../../../../lib/serverAuth';

export const PUT: APIRoute = async ({ request, cookies }) => {
  const auth = await getAdminAuthFromCookies(cookies);
  if (!auth) return new Response(JSON.stringify({ error: 'Niet geautoriseerd.' }), { status: 401, headers: { 'content-type': 'application/json' } });

  const body = await request.json().catch(() => null);
  if (!body?.integrations || typeof body.integrations !== 'object') {
    return new Response(JSON.stringify({ error: 'Ongeldige data.' }), { status: 400, headers: { 'content-type': 'application/json' } });
  }

  const supabase = getServiceRoleClient();
  const { error } = await supabase
    .from('site_settings')
    .update({ integrations: body.integrations, updated_at: new Date().toISOString() })
    .eq('id', 'current');

  if (error) return new Response(JSON.stringify({ error: 'Opslaan mislukt.' }), { status: 500, headers: { 'content-type': 'application/json' } });
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } });
};
