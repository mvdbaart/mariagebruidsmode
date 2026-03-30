-- Add homepage/team fields for employees
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS specialisms text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

UPDATE public.employees
SET
  specialisms = COALESCE(specialisms, '{}'::text[]),
  sort_order = COALESCE(sort_order, 0);

CREATE INDEX IF NOT EXISTS employees_active_sort_idx
  ON public.employees (is_active, sort_order, first_name);

DROP POLICY IF EXISTS "Public read active employees" ON public.employees;
CREATE POLICY "Public read active employees"
  ON public.employees
  FOR SELECT
  USING (is_active = true);
