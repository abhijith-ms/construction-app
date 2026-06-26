-- Migration 016: RLS policies for all tables
--
-- Implements the permission matrix from Part 3 of the project rules at the
-- database level. Every policy is designed to hold even if a user bypasses
-- the React frontend and queries the Supabase API directly with a valid JWT.
--
-- Depends on:
--   - Helper functions from migration 015 (get_my_role, is_supervisor_for_site,
--     has_wage_visibility)
--   - is_active columns on labour, staff, suppliers, materials (existing + mig 013)
--   - site_id column on labour_settlements (migration 014)
--   - site_id NOT NULL on labour_attendance (migration 012)
--
-- POLICY NAMING CONVENTION:
--   {table}_{operation}_{role_or_scope}
--   e.g. profiles_select_own, sites_insert_admin
--
-- DEFAULT DENY: All tables already have ENABLE ROW LEVEL SECURITY set with
-- zero policies (from the schema migrations), meaning no rows are accessible
-- by default. These policies open up exactly what the matrix allows.

---------------------------------------------------------------------------
-- CATEGORY 1: IDENTITY & ACCESS CONTROL
---------------------------------------------------------------------------

-- ── profiles ────────────────────────────────────────────────────────────
-- Admin sees all. Everyone sees own row. Non-admin cannot change role.
-- (Role-change protection is enforced by trigger in migration 015.)

CREATE POLICY profiles_select_own
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY profiles_select_admin
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.get_my_role() = 'admin');

CREATE POLICY profiles_insert_admin
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_role() = 'admin');

-- Any authenticated user can update their own profile row (role changes are
-- blocked by the trigger in migration 015, not by this policy).
CREATE POLICY profiles_update_own
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admin can update any profile (including changing roles — trigger allows admin).
CREATE POLICY profiles_update_admin
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- No DELETE policy. Deactivation via is_active = false. Hard deletes via
-- Supabase Auth dashboard if absolutely needed (cascades to profiles).

-- ── supervisor_site_assignments ─────────────────────────────────────────
-- Admin: full CRUD. Office Manager: read (needs to see assignments to
-- manage wage permissions). Supervisor: own rows only (so the app knows
-- which sites they're assigned to).

CREATE POLICY supervisor_site_assignments_select_admin_office
  ON public.supervisor_site_assignments FOR SELECT
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'office_manager'));

CREATE POLICY supervisor_site_assignments_select_own_supervisor
  ON public.supervisor_site_assignments FOR SELECT
  TO authenticated
  USING (
    public.get_my_role() = 'supervisor'
    AND supervisor_id = auth.uid()
  );

CREATE POLICY supervisor_site_assignments_insert_admin
  ON public.supervisor_site_assignments FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_role() = 'admin');

CREATE POLICY supervisor_site_assignments_update_admin
  ON public.supervisor_site_assignments FOR UPDATE
  TO authenticated
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

CREATE POLICY supervisor_site_assignments_delete_admin
  ON public.supervisor_site_assignments FOR DELETE
  TO authenticated
  USING (public.get_my_role() = 'admin');

-- ── supervisor_wage_permissions ─────────────────────────────────────────
-- Admin: full CRUD. Office Manager: read + write (toggle the flag).
-- Supervisor: read own rows only (so the app can show/hide wage UI).

CREATE POLICY supervisor_wage_permissions_select_admin_office
  ON public.supervisor_wage_permissions FOR SELECT
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'office_manager'));

CREATE POLICY supervisor_wage_permissions_select_own_supervisor
  ON public.supervisor_wage_permissions FOR SELECT
  TO authenticated
  USING (
    public.get_my_role() = 'supervisor'
    AND supervisor_id = auth.uid()
  );

CREATE POLICY supervisor_wage_permissions_insert_admin_office
  ON public.supervisor_wage_permissions FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_role() IN ('admin', 'office_manager'));

CREATE POLICY supervisor_wage_permissions_update_admin_office
  ON public.supervisor_wage_permissions FOR UPDATE
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'office_manager'))
  WITH CHECK (public.get_my_role() IN ('admin', 'office_manager'));

CREATE POLICY supervisor_wage_permissions_delete_admin
  ON public.supervisor_wage_permissions FOR DELETE
  TO authenticated
  USING (public.get_my_role() = 'admin');

---------------------------------------------------------------------------
-- CATEGORY 2: SITES & SITE SETTINGS
---------------------------------------------------------------------------

-- ── sites ───────────────────────────────────────────────────────────────
-- Admin: full read + write. Office Manager: read only. Supervisor: own sites
-- only. No DELETE — no hard delete on sites.

CREATE POLICY sites_select_admin_office
  ON public.sites FOR SELECT
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'office_manager'));

CREATE POLICY sites_select_supervisor
  ON public.sites FOR SELECT
  TO authenticated
  USING (
    public.get_my_role() = 'supervisor'
    AND public.is_supervisor_for_site(id)
  );

CREATE POLICY sites_insert_admin
  ON public.sites FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_role() = 'admin');

CREATE POLICY sites_update_admin
  ON public.sites FOR UPDATE
  TO authenticated
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- ── site_settings ───────────────────────────────────────────────────────
-- Admin + Office Manager: full access. Supervisor: read any assigned site's
-- settings; write only if wage visibility is enabled for that site.

CREATE POLICY site_settings_select_admin_office
  ON public.site_settings FOR SELECT
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'office_manager'));

CREATE POLICY site_settings_select_supervisor
  ON public.site_settings FOR SELECT
  TO authenticated
  USING (
    public.get_my_role() = 'supervisor'
    AND public.is_supervisor_for_site(site_id)
  );

CREATE POLICY site_settings_insert_admin_office
  ON public.site_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_role() IN ('admin', 'office_manager'));

CREATE POLICY site_settings_update_admin_office
  ON public.site_settings FOR UPDATE
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'office_manager'))
  WITH CHECK (public.get_my_role() IN ('admin', 'office_manager'));

-- Supervisor can update site_settings only if they have wage visibility for
-- that site (controls the half-day multiplier and job-type rate setting).
CREATE POLICY site_settings_update_supervisor
  ON public.site_settings FOR UPDATE
  TO authenticated
  USING (
    public.get_my_role() = 'supervisor'
    AND public.is_supervisor_for_site(site_id)
    AND public.has_wage_visibility(site_id)
  )
  WITH CHECK (
    public.get_my_role() = 'supervisor'
    AND public.is_supervisor_for_site(site_id)
    AND public.has_wage_visibility(site_id)
  );

---------------------------------------------------------------------------
-- CATEGORY 3: STAFF & STAFF ATTENDANCE
---------------------------------------------------------------------------
-- Supervisors have zero access to staff or staff_attendance (confirmed Q4).

-- ── staff ───────────────────────────────────────────────────────────────
CREATE POLICY staff_select_admin_office
  ON public.staff FOR SELECT
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'office_manager'));

CREATE POLICY staff_insert_admin_office
  ON public.staff FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_role() IN ('admin', 'office_manager'));

CREATE POLICY staff_update_admin_office
  ON public.staff FOR UPDATE
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'office_manager'))
  WITH CHECK (public.get_my_role() IN ('admin', 'office_manager'));

-- ── staff_attendance ────────────────────────────────────────────────────
CREATE POLICY staff_attendance_select_admin_office
  ON public.staff_attendance FOR SELECT
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'office_manager'));

CREATE POLICY staff_attendance_insert_admin_office
  ON public.staff_attendance FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_role() IN ('admin', 'office_manager'));

CREATE POLICY staff_attendance_update_admin_office
  ON public.staff_attendance FOR UPDATE
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'office_manager'))
  WITH CHECK (public.get_my_role() IN ('admin', 'office_manager'));

---------------------------------------------------------------------------
-- CATEGORY 4: LABOUR & LABOUR ATTENDANCE
---------------------------------------------------------------------------

-- ── labour (master data) ────────────────────────────────────────────────
-- Admin + Office Manager: all rows. Supervisor: active workers only
-- (needed to look up workers when marking attendance).

CREATE POLICY labour_select_admin_office
  ON public.labour FOR SELECT
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'office_manager'));

CREATE POLICY labour_select_supervisor
  ON public.labour FOR SELECT
  TO authenticated
  USING (
    public.get_my_role() = 'supervisor'
    AND is_active = true
  );

CREATE POLICY labour_insert_admin_office
  ON public.labour FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_role() IN ('admin', 'office_manager'));

CREATE POLICY labour_update_admin_office
  ON public.labour FOR UPDATE
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'office_manager'))
  WITH CHECK (public.get_my_role() IN ('admin', 'office_manager'));

-- ── labour_attendance (base table) ─────────────────────────────────────
-- NOTE: Authenticated role cannot SELECT this table directly — they use the
-- labour_attendance_secure view instead (REVOKE in migration 015).
-- These policies govern INSERT and UPDATE (and the row-visibility for the view
-- which inherits base table policies when security_invoker is not set).
--
-- The rate_applied write guard is enforced by trigger (migration 015),
-- not by these policies.

CREATE POLICY labour_attendance_select_admin_office
  ON public.labour_attendance FOR SELECT
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'office_manager'));

CREATE POLICY labour_attendance_select_supervisor
  ON public.labour_attendance FOR SELECT
  TO authenticated
  USING (
    public.get_my_role() = 'supervisor'
    AND public.is_supervisor_for_site(site_id)
  );

CREATE POLICY labour_attendance_insert_admin_office
  ON public.labour_attendance FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_role() IN ('admin', 'office_manager'));

-- Supervisor can only insert attendance for their own sites.
CREATE POLICY labour_attendance_insert_supervisor
  ON public.labour_attendance FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_my_role() = 'supervisor'
    AND public.is_supervisor_for_site(site_id)
  );

CREATE POLICY labour_attendance_update_admin_office
  ON public.labour_attendance FOR UPDATE
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'office_manager'))
  WITH CHECK (public.get_my_role() IN ('admin', 'office_manager'));

-- Supervisor can only update attendance for their own sites.
-- rate_applied write restriction is enforced by trigger, not this policy.
CREATE POLICY labour_attendance_update_supervisor
  ON public.labour_attendance FOR UPDATE
  TO authenticated
  USING (
    public.get_my_role() = 'supervisor'
    AND public.is_supervisor_for_site(site_id)
  )
  WITH CHECK (
    public.get_my_role() = 'supervisor'
    AND public.is_supervisor_for_site(site_id)
  );

---------------------------------------------------------------------------
-- CATEGORY 5: PAYROLL & ADVANCES
---------------------------------------------------------------------------

-- ── labour_settlements ──────────────────────────────────────────────────
-- Admin + Office Manager: all rows. Supervisor: only for assigned sites
-- where wage visibility is enabled AND site_id is set (added in mig 014).
-- Process/approve payroll: Admin + Office Manager only.

CREATE POLICY labour_settlements_select_admin_office
  ON public.labour_settlements FOR SELECT
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'office_manager'));

CREATE POLICY labour_settlements_select_supervisor
  ON public.labour_settlements FOR SELECT
  TO authenticated
  USING (
    public.get_my_role() = 'supervisor'
    AND site_id IS NOT NULL
    AND public.is_supervisor_for_site(site_id)
    AND public.has_wage_visibility(site_id)
  );

CREATE POLICY labour_settlements_insert_admin_office
  ON public.labour_settlements FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_role() IN ('admin', 'office_manager'));

CREATE POLICY labour_settlements_update_admin_office
  ON public.labour_settlements FOR UPDATE
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'office_manager'))
  WITH CHECK (public.get_my_role() IN ('admin', 'office_manager'));

-- ── labour_advances ─────────────────────────────────────────────────────
-- Admin + Office Manager: all rows (recording advances). Supervisor: read
-- only for their sites where wage visibility is on (advances are financial).

CREATE POLICY labour_advances_select_admin_office
  ON public.labour_advances FOR SELECT
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'office_manager'));

CREATE POLICY labour_advances_select_supervisor
  ON public.labour_advances FOR SELECT
  TO authenticated
  USING (
    public.get_my_role() = 'supervisor'
    AND public.is_supervisor_for_site(site_id)
    AND public.has_wage_visibility(site_id)
  );

CREATE POLICY labour_advances_insert_admin_office
  ON public.labour_advances FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_role() IN ('admin', 'office_manager'));

CREATE POLICY labour_advances_update_admin_office
  ON public.labour_advances FOR UPDATE
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'office_manager'))
  WITH CHECK (public.get_my_role() IN ('admin', 'office_manager'));

---------------------------------------------------------------------------
-- CATEGORY 6: FINANCIAL — RECEIPTS & EXPENSES
---------------------------------------------------------------------------

-- ── pay_receipts ────────────────────────────────────────────────────────
-- Admin + Office Manager only. Supervisors have zero access.

CREATE POLICY pay_receipts_select_admin_office
  ON public.pay_receipts FOR SELECT
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'office_manager'));

CREATE POLICY pay_receipts_insert_admin_office
  ON public.pay_receipts FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_role() IN ('admin', 'office_manager'));

CREATE POLICY pay_receipts_update_admin_office
  ON public.pay_receipts FOR UPDATE
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'office_manager'))
  WITH CHECK (public.get_my_role() IN ('admin', 'office_manager'));

-- ── site_expenses ───────────────────────────────────────────────────────
-- Admin + Office Manager only. Supervisors have zero access.

CREATE POLICY site_expenses_select_admin_office
  ON public.site_expenses FOR SELECT
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'office_manager'));

CREATE POLICY site_expenses_insert_admin_office
  ON public.site_expenses FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_role() IN ('admin', 'office_manager'));

CREATE POLICY site_expenses_update_admin_office
  ON public.site_expenses FOR UPDATE
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'office_manager'))
  WITH CHECK (public.get_my_role() IN ('admin', 'office_manager'));

-- ── office_expenses ─────────────────────────────────────────────────────
-- Admin SELECT only. Admin + Office Manager can INSERT and UPDATE.
-- Office Manager cannot read office_expenses (company-level financials).

CREATE POLICY office_expenses_select_admin
  ON public.office_expenses FOR SELECT
  TO authenticated
  USING (public.get_my_role() = 'admin');

CREATE POLICY office_expenses_insert_admin_office
  ON public.office_expenses FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_role() IN ('admin', 'office_manager'));

CREATE POLICY office_expenses_update_admin_office
  ON public.office_expenses FOR UPDATE
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'office_manager'))
  WITH CHECK (public.get_my_role() IN ('admin', 'office_manager'));

---------------------------------------------------------------------------
-- CATEGORY 7: SUPPLIERS & PROCUREMENT
---------------------------------------------------------------------------
-- Supervisors have zero access to all four tables (confirmed Q5).

-- ── suppliers ───────────────────────────────────────────────────────────
CREATE POLICY suppliers_select_admin_office
  ON public.suppliers FOR SELECT
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'office_manager'));

CREATE POLICY suppliers_insert_admin_office
  ON public.suppliers FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_role() IN ('admin', 'office_manager'));

CREATE POLICY suppliers_update_admin_office
  ON public.suppliers FOR UPDATE
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'office_manager'))
  WITH CHECK (public.get_my_role() IN ('admin', 'office_manager'));

-- ── purchase_orders ─────────────────────────────────────────────────────
CREATE POLICY purchase_orders_select_admin_office
  ON public.purchase_orders FOR SELECT
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'office_manager'));

CREATE POLICY purchase_orders_insert_admin_office
  ON public.purchase_orders FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_role() IN ('admin', 'office_manager'));

CREATE POLICY purchase_orders_update_admin_office
  ON public.purchase_orders FOR UPDATE
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'office_manager'))
  WITH CHECK (public.get_my_role() IN ('admin', 'office_manager'));

-- ── bills ───────────────────────────────────────────────────────────────
CREATE POLICY bills_select_admin_office
  ON public.bills FOR SELECT
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'office_manager'));

CREATE POLICY bills_insert_admin_office
  ON public.bills FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_role() IN ('admin', 'office_manager'));

CREATE POLICY bills_update_admin_office
  ON public.bills FOR UPDATE
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'office_manager'))
  WITH CHECK (public.get_my_role() IN ('admin', 'office_manager'));

-- ── supplier_payments ───────────────────────────────────────────────────
CREATE POLICY supplier_payments_select_admin_office
  ON public.supplier_payments FOR SELECT
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'office_manager'));

CREATE POLICY supplier_payments_insert_admin_office
  ON public.supplier_payments FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_role() IN ('admin', 'office_manager'));

CREATE POLICY supplier_payments_update_admin_office
  ON public.supplier_payments FOR UPDATE
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'office_manager'))
  WITH CHECK (public.get_my_role() IN ('admin', 'office_manager'));

---------------------------------------------------------------------------
-- CATEGORY 8: STOCK
---------------------------------------------------------------------------

-- ── materials ───────────────────────────────────────────────────────────
-- Admin + Office Manager: all rows. Supervisor: active materials only
-- (may need to reference material names when marking work categories).
-- No DELETE policy — use is_active = false (added in migration 013).

CREATE POLICY materials_select_admin_office
  ON public.materials FOR SELECT
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'office_manager'));

CREATE POLICY materials_select_supervisor
  ON public.materials FOR SELECT
  TO authenticated
  USING (
    public.get_my_role() = 'supervisor'
    AND is_active = true
  );

CREATE POLICY materials_insert_admin_office
  ON public.materials FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_role() IN ('admin', 'office_manager'));

CREATE POLICY materials_update_admin_office
  ON public.materials FOR UPDATE
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'office_manager'))
  WITH CHECK (public.get_my_role() IN ('admin', 'office_manager'));

-- ── stock_levels ────────────────────────────────────────────────────────
-- Admin + Office Manager: SELECT only. No authenticated user may write
-- directly — stock_levels is maintained exclusively by the trigger in
-- migration 011. The trigger runs as the table owner (SECURITY DEFINER /
-- superuser context), so it bypasses RLS.

CREATE POLICY stock_levels_select_admin_office
  ON public.stock_levels FOR SELECT
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'office_manager'));

-- ── stock_transactions ──────────────────────────────────────────────────
-- Admin + Office Manager: SELECT, INSERT, DELETE. No UPDATE (corrections
-- are delete + re-insert). Supervisor: zero access.
-- DELETE is intentionally allowed because it's the correction mechanism —
-- deleting a bad row triggers stock_levels recalculation.

CREATE POLICY stock_transactions_select_admin_office
  ON public.stock_transactions FOR SELECT
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'office_manager'));

CREATE POLICY stock_transactions_insert_admin_office
  ON public.stock_transactions FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_role() IN ('admin', 'office_manager'));

CREATE POLICY stock_transactions_delete_admin_office
  ON public.stock_transactions FOR DELETE
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'office_manager'));
