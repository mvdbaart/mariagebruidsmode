import type { APIRoute } from 'astro';
import { getAdminAuthFromCookies, getServiceRoleClient } from '../../../../../../lib/serverAuth';

export const GET: APIRoute = async ({ params, cookies }) => {
  const auth = await getAdminAuthFromCookies(cookies);
  if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const supabase = getServiceRoleClient();
  const { id } = params;

  const { data, error } = await supabase
    .from('landing_page_variants')
    .select('*')
    .eq('landing_page_id', id)
    .order('created_at', { ascending: true });

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  return new Response(JSON.stringify({ data }), { status: 200 });
};

export const POST: APIRoute = async ({ request, params, cookies }) => {
  const auth = await getAdminAuthFromCookies(cookies);
  if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const supabase = getServiceRoleClient();
  const { id } = params;
  const body = await request.json();

  const { data, error } = await supabase
    .from('landing_page_variants')
    .insert({
      landing_page_id: id,
      name: body.name || 'Nieuwe Variant',
      traffic_percentage: body.traffic_percentage || 0,
      show_header: body.show_header ?? true,
      show_footer: body.show_footer ?? true,
      blocks: body.blocks || [],
      meta_title: body.meta_title || null,
      meta_description: body.meta_description || null,
    })
    .select()
    .single();

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  return new Response(JSON.stringify({ data }), { status: 201 });
};
