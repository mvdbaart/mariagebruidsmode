import type { APIRoute } from 'astro';
import { getAdminAuthFromCookies, getServiceRoleClient } from '../../../../lib/serverAuth';

function trim(v: unknown, max = 500): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim().slice(0, max);
  return s || null;
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

export const PUT: APIRoute = async ({ request, cookies, params }) => {
  const auth = await getAdminAuthFromCookies(cookies);
  if (!auth) return json({ error: 'Niet geautoriseerd.' }, 401);

  const { id } = params;
  if (!id) return json({ error: 'ID ontbreekt.' }, 400);

  const body = await request.json().catch(() => null);
  const name = trim(body?.name, 200);
  if (!name) return json({ error: 'Naam is verplicht.' }, 400);

  const supabase = getServiceRoleClient();
  const { error } = await supabase
    .from('suppliers')
    .update({
      name,
      contact_name: trim(body?.contact_name, 200),
      email: trim(body?.email, 254),
      phone: trim(body?.phone, 40),
      website: trim(body?.website, 500),
      notes: trim(body?.notes, 2000),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) return json({ error: 'Opslaan mislukt.' }, 500);
  return json({ ok: true }, 200);
};

export const DELETE: APIRoute = async ({ cookies, params }) => {
  const auth = await getAdminAuthFromCookies(cookies);
  if (!auth) return json({ error: 'Niet geautoriseerd.' }, 401);

  const { id } = params;
  if (!id) return json({ error: 'ID ontbreekt.' }, 400);

  const supabase = getServiceRoleClient();
  const { error } = await supabase.from('suppliers').delete().eq('id', id);
  if (error) return json({ error: 'Verwijderen mislukt.' }, 500);
  return json({ ok: true }, 200);
};
