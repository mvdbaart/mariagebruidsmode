import type { APIRoute } from 'astro';
import { getAdminAuthFromCookies, getServiceRoleClient } from '../../../../../lib/serverAuth';

export const PUT: APIRoute = async ({ request, cookies, params }) => {
  const adminAuth = await getAdminAuthFromCookies(cookies);
  if (!adminAuth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  try {
    const body = await request.json();
    const supabase = getServiceRoleClient();

    const { data, error } = await supabase
      .from('hero_slides')
      .update({
        title: body.title,
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
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id!)
      .select()
      .single();

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    return new Response(JSON.stringify(data), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

export const DELETE: APIRoute = async ({ cookies, params }) => {
  const adminAuth = await getAdminAuthFromCookies(cookies);
  if (!adminAuth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const supabase = getServiceRoleClient();
  const { error } = await supabase.from('hero_slides').delete().eq('id', params.id!);

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
