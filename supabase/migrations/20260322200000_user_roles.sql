-- Create user_roles table for admin role management
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'none',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Only service role can read/write (admin API uses service role key)
CREATE POLICY "Service role full access" ON public.user_roles
  FOR ALL USING (auth.role() = 'service_role');
