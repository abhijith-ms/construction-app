-- Migration 004: Staff & staff attendance
-- Staff = permanent salaried employees (accountants, office assistants, etc.)
-- Separate from profiles: a staff member may or may not have an app login.

---------------------------------------------------------------------------
-- staff
---------------------------------------------------------------------------
CREATE TABLE staff (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id     UUID          UNIQUE REFERENCES profiles(id) ON DELETE SET NULL,
  full_name      TEXT          NOT NULL,
  email          TEXT,
  role           TEXT          NOT NULL,
  monthly_salary NUMERIC(12,2) NOT NULL CHECK (monthly_salary >= 0),
  is_active      BOOLEAN       NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);

COMMENT ON TABLE  staff            IS 'Permanent salaried employees. Optional link to profiles for app login.';
COMMENT ON COLUMN staff.role       IS 'Job title/description (e.g. accountant, office assistant). NOT the app permission role.';
COMMENT ON COLUMN staff.profile_id IS 'Links to app login if this staff member has one. NULL if no login.';

ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_staff_updated_at
  BEFORE UPDATE ON staff
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

---------------------------------------------------------------------------
-- staff_attendance
---------------------------------------------------------------------------
CREATE TABLE staff_attendance (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id       UUID        NOT NULL REFERENCES staff(id),
  date           DATE        NOT NULL,
  status         TEXT        NOT NULL
                 CHECK (status IN ('present', 'absent', 'half_day', 'leave')),
  last_edited_by UUID        REFERENCES profiles(id),
  last_edited_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (staff_id, date)
);

COMMENT ON TABLE staff_attendance IS 'Daily attendance record for permanent staff. One row per staff per day.';

ALTER TABLE staff_attendance ENABLE ROW LEVEL SECURITY;

-- Index: look up all attendance for a given date (daily attendance view)
CREATE INDEX idx_staff_attendance_date ON staff_attendance(date);
