import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Forms and dynamic content may not work.');
}

// Fallback to placeholder strings so createClient does not throw at module
// initialisation when env vars are absent (e.g. missing Vercel config).
// Queries against a misconfigured client return { data: null, error } and
// pages already handle null data gracefully.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);
