import type { APIRoute } from 'astro';
import { getAdminAuthFromCookies, getServiceRoleClient } from '../../../../lib/serverAuth';

const VALID_TYPES = new Set(['dress', 'suit', 'accessory']);

export const PUT: APIRoute = async ({ params, request, cookies }) => {
  const adminAuth = await getAdminAuthFromCookies(cookies);
  if (!adminAuth) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  const id = params.id;
  if (!id) {
    return new Response(JSON.stringify({ error: 'Ongeldig collectie ID.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const body = await request.json().catch(() => null);
  if (!body?.title || !body?.slug || !VALID_TYPES.has(body?.type)) {
    return new Response(JSON.stringify({ error: 'Titel, slug en type zijn verplicht.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const supabase = getServiceRoleClient();
  const { error } = await supabase
    .from('collections')
    .update({
      title: body.title,
      type: body.type,
      slug: body.slug,
      description: body.description ?? null,
      image_url: body.image_url ?? null,
    })
    .eq('id', id);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
