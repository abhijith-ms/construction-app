-- Migration 020: Fix expense permissions per updated permission matrix
--
-- Updates from PROJECT_MASTER_PROMPT.md Section 5:
-- 1. "Record expenses" — Supervisor can now INSERT site_expenses for assigned sites
-- 2. "View all-company financials / Office expenses" — Office Manager gets full read+write
--
-- Changes:
-- - site_expenses: Add Supervisor INSERT policy (is_supervisor_for_site check)
-- - office_expenses: Replace SELECT policy to include Office Manager (full ALL access)

-- ============================================================================
-- SITE EXPENSES: Add Supervisor INSERT policy
-- ============================================================================

-- Supervisor can INSERT site expenses for sites they are assigned to
CREATE POLICY site_expenses_insert_supervisor
  ON public.site_expenses FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_my_role() = 'supervisor'
    AND public.is_supervisor_for_site(site_id)
  );

-- ============================================================================
-- OFFICE EXPENSES: Give Office Manager full SELECT access
-- ============================================================================

-- Drop the old Admin-only SELECT policy
DROP POLICY IF EXISTS office_expenses_select_admin ON public.office_expenses;

-- Create new SELECT policy for Admin + Office Manager
CREATE POLICY office_expenses_select_admin_office
  ON public.office_expenses FOR SELECT
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'office_manager'));

-- Note: INSERT and UPDATE policies already exist for Admin + Office Manager
-- (office_expenses_insert_admin_office, office_expenses_update_admin_office)
-- These don't need to change.
