import type { APIRoute } from 'astro';
import { getServiceRoleClient } from '../../lib/serverAuth';

const VALID_TYPES = new Set(['standard', 'vip']);
const VALID_SLOTS = new Set(['10:00', '13:00', '15:00']);

// Simple in-memory rate limiter: max 5 submissions per IP per hour
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

function trimString(value: unknown, max = 500): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const ip = clientAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return new Response(JSON.stringify({ error: 'Te veel aanvragen. Probeer het later opnieuw.' }), {
      status: 429,
      headers: { 'content-type': 'application/json', 'Retry-After': '3600' },
    });
  }

  const body = await request.json().catch(() => null);
  const fullName = trimString(body?.full_name, 120);
  const email = trimString(body?.email, 200);
  const phone = trimString(body?.phone, 40);
  const preferredDate = trimString(body?.preferred_date, 20);
  const timeSlot = trimString(body?.time_slot, 10);
  const message = trimString(body?.message, 2000);
  const appointmentType = trimString(body?.appointment_type, 20);

  if (!fullName || !email || !preferredDate) {
    return new Response(JSON.stringify({ error: 'Naam, e-mail en voorkeursdatum zijn verplicht.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  if (!timeSlot || !VALID_SLOTS.has(timeSlot)) {
    return new Response(JSON.stringify({ error: 'Kies een tijdblok: 10:00, 13:00 of 15:00.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  if (!appointmentType || !VALID_TYPES.has(appointmentType)) {
    return new Response(JSON.stringify({ error: 'Ongeldig afspraaktype.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  // Basic date format guard (YYYY-MM-DD).
  if (!/^\d{4}-\d{2}-\d{2}$/.test(preferredDate)) {
    return new Response(JSON.stringify({ error: 'Ongeldige datum.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  try {
    const supabase = getServiceRoleClient();

    // Check if slot is still available
    const { data: existing } = await supabase
      .from('appointments')
      .select('id')
      .eq('preferred_date', preferredDate)
      .eq('time_slot', timeSlot)
      .limit(1);

    if (existing && existing.length > 0) {
      return new Response(JSON.stringify({ error: 'Dit tijdslot is helaas al bezet. Kies een ander tijdstip.' }), {
        status: 409,
        headers: { 'content-type': 'application/json' },
      });
    }

    const { error } = await supabase
      .from('appointments')
      .insert([
        {
          full_name: fullName,
          email,
          phone,
          preferred_date: preferredDate,
          time_slot: timeSlot,
          appointment_type: appointmentType,
          message,
        },
      ]);

    if (error) {
      return new Response(JSON.stringify({ error: 'Opslaan van afspraak mislukt.' }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Serverconfiguratie ontbreekt.' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
};
