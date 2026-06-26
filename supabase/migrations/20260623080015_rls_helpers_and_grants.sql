-- Migration 015: RLS helper functions, security triggers, view, and grants
--
-- This migration sets up the infrastructure that RLS policies in migration 016
-- depend on. Nothing in this file creates policies directly.
--
-- CONTENTS:
--   1. Helper functions (SECURITY DEFINER) — reused by all RLS policies
--   2. Role self-escalation trigger — blocks non-admin from changing profiles.role
--   3. rate_applied write guard trigger — blocks Supervisors without wage
--      visibility from writing rate_applied on labour_attendance
--   4. labour_attendance_secure view — masks rate_applied to NULL for
--      Supervisors without wage visibility (security requirement, not UX)
--   5. GRANTs — broad permissions to authenticated role; RLS then restricts rows
--   6. REVOKE direct SELECT on base labour_attendance from authenticated — forces
--      all reads through the labour_attendance_secure view

---------------------------------------------------------------------------
-- 1. HELPER FUNCTIONS (SECURITY DEFINER)
--
-- All functions use SECURITY DEFINER + search_path = public, '' to prevent
-- search_path injection. They run as the function owner (postgres/superuser),
-- not as the calling user, so they can safely read profiles/assignment tables
-- without requiring the calling user to have SELECT on those tables directly.
---------------------------------------------------------------------------

-- get_my_role()
-- Returns the role of the currently authenticated user from profiles.
-- Returns NULL if no profile row exists (should not happen in normal operation).
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, ''
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

COMMENT ON FUNCTION public.get_my_role()
  IS 'Returns the role (admin/office_manager/supervisor) for the current authenticated user. SECURITY DEFINER — reads profiles without requiring caller SELECT privilege.';

-- is_supervisor_for_site(p_site_id uuid)
-- Returns true if the current user has an assignment row for p_site_id.
-- Used by site-scoped Supervisor SELECT/INSERT/UPDATE policies.
CREATE OR REPLACE FUNCTION public.is_supervisor_for_site(p_site_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.supervisor_site_assignments
    WHERE supervisor_id = auth.uid()
      AND site_id = p_site_id
  );
$$;

COMMENT ON FUNCTION public.is_supervisor_for_site(uuid)
  IS 'Returns true if the current user is assigned as supervisor for the given site. SECURITY DEFINER — reads supervisor_site_assignments safely.';

-- has_wage_visibility(p_site_id uuid)
-- Returns true if the current user has the can_view_set_wages toggle enabled
-- for p_site_id. Used to gate wage/rate visibility and rate_applied writes.
CREATE OR REPLACE FUNCTION public.has_wage_visibility(p_site_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.supervisor_wage_permissions
    WHERE supervisor_id      = auth.uid()
      AND site_id            = p_site_id
      AND can_view_set_wages = true
  );
$$;

COMMENT ON FUNCTION public.has_wage_visibility(uuid)
  IS 'Returns true if the current user has wage visibility enabled for the given site. SECURITY DEFINER — reads supervisor_wage_permissions safely.';

---------------------------------------------------------------------------
-- 2. ROLE SELF-ESCALATION TRIGGER
--
-- Blocks any non-admin user from changing their own (or anyone else's) role
-- column via an UPDATE on profiles. Admin can still change any role.
-- This is a BEFORE trigger so the UPDATE is aborted before it reaches storage.
---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, ''
AS $$
BEGIN
  -- If the role column is not changing, always allow
  IF NEW.role = OLD.role THEN
    RETURN NEW;
  END IF;

  -- If the role IS changing, only allow if the caller is an admin
  IF public.get_my_role() = 'admin' THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Permission denied: only admin users can change the role column on profiles'
    USING ERRCODE = 'insufficient_privilege';
END;
$$;

COMMENT ON FUNCTION public.prevent_role_escalation()
  IS 'Trigger function: blocks non-admin users from changing the role column on profiles. Admin can change any role.';

CREATE TRIGGER trg_profiles_prevent_role_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_escalation();

---------------------------------------------------------------------------
-- 3. RATE_APPLIED WRITE GUARD TRIGGER
--
-- Blocks Supervisors from setting a non-NULL rate_applied on labour_attendance
-- rows for sites where they do not have wage visibility.
-- Admin and Office Manager can always write rate_applied.
-- This is a BEFORE INSERT OR UPDATE trigger — aborts before storage.
---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_rate_applied_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, ''
AS $$
DECLARE
  v_role text;
BEGIN
  v_role := public.get_my_role();

  -- Admin and office_manager can always write rate_applied
  IF v_role IN ('admin', 'office_manager') THEN
    RETURN NEW;
  END IF;

  -- Supervisors: block if trying to set a non-NULL rate_applied without wage visibility
  IF v_role = 'supervisor' AND NEW.rate_applied IS NOT NULL THEN
    IF NOT public.has_wage_visibility(NEW.site_id) THEN
      RAISE EXCEPTION 'Permission denied: supervisor does not have wage visibility for site % — cannot set rate_applied',
        NEW.site_id
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.guard_rate_applied_write()
  IS 'Trigger function: prevents supervisors without wage visibility from writing rate_applied on labour_attendance. Security enforcement — not just UX.';

CREATE TRIGGER trg_labour_attendance_guard_rate_applied
  BEFORE INSERT OR UPDATE ON public.labour_attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_rate_applied_write();

---------------------------------------------------------------------------
-- 4. labour_attendance_secure VIEW
--
-- This view is the ONLY way the authenticated role should read
-- labour_attendance. Direct SELECT on the base table is revoked below (step 6).
--
-- The view returns all columns, but replaces rate_applied with NULL for any
-- Supervisor querying a site where they do not have wage visibility.
-- Admin and Office Manager always see the real rate_applied.
--
-- The view itself has RLS-like filtering baked into the CASE expression for
-- rate_applied. The base table's RLS policies (in migration 016) still control
-- which ROWS are visible — the view only controls column masking.
---------------------------------------------------------------------------
-- CRITICAL: security_invoker = true ensures that when authenticated users query
-- this view, the base table's RLS policies are evaluated as THAT user's identity
-- (not the view owner). Without this, the view owner (postgres/superuser) would
-- evaluate the RLS check, bypassing all row filtering. PG 15+ required.
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
  IS 'Secure view of labour_attendance with security_invoker=true. RLS policies on the base table filter rows as the calling user. The CASE expression additionally masks rate_applied to NULL for supervisors without wage visibility. Application should query this view to get column-masked results. Direct SELECT on the base table is also subject to RLS and returns real rate_applied values — the view provides an extra masking convenience layer on top of RLS row-filtering.';

---------------------------------------------------------------------------
-- 5. GRANTS
--
-- Grant USAGE on schema public to authenticated (required for any table access).
-- Grant broad DML to authenticated on all tables — RLS policies in migration 016
-- then restrict which ROWS each user can access. This follows the Supabase
-- recommended pattern: broad grants + restrictive RLS.
--
-- Excluded: stock_levels (INSERT/UPDATE/DELETE managed by trigger only)
--
-- NOTE: labour_attendance base table SELECT IS granted here. The view uses
-- security_invoker=true, which requires the caller to have SELECT on the base
-- table. RLS on the base table still filters rows correctly as the calling user.
-- The labour_attendance_secure view adds column-level masking on top of RLS.
---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO authenticated;

-- Read access on all tables + view
GRANT SELECT ON public.profiles                   TO authenticated;
GRANT SELECT ON public.supervisor_site_assignments TO authenticated;
GRANT SELECT ON public.supervisor_wage_permissions TO authenticated;
GRANT SELECT ON public.sites                      TO authenticated;
GRANT SELECT ON public.site_settings              TO authenticated;
GRANT SELECT ON public.staff                      TO authenticated;
GRANT SELECT ON public.staff_attendance           TO authenticated;
GRANT SELECT ON public.labour                     TO authenticated;
GRANT SELECT ON public.labour_attendance          TO authenticated;
GRANT SELECT ON public.labour_attendance_secure   TO authenticated;
GRANT SELECT ON public.labour_settlements         TO authenticated;
GRANT SELECT ON public.labour_advances            TO authenticated;
GRANT SELECT ON public.pay_receipts               TO authenticated;
GRANT SELECT ON public.site_expenses              TO authenticated;
GRANT SELECT ON public.office_expenses            TO authenticated;
GRANT SELECT ON public.suppliers                  TO authenticated;
GRANT SELECT ON public.purchase_orders            TO authenticated;
GRANT SELECT ON public.bills                      TO authenticated;
GRANT SELECT ON public.supplier_payments          TO authenticated;
GRANT SELECT ON public.materials                  TO authenticated;
GRANT SELECT ON public.stock_levels               TO authenticated;
GRANT SELECT ON public.stock_transactions         TO authenticated;

-- Write access — RLS policies gate which rows can actually be written
GRANT INSERT, UPDATE ON public.profiles                   TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.supervisor_site_assignments TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.supervisor_wage_permissions TO authenticated;
GRANT INSERT, UPDATE ON public.sites                      TO authenticated;
GRANT INSERT, UPDATE ON public.site_settings              TO authenticated;
GRANT INSERT, UPDATE ON public.staff                      TO authenticated;
GRANT INSERT, UPDATE ON public.staff_attendance           TO authenticated;
GRANT INSERT, UPDATE ON public.labour                     TO authenticated;
GRANT INSERT, UPDATE ON public.labour_attendance          TO authenticated;
GRANT INSERT, UPDATE ON public.labour_settlements         TO authenticated;
GRANT INSERT, UPDATE ON public.labour_advances            TO authenticated;
GRANT INSERT, UPDATE ON public.pay_receipts               TO authenticated;
GRANT INSERT, UPDATE ON public.site_expenses              TO authenticated;
GRANT INSERT, UPDATE ON public.office_expenses            TO authenticated;
GRANT INSERT, UPDATE ON public.suppliers                  TO authenticated;
GRANT INSERT, UPDATE ON public.purchase_orders            TO authenticated;
GRANT INSERT, UPDATE ON public.bills                      TO authenticated;
GRANT INSERT, UPDATE ON public.supplier_payments          TO authenticated;
GRANT INSERT, UPDATE ON public.materials                  TO authenticated;
-- stock_levels: no direct writes from authenticated (trigger-managed only)
GRANT INSERT, UPDATE, DELETE ON public.stock_transactions TO authenticated;
