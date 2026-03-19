import { createClient, type Session, type User } from '@supabase/supabase-js';
import type { AstroCookies } from 'astro';

const isProd = import.meta.env.PROD;
const ACCESS_COOKIE = 'sb-access-token';
const REFRESH_COOKIE = 'sb-refresh-token';
const REFRESH_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function requirePublicSupabaseConfig() {
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_ANON_KEY.');
  }
}

function getAdminEmails(): string[] {
  return (import.meta.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((email: string) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function getUserRole(userId: string): Promise<string> {
  const supabase = getServiceRoleClient();
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('id', userId)
    .single();
  
  if (error || !data) return 'none';
  return data.role;
}

export async function isAdminUser(user: User): Promise<boolean> {
  const email = user.email?.toLowerCase();
  const adminEmails = getAdminEmails();
  
  // 1. Check environment variable (Super Admin)
  if (email && adminEmails.includes(email)) return true;
  
  // 2. Check user_roles table
  const role = await getUserRole(user.id);
  const validRoles = ['admin', 'moderator', 'marketing', 'extern'];
  
  return validRoles.includes(role);
}

export function setAuthCookies(cookies: AstroCookies, session: Session) {
  const accessExpires =
    typeof session.expires_at === 'number' && session.expires_at > 0
      ? new Date(session.expires_at * 1000)
      : undefined;

  cookies.set(ACCESS_COOKIE, session.access_token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    ...(accessExpires ? { expires: accessExpires } : {}),
  });

  cookies.set(REFRESH_COOKIE, session.refresh_token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    maxAge: REFRESH_MAX_AGE_SECONDS,
  });
}

export function clearAuthCookies(cookies: AstroCookies) {
  cookies.delete(ACCESS_COOKIE, { path: '/' });
  cookies.delete(REFRESH_COOKIE, { path: '/' });
}

export async function getAdminAuthFromCookies(cookies: AstroCookies): Promise<{
  session: Session;
  user: User;
} | null> {
  requirePublicSupabaseConfig();

  const accessToken = cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = cookies.get(REFRESH_COOKIE)?.value;
  if (!accessToken || !refreshToken) return null;

  const client = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL!, 
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY!, 
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  const { data, error } = await client.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error || !data.session || !data.user) return null;
  const isAllowed = await isAdminUser(data.user);
  if (!isAllowed) return null;

  setAuthCookies(cookies, data.session);
  return {
    session: data.session,
    user: data.user,
  };
}

export function getServiceRoleClient() {
  requirePublicSupabaseConfig();
  const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY.');
  }

  return createClient(
    import.meta.env.PUBLIC_SUPABASE_URL!, 
    serviceKey, 
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
