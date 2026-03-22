import type { APIRoute } from 'astro';
import { getServiceRoleClient } from '../../lib/serverAuth';

const VALID_TYPES = new Set(['standard', 'vip']);

// Valid block start times — must match availability.ts
const WEEKDAY_TIMES = new Set(['10:00', '13:00', '15:30']);
const WEEKEND_TIMES = new Set(['09:30', '12:00', '14:30']);

const BLOCK_ENDS: Record<string, string> = {
  '10:00': '12:00',
  '13:00': '15:00',
  '15:30': '17:30',
  '09:30': '11:30',
  '12:00': '14:00',
  '14:30': '16:30',
};

// Simple in-memory rate limiter: max 5 submissions per IP per hour
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

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

function getDayOfWeek(dateStr: string): number {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).getDay(); // 0=Sun … 6=Sat
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const ip = clientAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return err('Te veel aanvragen. Probeer het later opnieuw.', 429);
  }

  const body = await request.json().catch(() => null);
  const fullName = trimString(body?.full_name, 120);
  const email = trimString(body?.email, 200);
  const phone = trimString(body?.phone, 40);
  const preferredDate = trimString(body?.preferred_date, 20);
  const message = trimString(body?.message, 2000);
  const appointmentType = trimString(body?.appointment_type, 20);
  const preferredTime = trimString(body?.preferred_time, 10);
  const dressSize = trimString(body?.dress_size, 20);

  if (!fullName || !email || !preferredDate) {
    return err('Naam, e-mail en voorkeursdatum zijn verplicht.');
  }

  if (!appointmentType || !VALID_TYPES.has(appointmentType)) {
    return err('Ongeldig afspraaktype.');
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(preferredDate)) {
    return err('Ongeldige datum.');
  }

  if (!preferredTime) {
    return err('Kies een tijdblok voor de afspraak.');
  }

  const dayOfWeek = getDayOfWeek(preferredDate);

  // Monday: closed
  if (dayOfWeek === 1) {
    return err('We zijn op maandag gesloten. Kies een andere dag.');
  }

  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const validTimes = isWeekend ? WEEKEND_TIMES : WEEKDAY_TIMES;

  if (!validTimes.has(preferredTime)) {
    return err('Ongeldig tijdblok voor de gekozen dag.');
  }

  const supabase = getServiceRoleClient();

  // Sunday: must be in opening_exceptions
  if (dayOfWeek === 0) {
    const { data: exception } = await supabase
      .from('opening_exceptions')
      .select('date')
      .eq('date', preferredDate)
      .maybeSingle();

    if (!exception) {
      return err('Op zondag zijn we alleen open op persoonlijk verzoek. Neem contact met ons op.');
    }
  }

  // Check availability: slot must not be taken
  const { data: existing } = await supabase
    .from('appointments')
    .select('id')
    .eq('preferred_date', preferredDate)
    .eq('start_time', preferredTime)
    .neq('status', 'cancelled')
    .limit(1);

  if (existing && existing.length > 0) {
    return err('Dit tijdblok is helaas al bezet. Kies een ander tijdstip.');
  }

  const startTime = preferredTime;
  const endTime = BLOCK_ENDS[startTime] || null;

  try {
    const { error } = await supabase.from('appointments').insert([
      {
        full_name: fullName,
        email,
        phone,
        preferred_date: preferredDate,
        appointment_type: appointmentType,
        dress_size: dressSize,
        message,
        start_time: startTime,
        end_time: endTime,
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

function err(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
