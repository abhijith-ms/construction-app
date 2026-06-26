-- ======================================
-- SECTION 6 WORKED EXAMPLE VERIFICATION
-- Raju, week of June 15-21 (Monday start: 2026-06-15)
-- Expected: Gross ₹5,700, Advance ₹2,000, Net ₹3,700
-- ======================================

-- First, show Raju's attendance for that week with calculations
SELECT '=== Raju Attendance Calculation ===' as section;

SELECT 
    date,
    status,
    rate_applied,
    site_id,
    CASE status
        WHEN 'present' THEN 1.0
        WHEN 'half_day' THEN (SELECT half_day_multiplier FROM site_settings WHERE site_id = la.site_id)
        ELSE 0
    END as multiplier,
    rate_applied * CASE status
        WHEN 'present' THEN 1.0
        WHEN 'half_day' THEN (SELECT half_day_multiplier FROM site_settings WHERE site_id = la.site_id)
        ELSE 0
    END as calculated_wage
FROM labour_attendance la
WHERE labour_id = '44444444-0000-0000-0000-000000000001'
  AND date >= '2026-06-15'
  AND date <= '2026-06-20'
ORDER BY date;

SELECT '=== Raju Advances (before settlement) ===' as section;

SELECT 
    amount,
    date_given,
    settlement_id
FROM labour_advances
WHERE labour_id = '44444444-0000-0000-0000-000000000001'
  AND settlement_id IS NULL;

SELECT '=== Running calculate_weekly_settlement for Raju ===' as section;

-- Calculate settlement for Raju (Meena - office_manager)
SELECT * FROM calculate_weekly_settlement(
    '44444444-0000-0000-0000-000000000001',  -- Raju's labour_id
    '2026-06-15',                             -- Monday start
    'b0000000-0000-0000-0000-000000000002'    -- Meena's profile ID (office_manager)
);

SELECT '=== Settlement Result Summary ===' as section;

SELECT 
    ls.gross_wages,
    ls.total_advances,
    ls.carried_over_due,
    ls.net_payable,
    ls.payment_status,
    CASE 
        WHEN ls.gross_wages = 5700.00 AND ls.total_advances = 2000.00 AND ls.net_payable = 3700.00 
        THEN 'PASS: Gross ₹5,700, Advance ₹2,000, Net ₹3,700 (matches Section 6)'
        ELSE 'FAIL: Expected Gross ₹5,700, Advance ₹2,000, Net ₹3,700'
    END as test_result
FROM labour_settlements ls
WHERE labour_id = '44444444-0000-0000-0000-000000000001'
  AND week_start_date = '2026-06-15';

SELECT '=== Advances after settlement (should have settlement_id now) ===' as section;

SELECT 
    amount,
    date_given,
    settlement_id,
    CASE WHEN settlement_id IS NOT NULL THEN 'Consumed' ELSE 'NOT consumed' END as status
FROM labour_advances
WHERE labour_id = '44444444-0000-0000-0000-000000000001';