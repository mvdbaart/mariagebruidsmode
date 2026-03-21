import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { clearAuthCookies, isAdminUser, setAuthCookies } from '../../../lib/serverAuth';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response(JSON.stringify({ error: 'Supabase config ontbreekt.' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  const body = await request.json().catch(() => null);
  const email = body?.email;
  const password = body?.password;

  if (!email || !password) {
    return new Response(JSON.stringify({ error: 'E-mail en wachtwoord zijn verplicht.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session || !data.user) {
    return new Response(JSON.stringify({ error: 'Ongeldige inloggegevens.' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  if (!(await isAdminUser(data.user))) {
    clearAuthCookies(cookies);
    await supabase.auth.signOut();
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
