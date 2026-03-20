-- Hero slides table
create table if not exists public.hero_slides (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  subtitle text,
  eyebrow text,
  image_url text not null,
  button1_text text,
  button1_url text,
  button2_text text,
  button2_url text,
  text_align text not null default 'center',
  overlay_opacity integer not null default 40,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.hero_slides enable row level security;

-- Homepage section texts stored in site_settings
alter table public.site_settings
  add column if not exists homepage jsonb not null default '{}'::jsonb;
