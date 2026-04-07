import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { getServiceRoleClient } from '../../../lib/serverAuth';

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 6;
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

function trimText(value: unknown, max = 2000): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return (await request.json().catch(() => null)) || {};
  }

  if (
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data')
  ) {
    const formData = await request.formData().catch(() => null);
    if (!formData) return {};
    const body: Record<string, unknown> = {};
    for (const [key, value] of formData.entries()) {
      body[key] = typeof value === 'string' ? value : value.name;
    }
    return body;
  }

  return {};
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const ip = clientAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return json({ error: 'Te veel aanvragen. Probeer het later opnieuw.' }, 429);
  }

  const body = await readBody(request);

  // Honeypot for bots
  if (trimText(body._hp, 100)) {
    return json({ ok: true }, 200);
  }

  const vacancyId = trimText(body.vacancy_id, 100);
  const vacancySlug = trimText(body.vacancy_slug, 120);
  const fullName = trimText(body.full_name, 120);
  const email = trimText(body.email, 200);
  const phone = trimText(body.phone, 40) || null;
  const linkedinUrl = trimText(body.linkedin_url, 300) || null;
  const message = trimText(body.message, 4000);

  if (!vacancyId && !vacancySlug) {
    return json({ error: 'Vacature niet gevonden.' }, 404);
  }

  if (!fullName || !email || !message) {
    return json({ error: 'Naam, e-mail en motivatie zijn verplicht.' }, 400);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'Vul een geldig e-mailadres in.' }, 400);
  }

  const supabase = getServiceRoleClient();
  const vacancyQuery = supabase
    .from('vacancies')
    .select('id, slug, title, application_email, application_url, cta_label, is_active')
    .eq('is_active', true)
    .limit(1);

  const { data: vacancy, error } = vacancyId
    ? await vacancyQuery.eq('id', vacancyId).maybeSingle()
    : await vacancyQuery.eq('slug', vacancySlug).maybeSingle();

  if (error || !vacancy) {
    return json({ error: 'Deze vacature is niet beschikbaar.' }, 404);
  }

  const { error: insertError } = await supabase.from('vacancy_applications').insert([
    {
      vacancy_id: vacancy.id,
      vacancy_slug: vacancy.slug,
      vacancy_title: vacancy.title,
      full_name: fullName,
      email,
      phone,
      linkedin_url: linkedinUrl,
      message,
      ip_address: clientAddress ?? null,
      source: 'website',
      status: 'new',
    },
  ]);

  if (insertError) {
    return json({ error: 'Sollicitatie opslaan mislukt. Probeer opnieuw.' }, 500);
  }

  const resendApiKey = import.meta.env.RESEND_API_KEY;
  if (resendApiKey) {
    const resend = new Resend(resendApiKey);
    const fromEmail = import.meta.env.RESEND_FROM_EMAIL || 'Mariage Bruidsmode <onboarding@resend.dev>';
    const adminRecipient =
      vacancy.application_email?.trim() || import.meta.env.VACANCY_APPLICATIONS_EMAIL || 'bruidsmode@mariagebruidsmode.nl';
    const vacancyUrl = `${getSiteUrl()}/over-ons/vacatures/${vacancy.slug}/`;

    try {
      await Promise.allSettled([
        resend.emails.send({
          from: fromEmail,
          to: [adminRecipient],
          subject: `Nieuwe sollicitatie: ${vacancy.title}`,
          html: buildAdminNotificationHtml({
            vacancyTitle: vacancy.title,
            vacancyUrl,
            fullName,
            email,
            phone,
            linkedinUrl,
            message,
          }),
        }),
        resend.emails.send({
          from: fromEmail,
          to: [email],
          subject: `Sollicitatie ontvangen â€” ${vacancy.title}`,
          html: buildApplicantConfirmationHtml({
            vacancyTitle: vacancy.title,
            vacancyUrl,
            fullName,
          }),
        }),
      ]);
    } catch (sendError) {
      console.error('[vacancies] notification email failed:', sendError);
    }
  }

  return json({ ok: true }, 200);
};

function getSiteUrl() {
  return import.meta.env.SITE_URL || 'https://www.mariagebruidsmode.nl';
}

function buildAdminNotificationHtml(data: {
  vacancyTitle: string;
  vacancyUrl: string;
  fullName: string;
  email: string;
  phone: string | null;
  linkedinUrl: string | null;
  message: string;
}) {
  const { vacancyTitle, vacancyUrl, fullName, email, phone, linkedinUrl, message } = data;
  return `<!doctype html>
<html lang="nl">
<body style="margin:0;background:#faf7f4;font-family:Arial,sans-serif;color:#2c2a28;">
  <div style="max-width:640px;margin:0 auto;padding:32px 16px;">
    <div style="background:#ffffff;border:1px solid #e8ddd0;border-radius:24px;padding:28px;">
      <p style="margin:0 0 10px;font-size:10px;letter-spacing:.28em;text-transform:uppercase;color:#a66352;">Nieuwe sollicitatie</p>
      <h1 style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-size:30px;font-weight:400;">${escapeHtml(fullName)}</h1>
      <p style="margin:0 0 18px;color:#5e534d;line-height:1.7;">Voor de vacature: <a href="${vacancyUrl}" style="color:#c9a96e;text-decoration:none;">${escapeHtml(vacancyTitle)}</a></p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 20px;">
        <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#5e534d;">E-mail</td><td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right;">${escapeHtml(email)}</td></tr>
        ${phone ? `<tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#5e534d;">Telefoon</td><td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right;">${escapeHtml(phone)}</td></tr>` : ''}
        ${linkedinUrl ? `<tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#5e534d;">LinkedIn / Portfolio</td><td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right;"><a href="${escapeHtml(linkedinUrl)}" style="color:#c9a96e;text-decoration:none;">${escapeHtml(linkedinUrl)}</a></td></tr>` : ''}
      </table>
      <div style="background:#f3ede6;border-radius:18px;padding:18px 20px;">
        <p style="margin:0 0 8px;font-size:10px;letter-spacing:.28em;text-transform:uppercase;color:#a66352;">Motivatie</p>
        <p style="margin:0;color:#5e534d;line-height:1.8;white-space:pre-line;">${escapeHtml(message)}</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function buildApplicantConfirmationHtml(data: {
  vacancyTitle: string;
  vacancyUrl: string;
  fullName: string;
}) {
  const { vacancyTitle, vacancyUrl, fullName } = data;
  return `<!doctype html>
<html lang="nl">
<body style="margin:0;background:#faf7f4;font-family:Arial,sans-serif;color:#2c2a28;">
  <div style="max-width:640px;margin:0 auto;padding:32px 16px;">
    <div style="background:#ffffff;border:1px solid #e8ddd0;border-radius:24px;padding:28px;">
      <p style="margin:0 0 10px;font-size:10px;letter-spacing:.28em;text-transform:uppercase;color:#a66352;">Sollicitatie ontvangen</p>
      <h1 style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-size:30px;font-weight:400;">Beste ${escapeHtml(fullName)},</h1>
      <p style="margin:0 0 18px;color:#5e534d;line-height:1.8;">
        Bedankt voor je sollicitatie op <strong>${escapeHtml(vacancyTitle)}</strong>. We hebben je bericht goed ontvangen en nemen snel contact met je op.
      </p>
      <p style="margin:0 0 18px;color:#5e534d;line-height:1.8;">
        Je kunt de vacature hier nog eens bekijken:
        <a href="${vacancyUrl}" style="color:#c9a96e;text-decoration:none;">${vacancyUrl}</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

function json(body: object, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
