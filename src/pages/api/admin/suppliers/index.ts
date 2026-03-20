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

export const GET: APIRoute = async ({ cookies }) => {
  const auth = await getAdminAuthFromCookies(cookies);
  if (!auth) return json({ error: 'Niet geautoriseerd.' }, 401);

  const supabase = getServiceRoleClient();
  const { data, error } = await supabase.from('suppliers').select('*').order('name');
  if (error) return json({ error: 'Ophalen mislukt.' }, 500);
  return json(data, 200);
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const auth = await getAdminAuthFromCookies(cookies);
  if (!auth) return json({ error: 'Niet geautoriseerd.' }, 401);

  const body = await request.json().catch(() => null);
  const name = trim(body?.name, 200);
  if (!name) return json({ error: 'Naam is verplicht.' }, 400);

  const supabase = getServiceRoleClient();
  const { data, error } = await supabase
    .from('suppliers')
    .insert([{
      name,
      contact_name: trim(body?.contact_name, 200),
      email: trim(body?.email, 254),
      phone: trim(body?.phone, 40),
      website: trim(body?.website, 500),
      notes: trim(body?.notes, 2000),
    }])
    .select('id')
    .single();

  if (error) return json({ error: 'Aanmaken mislukt.' }, 500);
  return json({ ok: true, id: data.id }, 201);
};
