import type { APIRoute } from 'astro';
import { getServiceRoleClient } from '../../lib/serverAuth';
import { Resend } from 'resend';

const VALID_TYPES = new Set(['standard_bride', 'standard_groom', 'vip']);

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

    // Send confirmation email (non-blocking — don't fail the request if email fails)
    const resendApiKey = import.meta.env.RESEND_API_KEY;
    if (resendApiKey && email) {
      try {
        const resend = new Resend(resendApiKey);
        const fromEmail = import.meta.env.RESEND_FROM_EMAIL || 'Mariage Bruidsmode <onboarding@resend.dev>';
        const typeLabels: Record<string, string> = {
          standard_bride: 'Bruid pasafspraak',
          standard_groom: 'Bruidegom pasafspraak',
          vip: 'VIP arrangement',
        };
        const typeLabel = typeLabels[appointmentType!] ?? appointmentType;
        const [y, m, d] = preferredDate!.split('-');
        const formattedDate = `${d}-${m}-${y}`;
        const html = buildConfirmationHtml(fullName!, email, formattedDate, startTime, endTime, typeLabel, message);
        await resend.emails.send({
          from: fromEmail,
          to: [email],
          subject: 'Afspraakbevestiging — Mariage Bruidsmode',
          html,
        });
      } catch (emailErr) {
        console.error('[appointments] Confirmation email failed:', emailErr);
      }
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

function buildConfirmationHtml(
  name: string,
  email: string,
  date: string,
  startTime: string | null,
  endTime: string | null,
  type: string,
  message: string | null,
): string {
  const siteUrl = 'https://www.mariagebruidsmode.nl';
  const timeStr = startTime ? `${startTime}${endTime ? ` – ${endTime}` : ''}` : 'Nader te bepalen';
  return `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Afspraakbevestiging</title></head>
<body style="margin:0;padding:0;background-color:#FAF7F4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#FAF7F4;">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
        <!-- HEADER -->
        <tr><td style="background-color:#2C2A28;padding:40px;text-align:center;">
          <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:30px;font-weight:400;color:#C9A96E;letter-spacing:0.35em;text-transform:uppercase;">MARIAGE</p>
          <p style="margin:6px 0 0;font-family:Arial,sans-serif;font-size:10px;color:#E8C9BB;letter-spacing:0.3em;text-transform:uppercase;">Bruidsmode</p>
        </td></tr>
        <!-- BODY -->
        <tr><td style="background-color:#FAF7F4;padding:40px;">
          <p style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#2C2A28;">Beste ${name},</p>
          <p style="margin:0 0 24px;font-family:Arial,sans-serif;font-size:14px;color:#5E534D;line-height:1.7;">
            Bedankt voor het aanvragen van een afspraak bij Mariage Bruidsmode! Wij hebben jouw aanvraag goed ontvangen en nemen zo spoedig mogelijk contact met je op ter bevestiging.
          </p>
          <div style="background-color:#F3EDE6;padding:24px;margin:0 0 24px;">
            <p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:10px;color:#A66352;letter-spacing:0.3em;text-transform:uppercase;">Jouw afspraakdetails</p>
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#5E534D;border-bottom:1px solid #E8DDD0;">Type afspraak</td><td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#2C2A28;text-align:right;border-bottom:1px solid #E8DDD0;">${type}</td></tr>
              <tr><td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#5E534D;border-bottom:1px solid #E8DDD0;">Datum</td><td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#2C2A28;text-align:right;border-bottom:1px solid #E8DDD0;">${date}</td></tr>
              <tr><td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#5E534D;">Tijdblok</td><td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#2C2A28;text-align:right;">${timeStr}</td></tr>
            </table>
          </div>
          ${message ? `<p style="margin:0 0 24px;font-family:Arial,sans-serif;font-size:13px;color:#5E534D;line-height:1.7;"><strong>Jouw bericht:</strong><br />${message}</p>` : ''}
          <p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:14px;color:#5E534D;line-height:1.7;">
            Heb je vragen? Neem dan contact met ons op:
          </p>
          <p style="margin:0;font-family:Arial,sans-serif;font-size:14px;color:#5E534D;line-height:1.7;">
            📞 <a href="tel:+31402869165" style="color:#C9A96E;text-decoration:none;">(0)40 286 91 65</a><br />
            ✉️ <a href="mailto:bruidsmode@mariagebruidsmode.nl" style="color:#C9A96E;text-decoration:none;">bruidsmode@mariagebruidsmode.nl</a>
          </p>
        </td></tr>
        <!-- ADRES -->
        <tr><td style="background-color:#F3EDE6;padding:24px 40px;text-align:center;">
          <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;color:#5E534D;line-height:1.8;">
            Mariage Bruidsmode &nbsp;·&nbsp; Parallelweg 26e, 5664 AD Geldrop<br />
            <a href="${siteUrl}" style="color:#C9A96E;text-decoration:none;">www.mariagebruidsmode.nl</a>
          </p>
        </td></tr>
        <!-- FOOTER -->
        <tr><td style="background-color:#2C2A28;padding:24px 40px;text-align:center;">
          <p style="margin:0;font-family:Arial,sans-serif;font-size:10px;color:#5E534D;line-height:1.6;">
            Je ontvangt deze e-mail omdat je een afspraak hebt aangevraagd via onze website.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function err(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
