-- Migration: Admin-configurable work categories (work_categories)
--
-- Replaces the hardcoded WORK_CATEGORIES array duplicated in
-- src/routes/Labour.tsx and src/routes/Attendance.tsx with a real table,
-- so Admin/Office Manager can add and retire categories without a code
-- deploy. See CLAUDE.md Section 7 (pending feature) and KNOWN_GAPS.md
-- ("work_categories is not a real table") for full history.
--
-- labour.default_work_category and labour_attendance.work_category stay
-- plain, unconstrained TEXT — deliberately NOT converted to a foreign key.
-- An FK (especially ON UPDATE CASCADE on rename) would let a category
-- rename silently rewrite already-settled, already-paid historical
-- attendance/payroll rows — exactly the kind of retroactive mutation of
-- financial history CLAUDE.md warns against. Renaming is therefore not
-- supported: `name` is immutable after creation (no UPDATE path in the
-- app changes it), retirement is is_active = false, and this table is
-- purely the source of *options offered in the UI*, not a referential
-- constraint on historical data.
--
-- last_edited_by / created_by are NULLABLE here — unlike most audit
-- columns in this codebase, which are NOT NULL — because the 6 rows
-- seeded below were not created by any human actor. Inventing an admin
-- UUID for them would be a small lie in the audit trail; NULL honestly
-- means "system-seeded, no human actor." Every row created through the
-- app's create-hook sets both fields to the real logged-in user.
--
-- PERMISSIONS (per CLAUDE.md Section 5, "Manage work categories | admin ✓
-- | office_manager ✓ | supervisor ✗"):
-- - SELECT: all three roles (supervisors need to read categories to mark attendance)
-- - INSERT/UPDATE: Admin + Office Manager only
-- - DELETE: no one — retirement is is_active = false (default deny, no policy)

---------------------------------------------------------------------------
-- 1. work_categories table
---------------------------------------------------------------------------
CREATE TABLE work_categories (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT          NOT NULL UNIQUE,
  is_active       BOOLEAN       NOT NULL DEFAULT true,
  created_by      UUID          REFERENCES profiles(id),
  last_edited_by  UUID          REFERENCES profiles(id),
  last_edited_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

COMMENT ON TABLE  work_categories                 IS 'Admin-configurable list of labour job types (mason, helper, ...). Replaces the hardcoded WORK_CATEGORIES array. name is immutable once created — retire (is_active=false) and create a new row instead of renaming, to avoid changing historical attendance/payroll text.';
COMMENT ON COLUMN work_categories.name             IS 'Immutable after creation. No UPDATE path in the app changes this column — only is_active toggles.';
COMMENT ON COLUMN work_categories.created_by       IS 'NULL for the 6 rows seeded by this migration (no human actor). Set by the app for every category created through the UI.';
COMMENT ON COLUMN work_categories.last_edited_by   IS 'NULL for seeded rows. Set by the app on every insert/update — nullable only to honestly represent system-seeded data.';

ALTER TABLE work_categories ENABLE ROW LEVEL SECURITY;

---------------------------------------------------------------------------
-- 2. RLS Policies
---------------------------------------------------------------------------

-- All authenticated roles can read (supervisors need this for the attendance dropdown)
CREATE POLICY work_categories_select_all
  ON work_categories FOR SELECT
  TO authenticated
  USING (true);

-- Admin + Office Manager can create and edit (is_active toggle)
CREATE POLICY work_categories_insert_admin_office
  ON work_categories FOR INSERT
  TO authenticated
  WITH CHECK (get_my_role() IN ('admin', 'office_manager'));

CREATE POLICY work_categories_update_admin_office
  ON work_categories FOR UPDATE
  TO authenticated
  USING (get_my_role() IN ('admin', 'office_manager'))
  WITH CHECK (get_my_role() IN ('admin', 'office_manager'));

-- No DELETE policy for any role — default deny. Retirement is is_active = false.

---------------------------------------------------------------------------
-- 3. Seed data — the 6 categories currently hardcoded in
--    src/routes/Labour.tsx / src/routes/Attendance.tsx, so removing the
--    hardcoded array doesn't break anything. created_by/last_edited_by
--    intentionally left NULL — see column comments above.
---------------------------------------------------------------------------
INSERT INTO work_categories (name, is_active) VALUES
  ('mason', true),
  ('helper', true),
  ('electrician', true),
  ('painter', true),
  ('carpenter', true),
  ('plumber', true);

---------------------------------------------------------------------------
-- 4. GRANTs — coarse-grained table permission required for authenticated
--    to attempt these operations at all; RLS policies above then restrict
--    which rows/roles. No DELETE grant — matches "no one can delete".
---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE ON work_categories TO authenticated;
