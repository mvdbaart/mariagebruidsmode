import type { APIRoute } from 'astro';
import { getAdminAuthFromCookies, getServiceRoleClient } from '../../../../lib/serverAuth';

const VALID_STATUSES = new Set(['betaald', 'in_behandeling', 'verzonden', 'afgehaald', 'geannuleerd']);

export const PATCH: APIRoute = async ({ params, request, cookies }) => {
  const adminAuth = await getAdminAuthFromCookies(cookies);
  if (!adminAuth) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  const id = params.id;
  if (!id) {
    return new Response(JSON.stringify({ error: 'Ongeldig ID.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const body = await request.json().catch(() => null);
  if (!body?.status || !VALID_STATUSES.has(body.status)) {
    return new Response(JSON.stringify({ error: 'Ongeldige status.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const supabase = getServiceRoleClient();
  const { error } = await supabase
    .from('customer_orders')
    .update({ status: body.status })
    .eq('id', id);

  if (error) {
    return new Response(JSON.stringify({ error: 'Status bijwerken mislukt.' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
