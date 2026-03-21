import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

const VALID_EVENT_TYPES = ['pageview', 'cta_click', 'form_start', 'form_submit'] as const;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { session_id, page_path, page_title, referrer, event_type, metadata } = body;

    // Validate required fields
    if (!session_id || typeof session_id !== 'string' || session_id.length > 200) {
      return new Response(JSON.stringify({ ok: false }), { status: 400 });
    }
    if (!page_path || typeof page_path !== 'string' || !page_path.startsWith('/') || page_path.length > 500) {
      return new Response(JSON.stringify({ ok: false }), { status: 400 });
    }
    if (!VALID_EVENT_TYPES.includes(event_type)) {
      return new Response(JSON.stringify({ ok: false }), { status: 400 });
    }

    // Skip admin and landing page tracking (they have their own systems)
    if (page_path.startsWith('/admin') || page_path.startsWith('/lp/')) {
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(JSON.stringify({ ok: false }), { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    await supabase.from('page_events').insert({
      session_id: session_id.trim(),
      page_path: page_path.trim(),
      page_title: typeof page_title === 'string' ? page_title.slice(0, 300) : null,
      referrer: typeof referrer === 'string' ? referrer.slice(0, 500) : null,
      event_type,
      metadata: metadata && typeof metadata === 'object' ? metadata : {},
    });

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch {
    return new Response(JSON.stringify({ ok: false }), { status: 200 });
  }
};
