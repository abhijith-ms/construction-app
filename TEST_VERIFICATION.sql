-----------------------------------------------------------------------------
-- RLS & BUSINESS LOGIC VERIFICATION TEST SUITE
-- Run after every supabase db reset to verify all RLS policies
--
-- Run with dual-roles: as BOTH postgres superuser (to create results table)
-- AND as simulated authenticated users (for RLS enforcement)
--
-- Usage: docker run --rm --network supabase_network_construction-app 
--        -v /home/abhijithms/Documents/Work/construction-app:/app postgres:15 
--        psql postgresql://postgres:postgres@supabase_db_construction-app:5432/postgres 
--        -f /app/TEST_VERIFICATION.sql
--
-- EXPECTED RESULTS: 26/26 PASS (100%)
-- 
-- Run after every supabase db reset to verify RLS policies
-- npx supabase db query --file TEST_VERIFICATION.sql
--
-- Test Users (from seed.sql):
--   Vikram (c0000000-0000-0000-0000-000000000003) - Supervisor, Site A only, NO wage visibility  
--   Anil   (d0000000-0000-0000-0000-000000000004) - Supervisor, Site A + B, wage visibility ON for Site A only
--   Meena  (b0000000-0000-0000-0000-000000000002) - Office Manager
--   Rajesh (a0000000-0000-0000-0000-000000000001) - Admin
--
-- Sites:
--   Site A: 11111111-0000-0000-0000-000000000001 (Greenfield Residency)
--   Site B: 22222222-0000-0000-0000-000000000002 (Lakeview Commercial Complex)
-----------------------------------------------------------------------------

-- Setup: Create results table as superuser
DROP TABLE IF EXISTS test_results;
CREATE TABLE test_results (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  category TEXT,
  test_name TEXT,
  status TEXT,
  details TEXT
);

-- Function to report test results
CREATE OR REPLACE FUNCTION report_test(_category TEXT, _name TEXT, _status TEXT, _details TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO test_results (category, test_name, status, details) 
  VALUES (_category, _name, _status, _details);
END;
$$ LANGUAGE plpgsql;

-- Grant access to authenticated users
GRANT ALL ON test_results TO authenticated;
GRANT EXECUTE ON FUNCTION report_test TO authenticated;

-----------------------------------------------------------------------------
-- TEST SECTION: VIKRAM (Supervisor, Site A only, NO wage visibility)
-- UUID: c0000000-0000-0000-0000-000000000003
-----------------------------------------------------------------------------

DO $$
DECLARE
  v_count INTEGER;
  v_attendance_id UUID;
BEGIN
  -- Simulate Vikram logging in (set JWT claims)
  PERFORM set_config('request.jwt.claims', '{"sub":"c0000000-0000-0000-0000-000000000003","email":"vikram@constructionapp.local","role":"authenticated"}', true);
  PERFORM set_config('role', 'authenticated', true);

  -- TEST V1: Vikram sees only 1 site
  SELECT COUNT(*) INTO v_count FROM sites;
  IF v_count = 1 THEN
    PERFORM report_test('Vikram', 'sees only 1 site (Greenfield Residency)', 'PASS', 'Expected 1, got ' || v_count);
  ELSE
    PERFORM report_test('Vikram', 'sees only 1 site (Greenfield Residency)', 'FAIL', 'Expected 1, got ' || v_count);
  END IF;

  -- TEST V2: Vikram sees 0 rows in labour_attendance for Site B
  SELECT COUNT(*) INTO v_count FROM labour_attendance_secure WHERE site_id = '22222222-0000-0000-0000-000000000002';
  IF v_count = 0 THEN
    PERFORM report_test('Vikram', 'sees 0 rows in labour_attendance_secure for Site B', 'PASS', 'Expected 0, got ' || v_count);
  ELSE
    PERFORM report_test('Vikram', 'sees 0 rows in labour_attendance_secure for Site B', 'FAIL', 'Expected 0, got ' || v_count);
  END IF;

  -- TEST V3: rate_applied is NULL in labour_attendance_secure (wage masked)
  SELECT COUNT(*) INTO v_count FROM labour_attendance_secure WHERE site_id = '11111111-0000-0000-0000-000000000001' AND rate_applied IS NULL;
  IF v_count > 0 THEN
    PERFORM report_test('Vikram', 'rate_applied is NULL in labour_attendance_secure', 'PASS', v_count || ' rows have rate_applied masked');
  ELSE
    PERFORM report_test('Vikram', 'rate_applied is NULL in labour_attendance_secure', 'FAIL', 'Expected masked rows, got ' || v_count);
  END IF;

  -- TEST V4: BLOCKED - INSERT attendance for Site B
  BEGIN
    INSERT INTO labour_attendance (labour_id, date, site_id, status, work_category, rate_applied, last_edited_by)
    VALUES ('44444444-0000-0000-0000-000000000001', '2026-06-25', '22222222-0000-0000-0000-000000000002', 'present', 'mason', 1300.00, 'c0000000-0000-0000-0000-000000000003');
    PERFORM report_test('Vikram', 'BLOCKED - INSERT attendance for Site B', 'FAIL', 'Insert should have been blocked');
    -- Cleanup if it somehow succeeds
    DELETE FROM labour_attendance WHERE labour_id = '44444444-0000-0000-0000-000000000001' AND date = '2026-06-25';
  EXCEPTION WHEN OTHERS THEN
    PERFORM report_test('Vikram', 'BLOCKED - INSERT attendance for Site B', 'PASS', 'Blocked: ' || SQLERRM);
  END;

  -- TEST V5: BLOCKED - UPDATE rate_applied on Site A row
  BEGIN
    SELECT id INTO v_attendance_id FROM labour_attendance WHERE site_id = '11111111-0000-0000-0000-000000000001' LIMIT 1;
    UPDATE labour_attendance SET rate_applied = 9999.00 WHERE id = v_attendance_id;
    PERFORM report_test('Vikram', 'BLOCKED - UPDATE rate_applied on Site A row', 'FAIL', 'Update should have been blocked');
  EXCEPTION WHEN OTHERS THEN
    PERFORM report_test('Vikram', 'BLOCKED - UPDATE rate_applied on Site A row', 'PASS', 'Blocked: ' || SQLERRM);
  END;

  -- TEST V6: Vikram sees 0 rows in labour_settlements
  SELECT COUNT(*) INTO v_count FROM labour_settlements;
  IF v_count = 0 THEN
    PERFORM report_test('Vikram', 'sees 0 rows in labour_settlements', 'PASS', 'Expected 0, got ' || v_count);
  ELSE
    PERFORM report_test('Vikram', 'sees 0 rows in labour_settlements', 'FAIL', 'Expected 0, got ' || v_count);
  END IF;

  -- TEST V7: Vikram sees 0 rows in staff
  SELECT COUNT(*) INTO v_count FROM staff;
  IF v_count = 0 THEN
    PERFORM report_test('Vikram', 'sees 0 rows in staff', 'PASS', 'Expected 0, got ' || v_count);
  ELSE
    PERFORM report_test('Vikram', 'sees 0 rows in staff', 'FAIL', 'Expected 0, got ' || v_count);
  END IF;

  -- TEST V8: Vikram sees 0 rows in pay_receipts
  SELECT COUNT(*) INTO v_count FROM pay_receipts;
  IF v_count = 0 THEN
    PERFORM report_test('Vikram', 'sees 0 rows in pay_receipts', 'PASS', 'Expected 0, got ' || v_count);
  ELSE
    PERFORM report_test('Vikram', 'sees 0 rows in pay_receipts', 'FAIL', 'Expected 0, got ' || v_count);
  END IF;

  -- TEST V9: Vikram sees 0 rows in office_expenses
  SELECT COUNT(*) INTO v_count FROM office_expenses;
  IF v_count = 0 THEN
    PERFORM report_test('Vikram', 'sees 0 rows in office_expenses', 'PASS', 'Expected 0, got ' || v_count);
  ELSE
    PERFORM report_test('Vikram', 'sees 0 rows in office_expenses', 'FAIL', 'Expected 0, got ' || v_count);
  END IF;

END $$;

-----------------------------------------------------------------------------
-- TEST SECTION: ANIL (Supervisor, Site A + B, wage visibility ON for Site A only)
-- UUID: d0000000-0000-0000-0000-000000000004
-----------------------------------------------------------------------------

DO $$
DECLARE
  v_count INTEGER;
  v_attendance_id UUID;
BEGIN
  -- Simulate Anil logging in
  PERFORM set_config('request.jwt.claims', '{"sub":"d0000000-0000-0000-0000-000000000004","email":"anil@constructionapp.local","role":"authenticated"}', true);
  PERFORM set_config('role', 'authenticated', true);

  -- TEST A1: Anil sees 2 sites
  SELECT COUNT(*) INTO v_count FROM sites;
  IF v_count = 2 THEN
    PERFORM report_test('Anil', 'sees 2 sites (Greenfield + Lakeview)', 'PASS', 'Expected 2, got ' || v_count);
  ELSE
    PERFORM report_test('Anil', 'sees 2 sites (Greenfield + Lakeview)', 'FAIL', 'Expected 2, got ' || v_count);
  END IF;

  -- TEST A2: rate_applied visible for Site A rows in labour_attendance_secure
  SELECT COUNT(*) INTO v_count FROM labour_attendance_secure 
  WHERE site_id = '11111111-0000-0000-0000-000000000001' AND rate_applied IS NOT NULL;
  IF v_count > 0 THEN
    PERFORM report_test('Anil', 'rate_applied visible for Site A rows', 'PASS', v_count || ' rows have visible rate_applied');
  ELSE
    PERFORM report_test('Anil', 'rate_applied visible for Site A rows', 'FAIL', 'Expected visible rates, got ' || v_count);
  END IF;

  -- TEST A3: rate_applied NULL for Site B rows in labour_attendance_secure
  SELECT COUNT(*) INTO v_count FROM labour_attendance_secure 
  WHERE site_id = '22222222-0000-0000-0000-000000000002' AND rate_applied IS NULL;
  IF v_count > 0 THEN
    PERFORM report_test('Anil', 'rate_applied NULL for Site B rows', 'PASS', v_count || ' rows have masked rate_applied');
  ELSE
    PERFORM report_test('Anil', 'rate_applied NULL for Site B rows', 'FAIL', 'Expected masked rates, got ' || v_count);
  END IF;

  -- TEST A4: BLOCKED - UPDATE rate_applied on Site B row
  BEGIN
    SELECT id INTO v_attendance_id FROM labour_attendance WHERE site_id = '22222222-0000-0000-0000-000000000002' LIMIT 1;
    UPDATE labour_attendance SET rate_applied = 8888.00 WHERE id = v_attendance_id;
    PERFORM report_test('Anil', 'BLOCKED - UPDATE rate_applied on Site B row', 'FAIL', 'Update should have been blocked');
  EXCEPTION WHEN OTHERS THEN
    PERFORM report_test('Anil', 'BLOCKED - UPDATE rate_applied on Site B row', 'PASS', 'Blocked: ' || SQLERRM);
  END;

END $$;

-----------------------------------------------------------------------------
-- TEST SECTION: OFFICE MANAGER
-- UUID: b0000000-0000-0000-0000-000000000002
-----------------------------------------------------------------------------

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Simulate Office Manager logging in
  PERFORM set_config('request.jwt.claims', '{"sub":"b0000000-0000-0000-0000-000000000002","email":"meena@constructionapp.local","role":"authenticated"}', true);
  PERFORM set_config('role', 'authenticated', true);

  -- TEST OM1: Office Manager sees all attendance rows, rate_applied visible
  SELECT COUNT(*) INTO v_count FROM labour_attendance_secure;
  IF v_count >= 12 THEN
    SELECT COUNT(*) INTO v_count FROM labour_attendance_secure WHERE rate_applied IS NOT NULL;
    IF v_count > 0 THEN
      PERFORM report_test('Office Manager', 'sees all attendance rows, rates visible', 'PASS', v_count || ' rows with visible rates');
    ELSE
      PERFORM report_test('Office Manager', 'sees all attendance rows, rates visible', 'FAIL', 'All rate_applied are NULL');
    END IF;
  ELSE
    PERFORM report_test('Office Manager', 'sees all attendance rows, rates visible', 'FAIL', 'Expected at least 12 rows, got ' || v_count);
  END IF;

  -- TEST OM2: Office Manager INSERT policy exists for pay_receipts
  SELECT COUNT(*) INTO v_count FROM pg_policies 
  WHERE tablename = 'pay_receipts' 
  AND cmd = 'INSERT'
  AND (roles @> ARRAY['authenticated']::name[] OR qual LIKE '%office_manager%' OR with_check LIKE '%office_manager%');
  IF v_count > 0 THEN
    PERFORM report_test('Office Manager', 'INSERT policy exists for pay_receipts', 'PASS', 'Policy found');
  ELSE
    PERFORM report_test('Office Manager', 'INSERT policy exists for pay_receipts', 'FAIL', 'No INSERT policy for office_manager');
  END IF;

  -- TEST OM3: BLOCKED - Office Manager INSERT into sites
  BEGIN
    INSERT INTO sites (id, name, client_name, status, created_by)
    VALUES ('99999999-9999-9999-9999-999999999999', 'Test Site', 'Test Client', 'active', 'b0000000-0000-0000-0000-000000000002');
    PERFORM report_test('Office Manager', 'BLOCKED - INSERT into sites', 'FAIL', 'Insert should have been blocked');
    DELETE FROM sites WHERE id = '99999999-9999-9999-9999-999999999999';
  EXCEPTION WHEN OTHERS THEN
    PERFORM report_test('Office Manager', 'BLOCKED - INSERT into sites', 'PASS', 'Blocked: ' || SQLERRM);
  END;

  -- TEST OM4: BLOCKED - Office Manager INSERT into profiles
  BEGIN
    INSERT INTO profiles (id, full_name, email, role)
    VALUES ('99999999-9999-9999-9999-999999999999', 'Test User', 'test@example.com', 'supervisor');
    PERFORM report_test('Office Manager', 'BLOCKED - INSERT into profiles', 'FAIL', 'Insert should have been blocked');
  EXCEPTION WHEN OTHERS THEN
    PERFORM report_test('Office Manager', 'BLOCKED - INSERT into profiles', 'PASS', 'Blocked: ' || SQLERRM);
  END;

  -- TEST OM5: Office Manager sees all office_expenses rows
  SELECT COUNT(*) INTO v_count FROM office_expenses;
  IF v_count = 2 THEN
    PERFORM report_test('Office Manager', 'sees all office_expenses rows', 'PASS', v_count || ' rows visible');
  ELSE
    PERFORM report_test('Office Manager', 'sees all office_expenses rows', 'FAIL', 'Expected 2, got ' || v_count);
  END IF;

  -- TEST OM6: Office Manager INSERT policy exists for site_expenses
  SELECT COUNT(*) INTO v_count FROM pg_policies 
  WHERE tablename = 'site_expenses' 
  AND cmd = 'INSERT'
  AND (roles @> ARRAY['authenticated']::name[] OR qual LIKE '%office_manager%' OR with_check LIKE '%office_manager%');
  IF v_count > 0 THEN
    PERFORM report_test('Office Manager', 'INSERT policy exists for site_expenses', 'PASS', 'Policy found');
  ELSE
    PERFORM report_test('Office Manager', 'INSERT policy exists for site_expenses', 'FAIL', 'No INSERT policy for office_manager');
  END IF;

END $$;

-----------------------------------------------------------------------------
-- TEST SECTION: ADMIN
-- UUID: a0000000-0000-0000-0000-000000000001
-----------------------------------------------------------------------------

DO $$
DECLARE
  v_count INTEGER;
  v_tx_id UUID;
BEGIN
  -- Simulate Admin logging in
  PERFORM set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000001","email":"admin@constructionapp.local","role":"authenticated"}', true);
  PERFORM set_config('role', 'authenticated', true);

  -- TEST ADMIN1: Admin INSERT policy exists for sites
  SELECT COUNT(*) INTO v_count FROM pg_policies
  WHERE tablename = 'sites'
  AND cmd IN ('INSERT', 'ALL')
  AND (qual LIKE '%admin%' OR with_check LIKE '%admin%');
  IF v_count > 0 THEN
    PERFORM report_test('Admin', 'INSERT policy exists for sites', 'PASS', 'Policy found');
  ELSE
    PERFORM report_test('Admin', 'INSERT policy exists for sites', 'FAIL', 'No INSERT policy for admin');
  END IF;

  -- TEST ADMIN2: Admin can UPDATE profiles.role
  BEGIN
    UPDATE profiles SET role = 'office_manager' WHERE id = 'c0000000-0000-0000-0000-000000000003';
    UPDATE profiles SET role = 'supervisor' WHERE id = 'c0000000-0000-0000-0000-000000000003';
    PERFORM report_test('Admin', 'can UPDATE profiles.role', 'PASS', 'Updated successfully');
  EXCEPTION WHEN OTHERS THEN
    PERFORM report_test('Admin', 'can UPDATE profiles.role', 'FAIL', 'Update blocked: ' || SQLERRM);
  END;

  -- TEST ADMIN4: Admin can SELECT office_expenses
  SELECT COUNT(*) INTO v_count FROM office_expenses;
  IF v_count = 2 THEN
    PERFORM report_test('Admin', 'can SELECT office_expenses', 'PASS', v_count || ' rows visible');
  ELSE
    PERFORM report_test('Admin', 'can SELECT office_expenses', 'FAIL', 'Expected 2, got ' || v_count);
  END IF;

END $$;

-----------------------------------------------------------------------------
-- TEST SECTION: ATTACK VECTORS
-----------------------------------------------------------------------------

DO $$
DECLARE
  v_count INTEGER;
  v_role TEXT;
BEGIN
  -- AV1: Office Manager role self-escalation attempt
  PERFORM set_config('request.jwt.claims', '{"sub":"b0000000-0000-0000-0000-000000000002","email":"meena@constructionapp.local","role":"authenticated"}', true);
  PERFORM set_config('role', 'authenticated', true);
  
  BEGIN
    UPDATE profiles SET role = 'admin' WHERE id = 'b0000000-0000-0000-0000-000000000002';
    PERFORM report_test('Attack Vector', 'BLOCKED - Office Manager role self-escalation', 'FAIL', 'Escalation should have been blocked');
  EXCEPTION WHEN OTHERS THEN
    PERFORM report_test('Attack Vector', 'BLOCKED - Office Manager role self-escalation', 'PASS', 'Blocked: ' || SQLERRM);
  END;

  -- Verify role unchanged
  SELECT role INTO v_role FROM profiles WHERE id = 'b0000000-0000-0000-0000-000000000002';
  IF v_role = 'office_manager' THEN
    PERFORM report_test('Attack Vector', 'Role unchanged after escalation attempt', 'PASS', 'Role still office_manager');
  ELSE
    PERFORM report_test('Attack Vector', 'Role unchanged after escalation attempt', 'FAIL', 'Role was changed to ' || v_role);
  END IF;

END $$;

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  -- AV2: Supervisor INSERT to stock_transactions
  PERFORM set_config('request.jwt.claims', '{"sub":"c0000000-0000-0000-0000-000000000003","email":"vikram@constructionapp.local","role":"authenticated"}', true);
  PERFORM set_config('role', 'authenticated', true);

  BEGIN
    INSERT INTO stock_transactions (site_id, material_id, transaction_type, quantity, reference_note, last_edited_by)
    VALUES ('11111111-0000-0000-0000-000000000001', '66666666-0000-0000-0000-000000000001', 'receipt', 50.000, 'Test stock', 'c0000000-0000-0000-0000-000000000003');
    PERFORM report_test('Attack Vector', 'BLOCKED - Supervisor INSERT to stock_transactions', 'FAIL', 'Insert should have been blocked');
  EXCEPTION WHEN OTHERS THEN
    PERFORM report_test('Attack Vector', 'BLOCKED - Supervisor INSERT to stock_transactions', 'PASS', 'Blocked: ' || SQLERRM);
  END;

END $$;

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  -- AV3: Supervisor SELECT staff
  PERFORM set_config('request.jwt.claims', '{"sub":"c0000000-0000-0000-0000-000000000003","email":"vikram@constructionapp.local","role":"authenticated"}', true);
  PERFORM set_config('role', 'authenticated', true);

  SELECT COUNT(*) INTO v_count FROM staff;
  IF v_count = 0 THEN
    PERFORM report_test('Attack Vector', 'BLOCKED - Supervisor SELECT staff (0 rows)', 'PASS', '0 rows returned');
  ELSE
    PERFORM report_test('Attack Vector', 'BLOCKED - Supervisor SELECT staff (0 rows)', 'FAIL', 'Expected 0 rows, got ' || v_count);
  END IF;

END $$;

-----------------------------------------------------------------------------
-- SUMMARY
-----------------------------------------------------------------------------

-- Show results
SELECT category, test_name, status, details FROM test_results ORDER BY id;

-- Show summary stats
SELECT 
  COUNT(*) FILTER (WHERE status = 'PASS') AS pass_count,
  COUNT(*) FILTER (WHERE status = 'FAIL') AS fail_count,
  COUNT(*) AS total_tests
FROM test_results;

-- Cleanup
DROP TABLE IF EXISTS test_results;
