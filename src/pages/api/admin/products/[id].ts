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
      qualities: Array.isArray(body.qualities) ? body.qualities : [],
      price_range: body.price_range ? String(body.price_range).trim() : null,
      // Structured attributes
      pasvorm:     body.pasvorm     ? String(body.pasvorm).trim()     : null,
      hals:        body.hals        ? String(body.hals).trim()        : null,
      mouw:        body.mouw        ? String(body.mouw).trim()        : null,
      sale_price:  body.sale_price  ? String(body.sale_price).trim()  : null,
      in_stock:    typeof body.in_stock === 'boolean' ? body.in_stock : true,
      materialen:  Array.isArray(body.materialen)  ? body.materialen  : [],
      kleur:       Array.isArray(body.kleur)        ? body.kleur       : [],
      maten:       Array.isArray(body.maten)        ? body.maten       : [],
      categorieen: Array.isArray(body.categorieen)  ? body.categorieen : [],
    })
    .eq('id', id);

  if (error) {
    console.error('Product update error:', error);
    return new Response(JSON.stringify({ error: 'Product opslaan mislukt.' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};

export const DELETE: APIRoute = async ({ params, cookies }) => {
  const adminAuth = await getAdminAuthFromCookies(cookies);
  if (!adminAuth) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'content-type': 'application/json' } });
  }

  const id = params.id;
  if (!id) {
    return new Response(JSON.stringify({ error: 'Ongeldig product ID.' }), { status: 400, headers: { 'content-type': 'application/json' } });
  }

  const supabase = getServiceRoleClient();
  const { error } = await supabase.from('products').delete().eq('id', id);

  if (error) {
    console.error('Product delete error:', error);
    return new Response(JSON.stringify({ error: 'Product verwijderen mislukt.' }), { status: 500, headers: { 'content-type': 'application/json' } });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } });
};
