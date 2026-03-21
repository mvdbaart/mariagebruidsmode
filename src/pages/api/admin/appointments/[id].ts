import type { APIRoute } from 'astro';
import { getAdminAuthFromCookies, getServiceRoleClient } from '../../../../lib/serverAuth';

const VALID_STATUSES = new Set(['pending', 'confirmed', 'cancelled']);
const VALID_TYPES = new Set(['standard', 'vip']);
const VALID_TIMES = new Set(['', '10:00', '11:30', '13:00', '14:30', '16:00']);

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const hh = String(Math.floor(total / 60) % 24).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

export const PUT: APIRoute = async ({ params, request, cookies }) => {
  const auth = await getAdminAuthFromCookies(cookies);
  if (!auth) {
    return new Response(JSON.stringify({ error: 'Niet geautoriseerd.' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ error: 'Ongeldig ID.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return new Response(JSON.stringify({ error: 'Ongeldig verzoek.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const updates: Record<string, unknown> = {};

  if (body.status !== undefined) {
    if (!VALID_STATUSES.has(body.status)) {
      return new Response(JSON.stringify({ error: 'Ongeldige status.' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }
    updates.status = body.status;
  }

  if (body.appointment_type !== undefined) {
    if (!VALID_TYPES.has(body.appointment_type)) {
      return new Response(JSON.stringify({ error: 'Ongeldig afspraaktype.' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }
    updates.appointment_type = body.appointment_type;
  }

  if (body.preferred_date !== undefined) {
    if (body.preferred_date && !/^\d{4}-\d{2}-\d{2}$/.test(body.preferred_date)) {
      return new Response(JSON.stringify({ error: 'Ongeldige datum.' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }
    updates.preferred_date = body.preferred_date || null;
  }

  if (body.start_time !== undefined) {
    const time = body.start_time || '';
    if (!VALID_TIMES.has(time)) {
      return new Response(JSON.stringify({ error: 'Ongeldige starttijd.' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }
    updates.start_time = time || null;
    if (time) {
      const type = body.appointment_type || updates.appointment_type || 'standard';
      const durationMinutes = type === 'vip' ? 120 : 90;
      updates.end_time = addMinutes(time, durationMinutes);
    } else {
      updates.end_time = null;
    }
  }

  if (body.employee_id !== undefined) {
    updates.employee_id = body.employee_id || null;
  }

  if (body.notes !== undefined) {
    const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 2000) : null;
    updates.notes = notes || null;
  }

  if (Object.keys(updates).length === 0) {
    return new Response(JSON.stringify({ error: 'Geen velden om bij te werken.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const supabase = getServiceRoleClient();
  const { error } = await supabase
    .from('appointments')
    .update(updates)
    .eq('id', id);

  if (error) {
    return new Response(JSON.stringify({ error: 'Bijwerken mislukt.' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
