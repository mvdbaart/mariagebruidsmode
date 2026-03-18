import type { APIRoute } from 'astro';
import { getAdminAuthFromCookies, getServiceRoleClient } from '../../../../lib/serverAuth';

export const POST: APIRoute = async ({ request, cookies }) => {
  const adminAuth = await getAdminAuthFromCookies(cookies);
  if (!adminAuth) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'content-type': 'application/json' } });
  }

  const body = await request.json().catch(() => null);
  if (!body?.bride_name || !body?.groom_name) {
    return new Response(JSON.stringify({ error: 'Naam bruid en bruidegom zijn verplicht.' }), { status: 400, headers: { 'content-type': 'application/json' } });
  }

  const supabase = getServiceRoleClient();
  const { data, error } = await supabase
    .from('real_weddings')
    .insert({
      bride_name: String(body.bride_name).trim(),
      groom_name: String(body.groom_name).trim(),
      wedding_date: body.wedding_date || null,
      story: body.story ? String(body.story) : null,
      cover_image: body.cover_image ? String(body.cover_image).trim() : null,
      gallery_images: Array.isArray(body.gallery_images) ? body.gallery_images : [],
      slug: body.slug ? String(body.slug).trim() : null,
    })
    .select('id')
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'content-type': 'application/json' } });
  }

  return new Response(JSON.stringify({ ok: true, id: data.id }), { status: 201, headers: { 'content-type': 'application/json' } });
};
