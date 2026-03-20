-- Employees table (create if not exists, then add missing columns)
CREATE TABLE IF NOT EXISTS public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  role text,
  bio text,
  profile_photo_url text,
  contract_hours numeric(5,2) NOT NULL DEFAULT 0,
  hourly_rate numeric(10,2),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add new columns if they don't exist yet
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS profile_photo_url text;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS hourly_rate numeric(10,2);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Shifts table
CREATE TABLE IF NOT EXISTS public.shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  shift_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

-- Time entries table
CREATE TABLE IF NOT EXISTS public.time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  entry_date date NOT NULL,
  hours_worked numeric(5,2) NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- Absences table
CREATE TABLE IF NOT EXISTS public.absences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  absence_type text NOT NULL DEFAULT 'vacation',
  start_date date NOT NULL,
  end_date date NOT NULL,
  note text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.absences ENABLE ROW LEVEL SECURITY;

-- Triggers (use OR REPLACE on function, DROP IF EXISTS on triggers)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS employees_updated_at ON public.employees;
CREATE TRIGGER employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS shifts_updated_at ON public.shifts;
CREATE TRIGGER shifts_updated_at
  BEFORE UPDATE ON public.shifts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS time_entries_updated_at ON public.time_entries;
CREATE TRIGGER time_entries_updated_at
  BEFORE UPDATE ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS absences_updated_at ON public.absences;
CREATE TRIGGER absences_updated_at
  BEFORE UPDATE ON public.absences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS policies (drop first to avoid duplicate errors)
DROP POLICY IF EXISTS "No public access" ON public.employees;
CREATE POLICY "No public access" ON public.employees FOR ALL USING (false);

DROP POLICY IF EXISTS "No public access" ON public.shifts;
CREATE POLICY "No public access" ON public.shifts FOR ALL USING (false);

DROP POLICY IF EXISTS "No public access" ON public.time_entries;
CREATE POLICY "No public access" ON public.time_entries FOR ALL USING (false);

DROP POLICY IF EXISTS "No public access" ON public.absences;
CREATE POLICY "No public access" ON public.absences FOR ALL USING (false);
