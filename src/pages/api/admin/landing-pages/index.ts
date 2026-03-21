import type { APIRoute } from 'astro';
import { getAdminAuthFromCookies, getServiceRoleClient } from '../../../../lib/serverAuth';

export const GET: APIRoute = async ({ request, cookies }) => {
  const auth = await getAdminAuthFromCookies(cookies);
  if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const supabase = getServiceRoleClient();

  const { data: pages, error } = await supabase
    .from('landing_pages')
    .select('*, landing_page_variants(id, name, traffic_percentage, is_control)')
    .order('created_at', { ascending: false });

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  // Enrich with analytics stats
  const enriched = await Promise.all((pages || []).map(async (page: any) => {
    const variantIds = (page.landing_page_variants || []).map((v: any) => v.id);
    if (variantIds.length === 0) return { ...page, total_views: 0, total_conversions: 0 };

    const { data: events } = await supabase
      .from('landing_page_events')
      .select('event_type, variant_id')
      .in('variant_id', variantIds);

    const views = (events || []).filter((e: any) => e.event_type === 'view').length;
    const conversions = (events || []).filter((e: any) =>
      e.event_type === 'conversion' || e.event_type === 'cta_click'
    ).length;

    return { ...page, total_views: views, total_conversions: conversions };
  }));

  return new Response(JSON.stringify({ data: enriched }), { status: 200 });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const auth = await getAdminAuthFromCookies(cookies);
  if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const supabase = getServiceRoleClient();
  const body = await request.json();
  const { name, slug } = body;

  if (!name || !slug) {
    return new Response(JSON.stringify({ error: 'Naam en slug zijn verplicht' }), { status: 400 });
  }

  // Create landing page
  const { data: page, error } = await supabase
    .from('landing_pages')
    .insert({ name, slug })
    .select()
    .single();

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  // Auto-create two default variants (A + B, each 50%)
  const { error: variantError } = await supabase
    .from('landing_page_variants')
    .insert([
      { landing_page_id: page.id, name: 'Variant A', is_control: true, traffic_percentage: 50, blocks: [] },
      { landing_page_id: page.id, name: 'Variant B', is_control: false, traffic_percentage: 50, blocks: [] },
    ]);

  if (variantError) return new Response(JSON.stringify({ error: variantError.message }), { status: 500 });

  return new Response(JSON.stringify({ data: page }), { status: 201 });
};
