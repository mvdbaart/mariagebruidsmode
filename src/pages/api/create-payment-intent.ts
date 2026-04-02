import type { APIRoute } from 'astro';
import { stripe } from '../../lib/stripe';
import { getServiceRoleClient } from '../../lib/serverAuth';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { productId, size, paymentType, firstName, lastName, email, phone } = body;

    if (!productId || !paymentType || !firstName || !lastName || !email) {
      return new Response(JSON.stringify({ error: 'Verplichte velden ontbreken.' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    if (paymentType !== 'aanbetaling' && paymentType !== 'volledig') {
      return new Response(JSON.stringify({ error: 'Ongeldig betalingstype.' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    const supabase = getServiceRoleClient();
    const { data: product, error } = await supabase
      .from('products')
      .select('id, name, price, in_stock')
      .eq('id', productId)
      .single();

    if (error || !product) {
      return new Response(JSON.stringify({ error: 'Product niet gevonden.' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      });
    }

    if (!product.in_stock) {
      return new Response(JSON.stringify({ error: 'Product is momenteel niet op voorraad.' }), {
        status: 409,
        headers: { 'content-type': 'application/json' },
      });
    }

    if (!product.price || product.price <= 0) {
      return new Response(JSON.stringify({ error: 'Prijs niet beschikbaar voor online bestelling.' }), {
        status: 422,
        headers: { 'content-type': 'application/json' },
      });
    }

    const fullPrice = Number(product.price);
    const chargeAmount = paymentType === 'aanbetaling'
      ? Math.round(fullPrice * 0.5 * 100)   // 50% deposit in cents
      : Math.round(fullPrice * 100);          // full price in cents

    const paymentIntent = await stripe.paymentIntents.create({
      amount: chargeAmount,
      currency: 'eur',
      metadata: {
        product_id: product.id,
        product_name: product.name,
        size: size ?? '',
        payment_type: paymentType,
        first_name: firstName,
        last_name: lastName,
        email,
        phone: phone ?? '',
      },
    });

    return new Response(JSON.stringify({ clientSecret: paymentIntent.client_secret }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    console.error('[create-payment-intent]', err);
    return new Response(JSON.stringify({ error: 'Serverfout. Probeer het opnieuw.' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
};
