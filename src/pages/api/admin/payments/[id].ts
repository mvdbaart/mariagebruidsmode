import type { APIRoute } from 'astro';
import { getAdminAuthFromCookies, getServiceRoleClient } from '../../../../lib/serverAuth';

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

export const DELETE: APIRoute = async ({ cookies, params }) => {
  const auth = await getAdminAuthFromCookies(cookies);
  if (!auth) return json({ error: 'Niet geautoriseerd.' }, 401);

  const { id } = params;
  if (!id) return json({ error: 'ID ontbreekt.' }, 400);

  const supabase = getServiceRoleClient();
  const { error } = await supabase.from('payments').delete().eq('id', id);
  if (error) return json({ error: 'Verwijderen mislukt.' }, 500);
  return json({ ok: true }, 200);
};
