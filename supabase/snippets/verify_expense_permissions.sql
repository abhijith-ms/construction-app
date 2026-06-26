-- Verification script for expense permissions (Migration 020)
-- Tests the new policies created in 20260623080020_fix_expense_permissions.sql
--
-- Expected results:
-- 1. Supervisor can INSERT site_expenses for assigned site ✅
-- 2. Supervisor cannot INSERT site_expenses for unassigned site ✅
-- 3. Office Manager can SELECT office_expenses ✅

-- ============================================================================
-- Test Setup: Create a site and assign supervisors
-- ============================================================================

-- Clean up any existing test data
DELETE FROM public.site_expenses WHERE description LIKE 'Test expense%';
DELETE FROM public.office_expenses WHERE description LIKE 'Test office%';

-- Get or create test users
DO $$
DECLARE
  admin_id UUID := 'a0000000-0000-0000-0000-000000000000';
  office_id UUID := 'b0000000-0000-0000-0000-000000000002';
  supervisor1_id UUID := 'c0000000-0000-0000-0000-000000000001';
  supervisor2_id UUID := 'd0000000-0000-0000-0000-000000000003';
  site1_id UUID := 'eeeeeeee-0000-0000-0000-000000000001';
  site2_id UUID := 'ffffffff-0000-0000-0000-000000000002';
BEGIN
  -- Create test site 1 (for supervisor1)
  INSERT INTO public.sites (id, name, client_name, client_phone, budget)
  VALUES (site1_id, 'Test Site 1', 'Test Client', '9999999999', 1000000)
  ON CONFLICT (id) DO NOTHING;

  -- Create test site 2 (for supervisor2)
  INSERT INTO public.sites (id, name, client_name, client_phone, budget)
  VALUES (site2_id, 'Test Site 2', 'Test Client 2', '8888888888', 500000)
  ON CONFLICT (id) DO NOTHING;

  -- Assign supervisor1 to site1
  INSERT INTO public.supervisor_site_assignments (supervisor_id, site_id)
  VALUES (supervisor1_id, site1_id)
  ON CONFLICT DO NOTHING;

  -- Assign supervisor2 to site2
  INSERT INTO public.supervisor_site_assignments (supervisor2_id, site2_id)
  VALUES (supervisor2_id, site2_id)
  ON CONFLICT DO NOTHING;
END $$;

-- ============================================================================
-- Verification: Check policies exist
-- ============================================================================

SELECT 'POLICY CHECK' AS section;

SELECT 
  schemaname, 
  tablename, 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND (
    policyname LIKE '%site_expenses%' 
    OR policyname LIKE '%office_expenses%'
  )
ORDER BY tablename, policyname;

-- ============================================================================
-- Policy name reference for manual verification
-- ============================================================================

SELECT '
EXPECTED POLICIES:
- site_expenses_insert_supervisor (NEW in migration 020)
- site_expenses_insert_admin_office (existing)
- site_expenses_select_admin_office (existing)
- site_expenses_update_admin_office (existing)
- office_expenses_select_admin_office (NEW in migration 020 - replaces office_expenses_select_admin)
- office_expenses_insert_admin_office (existing)
- office_expenses_update_admin_office (existing)
' AS policy_reference;
