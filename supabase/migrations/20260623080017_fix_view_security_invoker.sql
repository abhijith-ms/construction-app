-- Migration 017: Fix labour_attendance_secure view with security_invoker + restore GRANT
--
-- REASON: Migration 015 created the view without security_invoker=true and then
-- revoked SELECT on the base labour_attendance table from authenticated. This
-- approach has two problems:
--
--   1. Without security_invoker=true, the view runs as the view owner (postgres/
--      superuser), so the base table's RLS policies are evaluated as superuser,
--      bypassing all row filtering. Vikram could see all rows regardless of his
--      site assignments.
--
--   2. Adding security_invoker=true then broke the view because the authenticated
--      role needs SELECT on the base table for a security_invoker view to work.
--
-- CORRECT ARCHITECTURE:
--   - Grant SELECT on base labour_attendance to authenticated (required by the
--     security_invoker view).
--   - Use security_invoker=true on the view so RLS fires as the calling user —
--     this correctly filters rows to only those the user's RLS policies allow.
--   - The view's CASE expression masks rate_applied to NULL for Supervisors
--     without wage visibility, providing column-level masking on top of row RLS.
--   - Direct queries on the base table also hit RLS correctly. The view provides
--     an additional column-masking convenience layer.
--
-- This migration:
--   1. Restores GRANT SELECT ON labour_attendance TO authenticated (corrects the
--      erroneous REVOKE from migration 015).
--   2. Recreates the view with security_invoker=true (and correct AS syntax).

-- Step 1: Restore SELECT grant on base table (revoked in migration 015 incorrectly)
GRANT SELECT ON public.labour_attendance TO authenticated;

-- Step 2: Recreate view with security_invoker=true
-- RLS on labour_attendance now fires as the calling user, not the view owner.
CREATE OR REPLACE VIEW public.labour_attendance_secure
  WITH (security_invoker = true)
AS
SELECT
  id,
  labour_id,
  date,
  site_id,
  status,
  work_category,
  CASE
    WHEN public.get_my_role() IN ('admin', 'office_manager') THEN rate_applied
    WHEN public.get_my_role() = 'supervisor' AND public.has_wage_visibility(site_id) THEN rate_applied
    ELSE NULL
  END AS rate_applied,
  last_edited_by,
  last_edited_at
FROM public.labour_attendance;

COMMENT ON VIEW public.labour_attendance_secure
  IS 'Secure view of labour_attendance with security_invoker=true. Base table RLS policies filter rows as the calling user. The CASE expression additionally masks rate_applied to NULL for supervisors without wage visibility. Application should query this view to get column-masked results.';
