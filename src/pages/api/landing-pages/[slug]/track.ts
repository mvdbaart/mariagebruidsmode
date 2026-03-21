import type { APIRoute } from 'astro';
import { supabase } from '../../../../lib/supabase';

export const POST: APIRoute = async ({ request, params }) => {
  try {
    const { slug } = params;
    const body = await request.json();
    const { variant_id, session_id, event_type, metadata } = body;

    if (!variant_id || !session_id || !event_type) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    // Deduplicate 'view' events: one per session+variant
    if (event_type === 'view') {
      const { data: existing } = await supabase
        .from('landing_page_events')
        .select('id')
        .eq('variant_id', variant_id)
        .eq('session_id', session_id)
        .eq('event_type', 'view')
        .single();

      if (existing) {
        return new Response(JSON.stringify({ ok: true, deduplicated: true }), { status: 200 });
      }
    }

    const { error } = await supabase
      .from('landing_page_events')
      .insert({ variant_id, session_id, event_type, metadata: metadata || {} });

    if (error) throw error;

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
