-- Migration: Add overtime_hours to labour_attendance
--
-- FEATURE: Track overtime hours per worker per day alongside attendance.
--
-- overtime_hours:
--   Number of overtime hours worked on this day. The settlement function
--   multiplies this by labour.overtime_rate to compute overtime pay.
--   NULL means no overtime recorded (the common case — not stored as 0
--   to avoid inflating rows with meaningless data).
--   CHECK constraint prevents negative values; NULL passes through
--   (PostgreSQL CHECK evaluates NULL comparisons as NULL, which passes).
--
-- Only relevant for present/half_day rows where work was performed;
-- absent/leave rows should leave overtime_hours NULL.
--
-- No RLS changes: existing labour_attendance table policies cover new columns.

ALTER TABLE public.labour_attendance
  ADD COLUMN overtime_hours NUMERIC(5,2)
    CONSTRAINT labour_attendance_overtime_hours_non_negative
    CHECK (overtime_hours >= 0);

COMMENT ON COLUMN public.labour_attendance.overtime_hours IS
  'Overtime hours worked on this day. Multiplied by labour.overtime_rate for OT pay. '
  'NULL = no overtime (common case). Cannot be negative. Ignored when labour.overtime_rate IS NULL.';
