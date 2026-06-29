-- Add unique constraint for labour_attendance to support upsert operations
-- This constraint ensures that each worker can only have one attendance record per date per site

ALTER TABLE labour_attendance 
ADD CONSTRAINT labour_attendance_labour_date_site_unique 
UNIQUE (labour_id, date, site_id);

COMMENT ON CONSTRAINT labour_attendance_labour_date_site_unique ON labour_attendance IS 
'Unique constraint to support upsert operations for attendance records';
