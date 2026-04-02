import type { APIRoute } from 'astro';
import { stripe } from '../../../lib/stripe';
import { getServiceRoleClient } from '../../../lib/serverAuth';
import { Resend } from 'resend';

export const POST: APIRoute = async ({ request }) => {
  const sig = request.headers.get('stripe-signature');
  const webhookSecret = import.meta.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return new Response('Webhook signature missing.', { status: 400 });
  }

  let event;
  try {
    const rawBody = await request.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('[stripe-webhook] Signature verification failed:', err);
    return new Response('Webhook verification failed.', { status: 400 });
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    const meta = paymentIntent.metadata;

    try {
      const supabase = getServiceRoleClient();
      await supabase.from('customer_orders').insert({
        product_id: meta.product_id || null,
        product_name: meta.product_name,
        size: meta.size || null,
        first_name: meta.first_name,
        last_name: meta.last_name,
        email: meta.email,
        phone: meta.phone || null,
        amount_paid: paymentIntent.amount / 100,
        payment_type: meta.payment_type,
        stripe_payment_intent_id: paymentIntent.id,
        status: 'betaald',
      });
    } catch (dbErr) {
      console.error('[stripe-webhook] DB insert failed:', dbErr);
      // Return 500 so Stripe retries
      return new Response('Database error.', { status: 500 });
    }

    // Send confirmation email (non-blocking)
    const resendApiKey = import.meta.env.RESEND_API_KEY;
    if (resendApiKey && meta.email) {
      try {
        const resend = new Resend(resendApiKey);
        const fromEmail = import.meta.env.RESEND_FROM_EMAIL || 'Mariage Bruidsmode <onboarding@resend.dev>';
        const amountFormatted = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(paymentIntent.amount / 100);
        const paymentLabel = meta.payment_type === 'aanbetaling' ? 'Aanbetaling (50%)' : 'Volledig bedrag';

        await resend.emails.send({
          from: fromEmail,
          to: [meta.email],
          subject: `Bestelbevestiging — ${meta.product_name}`,
          html: buildOrderConfirmationHtml({
            firstName: meta.first_name,
            lastName: meta.last_name,
            email: meta.email,
            productName: meta.product_name,
            size: meta.size,
            amountFormatted,
            paymentLabel,
            paymentIntentId: paymentIntent.id,
          }),
        });

        // Notify the shop
        const adminEmail = (import.meta.env.ADMIN_EMAILS ?? '').split(',')[0]?.trim();
        if (adminEmail) {
          await resend.emails.send({
            from: fromEmail,
            to: [adminEmail],
            subject: `Nieuwe online bestelling — ${meta.product_name}`,
            html: buildAdminNotificationHtml({
              firstName: meta.first_name,
              lastName: meta.last_name,
              email: meta.email,
              phone: meta.phone,
              productName: meta.product_name,
              size: meta.size,
              amountFormatted,
              paymentLabel,
              paymentIntentId: paymentIntent.id,
            }),
          });
        }
      } catch (emailErr) {
        console.error('[stripe-webhook] Email failed:', emailErr);
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};

interface OrderEmailParams {
  firstName: string;
  lastName: string;
  email: string;
  productName: string;
  size: string;
  amountFormatted: string;
  paymentLabel: string;
  paymentIntentId: string;
  phone?: string;
}

function buildOrderConfirmationHtml(p: OrderEmailParams): string {
  return `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8" /><title>Bestelbevestiging</title></head>
<body style="margin:0;padding:0;background-color:#FAF7F4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#FAF7F4;">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#fff;border-radius:8px;overflow:hidden;">
        <tr><td style="background-color:#1a1a1a;padding:32px;text-align:center;">
          <p style="color:#c9a96e;font-size:13px;letter-spacing:3px;margin:0 0 8px;text-transform:uppercase;">Mariage Bruidsmode</p>
          <h1 style="color:#fff;font-size:26px;margin:0;">Bedankt voor uw bestelling</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="color:#4a4a4a;margin:0 0 16px;">Beste ${p.firstName},</p>
          <p style="color:#4a4a4a;margin:0 0 24px;">Uw betaling is ontvangen. Wij nemen zo spoedig mogelijk contact met u op om de verdere afhandeling te bespreken.</p>
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FAF7F4;border-radius:6px;padding:20px;margin-bottom:24px;">
            <tr><td style="padding:6px 0;color:#888;font-size:14px;">Product</td><td style="padding:6px 0;color:#1a1a1a;font-size:14px;font-weight:bold;">${p.productName}</td></tr>
            ${p.size ? `<tr><td style="padding:6px 0;color:#888;font-size:14px;">Maat</td><td style="padding:6px 0;color:#1a1a1a;font-size:14px;">${p.size}</td></tr>` : ''}
            <tr><td style="padding:6px 0;color:#888;font-size:14px;">Betaling</td><td style="padding:6px 0;color:#1a1a1a;font-size:14px;">${p.paymentLabel}</td></tr>
            <tr><td style="padding:6px 0;color:#888;font-size:14px;">Betaald bedrag</td><td style="padding:6px 0;color:#1a1a1a;font-size:14px;font-weight:bold;">${p.amountFormatted}</td></tr>
          </table>
          <p style="color:#888;font-size:12px;margin:0;">Referentie: ${p.paymentIntentId}</p>
        </td></tr>
        <tr><td style="background-color:#1a1a1a;padding:24px;text-align:center;">
          <p style="color:#888;font-size:12px;margin:0;">Mariage Bruidsmode · Geldrop · <a href="https://www.mariagebruidsmode.nl" style="color:#c9a96e;text-decoration:none;">mariagebruidsmode.nl</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildAdminNotificationHtml(p: OrderEmailParams): string {
  return `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8" /><title>Nieuwe bestelling</title></head>
<body style="margin:0;padding:0;background-color:#FAF7F4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#FAF7F4;">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#fff;border-radius:8px;overflow:hidden;">
        <tr><td style="background-color:#1a1a1a;padding:24px 32px;">
          <h1 style="color:#c9a96e;font-size:20px;margin:0;">Nieuwe online bestelling</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FAF7F4;border-radius:6px;padding:20px;">
            <tr><td style="padding:6px 0;color:#888;font-size:14px;width:140px;">Klant</td><td style="padding:6px 0;color:#1a1a1a;font-size:14px;">${p.firstName} ${p.lastName}</td></tr>
            <tr><td style="padding:6px 0;color:#888;font-size:14px;">E-mail</td><td style="padding:6px 0;color:#1a1a1a;font-size:14px;"><a href="mailto:${p.email}" style="color:#c9a96e;">${p.email}</a></td></tr>
            ${p.phone ? `<tr><td style="padding:6px 0;color:#888;font-size:14px;">Telefoon</td><td style="padding:6px 0;color:#1a1a1a;font-size:14px;">${p.phone}</td></tr>` : ''}
            <tr><td style="padding:6px 0;color:#888;font-size:14px;">Product</td><td style="padding:6px 0;color:#1a1a1a;font-size:14px;font-weight:bold;">${p.productName}</td></tr>
            ${p.size ? `<tr><td style="padding:6px 0;color:#888;font-size:14px;">Maat</td><td style="padding:6px 0;color:#1a1a1a;font-size:14px;">${p.size}</td></tr>` : ''}
            <tr><td style="padding:6px 0;color:#888;font-size:14px;">Betaaltype</td><td style="padding:6px 0;color:#1a1a1a;font-size:14px;">${p.paymentLabel}</td></tr>
            <tr><td style="padding:6px 0;color:#888;font-size:14px;">Bedrag</td><td style="padding:6px 0;color:#1a1a1a;font-size:14px;font-weight:bold;">${p.amountFormatted}</td></tr>
            <tr><td style="padding:6px 0;color:#888;font-size:14px;">Referentie</td><td style="padding:6px 0;color:#1a1a1a;font-size:12px;">${p.paymentIntentId}</td></tr>
          </table>
          <p style="margin-top:24px;"><a href="${import.meta.env.SITE_URL ?? 'https://www.mariagebruidsmode.nl'}/admin/online-bestellingen" style="background:#c9a96e;color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;font-size:14px;">Bekijk in admin</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
