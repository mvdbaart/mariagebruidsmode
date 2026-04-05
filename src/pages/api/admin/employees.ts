import type { APIRoute } from 'astro';
import { getAdminAuthFromCookies, getServiceRoleClient } from '../../../lib/serverAuth';
import { normalizeSpecialisms, parseSortOrder } from '../../../lib/employees';

export const GET: APIRoute = async ({ cookies }) => {
  const adminAuth = await getAdminAuthFromCookies(cookies);
  if (!adminAuth) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const supabase = getServiceRoleClient();
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('team_sort_order', { ascending: true, nullsFirst: true })
      .order('first_name', { ascending: true });

    if (error) throw error;
    return new Response(JSON.stringify(data), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const adminAuth = await getAdminAuthFromCookies(cookies);
  if (!adminAuth) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      first_name,
      last_name,
      email,
      role,
      bio,
      contract_hours,
      hourly_rate,
      is_active,
      specialisms,
      sort_order,
      show_on_team,
      team_sort_order,
      contract_schedule,
    } = body;

    if (!first_name || !last_name) {
      return new Response(JSON.stringify({ error: 'Voornaam en achternaam zijn verplicht' }), { status: 400 });
    }

    const employee = {
      first_name: String(first_name).trim(),
      last_name: String(last_name).trim(),
      email: email ? String(email).trim() : null,
      role: role ? String(role).trim() : null,
      bio: bio ? String(bio).trim() : null,
      specialisms: normalizeSpecialisms(specialisms),
      contract_hours: contract_hours != null ? Number(contract_hours) : 0,
      hourly_rate: hourly_rate != null ? Number(hourly_rate) : null,
      sort_order: parseSortOrder(sort_order),
      show_on_team: show_on_team === true,
      team_sort_order: parseSortOrder(team_sort_order),
      is_active: is_active !== false,
      contract_schedule: contract_schedule && typeof contract_schedule === 'object' ? contract_schedule : {},
    };

    const supabase = getServiceRoleClient();

    const { data, error } = await supabase
      .from('employees')
      .insert([employee])
      .select()
      .single();

    if (error) throw error;
    return new Response(JSON.stringify(data), { status: 201 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
