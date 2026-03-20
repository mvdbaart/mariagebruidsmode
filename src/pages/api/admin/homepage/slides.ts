import type { APIRoute } from 'astro';
import { getAdminAuthFromCookies, getServiceRoleClient } from '../../../../lib/serverAuth';

export const GET: APIRoute = async () => {
  const supabase = getServiceRoleClient();
  const { data, error } = await supabase
    .from('hero_slides')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify(data), { status: 200 });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const adminAuth = await getAdminAuthFromCookies(cookies);
  if (!adminAuth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  try {
    const body = await request.json();
    const supabase = getServiceRoleClient();

    // Get next sort_order
    const { data: last } = await supabase
      .from('hero_slides')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    const sort_order = (last?.sort_order ?? -1) + 1;

    const { data, error } = await supabase
      .from('hero_slides')
      .insert({
        title: body.title ?? '',
        subtitle: body.subtitle ?? null,
        eyebrow: body.eyebrow ?? null,
        image_url: body.image_url,
        button1_text: body.button1_text ?? null,
        button1_url: body.button1_url ?? null,
        button2_text: body.button2_text ?? null,
        button2_url: body.button2_url ?? null,
        text_align: body.text_align ?? 'center',
        overlay_opacity: body.overlay_opacity ?? 40,
        is_active: body.is_active ?? true,
        sort_order,
      })
      .select()
      .single();

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    return new Response(JSON.stringify(data), { status: 201 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
