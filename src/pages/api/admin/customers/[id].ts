import type { APIRoute } from 'astro';
import { getAdminAuthFromCookies, getServiceRoleClient } from '../../../../lib/serverAuth';

function trim(v: unknown, max = 500): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim().slice(0, max);
  return s || null;
}

export const PUT: APIRoute = async ({ request, cookies, params }) => {
  const auth = await getAdminAuthFromCookies(cookies);
  if (!auth) return json({ error: 'Niet geautoriseerd.' }, 401);

  const { id } = params;
  if (!id) return json({ error: 'ID ontbreekt.' }, 400);

  const body = await request.json().catch(() => null);
  const first_name = trim(body?.first_name, 100);
  const last_name = trim(body?.last_name, 100);
  if (!first_name || !last_name) return json({ error: 'Voornaam en achternaam zijn verplicht.' }, 400);

  const supabase = getServiceRoleClient();
  const { error } = await supabase
    .from('customers')
    .update({
      first_name,
      last_name,
      email: trim(body?.email, 254),
      phone: trim(body?.phone, 40),
      wedding_date: trim(body?.wedding_date, 20) || null,
      wedding_venue: trim(body?.wedding_venue, 200),
      size_clothing: trim(body?.size_clothing, 20),
      size_shoe: trim(body?.size_shoe, 20),
      measure_bust: trim(body?.measure_bust, 20),
      measure_waist: trim(body?.measure_waist, 20),
      measure_hips: trim(body?.measure_hips, 20),
      measure_height: trim(body?.measure_height, 20),
      style_wishes: trim(body?.style_wishes, 2000),
      chosen_product_id: trim(body?.chosen_product_id, 36) || null,
      order_status: trim(body?.order_status, 30),
      delivery_date: trim(body?.delivery_date, 20) || null,
      price: trim(body?.price, 50),
      notes: trim(body?.notes, 5000),
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
  const { error } = await supabase.from('customers').delete().eq('id', id);
  if (error) return json({ error: 'Verwijderen mislukt.' }, 500);
  return json({ ok: true }, 200);
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
