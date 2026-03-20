import type { APIRoute } from 'astro';
import { getAdminAuthFromCookies, getServiceRoleClient } from '../../../../lib/serverAuth';

export const POST: APIRoute = async ({ request, cookies }) => {
  const adminAuth = await getAdminAuthFromCookies(cookies);
  if (!adminAuth) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('logo') as File | null;
    if (!file || file.size === 0) {
      return new Response(JSON.stringify({ error: 'Geen bestand ontvangen' }), { status: 400 });
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml'];
    if (!allowed.includes(file.type)) {
      return new Response(JSON.stringify({ error: 'Ongeldig bestandstype. Gebruik JPG, PNG, WebP, AVIF of SVG.' }), { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
    const path = `logo/logo-${stamp}.${ext}`;

    const buffer = await file.arrayBuffer();
    const supabase = getServiceRoleClient();

    const { error: uploadError } = await supabase.storage
      .from('settings')
      .upload(path, buffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      return new Response(JSON.stringify({ error: uploadError.message }), { status: 500 });
    }

    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    const url = `${supabaseUrl}/storage/v1/object/public/settings/${path}`;

    const { error: updateError } = await supabase
      .from('site_settings')
      .update({ logo_url: url, updated_at: new Date().toISOString() })
      .eq('id', 'current');

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ url }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

export const DELETE: APIRoute = async ({ cookies }) => {
  const adminAuth = await getAdminAuthFromCookies(cookies);
  if (!adminAuth) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const supabase = getServiceRoleClient();
    const { error } = await supabase
      .from('site_settings')
      .update({ logo_url: null, updated_at: new Date().toISOString() })
      .eq('id', 'current');

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
