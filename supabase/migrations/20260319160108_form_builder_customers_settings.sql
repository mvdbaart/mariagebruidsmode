-- Forms table
create table if not exists public.forms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  fields jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  submission_count integer not null default 0,
  last_submission_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.forms enable row level security;

-- Form submissions table
create table if not exists public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now(),
  ip_address text
);

create index if not exists form_submissions_form_id_submitted_at_idx
  on public.form_submissions(form_id, submitted_at desc);

alter table public.form_submissions enable row level security;

-- Customers table
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  wedding_date date,
  wedding_venue text,
  size_clothing text,
  size_shoe text,
  measure_bust text,
  measure_waist text,
  measure_hips text,
  measure_height text,
  style_wishes text,
  chosen_product_id uuid references public.products(id) on delete set null,
  order_status text not null default 'orientation',
  delivery_date date,
  price text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customers enable row level security;

-- Integrations column on site_settings
alter table public.site_settings
  add column if not exists integrations jsonb not null default '{}'::jsonb;

-- Optional: link appointments to customers
alter table public.appointments
  add column if not exists customer_id uuid references public.customers(id) on delete set null;
