-- Fix shifts: rename shift_date -> date (code uses 'date' everywhere)
ALTER TABLE public.shifts RENAME COLUMN shift_date TO date;

-- Fix time_entries: rename entry_date -> date, add start_time/end_time/break_minutes
ALTER TABLE public.time_entries RENAME COLUMN entry_date TO date;
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS start_time time;
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS end_time time;
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS break_minutes integer NOT NULL DEFAULT 0;

-- Fix absences: rename absence_type -> type (code uses 'type' everywhere)
ALTER TABLE public.absences RENAME COLUMN absence_type TO type;
