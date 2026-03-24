-- Add qualities column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS qualities TEXT[] DEFAULT '{}';
