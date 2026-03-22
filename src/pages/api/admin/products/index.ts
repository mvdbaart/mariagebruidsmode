import type { APIRoute } from 'astro';
import { getAdminAuthFromCookies, getServiceRoleClient } from '../../../../lib/serverAuth';

export const POST: APIRoute = async ({ request, cookies }) => {
  const adminAuth = await getAdminAuthFromCookies(cookies);
  if (!adminAuth) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'content-type': 'application/json' } });
  }

  const body = await request.json().catch(() => null);
  if (!body?.name || !body?.slug) {
    return new Response(JSON.stringify({ error: 'Naam en slug zijn verplicht.' }), { status: 400, headers: { 'content-type': 'application/json' } });
  }

  const supabase = getServiceRoleClient();
  const { data, error } = await supabase
    .from('products')
    .insert({
      name: String(body.name).trim(),
      slug: String(body.slug).trim(),
      brand: body.brand ? String(body.brand).trim() : null,
      collection_id: body.collection_id || null,
      description: body.description ? String(body.description) : null,
      features: Array.isArray(body.features) ? body.features : [],
      images: Array.isArray(body.images) ? body.images : [],
      qualities: Array.isArray(body.qualities) ? body.qualities : [],
      price_range: body.price_range ? String(body.price_range).trim() : null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Product create error:', error);
    return new Response(JSON.stringify({ error: 'Product aanmaken mislukt.' }), { status: 500, headers: { 'content-type': 'application/json' } });
  }

  return new Response(JSON.stringify({ ok: true, id: data.id }), { status: 201, headers: { 'content-type': 'application/json' } });
};
