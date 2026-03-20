import type { APIRoute } from 'astro';
import { getAdminAuthFromCookies, getServiceRoleClient } from '../../../../../lib/serverAuth';

// Accepts: { slides: [{ id: string, sort_order: number }] }
export const PUT: APIRoute = async ({ request, cookies }) => {
  const adminAuth = await getAdminAuthFromCookies(cookies);
  if (!adminAuth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  try {
    const { slides } = await request.json() as { slides: { id: string; sort_order: number }[] };
    if (!Array.isArray(slides)) {
      return new Response(JSON.stringify({ error: 'Ongeldig formaat' }), { status: 400 });
    }

    const supabase = getServiceRoleClient();
    await Promise.all(
      slides.map(({ id, sort_order }) =>
        supabase.from('hero_slides').update({ sort_order, updated_at: new Date().toISOString() }).eq('id', id)
      )
    );

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
