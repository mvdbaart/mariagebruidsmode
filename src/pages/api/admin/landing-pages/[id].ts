import type { APIRoute } from 'astro';
import { getAdminAuthFromCookies, getServiceRoleClient } from '../../../../lib/serverAuth';

export const GET: APIRoute = async ({ params, cookies }) => {
  const auth = await getAdminAuthFromCookies(cookies);
  if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const supabase = getServiceRoleClient();
  const { id } = params;

  const { data: page, error } = await supabase
    .from('landing_pages')
    .select('*, landing_page_variants(*)')
    .eq('id', id)
    .single();

  if (error || !page) return new Response(JSON.stringify({ error: 'Niet gevonden' }), { status: 404 });

  // Load analytics per variant
  const variantIds = (page.landing_page_variants || []).map((v: any) => v.id);
  const { data: events } = await supabase
    .from('landing_page_events')
    .select('event_type, variant_id')
    .in('variant_id', variantIds.length > 0 ? variantIds : ['none']);

  const statsMap: Record<string, { views: number; conversions: number }> = {};
  for (const v of page.landing_page_variants || []) {
    statsMap[v.id] = { views: 0, conversions: 0 };
  }
  for (const e of events || []) {
    if (!statsMap[e.variant_id]) continue;
    if (e.event_type === 'view') statsMap[e.variant_id].views++;
    else if (e.event_type === 'conversion' || e.event_type === 'cta_click') statsMap[e.variant_id].conversions++;
  }

  const variantsWithStats = (page.landing_page_variants || []).map((v: any) => ({
    ...v,
    stats: statsMap[v.id] || { views: 0, conversions: 0 },
  }));

  return new Response(JSON.stringify({ data: { ...page, landing_page_variants: variantsWithStats } }), { status: 200 });
};

export const PUT: APIRoute = async ({ request, params, cookies }) => {
  const auth = await getAdminAuthFromCookies(cookies);
  if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const supabase = getServiceRoleClient();
  const { id } = params;
  const body = await request.json();

  const allowed = ['name', 'slug', 'status', 'auto_select_winner', 'min_views', 'winner_variant_id'];
  const updates: Record<string, any> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  const { data, error } = await supabase
    .from('landing_pages')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  return new Response(JSON.stringify({ data }), { status: 200 });
};

export const DELETE: APIRoute = async ({ params, cookies }) => {
  const auth = await getAdminAuthFromCookies(cookies);
  if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const supabase = getServiceRoleClient();
  const { id } = params;

  const { error } = await supabase.from('landing_pages').delete().eq('id', id);

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
