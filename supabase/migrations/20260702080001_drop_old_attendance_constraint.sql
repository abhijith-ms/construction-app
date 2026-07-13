-- Migration: Drop legacy unique constraint on labour_attendance
--
-- REASON: There are two conflicting unique constraints on the labour_attendance table:
-- 1. labour_attendance_labour_id_date_key (labour_id, date) - legacy from migration 005
-- 2. labour_attendance_labour_date_site_unique (labour_id, date, site_id) - added in migration 025
--
-- Having both constraints prevents workers from having attendance records at different
-- sites on the same day, which is a valid business scenario (multi-site workers).
--
-- This migration drops the legacy constraint so only the correct (labour_id, date, site_id)
-- constraint from migration 025 remains.

-- Drop the legacy constraint if it exists
ALTER TABLE labour_attendance 
DROP CONSTRAINT IF EXISTS labour_attendance_labour_id_date_key;

COMMENT ON TABLE labour_attendance IS 
'Attendance records per worker per day per site. The unique constraint (labour_id, date, site_id) \
allows the same worker to be marked at different sites on the same day for multi-site workers.';
