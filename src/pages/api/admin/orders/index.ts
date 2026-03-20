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

export const GET: APIRoute = async ({ cookies, url }) => {
  const auth = await getAdminAuthFromCookies(cookies);
  if (!auth) return json({ error: 'Niet geautoriseerd.' }, 401);

  const customerId = url.searchParams.get('customer_id');
  const supabase = getServiceRoleClient();

  let query = supabase
    .from('orders')
    .select('*, customers(first_name, last_name), suppliers(name)')
    .order('created_at', { ascending: false });

  if (customerId) query = query.eq('customer_id', customerId);

  const { data, error } = await query;
  if (error) return json({ error: 'Ophalen mislukt.' }, 500);
  return json(data, 200);
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const auth = await getAdminAuthFromCookies(cookies);
  if (!auth) return json({ error: 'Niet geautoriseerd.' }, 401);

  const body = await request.json().catch(() => null);
  const product_description = trim(body?.product_description, 500);
  if (!product_description) return json({ error: 'Omschrijving is verplicht.' }, 400);

  const price = body?.price ? parseFloat(body.price) : null;

  const supabase = getServiceRoleClient();
  const { data, error } = await supabase
    .from('orders')
    .insert([{
      customer_id: trim(body?.customer_id, 36) || null,
      supplier_id: trim(body?.supplier_id, 36) || null,
      product_description,
      reference_number: trim(body?.reference_number, 100),
      order_date: trim(body?.order_date, 20) || null,
      expected_delivery_date: trim(body?.expected_delivery_date, 20) || null,
      actual_delivery_date: trim(body?.actual_delivery_date, 20) || null,
      status: trim(body?.status, 20) || 'besteld',
      price: price && !isNaN(price) ? price : null,
      notes: trim(body?.notes, 2000),
    }])
    .select('id')
    .single();

  if (error) return json({ error: 'Aanmaken mislukt.' }, 500);
  return json({ ok: true, id: data.id }, 201);
};
