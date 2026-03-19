import type { APIRoute } from 'astro';
import { getServiceRoleClient } from '../../../lib/serverAuth';

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);
  
  if (!body || typeof body !== 'object') {
    return new Response(JSON.stringify({ error: 'Ongeldige aanvraag' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  try {
    const supabase = getServiceRoleClient();
    
    // Convert object keys to database rows
    const updates = Object.entries(body).map(([key, value]) => ({
      key,
      value: typeof value === 'string' ? value : JSON.stringify(value),
      updated_at: new Date().toISOString()
    }));

    for (const update of updates) {
      const { error } = await supabase
        .from('site_settings')
        .upsert(update, { onConflict: 'key' });

      if (error) {
        return new Response(JSON.stringify({ error: `Fout bij bijwerken van ${update.key}: ${error.message}` }), {
          status: 500,
          headers: { 'content-type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Interne serverfout' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
};
