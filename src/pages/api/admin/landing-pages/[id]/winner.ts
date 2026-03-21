import type { APIRoute } from 'astro';
import { getAdminAuthFromCookies, getServiceRoleClient } from '../../../../../lib/serverAuth';

// GET: compute auto-winner suggestion
export const GET: APIRoute = async ({ params, cookies }) => {
  const auth = await getAdminAuthFromCookies(cookies);
  if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const supabase = getServiceRoleClient();
  const { id } = params;

  const { data: page } = await supabase
    .from('landing_pages')
    .select('*, landing_page_variants(id, name, is_control)')
    .eq('id', id)
    .single();

  if (!page) return new Response(JSON.stringify({ error: 'Niet gevonden' }), { status: 404 });

  const variants = page.landing_page_variants || [];
  const variantIds = variants.map((v: any) => v.id);

  const { data: events } = await supabase
    .from('landing_page_events')
    .select('event_type, variant_id')
    .in('variant_id', variantIds.length > 0 ? variantIds : ['none']);

  const statsMap: Record<string, { views: number; conversions: number; rate: number }> = {};
  for (const v of variants) {
    statsMap[v.id] = { views: 0, conversions: 0, rate: 0 };
  }
  for (const e of events || []) {
    if (!statsMap[e.variant_id]) continue;
    if (e.event_type === 'view') statsMap[e.variant_id].views++;
    else if (e.event_type === 'conversion' || e.event_type === 'cta_click') statsMap[e.variant_id].conversions++;
  }
  for (const vid of Object.keys(statsMap)) {
    const s = statsMap[vid];
    s.rate = s.views > 0 ? s.conversions / s.views : 0;
  }

  const minViews = page.min_views || 100;
  const qualified = variants.filter((v: any) => statsMap[v.id]?.views >= minViews);
  const allQualified = qualified.length === variants.length;

  let suggestedWinner: any = null;
  if (allQualified && variants.length > 0) {
    const sorted = [...variants].sort((a: any, b: any) => statsMap[b.id].rate - statsMap[a.id].rate);
    suggestedWinner = sorted[0];
  }

  return new Response(JSON.stringify({
    data: {
      stats: statsMap,
      suggested_winner: suggestedWinner,
      all_qualified: allQualified,
      min_views: minViews,
    },
  }), { status: 200 });
};

// POST: declare winner manually or apply auto-winner
export const POST: APIRoute = async ({ request, params, cookies }) => {
  const auth = await getAdminAuthFromCookies(cookies);
  if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const supabase = getServiceRoleClient();
  const { id } = params;
  const body = await request.json();
  const { variant_id } = body;

  if (!variant_id) {
    return new Response(JSON.stringify({ error: 'variant_id is verplicht' }), { status: 400 });
  }

  const { data, error } = await supabase
    .from('landing_pages')
    .update({ winner_variant_id: variant_id, status: 'completed' })
    .eq('id', id)
    .select()
    .single();

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  return new Response(JSON.stringify({ data }), { status: 200 });
};
