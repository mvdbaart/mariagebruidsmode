import type { APIRoute } from 'astro';
import { getAdminAuthFromCookies, getServiceRoleClient } from '../../../lib/serverAuth';

// POST /api/admin/opening-exceptions — mark a date as open
export const POST: APIRoute = async ({ request, cookies }) => {
  const auth = await getAdminAuthFromCookies(cookies);
  if (!auth) {
    return err('Niet geautoriseerd.', 401);
  }

  const body = await request.json().catch(() => null);
  const date = typeof body?.date === 'string' ? body.date.trim() : null;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return err('Ongeldige datum.');
  }

  const supabase = getServiceRoleClient();
  const { error } = await supabase
    .from('opening_exceptions')
    .upsert({ date }, { onConflict: 'date' });

  if (error) return err('Opslaan mislukt.');

  return ok();
};

// DELETE /api/admin/opening-exceptions — remove a date from exceptions
export const DELETE: APIRoute = async ({ request, cookies }) => {
  const auth = await getAdminAuthFromCookies(cookies);
  if (!auth) {
    return err('Niet geautoriseerd.', 401);
  }

  const body = await request.json().catch(() => null);
  const date = typeof body?.date === 'string' ? body.date.trim() : null;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return err('Ongeldige datum.');
  }

  const supabase = getServiceRoleClient();
  const { error } = await supabase
    .from('opening_exceptions')
    .delete()
    .eq('date', date);

  if (error) return err('Verwijderen mislukt.');

  return ok();
};

function ok() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function err(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
