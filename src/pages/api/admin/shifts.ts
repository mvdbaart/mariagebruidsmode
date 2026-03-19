import type { APIRoute } from 'astro';
import { getAdminAuthFromCookies, getServiceRoleClient } from '../../../lib/serverAuth';

export const GET: APIRoute = async ({ request, cookies }) => {
  const adminAuth = await getAdminAuthFromCookies(cookies);
  if (!adminAuth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const url = new URL(request.url);
  const start = url.searchParams.get('start');
  const end = url.searchParams.get('end');

  try {
    const supabase = getServiceRoleClient();
    let query = supabase.from('shifts').select('*, employees(first_name, last_name)');
    
    if (start) query = query.gte('date', start);
    if (end) query = query.lte('date', end);

    const { data, error } = await query;
    if (error) throw error;
    return new Response(JSON.stringify(data), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const adminAuth = await getAdminAuthFromCookies(cookies);
  if (!adminAuth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  try {
    const shift = await request.json();
    const supabase = getServiceRoleClient();
    const { data, error } = await supabase.from('shifts').insert([shift]).select().single();
    if (error) throw error;
    return new Response(JSON.stringify(data), { status: 201 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

export const PUT: APIRoute = async ({ request, cookies }) => {
  const adminAuth = await getAdminAuthFromCookies(cookies);
  if (!adminAuth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  try {
    const { id, ...updates } = await request.json();
    const supabase = getServiceRoleClient();
    const { data, error } = await supabase.from('shifts').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return new Response(JSON.stringify(data), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

export const DELETE: APIRoute = async ({ request, cookies }) => {
  const adminAuth = await getAdminAuthFromCookies(cookies);
  if (!adminAuth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  try {
    const supabase = getServiceRoleClient();
    const { error } = await supabase.from('shifts').delete().eq('id', id);
    if (error) throw error;
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
