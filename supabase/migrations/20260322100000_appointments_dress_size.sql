-- Add dress_size field to appointments so fitting sessions can be prepared optimally
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS dress_size TEXT;
