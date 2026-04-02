-- Customer online orders via Stripe (distinct from supplier orders table)
CREATE TABLE IF NOT EXISTS customer_orders (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id                UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name              TEXT NOT NULL,
  size                      TEXT,
  first_name                TEXT NOT NULL,
  last_name                 TEXT NOT NULL,
  email                     TEXT NOT NULL,
  phone                     TEXT,
  amount_paid               NUMERIC(10,2) NOT NULL,
  payment_type              TEXT NOT NULL CHECK (payment_type IN ('aanbetaling', 'volledig')),
  stripe_payment_intent_id  TEXT UNIQUE,
  status                    TEXT NOT NULL DEFAULT 'betaald'
                            CHECK (status IN ('betaald', 'in_behandeling', 'verzonden', 'afgehaald', 'geannuleerd')),
  notes                     TEXT,
  created_at                TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE customer_orders ENABLE ROW LEVEL SECURITY;

-- Only service role (admin) can access
CREATE POLICY "Service role only" ON customer_orders
  USING (false);
