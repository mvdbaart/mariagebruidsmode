import type { APIRoute } from 'astro';
import { getAdminAuthFromCookies, getServiceRoleClient } from '../../../../lib/serverAuth';

const VALID_TYPES = new Set(['dress', 'suit', 'accessory']);
const VALID_TITLE_FONTS = new Set(['bridal', 'tailored']);

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
  const hasCoreFields = body?.title && body?.slug && VALID_TYPES.has(body?.type);
  const hasFontField = body?.title_font === undefined || VALID_TITLE_FONTS.has(body?.title_font);

  if ((!hasCoreFields && body?.title_font === undefined) || !hasFontField) {
    return new Response(JSON.stringify({ error: 'Ongeldige collectiegegevens.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const supabase = getServiceRoleClient();
  const updateData: Record<string, unknown> = {};

  if (body?.title !== undefined) updateData.title = body.title;
  if (body?.slug !== undefined) updateData.slug = body.slug;
  if (body?.type !== undefined) updateData.type = body.type;
  if (body?.description !== undefined) updateData.description = body.description ?? null;
  if (body?.image_url !== undefined) updateData.image_url = body.image_url ?? null;
  if (body?.title_font !== undefined) updateData.title_font = VALID_TITLE_FONTS.has(body.title_font) ? body.title_font : 'bridal';

  if (Object.keys(updateData).length === 0) {
    return new Response(JSON.stringify({ error: 'Geen velden om bij te werken.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const { error } = await supabase
    .from('collections')
    .update(updateData)
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
