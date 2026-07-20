-- Migration: Add overtime_hours to labour_attendance_secure view
--
-- REASON: Migration 20260713080003 added overtime_hours to the base
-- labour_attendance table, but labour_attendance_secure (migration
-- 20260623080017) has an explicit column list that was never updated to
-- include it. Any query selecting overtime_hours through the view fails
-- with Postgres error 42703 (column does not exist), silently breaking the
-- OT Hours read path everywhere the app queries the secure view instead of
-- the base table.
--
-- MASKING DECISION: overtime_hours is exposed unmasked (no CASE, unlike
-- rate_applied). Per CLAUDE.md's role/permission matrix, "Mark overtime
-- hours" is explicitly "operational, not financial" and available to
-- Supervisors on their own site(s) always, regardless of the wage-visibility
-- toggle — that toggle only ever gated rate_applied. Row-level RLS on the
-- base table still restricts which rows a Supervisor can see at all.
--
-- Recreates the view (CREATE OR REPLACE VIEW with the same security_invoker
-- setting from migration 20260623080017) with overtime_hours added to the
-- passthrough column list. Postgres only allows CREATE OR REPLACE VIEW to
-- append new columns at the end of the existing list (renaming/reordering
-- existing positions errors with "cannot change name of view column") — so
-- overtime_hours is added last, not grouped next to rate_applied.

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
  last_edited_at,
  overtime_hours
FROM public.labour_attendance;

COMMENT ON VIEW public.labour_attendance_secure
  IS 'Secure view of labour_attendance with security_invoker=true. Base table RLS policies filter rows as the calling user. The CASE expression masks rate_applied to NULL for supervisors without wage visibility. overtime_hours is unmasked (operational, not financial per the role/permission matrix). Application should query this view to get column-masked results.';
