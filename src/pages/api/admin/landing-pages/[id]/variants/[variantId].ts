import type { APIRoute } from 'astro';
import { getAdminAuthFromCookies, getServiceRoleClient } from '../../../../../../lib/serverAuth';

export const PUT: APIRoute = async ({ request, params, cookies }) => {
  const auth = await getAdminAuthFromCookies(cookies);
  if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const supabase = getServiceRoleClient();
  const { variantId } = params;
  const body = await request.json();

  const allowed = ['name', 'traffic_percentage', 'show_header', 'show_footer', 'blocks', 'meta_title', 'meta_description', 'is_control'];
  const updates: Record<string, any> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  const { data, error } = await supabase
    .from('landing_page_variants')
    .update(updates)
    .eq('id', variantId)
    .select()
    .single();

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  return new Response(JSON.stringify({ data }), { status: 200 });
};

export const DELETE: APIRoute = async ({ params, cookies }) => {
  const auth = await getAdminAuthFromCookies(cookies);
  if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const supabase = getServiceRoleClient();
  const { variantId } = params;

  const { error } = await supabase
    .from('landing_page_variants')
    .delete()
    .eq('id', variantId);

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
