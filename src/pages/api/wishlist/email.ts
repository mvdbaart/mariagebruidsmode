import type { APIRoute } from 'astro';
import { Resend } from 'resend';

// Simple in-memory rate limiter: max 3 email sends per IP per hour
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 3;
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

function err(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function sanitizeUrl(value: unknown): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('/')) return `https://www.mariagebruidsmode.nl${trimmed}`;
  return '';
}

interface WishlistItem {
  slug: string;
  name: string;
  image: string;
  url: string;
}

function buildEmailHtml(recipientName: string, items: WishlistItem[]): string {
  const siteUrl = 'https://www.mariagebruidsmode.nl';
  const appointmentUrl = `${siteUrl}/afspraak-maken`;

  const itemRows = items.map(item => {
    const productUrl = item.url || `${siteUrl}/product/${encodeURIComponent(item.slug)}`;
    const imageCell = item.image
      ? `<td width="90" style="padding:0 16px 0 0;vertical-align:top;">
           <a href="${productUrl}" style="display:block;text-decoration:none;">
             <img src="${item.image}" alt="${item.name}" width="90" height="90"
                  style="display:block;width:90px;height:90px;object-fit:cover;background-color:#EDE5DC;" />
           </a>
         </td>`
      : `<td width="90" style="padding:0 16px 0 0;vertical-align:top;">
           <div style="width:90px;height:90px;background-color:#EDE5DC;display:flex;align-items:center;justify-content:center;font-size:28px;color:#E8C9BB;text-align:center;line-height:90px;">
             &#9825;
           </div>
         </td>`;

    return `
      <tr>
        <td style="padding:16px 0;border-bottom:1px solid #E8DDD0;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              ${imageCell}
              <td style="vertical-align:top;padding-top:4px;">
                <p style="margin:0 0 6px 0;font-family:Georgia,'Times New Roman',serif;font-size:15px;font-weight:600;color:#2C2A28;line-height:1.3;">${item.name}</p>
                <a href="${productUrl}" style="font-family:Arial,sans-serif;font-size:11px;color:#C9A96E;text-decoration:underline;letter-spacing:0.1em;text-transform:uppercase;">Bekijk product &rarr;</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>`;
  }).join('');

  const itemCount = items.length;
  const preheaderText = `Bekijk de ${itemCount} ${itemCount === 1 ? 'jurk' : 'stukken'} die je hebt opgeslagen bij Mariage Bruidsmode.`;

  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Jouw verlanglijst bij Mariage Bruidsmode</title>
</head>
<body style="margin:0;padding:0;background-color:#FAF7F4;font-family:Arial,sans-serif;">

  <!-- Preheader -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;color:#FAF7F4;line-height:1px;">
    ${preheaderText}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#FAF7F4;">
    <tr>
      <td align="center" style="padding:32px 16px;">

        <!-- Email container -->
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

          <!-- HEADER -->
          <tr>
            <td style="background-color:#2C2A28;padding:40px 40px 36px;text-align:center;">
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:30px;font-weight:400;color:#C9A96E;letter-spacing:0.35em;text-transform:uppercase;line-height:1;">MARIAGE</p>
              <p style="margin:6px 0 0;font-family:Arial,sans-serif;font-size:10px;color:#E8C9BB;letter-spacing:0.3em;text-transform:uppercase;">Bruidsmode</p>
            </td>
          </tr>

          <!-- GREETING -->
          <tr>
            <td style="background-color:#FAF7F4;padding:36px 40px 0;">
              <p style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#2C2A28;font-weight:400;">Beste ${recipientName},</p>
              <p style="margin:0 0 24px;font-family:Arial,sans-serif;font-size:14px;color:#5E534D;line-height:1.7;">
                Dit zijn de trouwjurken die je hebt bewaard op Mariage Bruidsmode. Neem rustig de tijd om ze nog eens te bekijken — en plan gerust een pasafspraak om ze te passen in onze atelier.
              </p>
              <div style="height:1px;background-color:#C9A96E;opacity:0.4;margin-bottom:24px;"></div>
            </td>
          </tr>

          <!-- ITEMS -->
          <tr>
            <td style="background-color:#FAF7F4;padding:0 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                ${itemRows}
              </table>
            </td>
          </tr>

          <!-- CTA SECTION -->
          <tr>
            <td style="background-color:#F3EDE6;padding:40px;text-align:center;">
              <p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:10px;color:#A66352;letter-spacing:0.3em;text-transform:uppercase;">Jouw droomjurk wacht</p>
              <p style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:26px;color:#2C2A28;font-weight:400;line-height:1.2;">Maak een Pasafspraak</p>
              <p style="margin:0 0 28px;font-family:Arial,sans-serif;font-size:14px;color:#5E534D;line-height:1.7;">
                Kom jouw favorieten passen in onze winkel. Onze stylisten begeleiden je persoonlijk bij het vinden van jouw perfecte jurk.
              </p>
              <a href="${appointmentUrl}"
                 style="display:inline-block;background-color:#A66352;color:#FDFAF8;text-decoration:none;font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.25em;text-transform:uppercase;padding:16px 40px;">
                MAAK EEN PASAFSPRAAK
              </a>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color:#2C2A28;padding:32px 40px;text-align:center;">
              <p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:12px;color:#E8DDD0;line-height:1.6;">
                Mariage Bruidsmode<br />
                <a href="${siteUrl}" style="color:#C9A96E;text-decoration:none;">www.mariagebruidsmode.nl</a>
              </p>
              <p style="margin:16px 0 0;font-family:Arial,sans-serif;font-size:10px;color:#5E534D;line-height:1.6;">
                Je ontvangt deze e-mail omdat je jouw verlanglijst hebt verstuurd via onze website.<br />
                Heb je vragen? Neem contact met ons op via de website.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const ip = clientAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return err('Te veel aanvragen. Probeer het later opnieuw.', 429);
  }

  const body = await request.json().catch(() => null);
  if (!body) return err('Ongeldig verzoek.');

  const name = trimString(body?.name, 120);
  const email = trimString(body?.email, 200);

  if (!name) return err('Vul je voornaam in.');
  if (!email) return err('Vul je e-mailadres in.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err('Vul een geldig e-mailadres in.');

  const rawItems = body?.items;
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return err('Je verlanglijst is leeg.');
  }
  if (rawItems.length > 50) return err('Te veel items in de verlanglijst.');

  const items: WishlistItem[] = rawItems
    .filter((i: unknown) => i && typeof i === 'object')
    .map((i: Record<string, unknown>) => ({
      slug: trimString(i.slug, 100) || '',
      name: trimString(i.name, 200) || '',
      image: sanitizeUrl(i.image),
      url: sanitizeUrl(i.url),
    }))
    .filter(i => i.slug && i.name);

  if (items.length === 0) return err('Geen geldige items gevonden in de verlanglijst.');

  const apiKey = import.meta.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('[wishlist/email] RESEND_API_KEY is not configured');
    return err('E-mail service tijdelijk niet beschikbaar. Probeer het later opnieuw.', 503);
  }

  try {
    const resend = new Resend(apiKey);
    const fromEmail = import.meta.env.RESEND_FROM_EMAIL || 'Mariage Bruidsmode <onboarding@resend.dev>';

    await resend.emails.send({
      from: fromEmail,
      to: [email],
      subject: `Jouw verlanglijst bij Mariage Bruidsmode`,
      html: buildEmailHtml(name, items),
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[wishlist/email] Failed to send email:', e);
    return err('E-mail kon niet worden verstuurd. Probeer het later opnieuw.', 503);
  }
};
