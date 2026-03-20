import type { APIRoute } from 'astro';
import { getAdminAuthFromCookies, getServiceRoleClient } from '../../../../../lib/serverAuth';

export const POST: APIRoute = async ({ request, cookies }) => {
  const adminAuth = await getAdminAuthFromCookies(cookies);
  if (!adminAuth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get('image') as File | null;
    if (!file || file.size === 0) {
      return new Response(JSON.stringify({ error: 'Geen bestand ontvangen' }), { status: 400 });
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    if (!allowed.includes(file.type)) {
      return new Response(JSON.stringify({ error: 'Gebruik JPG, PNG, WebP of AVIF.' }), { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
    const path = `hero/slide-${stamp}.${ext}`;

    const buffer = await file.arrayBuffer();
    const supabase = getServiceRoleClient();

    const { error: uploadError } = await supabase.storage
      .from('settings')
      .upload(path, buffer, { contentType: file.type, upsert: false });

    if (uploadError) return new Response(JSON.stringify({ error: uploadError.message }), { status: 500 });

    const url = `${import.meta.env.PUBLIC_SUPABASE_URL}/storage/v1/object/public/settings/${path}`;
    return new Response(JSON.stringify({ url }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
