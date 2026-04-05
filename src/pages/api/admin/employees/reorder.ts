import type { APIRoute } from 'astro';
import { getAdminAuthFromCookies, getServiceRoleClient } from '../../../../lib/serverAuth';

type ReorderBody = {
  employee_ids?: string[];
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const adminAuth = await getAdminAuthFromCookies(cookies);
  if (!adminAuth) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const body = (await request.json()) as ReorderBody;
    const employeeIds = Array.isArray(body.employee_ids)
      ? body.employee_ids.map((id) => String(id).trim()).filter(Boolean)
      : [];

    if (employeeIds.length === 0) {
      return new Response(JSON.stringify({ error: 'Geen medewerkers ontvangen' }), { status: 400 });
    }

    const supabase = getServiceRoleClient();
    const now = new Date().toISOString();

    for (const [index, id] of employeeIds.entries()) {
      const { error } = await supabase
        .from('employees')
        .update({ team_sort_order: index, updated_at: now })
        .eq('id', id);

      if (error) throw error;
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
