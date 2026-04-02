-- Add numeric price field to products for online checkout
ALTER TABLE products ADD COLUMN IF NOT EXISTS price NUMERIC(10,2);
