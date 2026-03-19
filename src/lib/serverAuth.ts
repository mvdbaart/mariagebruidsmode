import { createClient, type Session, type User } from '@supabase/supabase-js';
import type { AstroCookies } from 'astro';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

const isProd = import.meta.env.PROD;
const ACCESS_COOKIE = 'sb-access-token';
const REFRESH_COOKIE = 'sb-refresh-token';
const REFRESH_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function requirePublicSupabaseConfig() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_ANON_KEY.');
  }
}

function getAdminEmails(): string[] {
  return (import.meta.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((email: string) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminUser(user: User): boolean {
  const email = user.email?.toLowerCase();
  const adminEmails = getAdminEmails();
  if (email && adminEmails.includes(email)) return true;
  if (user.app_metadata?.role === 'admin') return true;
  return false;
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

  const client = createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await client.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error || !data.session || !data.user) return null;
  if (!isAdminUser(data.user)) return null;

  setAuthCookies(cookies, data.session);
  return {
    session: data.session,
    user: data.user,
  };
}

export function getServiceRoleClient() {
  requirePublicSupabaseConfig();
  if (!supabaseServiceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY.');
  }

  return createClient(supabaseUrl!, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
