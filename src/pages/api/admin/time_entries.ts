import type { APIRoute } from 'astro';
import { getAdminAuthFromCookies, getServiceRoleClient } from '../../../lib/serverAuth';

export const GET: APIRoute = async ({ cookies }) => {
  const adminAuth = await getAdminAuthFromCookies(cookies);
  if (!adminAuth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  try {
    const supabase = getServiceRoleClient();
    const { data, error } = await supabase.from('time_entries').select('*, employees(*)').order('date', { ascending: false });
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
    const entry = await request.json();
    const supabase = getServiceRoleClient();
    const { data, error } = await supabase.from('time_entries').insert([entry]).select().single();
    if (error) throw error;
    return new Response(JSON.stringify(data), { status: 201 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
