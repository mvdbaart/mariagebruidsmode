import type { APIRoute } from 'astro';
import { getAdminAuthFromCookies, getServiceRoleClient } from '../../../../../lib/serverAuth';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

export const POST: APIRoute = async ({ params, request, cookies }) => {
  const adminAuth = await getAdminAuthFromCookies(cookies);
  if (!adminAuth) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('photo') as File | null;
    if (!file || file.size === 0) {
      return new Response(JSON.stringify({ error: 'Geen bestand ontvangen' }), { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return new Response(
        JSON.stringify({ error: 'Ongeldig bestandstype. Gebruik JPG, PNG, WebP of AVIF.' }),
        { status: 400 }
      );
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
    const path = `${id}/photo-${stamp}.${ext}`;

    const buffer = await file.arrayBuffer();
    const supabase = getServiceRoleClient();

    const { error: uploadError } = await supabase.storage
      .from('employees')
      .upload(path, buffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      return new Response(JSON.stringify({ error: uploadError.message }), { status: 500 });
    }

    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    const url = `${supabaseUrl}/storage/v1/object/public/employees/${path}`;

    const { error: updateError } = await supabase
      .from('employees')
      .update({ profile_photo_url: url, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ url }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

export const DELETE: APIRoute = async ({ params, cookies }) => {
  const adminAuth = await getAdminAuthFromCookies(cookies);
  if (!adminAuth) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400 });
  }

  try {
    const supabase = getServiceRoleClient();
    const { error } = await supabase
      .from('employees')
      .update({ profile_photo_url: null, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
