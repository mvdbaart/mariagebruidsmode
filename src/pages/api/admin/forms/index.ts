import type { APIRoute } from 'astro';
import { getAdminAuthFromCookies, getServiceRoleClient } from '../../../../lib/serverAuth';
import { validateSlug } from '../../../../lib/forms';

export const GET: APIRoute = async ({ cookies }) => {
  const auth = await getAdminAuthFromCookies(cookies);
  if (!auth) return new Response(JSON.stringify({ error: 'Niet geautoriseerd.' }), { status: 401, headers: { 'content-type': 'application/json' } });

  const supabase = getServiceRoleClient();
  const { data, error } = await supabase
    .from('forms')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return new Response(JSON.stringify({ error: 'Ophalen mislukt.' }), { status: 500, headers: { 'content-type': 'application/json' } });
  return new Response(JSON.stringify(data), { status: 200, headers: { 'content-type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const auth = await getAdminAuthFromCookies(cookies);
  if (!auth) return new Response(JSON.stringify({ error: 'Niet geautoriseerd.' }), { status: 401, headers: { 'content-type': 'application/json' } });

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 200) : '';
  const slug = typeof body?.slug === 'string' ? body.slug.trim().slice(0, 100) : '';
  const description = typeof body?.description === 'string' ? body.description.trim().slice(0, 1000) : null;
  const fields = Array.isArray(body?.fields) ? body.fields : [];
  const is_active = body?.is_active !== false;

  if (!name) return new Response(JSON.stringify({ error: 'Naam is verplicht.' }), { status: 400, headers: { 'content-type': 'application/json' } });
  if (!slug || !validateSlug(slug)) return new Response(JSON.stringify({ error: 'Ongeldige slug (alleen kleine letters, cijfers en koppeltekens).' }), { status: 400, headers: { 'content-type': 'application/json' } });

  const supabase = getServiceRoleClient();

  // Check slug uniqueness
  const { data: existing } = await supabase.from('forms').select('id').eq('slug', slug).maybeSingle();
  if (existing) return new Response(JSON.stringify({ error: 'Deze slug is al in gebruik.' }), { status: 409, headers: { 'content-type': 'application/json' } });

  const { data, error } = await supabase
    .from('forms')
    .insert([{ name, slug, description, fields, is_active }])
    .select('id')
    .single();

  if (error) return new Response(JSON.stringify({ error: 'Aanmaken mislukt.' }), { status: 500, headers: { 'content-type': 'application/json' } });
  return new Response(JSON.stringify({ ok: true, id: data.id }), { status: 201, headers: { 'content-type': 'application/json' } });
};
