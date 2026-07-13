-- Migration 032: site_labour_assignments — Site roster membership for labour
--
-- PURPOSE:
--   Tracks which labour workers are on each site's roster. This controls
--   which workers appear on the attendance screen for a given site.
--
--   IMPORTANT — distinct from labour_site_assignments (migration 027):
--     - labour_site_assignments: rate/category assignments with date ranges
--     - site_labour_assignments: pure roster membership (is this worker on
--       this site's attendance list?)
--
-- KEY DESIGN DECISION — is_active = false means "removed from roster, history preserved":
--   Removing a worker from a site roster NEVER deletes the row. Instead,
--   is_active is set to false. Past labour_attendance rows for that worker
--   and site are completely untouched — there is no cascade, no trigger,
--   no FK relationship that would modify attendance history.
--   A worker can be re-added to a site (new INSERT); historical inactive rows
--   are retained as an audit trail. The partial unique index
--   uq_site_labour_active enforces at most one active roster entry per
--   (site_id, labour_id) pair while allowing arbitrarily many inactive rows.
--
-- MULTI-SITE INDICATOR:
--   get_labour_active_site_count(p_labour_id) is a SECURITY DEFINER function
--   that returns the true count of active roster entries for a worker across
--   ALL sites, bypassing RLS. This is required because a supervisor's RLS
--   restricts their view to their own site(s) only — a plain view would
--   undercount multi-site workers for supervisors, making the indicator wrong.

---------------------------------------------------------------------------
-- 1. site_labour_assignments table
---------------------------------------------------------------------------
CREATE TABLE public.site_labour_assignments (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id        UUID        NOT NULL REFERENCES public.sites(id),
  labour_id      UUID        NOT NULL REFERENCES public.labour(id),
  is_active      BOOLEAN     NOT NULL DEFAULT true,
  assigned_by    UUID        NOT NULL REFERENCES public.profiles(id),
  assigned_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_edited_by UUID        NOT NULL REFERENCES public.profiles(id),
  last_edited_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.site_labour_assignments IS
  'Roster membership: which labour workers are assigned to which site. '
  'is_active = false means removed from roster — row is kept for history. '
  'Past labour_attendance rows are never touched by roster changes.';

COMMENT ON COLUMN public.site_labour_assignments.is_active IS
  'true = worker is currently on this site roster and will appear on attendance screen. '
  'false = worker was removed; historical record only. Set to false on removal, never hard-delete.';

COMMENT ON COLUMN public.site_labour_assignments.assigned_by IS
  'Profile ID of the user who added this worker to the site roster.';

COMMENT ON COLUMN public.site_labour_assignments.assigned_at IS
  'Timestamp when the worker was added to the roster.';

COMMENT ON COLUMN public.site_labour_assignments.last_edited_by IS
  'Audit: profile ID of the last user to modify this row (required by Security Requirement #5).';

COMMENT ON COLUMN public.site_labour_assignments.last_edited_at IS
  'Audit: timestamp of the last modification to this row (required by Security Requirement #5).';

---------------------------------------------------------------------------
-- 2. Indexes
---------------------------------------------------------------------------

-- Primary lookup: "give me all active workers on site X" (attendance screen)
CREATE INDEX idx_site_labour_assignments_site_id
  ON public.site_labour_assignments(site_id);

-- Secondary lookup: "which sites is this worker on?" (multi-site check)
CREATE INDEX idx_site_labour_assignments_labour_id
  ON public.site_labour_assignments(labour_id);

-- Partial unique index: at most ONE active roster entry per (site, worker).
-- Allows arbitrarily many is_active = false rows (historical records).
-- Re-adding a removed worker creates a new active row without violating this.
CREATE UNIQUE INDEX uq_site_labour_active
  ON public.site_labour_assignments(site_id, labour_id)
  WHERE is_active = true;

---------------------------------------------------------------------------
-- 3. RLS
---------------------------------------------------------------------------
ALTER TABLE public.site_labour_assignments ENABLE ROW LEVEL SECURITY;

-- Admin and Office Manager: full CRUD
-- Matches permission matrix: "Assign labour to site roster" -> Admin, Office Manager
CREATE POLICY site_labour_assignments_all_admin_office
  ON public.site_labour_assignments
  FOR ALL
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'office_manager'))
  WITH CHECK (public.get_my_role() IN ('admin', 'office_manager'));

-- Supervisor: SELECT only, restricted to their assigned sites
-- Allows supervisors to see who is on their site's roster (and the multi-site indicator)
-- is_supervisor_for_site() helper (migration 015) is reused — no new helper needed.
-- Matches permission matrix: Supervisor sees own site(s) only, no write access.
CREATE POLICY site_labour_assignments_select_supervisor
  ON public.site_labour_assignments
  FOR SELECT
  TO authenticated
  USING (
    public.get_my_role() = 'supervisor'
    AND public.is_supervisor_for_site(site_id)
  );

---------------------------------------------------------------------------
-- 4. GRANTs
---------------------------------------------------------------------------
GRANT SELECT ON public.site_labour_assignments TO authenticated;
GRANT INSERT, UPDATE ON public.site_labour_assignments TO authenticated;
-- No DELETE grant: roster removals are soft-deletes (is_active = false).
-- Hard deletes are not permitted via the API; history must be preserved.

---------------------------------------------------------------------------
-- 5. get_labour_active_site_count(p_labour_id uuid) RETURNS integer
--
-- Returns the count of active roster entries for a given labour worker
-- across ALL sites, bypassing RLS.
--
-- WHY SECURITY DEFINER:
--   A supervisor's RLS on site_labour_assignments restricts rows to their
--   own assigned site(s). A supervisor calling this function for a worker on
--   their site would only see count = 1 (their site), even if that worker is
--   also on two other sites. The visual multi-site indicator would be wrong.
--   SECURITY DEFINER runs as the function owner (postgres) and bypasses RLS,
--   so it always returns the true count across all sites.
--
-- SECURITY NOTE:
--   This function returns only an integer — no sensitive data is exposed.
--   It does NOT return which sites the worker is on (site IDs, names, or any
--   other data), only the count. A supervisor learning that a worker is on
--   2 active sites does not expose any data they are not entitled to.
--
-- RETURN VALUE:
--   Integer count of active roster entries (>= 0).
--   Frontend computes is_multi_site as: count > 1
---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_labour_active_site_count(p_labour_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, ''
AS $$
  SELECT COUNT(*)::integer
  FROM public.site_labour_assignments
  WHERE labour_id = p_labour_id
    AND is_active = true;
$$;

COMMENT ON FUNCTION public.get_labour_active_site_count(uuid) IS
  'Returns the count of active roster entries for a labour worker across ALL sites. '
  'SECURITY DEFINER — bypasses RLS to give supervisors the true cross-site count '
  'for the multi-site visual indicator. Returns only an integer; no site-level data exposed.';

GRANT EXECUTE ON FUNCTION public.get_labour_active_site_count(uuid) TO authenticated;
