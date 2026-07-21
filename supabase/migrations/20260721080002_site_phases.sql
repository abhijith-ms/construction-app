-- Migration: Work progress tracking (site_phases)
--
-- Tracks % complete per construction phase per site. 5 fixed phases
-- (foundation, structure, mep, finishing, handover) — a CHECK-constraint
-- enum, not an admin-configurable table: these are standard phases that
-- don't need per-project editing, and building a lookup table + admin UI
-- for 5 values that rarely change would be premature.
--
-- Phases are independent (no sequential gating) — real construction phases
-- overlap in practice (MEP rough-in often starts before Structure is fully
-- complete), so enforcing a hard 100%-before-next-starts gate would force
-- supervisors to misreport reality to work around it.
--
-- PERMISSIONS (operational data, not financial — matches labour_attendance's
-- pattern, not site_expenses'):
-- - Admin + Office Manager: view + edit, all sites
-- - Supervisor: view + edit, own assigned site(s) only
-- No client-facing INSERT/DELETE policy — rows are seeded automatically by
-- trigger on site creation (see below), so the app only ever needs
-- SELECT + UPDATE.

---------------------------------------------------------------------------
-- 1. site_phases table
---------------------------------------------------------------------------
CREATE TABLE site_phases (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id           UUID          NOT NULL REFERENCES sites(id),
  phase             TEXT          NOT NULL
                    CHECK (phase IN ('foundation', 'structure', 'mep', 'finishing', 'handover')),
  percent_complete  SMALLINT      NOT NULL DEFAULT 0
                    CHECK (percent_complete BETWEEN 0 AND 100),
  last_edited_by    UUID          NOT NULL REFERENCES profiles(id),
  last_edited_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  UNIQUE (site_id, phase)
);

COMMENT ON TABLE  site_phases                  IS 'Work progress (% complete) per construction phase per site. Phases are independent, not sequentially gated.';
COMMENT ON COLUMN site_phases.phase             IS 'Fixed enum: foundation, structure, mep, finishing, handover. Not admin-configurable by design — see migration header.';
COMMENT ON COLUMN site_phases.percent_complete  IS 'Manually entered 0-100. No derived/automatic source exists for physical construction progress.';

ALTER TABLE site_phases ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_site_phases_site_id ON site_phases(site_id);

---------------------------------------------------------------------------
-- 2. RLS Policies
---------------------------------------------------------------------------

-- Admin + Office Manager: view + edit, all sites
CREATE POLICY site_phases_select_admin_office
  ON site_phases FOR SELECT
  TO authenticated
  USING (get_my_role() IN ('admin', 'office_manager'));

CREATE POLICY site_phases_update_admin_office
  ON site_phases FOR UPDATE
  TO authenticated
  USING (get_my_role() IN ('admin', 'office_manager'))
  WITH CHECK (get_my_role() IN ('admin', 'office_manager'));

-- Supervisor: view + edit, own assigned site(s) only
CREATE POLICY site_phases_select_supervisor
  ON site_phases FOR SELECT
  TO authenticated
  USING (
    get_my_role() = 'supervisor'
    AND is_supervisor_for_site(site_id)
  );

CREATE POLICY site_phases_update_supervisor
  ON site_phases FOR UPDATE
  TO authenticated
  USING (
    get_my_role() = 'supervisor'
    AND is_supervisor_for_site(site_id)
  )
  WITH CHECK (
    get_my_role() = 'supervisor'
    AND is_supervisor_for_site(site_id)
  );

-- No INSERT/DELETE policy for any role — default deny. Rows are only ever
-- created by the SECURITY DEFINER trigger below (on site creation) or the
-- one-time backfill in this migration, both of which bypass RLS.

---------------------------------------------------------------------------
-- 3. Auto-seed trigger: create all 5 phase rows (0%) when a site is created
---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION seed_site_phases()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, ''
AS $$
BEGIN
  -- sites.created_by is nullable and the app's create-site flow (useCreateSite.ts)
  -- never actually sets it, so NEW.created_by is NULL for every site created
  -- through the UI today. Fall back to auth.uid() (the actual inserting user)
  -- so last_edited_by NOT NULL is never violated. auth.uid() reads the calling
  -- session's JWT claim, not the function owner, even under SECURITY DEFINER —
  -- same technique already used by get_my_role()/is_supervisor_for_site().
  INSERT INTO public.site_phases (site_id, phase, percent_complete, last_edited_by)
  SELECT NEW.id, p, 0, COALESCE(NEW.created_by, auth.uid())
  FROM unnest(ARRAY['foundation', 'structure', 'mep', 'finishing', 'handover']) AS p;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION seed_site_phases() IS 'Auto-creates all 5 site_phases rows at 0% when a new site is inserted. SECURITY DEFINER so it works regardless of the inserting user''s RLS visibility into site_phases.';

CREATE TRIGGER trg_sites_seed_phases
  AFTER INSERT ON sites
  FOR EACH ROW
  EXECUTE FUNCTION seed_site_phases();

---------------------------------------------------------------------------
-- 4. Backfill: seed phases for sites that already existed before this migration
---------------------------------------------------------------------------
INSERT INTO site_phases (site_id, phase, percent_complete, last_edited_by)
SELECT s.id, p, 0, s.created_by
FROM sites s
CROSS JOIN unnest(ARRAY['foundation', 'structure', 'mep', 'finishing', 'handover']) AS p
ON CONFLICT (site_id, phase) DO NOTHING;

---------------------------------------------------------------------------
-- 5. GRANTs (following pattern from migration 015 / 029)
-- Coarse-grained GRANT required for authenticated to attempt SELECT/UPDATE
-- at all; RLS policies above then restrict which rows and roles.
---------------------------------------------------------------------------
GRANT SELECT, UPDATE ON site_phases TO authenticated;
