import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { clearAuthCookies, isAdminUser, setAuthCookies } from '../../../lib/serverAuth';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

/**
 * Called by /auth/callback after Supabase redirects the user back with tokens
 * in the URL fragment. The client-side callback page parses the fragment and
 * POSTs the access + refresh tokens here so we can set httpOnly cookies.
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response(JSON.stringify({ error: 'Supabase config ontbreekt.' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  const body = await request.json().catch(() => null);
  const accessToken: string | undefined = body?.access_token;
  const refreshToken: string | undefined = body?.refresh_token;

  if (!accessToken || !refreshToken) {
    return new Response(JSON.stringify({ error: 'Tokens ontbreken.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });

  if (error || !data.session || !data.user) {
    return new Response(JSON.stringify({ error: 'Ongeldige of verlopen sessie.' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  if (!isAdminUser(data.user)) {
    clearAuthCookies(cookies);
    return new Response(JSON.stringify({ error: 'Geen toegang tot admin.' }), {
      status: 403,
      headers: { 'content-type': 'application/json' },
    });
  }

  setAuthCookies(cookies, data.session);
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
