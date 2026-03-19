import type { APIRoute } from 'astro';
import { getAdminAuthFromCookies, getServiceRoleClient } from '../../../../lib/serverAuth';
import { validateSlug } from '../../../../lib/forms';

export const PUT: APIRoute = async ({ request, cookies, params }) => {
  const auth = await getAdminAuthFromCookies(cookies);
  if (!auth) return new Response(JSON.stringify({ error: 'Niet geautoriseerd.' }), { status: 401, headers: { 'content-type': 'application/json' } });

  const { id } = params;
  if (!id) return new Response(JSON.stringify({ error: 'ID ontbreekt.' }), { status: 400, headers: { 'content-type': 'application/json' } });

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 200) : '';
  const slug = typeof body?.slug === 'string' ? body.slug.trim().slice(0, 100) : '';
  const description = typeof body?.description === 'string' ? body.description.trim().slice(0, 1000) : null;
  const fields = Array.isArray(body?.fields) ? body.fields : [];
  const is_active = body?.is_active !== false;

  if (!name) return new Response(JSON.stringify({ error: 'Naam is verplicht.' }), { status: 400, headers: { 'content-type': 'application/json' } });
  if (!slug || !validateSlug(slug)) return new Response(JSON.stringify({ error: 'Ongeldige slug.' }), { status: 400, headers: { 'content-type': 'application/json' } });

  const supabase = getServiceRoleClient();

  // Check slug uniqueness (exclude current record)
  const { data: existing } = await supabase.from('forms').select('id').eq('slug', slug).neq('id', id).maybeSingle();
  if (existing) return new Response(JSON.stringify({ error: 'Deze slug is al in gebruik.' }), { status: 409, headers: { 'content-type': 'application/json' } });

  const { error } = await supabase
    .from('forms')
    .update({ name, slug, description, fields, is_active, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return new Response(JSON.stringify({ error: 'Opslaan mislukt.' }), { status: 500, headers: { 'content-type': 'application/json' } });
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ cookies, params }) => {
  const auth = await getAdminAuthFromCookies(cookies);
  if (!auth) return new Response(JSON.stringify({ error: 'Niet geautoriseerd.' }), { status: 401, headers: { 'content-type': 'application/json' } });

  const { id } = params;
  if (!id) return new Response(JSON.stringify({ error: 'ID ontbreekt.' }), { status: 400, headers: { 'content-type': 'application/json' } });

  const supabase = getServiceRoleClient();
  const { error } = await supabase.from('forms').delete().eq('id', id);

  if (error) return new Response(JSON.stringify({ error: 'Verwijderen mislukt.' }), { status: 500, headers: { 'content-type': 'application/json' } });
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } });
};
