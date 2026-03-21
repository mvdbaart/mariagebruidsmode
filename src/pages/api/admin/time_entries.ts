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
    const body = await request.json();
    const { employee_id, date, start_time, end_time, break_minutes } = body;

    if (!employee_id || !date || !start_time || !end_time) {
      return new Response(JSON.stringify({ error: 'Verplichte velden ontbreken' }), { status: 400 });
    }

    const start = new Date(`1970-01-01T${start_time}`);
    const end = new Date(`1970-01-01T${end_time}`);
    let diffMs = end.getTime() - start.getTime();
    if (diffMs < 0) diffMs += 24 * 60 * 60 * 1000;
    const breakMins = Number(break_minutes) || 0;
    const hours_worked = Math.max(0, (diffMs / 60000 - breakMins) / 60);

    const supabase = getServiceRoleClient();
    const { data, error } = await supabase
      .from('time_entries')
      .insert([{ employee_id, date, start_time, end_time, break_minutes: breakMins, hours_worked }])
      .select()
      .single();
    if (error) throw error;
    return new Response(JSON.stringify(data), { status: 201 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
