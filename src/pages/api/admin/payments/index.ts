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

  let query = supabase.from('payments').select('*').order('payment_date', { ascending: false });
  if (customerId) query = query.eq('customer_id', customerId);

  const { data, error } = await query;
  if (error) return json({ error: 'Ophalen mislukt.' }, 500);
  return json(data, 200);
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const auth = await getAdminAuthFromCookies(cookies);
  if (!auth) return json({ error: 'Niet geautoriseerd.' }, 401);

  const body = await request.json().catch(() => null);
  const customer_id = trim(body?.customer_id, 36);
  const amount = parseFloat(body?.amount);
  const type = trim(body?.type, 20);

  if (!customer_id || isNaN(amount) || amount <= 0 || !type) {
    return json({ error: 'Klant, bedrag en type zijn verplicht.' }, 400);
  }

  const supabase = getServiceRoleClient();
  const { data, error } = await supabase
    .from('payments')
    .insert([{
      customer_id,
      amount,
      type,
      payment_date: trim(body?.payment_date, 20) || new Date().toISOString().slice(0, 10),
      method: trim(body?.method, 20) || null,
      notes: trim(body?.notes, 1000) || null,
    }])
    .select('id')
    .single();

  if (error) return json({ error: 'Aanmaken mislukt.' }, 500);
  return json({ ok: true, id: data.id }, 201);
};
