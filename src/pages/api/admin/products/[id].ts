import type { APIRoute } from 'astro';
import { getAdminAuthFromCookies, getServiceRoleClient } from '../../../../lib/serverAuth';

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
    return new Response(JSON.stringify({ error: 'Ongeldig product ID.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const body = await request.json().catch(() => null);
  if (!body?.name || !body?.slug) {
    return new Response(JSON.stringify({ error: 'Naam en slug zijn verplicht.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const supabase = getServiceRoleClient();
  const { error } = await supabase
    .from('products')
    .update({
      name: body.name,
      brand: body.brand ?? null,
      collection_id: body.collection_id ?? null,
      slug: body.slug,
      description: body.description ?? null,
      features: Array.isArray(body.features) ? body.features : [],
      images: Array.isArray(body.images) ? body.images : [],
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
