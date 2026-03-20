-- Add logo and contact info to site_settings
alter table public.site_settings
  add column if not exists logo_url text,
  add column if not exists contact_info jsonb not null default '{}'::jsonb;
