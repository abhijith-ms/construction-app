-- Migration: Add half_day_rate and overtime_rate to labour
--
-- FEATURE: Per-worker fixed half-day rate and overtime rate.
--
-- half_day_rate:
--   When set, the settlement function uses this fixed INR amount for any
--   half-day attendance row instead of (rate_applied × site multiplier).
--   When NULL (the default for all existing workers), the old behaviour is
--   preserved: rate_applied × site_settings.half_day_multiplier.
--   Nullable intentionally — NULL means "use site default", not "zero pay".
--
-- overtime_rate:
--   Hourly rate in INR. When set, overtime_hours (on labour_attendance) are
--   multiplied by this rate and added to gross wages for that day.
--   When NULL, the worker is not eligible for overtime (no OT pay added).
--   Nullable intentionally — NULL means "not eligible", not "zero per hour".
--
-- No RLS changes: existing labour table policies cover new columns.
-- No DEFAULT values: existing rows stay NULL (backward-compatible behaviour).

ALTER TABLE public.labour
  ADD COLUMN half_day_rate NUMERIC(10,2)
    CHECK (half_day_rate >= 0);

ALTER TABLE public.labour
  ADD COLUMN overtime_rate NUMERIC(10,2)
    CHECK (overtime_rate >= 0);

COMMENT ON COLUMN public.labour.half_day_rate IS
  'Fixed INR amount paid for a half-day. When set, overrides the site-level '
  'half_day_multiplier for this worker. NULL = use rate_applied × site multiplier (old behaviour).';

COMMENT ON COLUMN public.labour.overtime_rate IS
  'Hourly overtime rate in INR. Multiplied by labour_attendance.overtime_hours '
  'to compute overtime pay for each day. NULL = worker not eligible for overtime.';
