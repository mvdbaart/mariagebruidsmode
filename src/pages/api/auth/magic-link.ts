import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

export const POST: APIRoute = async ({ request }) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response(JSON.stringify({ error: 'Supabase config ontbreekt.' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  const body = await request.json().catch(() => null);
  const email = body?.email?.trim();

  if (!email) {
    return new Response(JSON.stringify({ error: 'E-mailadres is verplicht.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  // Derive the site origin from the request so the redirect URL works in
  // all environments (local, preview, production).
  const origin = new URL(request.url).origin;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      // Do NOT create a new user if this email is not already registered.
      shouldCreateUser: false,
    },
  });

  if (error) {
    // Surface a friendly message; hide raw Supabase internals.
    const message =
      error.message.toLowerCase().includes('not found') ||
      error.message.toLowerCase().includes('signup')
        ? 'Dit e-mailadres is niet bekend als admin.'
        : 'Kon de magic link niet versturen. Probeer opnieuw.';

    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
