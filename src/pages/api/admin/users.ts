import type { APIRoute } from 'astro';
import { getAdminAuthFromCookies, getServiceRoleClient, getUserRole } from '../../../lib/serverAuth';

function isAdminCheck(role: string, email: string): boolean {
  return role === 'admin' || (import.meta.env.ADMIN_EMAILS ?? '').includes(email);
}

export const PATCH: APIRoute = async ({ request, cookies }) => {
  const adminAuth = await getAdminAuthFromCookies(cookies);
  if (!adminAuth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const role = await getUserRole(adminAuth.user.id);
  if (!isAdminCheck(role, adminAuth.user.email!)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  try {
    const { userId, email } = await request.json();
    if (!userId || !email || typeof email !== 'string') {
      return new Response(JSON.stringify({ error: 'userId en email zijn verplicht.' }), { status: 400 });
    }
    const trimmedEmail = email.trim().toLowerCase().slice(0, 254);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return new Response(JSON.stringify({ error: 'Ongeldig e-mailadres.' }), { status: 400 });
    }

    const supabase = getServiceRoleClient();
    const { error } = await supabase.auth.admin.updateUserById(userId, { email: trimmedEmail });
    if (error) throw error;
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    console.error('User email update error:', err);
    return new Response(JSON.stringify({ error: 'E-mail bijwerken mislukt.' }), { status: 500 });
  }
};

export const GET: APIRoute = async ({ cookies }) => {
  const adminAuth = await getAdminAuthFromCookies(cookies);
  if (!adminAuth) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const role = await getUserRole(adminAuth.user.id);
  if (role !== 'admin' && !((import.meta.env.ADMIN_EMAILS ?? '').includes(adminAuth.user.email!))) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  try {
    const supabase = getServiceRoleClient();
    
    // 1. Get all users from Auth (Service Role required)
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) throw authError;

    // 2. Get all roles from user_roles
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('*');

    if (rolesError) throw rolesError;

    // 3. Merge
    const combined = users.map(u => ({
      id: u.id,
      email: u.email,
      last_login: u.last_sign_in_at,
      created_at: u.created_at,
      role: roles?.find(r => r.id === u.id)?.role || 'none'
    }));

    return new Response(JSON.stringify(combined), { status: 200 });
  } catch (err) {
    console.error('Users fetch error:', err);
    return new Response(JSON.stringify({ error: 'Gebruikers ophalen mislukt.' }), { status: 500 });
  }
};

export const PUT: APIRoute = async ({ request, cookies }) => {
  const adminAuth = await getAdminAuthFromCookies(cookies);
  if (!adminAuth) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const role = await getUserRole(adminAuth.user.id);
  if (role !== 'admin' && !((import.meta.env.ADMIN_EMAILS ?? '').includes(adminAuth.user.email!))) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  try {
    const { userId, newRole } = await request.json();
    const supabase = getServiceRoleClient();

    const { error } = await supabase
      .from('user_roles')
      .upsert({
        id: userId,
        role: newRole,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error('User role update error:', err);
    return new Response(JSON.stringify({ error: 'Rol bijwerken mislukt.' }), { status: 500 });
  }
};
