-- ==========================================================================
-- ⚠️  LOCAL DEVELOPMENT SEED DATA ONLY — DO NOT USE IN PRODUCTION  ⚠️
-- All credentials below (password: devpassword123) are for local Supabase
-- only. Never apply this file against the linked Supabase Pro project.
-- ==========================================================================

-- =========================================================================
-- 1. AUTH USERS (4 dev accounts — password: devpassword123 for all)
-- =========================================================================

INSERT INTO auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES
  -- Admin: Rajesh Kumar
  (
    '00000000-0000-0000-0000-000000000000',
    'a0000000-0000-0000-0000-000000000001',
    'authenticated', 'authenticated',
    'admin@constructionapp.local',
    crypt('devpassword123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Rajesh Kumar"}',
    now(), now(), '', '', '', ''
  ),
  -- Office Manager: Meena Sharma
  (
    '00000000-0000-0000-0000-000000000000',
    'b0000000-0000-0000-0000-000000000002',
    'authenticated', 'authenticated',
    'meena@constructionapp.local',
    crypt('devpassword123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Meena Sharma"}',
    now(), now(), '', '', '', ''
  ),
  -- Supervisor 1: Vikram Singh (Site A only, NO wage visibility)
  (
    '00000000-0000-0000-0000-000000000000',
    'c0000000-0000-0000-0000-000000000003',
    'authenticated', 'authenticated',
    'vikram@constructionapp.local',
    crypt('devpassword123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Vikram Singh"}',
    now(), now(), '', '', '', ''
  ),
  -- Supervisor 2: Anil Patil (Site A + Site B, wage visibility on Site A only)
  (
    '00000000-0000-0000-0000-000000000000',
    'd0000000-0000-0000-0000-000000000004',
    'authenticated', 'authenticated',
    'anil@constructionapp.local',
    crypt('devpassword123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Anil Patil"}',
    now(), now(), '', '', '', ''
  );

-- Identity entries (required by Supabase Auth for email/password login)
INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id,
  last_sign_in_at, created_at, updated_at
) VALUES
  (
    gen_random_uuid(), 'a0000000-0000-0000-0000-000000000001',
    jsonb_build_object('sub', 'a0000000-0000-0000-0000-000000000001'::text, 'email', 'admin@constructionapp.local'),
    'email', 'a0000000-0000-0000-0000-000000000001', now(), now(), now()
  ),
  (
    gen_random_uuid(), 'b0000000-0000-0000-0000-000000000002',
    jsonb_build_object('sub', 'b0000000-0000-0000-0000-000000000002'::text, 'email', 'meena@constructionapp.local'),
    'email', 'b0000000-0000-0000-0000-000000000002', now(), now(), now()
  ),
  (
    gen_random_uuid(), 'c0000000-0000-0000-0000-000000000003',
    jsonb_build_object('sub', 'c0000000-0000-0000-0000-000000000003'::text, 'email', 'vikram@constructionapp.local'),
    'email', 'c0000000-0000-0000-0000-000000000003', now(), now(), now()
  ),
  (
    gen_random_uuid(), 'd0000000-0000-0000-0000-000000000004',
    jsonb_build_object('sub', 'd0000000-0000-0000-0000-000000000004'::text, 'email', 'anil@constructionapp.local'),
    'email', 'd0000000-0000-0000-0000-000000000004', now(), now(), now()
  );


-- =========================================================================
-- 2. PROFILES (1:1 with auth.users above)
-- =========================================================================

INSERT INTO profiles (id, full_name, email, phone, role) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Rajesh Kumar',  'admin@constructionapp.local',  '9876543210', 'admin'),
  ('b0000000-0000-0000-0000-000000000002', 'Meena Sharma',  'meena@constructionapp.local',  '9876543211', 'office_manager'),
  ('c0000000-0000-0000-0000-000000000003', 'Vikram Singh',  'vikram@constructionapp.local', '9876543212', 'supervisor'),
  ('d0000000-0000-0000-0000-000000000004', 'Anil Patil',    'anil@constructionapp.local',   '9876543213', 'supervisor');


-- =========================================================================
-- 3. SITES
-- =========================================================================

INSERT INTO sites (id, name, client_name, client_phone, budget, start_date, status, created_by) VALUES
  ('11111111-0000-0000-0000-000000000001', 'Greenfield Residency',        'Sunil Mehta', '9800000001',  5000000.00, '2026-01-15', 'active', 'a0000000-0000-0000-0000-000000000001'),
  ('22222222-0000-0000-0000-000000000002', 'Lakeview Commercial Complex', 'Anita Desai', '9800000002', 12000000.00, '2026-03-01', 'active', 'a0000000-0000-0000-0000-000000000001');


-- =========================================================================
-- 4. SITE SETTINGS (per-site half-day multiplier)
-- =========================================================================
-- Site A = 0.60, Site B = 0.50 — deliberately different so we can confirm
-- per-site values aren't shared. Site B at 0.50 also matches Raju's worked
-- example (Wed half-day at Site B: ₹1000 × 0.50 = ₹500).

INSERT INTO site_settings (site_id, half_day_multiplier, last_edited_by) VALUES
  ('11111111-0000-0000-0000-000000000001', 0.60, 'a0000000-0000-0000-0000-000000000001'),
  ('22222222-0000-0000-0000-000000000002', 0.50, 'a0000000-0000-0000-0000-000000000001');


-- =========================================================================
-- 5. SUPERVISOR SITE ASSIGNMENTS
-- =========================================================================
-- Vikram → Site A only
-- Anil   → Site A AND Site B (tests multi-site schema)

INSERT INTO supervisor_site_assignments (supervisor_id, site_id, assigned_by) VALUES
  ('c0000000-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001'),
  ('d0000000-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001'),
  ('d0000000-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001');


-- =========================================================================
-- 6. SUPERVISOR WAGE PERMISSIONS
-- =========================================================================
-- Anil can view/set wages on Site A ONLY. All others disabled (default).
-- Test case: same supervisor, two sites, different wage visibility.

INSERT INTO supervisor_wage_permissions (supervisor_id, site_id, can_view_set_wages, last_edited_by) VALUES
  ('c0000000-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', false, 'a0000000-0000-0000-0000-000000000001'),
  ('d0000000-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000001', true,  'a0000000-0000-0000-0000-000000000001'),
  ('d0000000-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000002', false, 'a0000000-0000-0000-0000-000000000001');


-- =========================================================================
-- 7. STAFF (permanent salaried employees — no app login)
-- =========================================================================

INSERT INTO staff (id, full_name, email, role, monthly_salary) VALUES
  ('33333333-0000-0000-0000-000000000001', 'Priya Nair',   'priya.nair@example.com', 'Accountant',        35000.00),
  ('33333333-0000-0000-0000-000000000002', 'Deepak Joshi', 'deepak.j@example.com',   'Office Assistant',  22000.00);


-- =========================================================================
-- 8. STAFF ATTENDANCE (a few days in the same week as labour data)
-- =========================================================================

INSERT INTO staff_attendance (staff_id, date, status, last_edited_by) VALUES
  -- Priya (Accountant) — Mon-Wed
  ('33333333-0000-0000-0000-000000000001', '2026-06-15', 'present',  'b0000000-0000-0000-0000-000000000002'),
  ('33333333-0000-0000-0000-000000000001', '2026-06-16', 'present',  'b0000000-0000-0000-0000-000000000002'),
  ('33333333-0000-0000-0000-000000000001', '2026-06-17', 'half_day', 'b0000000-0000-0000-0000-000000000002'),
  -- Deepak (Office Assistant) — Mon-Tue
  ('33333333-0000-0000-0000-000000000002', '2026-06-15', 'present',  'b0000000-0000-0000-0000-000000000002'),
  ('33333333-0000-0000-0000-000000000002', '2026-06-16', 'absent',   'b0000000-0000-0000-0000-000000000002');


-- =========================================================================
-- 9. LABOUR (daily-wage workers)
-- =========================================================================

INSERT INTO labour (id, full_name, phone, default_work_category, default_daily_rate) VALUES
  ('44444444-0000-0000-0000-000000000001', 'Raju',     '9700000001', 'mason',       1300.00),
  ('44444444-0000-0000-0000-000000000002', 'Suresh',   '9700000002', 'helper',      1000.00),
  ('44444444-0000-0000-0000-000000000003', 'Ganesh',   '9700000003', 'electrician', 1500.00),
  ('44444444-0000-0000-0000-000000000004', 'Priya P.', '9700000004', 'painter',     1200.00);


-- =========================================================================
-- 10. LABOUR ATTENDANCE — Week of June 15–20, 2026 (Monday–Saturday)
-- =========================================================================
--
-- RAJU — reproduces the worked example from rules Part 3, Section 6:
--   Mon: Site A, Mason,  Full day, ₹1,300
--   Tue: Site A, Mason,  Full day, ₹1,300
--   Wed: Site B, Helper, Half day, ₹1,000 × 0.50 (Site B multiplier) = ₹500
--   Thu: Absent,         ₹0
--   Fri: Site A, Mason,  Full day, ₹1,300
--   Sat: Site A, Mason,  Full day, ₹1,300
--   ─────────────────────────────────
--   Gross wages due:     ₹5,700
--   Less advance (Tue):  -₹2,000
--   Net payable:         ₹3,700
--
-- SURESH — secondary test case with different pattern:
--   Mon–Wed: Site A, Helper, Full day, ₹1,000 each
--   Thu:     Site B, Helper, Half day, ₹1,000 × 0.50 = ₹500
--   Fri–Sat: Site A, Helper, Full day, ₹1,000 each
--   Gross = ₹5,500 | Advance = ₹500 | Net = ₹5,000
--

INSERT INTO labour_attendance (labour_id, date, site_id, status, work_category, rate_applied, last_edited_by) VALUES
  -- Raju (worked example — marked by Vikram on Site A days, Anil on Site B day)
  ('44444444-0000-0000-0000-000000000001', '2026-06-15', '11111111-0000-0000-0000-000000000001', 'present',  'mason',  1300.00, 'c0000000-0000-0000-0000-000000000003'),
  ('44444444-0000-0000-0000-000000000001', '2026-06-16', '11111111-0000-0000-0000-000000000001', 'present',  'mason',  1300.00, 'c0000000-0000-0000-0000-000000000003'),
  ('44444444-0000-0000-0000-000000000001', '2026-06-17', '22222222-0000-0000-0000-000000000002', 'half_day', 'helper', 1000.00, 'd0000000-0000-0000-0000-000000000004'),
  ('44444444-0000-0000-0000-000000000001', '2026-06-18', '11111111-0000-0000-0000-000000000001', 'absent',   NULL,     NULL,    'c0000000-0000-0000-0000-000000000003'),
  ('44444444-0000-0000-0000-000000000001', '2026-06-19', '11111111-0000-0000-0000-000000000001', 'present',  'mason',  1300.00, 'c0000000-0000-0000-0000-000000000003'),
  ('44444444-0000-0000-0000-000000000001', '2026-06-20', '11111111-0000-0000-0000-000000000001', 'present',  'mason',  1300.00, 'c0000000-0000-0000-0000-000000000003'),

  -- Suresh (secondary test case — marked by Vikram on Site A days, Anil on Site B day)
  ('44444444-0000-0000-0000-000000000002', '2026-06-15', '11111111-0000-0000-0000-000000000001', 'present',  'helper', 1000.00, 'c0000000-0000-0000-0000-000000000003'),
  ('44444444-0000-0000-0000-000000000002', '2026-06-16', '11111111-0000-0000-0000-000000000001', 'present',  'helper', 1000.00, 'c0000000-0000-0000-0000-000000000003'),
  ('44444444-0000-0000-0000-000000000002', '2026-06-17', '11111111-0000-0000-0000-000000000001', 'present',  'helper', 1000.00, 'c0000000-0000-0000-0000-000000000003'),
  ('44444444-0000-0000-0000-000000000002', '2026-06-18', '22222222-0000-0000-0000-000000000002', 'half_day', 'helper', 1000.00, 'd0000000-0000-0000-0000-000000000004'),
  ('44444444-0000-0000-0000-000000000002', '2026-06-19', '11111111-0000-0000-0000-000000000001', 'present',  'helper', 1000.00, 'c0000000-0000-0000-0000-000000000003'),
  ('44444444-0000-0000-0000-000000000002', '2026-06-20', '11111111-0000-0000-0000-000000000001', 'present',  'helper', 1000.00, 'c0000000-0000-0000-0000-000000000003');


-- =========================================================================
-- 11. LABOUR ADVANCES
-- =========================================================================
-- Raju:  ₹2,000 on Tuesday (matches worked example exactly)
-- Suresh: ₹500 on Wednesday

INSERT INTO labour_advances (labour_id, site_id, amount, date_given, notes, last_edited_by) VALUES
  ('44444444-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 2000.00, '2026-06-16', 'Weekly advance — Raju',   'b0000000-0000-0000-0000-000000000002'),
  ('44444444-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001',  500.00, '2026-06-17', 'Weekly advance — Suresh', 'b0000000-0000-0000-0000-000000000002');

-- NOTE: No labour_settlements rows are seeded. The settlement table should be
-- populated by the wage-calculation Postgres function (not yet built). This
-- seed provides the inputs (attendance + advances) so we can verify the
-- function's output matches the worked example: Gross ₹5,700 - Advance ₹2,000 = Net ₹3,700.


-- =========================================================================
-- 12. SUPPLIERS
-- =========================================================================

INSERT INTO suppliers (id, name, contact_phone, contact_email, materials_supplied) VALUES
  ('55555555-0000-0000-0000-000000000001', 'Sri Lakshmi Cement Works', '9600000001', 'lakshmi@example.com', 'Cement, concrete mix'),
  ('55555555-0000-0000-0000-000000000002', 'Ravi Electricals',        '9600000002', 'ravi.e@example.com',  'Wiring, switches, panels');


-- =========================================================================
-- 13. PURCHASE ORDER → BILL → SUPPLIER PAYMENT (full chain)
-- =========================================================================
-- PO: 200 bags cement for Site A from Sri Lakshmi Cement

INSERT INTO purchase_orders (id, site_id, supplier_id, description, total_amount, status, order_date, created_by) VALUES
  ('77777777-0000-0000-0000-000000000001',
   '11111111-0000-0000-0000-000000000001',
   '55555555-0000-0000-0000-000000000001',
   '200 bags OPC cement for foundation work',
   80000.00, 'received', '2026-06-10',
   'a0000000-0000-0000-0000-000000000001');

-- Bill against that PO
INSERT INTO bills (id, purchase_order_id, bill_number, bill_date, amount, notes, last_edited_by) VALUES
  ('88888888-0000-0000-0000-000000000001',
   '77777777-0000-0000-0000-000000000001',
   'SLC/2026/0042', '2026-06-12',
   78500.00, 'Final amount slightly under PO estimate',
   'b0000000-0000-0000-0000-000000000002');

-- Partial payment against that bill (₹50,000 of ₹78,500 — balance owed: ₹28,500)
INSERT INTO supplier_payments (bill_id, supplier_id, amount, payment_date, payment_mode, notes, last_edited_by) VALUES
  ('88888888-0000-0000-0000-000000000001',
   '55555555-0000-0000-0000-000000000001',
   50000.00, '2026-06-14', 'bank',
   'First installment via bank transfer',
   'b0000000-0000-0000-0000-000000000002');


-- =========================================================================
-- 14. PAY RECEIPTS (money received from clients)
-- =========================================================================

INSERT INTO pay_receipts (site_id, date, amount, payment_mode, notes, last_edited_by) VALUES
  ('11111111-0000-0000-0000-000000000001', '2026-06-01',  500000.00, 'bank', 'First milestone payment — Greenfield', 'b0000000-0000-0000-0000-000000000002'),
  ('22222222-0000-0000-0000-000000000002', '2026-06-05', 1000000.00, 'bank', 'Advance payment — Lakeview',           'b0000000-0000-0000-0000-000000000002');


-- =========================================================================
-- 15. SITE EXPENSES
-- =========================================================================

INSERT INTO site_expenses (site_id, category, amount, date, description, work_type, last_edited_by) VALUES
  ('11111111-0000-0000-0000-000000000001', 'material',  15000.00, '2026-06-13', 'Sand and gravel delivery',          'foundation',  'b0000000-0000-0000-0000-000000000002'),
  ('11111111-0000-0000-0000-000000000001', 'transport',  3500.00, '2026-06-14', 'Truck hire for material transport',  NULL,          'b0000000-0000-0000-0000-000000000002'),
  ('22222222-0000-0000-0000-000000000002', 'food',       2000.00, '2026-06-15', 'Worker lunch — week start',          NULL,          'b0000000-0000-0000-0000-000000000002');


-- =========================================================================
-- 16. OFFICE EXPENSES (company-level, not tied to any site)
-- =========================================================================

INSERT INTO office_expenses (category, amount, date, description, last_edited_by) VALUES
  ('rent',    25000.00, '2026-06-01', 'Office rent — June 2026',      'a0000000-0000-0000-0000-000000000001'),
  ('general',  5000.00, '2026-06-10', 'Office supplies and printing', 'b0000000-0000-0000-0000-000000000002');


-- =========================================================================
-- 17. MATERIALS (master list)
-- =========================================================================

INSERT INTO materials (id, name, unit) VALUES
  ('66666666-0000-0000-0000-000000000001', 'OPC Cement',      'bags'),
  ('66666666-0000-0000-0000-000000000002', 'River Sand',      'cubic feet'),
  ('66666666-0000-0000-0000-000000000003', 'Electrical Wire', 'metres');


-- =========================================================================
-- 18. STOCK TRANSACTIONS
-- =========================================================================
-- stock_levels rows are auto-created by the trigger in migration 011
-- (update_stock_levels_on_transaction). No manual stock_levels insert needed.
--
-- Expected auto-computed stock_levels after these inserts:
--   Site A, Cement:  100 received − 30 used  = 70.000
--   Site A, Sand:    200 received            = 200.000
--   Site B, Wire:    500 received − 150 used = 350.000

INSERT INTO stock_transactions (site_id, material_id, transaction_type, quantity, reference_note, last_edited_by) VALUES
  -- Cement at Site A: received 100, used 30 → expected balance: 70
  ('11111111-0000-0000-0000-000000000001', '66666666-0000-0000-0000-000000000001', 'receipt', 100.000, 'PO SLC/2026/0042 — 100 bags received', 'b0000000-0000-0000-0000-000000000002'),
  ('11111111-0000-0000-0000-000000000001', '66666666-0000-0000-0000-000000000001', 'usage',    30.000, 'Foundation work — Block A',             'b0000000-0000-0000-0000-000000000002'),
  -- Sand at Site A: received 200 → expected balance: 200
  ('11111111-0000-0000-0000-000000000001', '66666666-0000-0000-0000-000000000002', 'receipt', 200.000, 'Sand delivery for plastering',          'b0000000-0000-0000-0000-000000000002'),
  -- Electrical wire at Site B: received 500, used 150 → expected balance: 350
  ('22222222-0000-0000-0000-000000000002', '66666666-0000-0000-0000-000000000003', 'receipt', 500.000, 'Wiring for ground floor',               'b0000000-0000-0000-0000-000000000002'),
  ('22222222-0000-0000-0000-000000000002', '66666666-0000-0000-0000-000000000003', 'usage',   150.000, 'Ground floor wiring — Phase 1',         'b0000000-0000-0000-0000-000000000002');
