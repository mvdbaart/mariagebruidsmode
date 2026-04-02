-- Add frontend team profile controls to employees.
-- This keeps planning activity (is_active) separate from website visibility.

ALTER TABLE IF EXISTS public.employees
  ADD COLUMN IF NOT EXISTS show_on_team boolean NOT NULL DEFAULT false;

ALTER TABLE IF EXISTS public.employees
  ADD COLUMN IF NOT EXISTS team_sort_order integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS employees_team_visible_sort_idx
  ON public.employees (is_active, show_on_team, team_sort_order, first_name);

