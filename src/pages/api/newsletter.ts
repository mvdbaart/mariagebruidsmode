import type { APIRoute } from 'astro';
import { getServiceRoleClient } from '../../lib/serverAuth';
import { Resend } from 'resend';

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return true;
  }
  if (entry.count >= 3) return false;
  entry.count++;
  return true;
}

function err(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const ip = clientAddress || 'unknown';
  if (!checkRateLimit(ip)) return err('Te veel aanvragen.', 429);

  const body = await request.json().catch(() => null);
  if (!body) return err('Ongeldig verzoek.');

  const email = typeof body?.email === 'string' ? body.email.trim().slice(0, 200) : '';
  const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 120) : '';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return err('Vul een geldig e-mailadres in.');
  }

  const supabase = getServiceRoleClient();

  // Upsert subscriber — ignore duplicate constraint errors
  const { error: dbError } = await supabase
    .from('newsletter_subscribers')
    .upsert([{ email, name: name || null, subscribed_at: new Date().toISOString() }], {
      onConflict: 'email',
      ignoreDuplicates: true,
    });

  if (dbError) {
    console.error('[newsletter] DB error:', dbError.message);
    // Continue even if DB fails — still send confirmation email
  }

  // Send welcome email if Resend is configured
  const apiKey = import.meta.env.RESEND_API_KEY;
  if (apiKey) {
    try {
      const resend = new Resend(apiKey);
      const fromEmail = import.meta.env.RESEND_FROM_EMAIL || 'Mariage Bruidsmode <onboarding@resend.dev>';
      const greeting = name ? `Beste ${name},` : 'Beste abonnee,';
      await resend.emails.send({
        from: fromEmail,
        to: [email],
        subject: 'Welkom bij de Mariage nieuwsbrief',
        html: `<!DOCTYPE html><html lang="nl"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#FAF7F4;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#FAF7F4;"><tr><td align="center" style="padding:32px 16px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
<tr><td style="background:#2C2A28;padding:40px;text-align:center;">
  <p style="margin:0;font-family:Georgia,serif;font-size:30px;color:#C9A96E;letter-spacing:0.35em;text-transform:uppercase;">MARIAGE</p>
  <p style="margin:6px 0 0;font-family:Arial,sans-serif;font-size:10px;color:#E8C9BB;letter-spacing:0.3em;text-transform:uppercase;">Bruidsmode</p>
</td></tr>
<tr><td style="background:#FAF7F4;padding:40px;">
  <p style="margin:0 0 16px;font-family:Georgia,serif;font-size:22px;color:#2C2A28;">${greeting}</p>
  <p style="margin:0 0 16px;font-family:Arial,sans-serif;font-size:14px;color:#5E534D;line-height:1.7;">
    Welkom bij de nieuwsbrief van Mariage Bruidsmode! Je bent nu als eerste op de hoogte van nieuwe collecties, evenementen en exclusieve aanbiedingen.
  </p>
  <p style="margin:0 0 24px;font-family:Arial,sans-serif;font-size:14px;color:#5E534D;line-height:1.7;">
    Wil je alvast je droomjurk verkennen? Maak een afspraak in onze boutique in Geldrop.
  </p>
  <a href="https://www.mariagebruidsmode.nl/afspraak-maken" style="display:inline-block;background:#A66352;color:#FDFAF8;text-decoration:none;font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.25em;text-transform:uppercase;padding:14px 36px;">
    AFSPRAAK MAKEN
  </a>
</td></tr>
<tr><td style="background:#2C2A28;padding:24px 40px;text-align:center;">
  <p style="margin:0;font-family:Arial,sans-serif;font-size:10px;color:#5E534D;line-height:1.6;">
    Mariage Bruidsmode · Parallelweg 26e, 5664 AD Geldrop<br/>
    <a href="https://www.mariagebruidsmode.nl" style="color:#C9A96E;text-decoration:none;">www.mariagebruidsmode.nl</a>
  </p>
</td></tr>
</table></td></tr></table>
</body></html>`,
      });
    } catch (e) {
      console.error('[newsletter] Email error:', e);
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
