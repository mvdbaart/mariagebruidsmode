import type { APIRoute } from 'astro';
import { getAdminAuthFromCookies, getServiceRoleClient, getUserRole } from '../../../lib/serverAuth';

export const GET: APIRoute = async ({ cookies }) => {
  const adminAuth = await getAdminAuthFromCookies(cookies);
  if (!adminAuth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const role = await getUserRole(adminAuth.user.id);
  if (role !== 'admin' && !((import.meta.env.ADMIN_EMAILS ?? '').includes(adminAuth.user.email!))) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  const result: Record<string, unknown> = {
    PUBLIC_SUPABASE_URL: !!import.meta.env.PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY: !!import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
    ADMIN_EMAILS: !!import.meta.env.ADMIN_EMAILS,
    serviceRoleWorks: false,
    error: null as string | null,
  };

  try {
    const supabase = getServiceRoleClient();
    const { error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (error) {
      result.error = error.message;
    } else {
      result.serviceRoleWorks = true;
    }
  } catch (e: any) {
    result.error = e?.message ?? 'Unknown error';
  }

  return new Response(JSON.stringify(result, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
