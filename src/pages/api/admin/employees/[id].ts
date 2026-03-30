import type { APIRoute } from 'astro';
import { getAdminAuthFromCookies, getServiceRoleClient } from '../../../../lib/serverAuth';
import { normalizeSpecialisms, parseSortOrder } from '../../../../lib/employees';

export const PUT: APIRoute = async ({ params, request, cookies }) => {
  const adminAuth = await getAdminAuthFromCookies(cookies);
  if (!adminAuth) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400 });
  }

  try {
    const body = await request.json();
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    const allowed = ['first_name', 'last_name', 'email', 'role', 'bio', 'contract_hours', 'hourly_rate', 'is_active', 'sort_order'];
    for (const key of allowed) {
      if (key in body) update[key] = body[key];
    }

    if ('specialisms' in body) {
      update.specialisms = normalizeSpecialisms(body.specialisms);
    }

    if ('sort_order' in body) {
      update.sort_order = parseSortOrder(body.sort_order);
    }

    const supabase = getServiceRoleClient();
    const { data, error } = await supabase
      .from('employees')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return new Response(JSON.stringify(data), { status: 200 });
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
      .delete()
      .eq('id', id);

    if (error) throw error;
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
