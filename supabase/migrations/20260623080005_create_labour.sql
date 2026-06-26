-- Migration 005: Labour & labour attendance
-- Labour = daily-wage workers (masons, helpers, etc.). Not app users.
-- A single worker can have different site + rate + job type on different days.

---------------------------------------------------------------------------
-- labour
---------------------------------------------------------------------------
CREATE TABLE labour (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name             TEXT          NOT NULL,
  phone                 VARCHAR(20),
  default_work_category TEXT          NOT NULL,
  default_daily_rate    NUMERIC(10,2) NOT NULL CHECK (default_daily_rate >= 0),
  is_active             BOOLEAN       NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now()
);

COMMENT ON TABLE  labour                        IS 'Daily-wage workers. Can work different sites/rates on different days.';
COMMENT ON COLUMN labour.default_work_category  IS 'Default job type (e.g. mason, helper). Actual per-day category is in labour_attendance.';
COMMENT ON COLUMN labour.default_daily_rate     IS 'Default daily rate in INR. Actual per-day rate is in labour_attendance.';

ALTER TABLE labour ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_labour_updated_at
  BEFORE UPDATE ON labour
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

---------------------------------------------------------------------------
-- labour_attendance
---------------------------------------------------------------------------
-- One row per worker per day. This is the core data source for wage calc.
-- The CHECK constraint enforces: present/half_day MUST have site, category,
-- and rate; absent/leave rows do not require them.
CREATE TABLE labour_attendance (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  labour_id      UUID          NOT NULL REFERENCES labour(id),
  date           DATE          NOT NULL,
  site_id        UUID          REFERENCES sites(id),
  status         TEXT          NOT NULL
                 CHECK (status IN ('present', 'absent', 'half_day', 'leave')),
  work_category  TEXT,
  rate_applied   NUMERIC(10,2) CHECK (rate_applied >= 0),
  last_edited_by UUID          REFERENCES profiles(id),
  last_edited_at TIMESTAMPTZ   DEFAULT now(),
  UNIQUE (labour_id, date),
  CHECK (
    (status IN ('present', 'half_day')
      AND site_id IS NOT NULL
      AND rate_applied IS NOT NULL
      AND work_category IS NOT NULL)
    OR
    (status IN ('absent', 'leave'))
  )
);

COMMENT ON TABLE  labour_attendance              IS 'Per-worker per-day attendance with site, job type, and rate. Drives wage computation.';
COMMENT ON COLUMN labour_attendance.rate_applied IS 'Actual daily rate in INR for this day. May differ from labour.default_daily_rate.';
COMMENT ON COLUMN labour_attendance.work_category IS 'Job type for this day (e.g. mason, helper). May differ from labour.default_work_category.';

ALTER TABLE labour_attendance ENABLE ROW LEVEL SECURITY;

-- Indexes for common queries
CREATE INDEX idx_labour_attendance_date    ON labour_attendance(date);
CREATE INDEX idx_labour_attendance_site_id ON labour_attendance(site_id);
