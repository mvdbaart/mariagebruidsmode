-- Database Schema for Mariage Bruidsmode Rebuild

-- Enable Row Level Security
ALTER TABLE IF EXISTS collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS real_weddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS appointments ENABLE ROW LEVEL SECURITY;

-- Collections table
CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  type TEXT CHECK (type IN ('dress', 'suit', 'accessory')),
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  brand TEXT,
  description TEXT,
  images TEXT[] DEFAULT '{}',
  features TEXT[] DEFAULT '{}',
  price_range TEXT,
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Real Weddings (Testimonials)
CREATE TABLE IF NOT EXISTS real_weddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bride_name TEXT NOT NULL,
  groom_name TEXT,
  slug TEXT UNIQUE NOT NULL,
  quote TEXT,
  story TEXT,
  cover_image TEXT,
  gallery_images TEXT[] DEFAULT '{}',
  wedding_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blog Posts
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT,
  excerpt TEXT,
  author TEXT,
  cover_image TEXT,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  tags TEXT[] DEFAULT '{}'
);

-- Appointments (Form Submissions)
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  preferred_date DATE,
  appointment_type TEXT CHECK (appointment_type IN ('standard', 'vip')),
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employees
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  role TEXT,
  bio TEXT,
  specialisms TEXT[] NOT NULL DEFAULT '{}',
  profile_photo_url TEXT,
  contract_hours NUMERIC(5,2) NOT NULL DEFAULT 0,
  hourly_rate NUMERIC(10,2),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS employees_active_sort_idx
  ON employees (is_active, sort_order, first_name);

CREATE POLICY "Public read active employees" ON employees
  FOR SELECT USING (is_active = true);

-- Basic RLS Policies (Read-only for public, Admin for write)
CREATE POLICY "Enable read access for all users" ON collections FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON products FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON real_weddings FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON blog_posts FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON appointments FOR INSERT WITH CHECK (true);
