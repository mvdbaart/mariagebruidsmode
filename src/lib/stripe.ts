// Server-only — never import this in client-side code
import Stripe from 'stripe';

export const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-03-31.basil',
});
