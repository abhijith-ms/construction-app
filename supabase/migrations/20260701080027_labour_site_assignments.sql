-- Migration 027: Labour Site Assignments + Payment Mode in Settlements
--
-- This migration:
--   1. Creates labour_site_assignments table to track which labourer is assigned
--      to which site, with what category and rate
--   2. Adds payment_mode and payment_reference columns to labour_settlements
--
-- REASON: Currently, labourers have default_work_category and default_daily_rate on
-- the labour table, but they may get assigned to different sites with different
-- categories/rates. This table tracks those assignments with date ranges.
--
-- RLS POLICY APPROACH:
--   - Admin and Office Manager: full access (CREATE, READ, UPDATE)
--   - Supervisor: read-only for their assigned sites
--   - No DELETE on assignments — use end_date to deactivate (soft end)

---------------------------------------------------------------------------
-- 1. labour_site_assignments table
---------------------------------------------------------------------------
CREATE TABLE labour_site_assignments (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  labour_id       UUID          NOT NULL REFERENCES labour(id),
  site_id         UUID          NOT NULL REFERENCES sites(id),
  task_category   TEXT          NOT NULL,
  daily_rate      NUMERIC(10,2) NOT NULL CHECK (daily_rate > 0),
  start_date      DATE          NOT NULL,
  end_date        DATE,
  notes           TEXT,
  assigned_by     UUID          NOT NULL REFERENCES profiles(id),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CONSTRAINT no_overlapping_assignments UNIQUE (labour_id, site_id, start_date)
);

COMMENT ON TABLE labour_site_assignments IS 'Tracks labourer assignments to sites with task category and daily rate. Active assignment = end_date IS NULL or end_date >= today.';

COMMENT ON COLUMN labour_site_assignments.labour_id IS 'Reference to the labour/worker';
COMMENT ON COLUMN labour_site_assignments.site_id IS 'Reference to the site where worker is assigned';
COMMENT ON COLUMN labour_site_assignments.task_category IS 'Job type (mason, helper, electrician, painter, carpenter, plumber)';
COMMENT ON COLUMN labour_site_assignments.daily_rate IS 'Daily rate in INR for this assignment';
COMMENT ON COLUMN labour_site_assignments.start_date IS 'Assignment start date';
COMMENT ON COLUMN labour_site_assignments.end_date IS 'Assignment end date (NULL = active/indefinite)';
COMMENT ON COLUMN labour_site_assignments.notes IS 'Optional notes about the assignment';
COMMENT ON COLUMN labour_site_assignments.assigned_by IS 'User who created this assignment';

-- Indexes for common queries
CREATE INDEX idx_labour_site_assignments_labour_id ON labour_site_assignments(labour_id);
CREATE INDEX idx_labour_site_assignments_site_id ON labour_site_assignments(site_id);
CREATE INDEX idx_labour_site_assignments_start_date ON labour_site_assignments(start_date);
CREATE INDEX idx_labour_site_assignments_end_date ON labour_site_assignments(end_date);

ALTER TABLE labour_site_assignments ENABLE ROW LEVEL SECURITY;

-- RLS: Admin and Office Manager full access
CREATE POLICY "admin_office_full_access_assignments"
ON labour_site_assignments FOR ALL
TO authenticated
USING (get_my_role() IN ('admin', 'office_manager'))
WITH CHECK (get_my_role() IN ('admin', 'office_manager'));

-- RLS: Supervisor read-only for their assigned sites
CREATE POLICY "supervisor_read_assignments"
ON labour_site_assignments FOR SELECT
TO authenticated
USING (
  get_my_role() = 'supervisor'
  AND is_supervisor_for_site(site_id)
);

-- RLS: allow inserts by supervisors (for backwards compatibility with potential future use)
-- Currently commented out since user requirement doesn't specify supervisor assignment creation
-- Uncomment and adjust if needed:
-- CREATE POLICY "supervisor_insert_assignments"
-- ON labour_site_assignments FOR INSERT
-- TO authenticated
-- WITH CHECK (
--   get_my_role() = 'supervisor'
--   AND is_supervisor_for_site(site_id)
-- );

---------------------------------------------------------------------------
-- 2. Add payment fields to labour_settlements
---------------------------------------------------------------------------
ALTER TABLE labour_settlements
  ADD COLUMN IF NOT EXISTS payment_mode TEXT
    CHECK (payment_mode IN ('cash', 'upi', 'bank_transfer', 'cheque')),
  ADD COLUMN IF NOT EXISTS payment_reference TEXT;

COMMENT ON COLUMN labour_settlements.payment_mode IS 'How the settlement was paid: cash, upi, bank_transfer, cheque. Set when marking as paid.';
COMMENT ON COLUMN labour_settlements.payment_reference IS 'UPI transaction ID, cheque number, or bank reference. Required for UPI/Bank/Cheque, optional for Cash.';

-- Grant SELECT on labour_site_assignments for authenticated users
GRANT SELECT ON public.labour_site_assignments TO authenticated;
GRANT INSERT, UPDATE ON public.labour_site_assignments TO authenticated;
