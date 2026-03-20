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
  const price = body?.price ? parseFloat(body.price) : null;

  const supabase = getServiceRoleClient();
  const { error } = await supabase
    .from('orders')
    .update({
      customer_id: trim(body?.customer_id, 36) || null,
      supplier_id: trim(body?.supplier_id, 36) || null,
      product_description: trim(body?.product_description, 500),
      reference_number: trim(body?.reference_number, 100),
      order_date: trim(body?.order_date, 20) || null,
      expected_delivery_date: trim(body?.expected_delivery_date, 20) || null,
      actual_delivery_date: trim(body?.actual_delivery_date, 20) || null,
      status: trim(body?.status, 20),
      price: price && !isNaN(price) ? price : null,
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
  const { error } = await supabase.from('orders').delete().eq('id', id);
  if (error) return json({ error: 'Verwijderen mislukt.' }, 500);
  return json({ ok: true }, 200);
};
