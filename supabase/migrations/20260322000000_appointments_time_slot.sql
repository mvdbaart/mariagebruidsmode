-- Add time_slot column to appointments table
-- Fixed slots: '10:00', '13:00', '15:00'
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS time_slot TEXT;

-- Constraint to allow only valid slot values (or null for legacy rows)
ALTER TABLE appointments
  ADD CONSTRAINT appointments_time_slot_check
  CHECK (time_slot IS NULL OR time_slot IN ('10:00', '13:00', '15:00'));
