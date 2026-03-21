import type { APIRoute } from 'astro';
import { getAdminAuthFromCookies, getServiceRoleClient } from '../../../lib/serverAuth';

export const GET: APIRoute = async ({ cookies }) => {
  const adminAuth = await getAdminAuthFromCookies(cookies);
  if (!adminAuth) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const supabase = getServiceRoleClient();
  const { data, error } = await supabase
    .from('site_settings')
    .select('*')
    .eq('id', 'current')
    .single();

  if (error) {
    console.error('Settings fetch error:', error);
    return new Response(JSON.stringify({ error: 'Instellingen ophalen mislukt.' }), { status: 500 });
  }

  return new Response(JSON.stringify(data), { status: 200 });
};

export const PUT: APIRoute = async ({ request, cookies }) => {
  const adminAuth = await getAdminAuthFromCookies(cookies);
  if (!adminAuth) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const body = await request.json();
    const supabase = getServiceRoleClient();
    
    const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.colors !== undefined) updatePayload.colors = body.colors;
    if (body.typography !== undefined) updatePayload.typography = body.typography;
    if (body.ui_styles !== undefined) updatePayload.ui_styles = body.ui_styles;
    if (body.site_metadata !== undefined) updatePayload.site_metadata = body.site_metadata;
    if (body.contact_info !== undefined) updatePayload.contact_info = body.contact_info;
    if (body.homepage !== undefined) updatePayload.homepage = body.homepage;

    const { data, error } = await supabase
      .from('site_settings')
      .update(updatePayload)
      .eq('id', 'current')
      .select()
      .single();

    if (error) {
      console.error('Settings update error:', error);
      return new Response(JSON.stringify({ error: 'Instellingen opslaan mislukt.' }), { status: 500 });
    }

    return new Response(JSON.stringify(data), { status: 200 });
  } catch (err) {
    console.error('Settings update exception:', err);
    return new Response(JSON.stringify({ error: 'Er is een fout opgetreden.' }), { status: 500 });
  }
};
