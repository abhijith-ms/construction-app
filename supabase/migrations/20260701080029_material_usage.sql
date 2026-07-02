-- Migration 029: Material Usage for Sites
-- Logs materials consumed at a site with approval workflow.
-- Approved records reduce stock and add to site material cost.
--
-- WORKFLOW:
-- 1. User (Admin/Office/Supervisor) logs material usage → state = 'pending'
-- 2. Admin/Office approves → creates stock_transaction (usage type) → stock reduced
-- 3. Approved records contribute to site cost via P&L function
--
-- PERMISSIONS:
-- - Admin + Office Manager: full access (create, approve, delete pending)
-- - Supervisor: INSERT for assigned sites, SELECT for assigned sites
-- - Supervisor cannot approve or delete

---------------------------------------------------------------------------
-- 1. material_usage table
---------------------------------------------------------------------------
CREATE TABLE material_usage (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id         UUID          NOT NULL REFERENCES sites(id),
  material_id     UUID          NOT NULL REFERENCES materials(id),
  quantity        NUMERIC(12,3) NOT NULL CHECK (quantity > 0),
  unit_price      NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  total_cost      NUMERIC(14,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  usage_date      DATE          NOT NULL DEFAULT CURRENT_DATE,
  notes           TEXT,
  state           TEXT          NOT NULL DEFAULT 'pending'
                  CHECK (state IN ('pending', 'approved')),
  last_edited_by  UUID          NOT NULL REFERENCES profiles(id),
  last_edited_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

COMMENT ON TABLE material_usage IS 'Logs materials consumed at a site. Approved records reduce stock and add to site material cost.';
COMMENT ON COLUMN material_usage.state IS 'pending = logged but not confirmed. approved = stock reduced and cost added to site.';
COMMENT ON COLUMN material_usage.total_cost IS 'Auto-calculated: quantity * unit_price';

-- Enable RLS
ALTER TABLE material_usage ENABLE ROW LEVEL SECURITY;

-- Index for site+date queries (P&L calculations)
CREATE INDEX idx_material_usage_site_date ON material_usage(site_id, usage_date);
CREATE INDEX idx_material_usage_state ON material_usage(state);

---------------------------------------------------------------------------
-- 2. RLS Policies
---------------------------------------------------------------------------

-- Admin + Office Manager: full access (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY material_usage_select_admin_office
  ON material_usage FOR SELECT
  TO authenticated
  USING (get_my_role() IN ('admin', 'office_manager'));

CREATE POLICY material_usage_insert_admin_office
  ON material_usage FOR INSERT
  TO authenticated
  WITH CHECK (get_my_role() IN ('admin', 'office_manager'));

CREATE POLICY material_usage_update_admin_office
  ON material_usage FOR UPDATE
  TO authenticated
  USING (get_my_role() IN ('admin', 'office_manager'))
  WITH CHECK (get_my_role() IN ('admin', 'office_manager'));

CREATE POLICY material_usage_delete_admin_office
  ON material_usage FOR DELETE
  TO authenticated
  USING (get_my_role() IN ('admin', 'office_manager'));

-- Supervisor: SELECT for assigned sites only
CREATE POLICY material_usage_select_supervisor
  ON material_usage FOR SELECT
  TO authenticated
  USING (
    get_my_role() = 'supervisor'
    AND is_supervisor_for_site(site_id)
  );

-- Supervisor: INSERT for assigned sites only (creates pending records)
CREATE POLICY material_usage_insert_supervisor
  ON material_usage FOR INSERT
  TO authenticated
  WITH CHECK (
    get_my_role() = 'supervisor'
    AND is_supervisor_for_site(site_id)
  );

-- Supervisor: UPDATE is NOT allowed (state changes only via approval function)
-- No UPDATE policy means default deny for Supervisor

-- Supervisor: DELETE is NOT allowed
-- No DELETE policy means default deny for Supervisor

---------------------------------------------------------------------------
-- 3. Approval function
-- Only Admin and Office Manager can approve
-- Creates a stock_transaction which triggers automatic stock reduction
---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION approve_material_usage(p_usage_id UUID)
RETURNS material_usage
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, ''
AS $$
DECLARE
  v_usage material_usage;
  v_editor_id UUID;
  v_role TEXT;
BEGIN
  -- Get current user role
  v_role := get_my_role();

  -- Only admin and office_manager can approve
  IF v_role NOT IN ('admin', 'office_manager') THEN
    RAISE EXCEPTION 'Permission denied: only admin or office manager can approve material usage'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Get the usage record
  SELECT * INTO v_usage FROM material_usage WHERE id = p_usage_id;

  IF v_usage IS NULL THEN
    RAISE EXCEPTION 'Material usage record not found';
  END IF;

  IF v_usage.state = 'approved' THEN
    RAISE EXCEPTION 'Material usage already approved';
  END IF;

  -- Get current user id for audit
  v_editor_id := auth.uid();

  -- Create stock transaction (usage type) - trigger will reduce stock_levels
  INSERT INTO stock_transactions (
    site_id,
    material_id,
    transaction_type,
    quantity,
    reference_note,
    last_edited_by
  )
  VALUES (
    v_usage.site_id,
    v_usage.material_id,
    'usage',
    v_usage.quantity,
    'Material usage approval: ' || COALESCE(v_usage.notes, 'No notes'),
    v_editor_id
  );

  -- Mark as approved with audit trail
  UPDATE material_usage
  SET
    state = 'approved',
    last_edited_by = v_editor_id,
    last_edited_at = now()
  WHERE id = p_usage_id
  RETURNING * INTO v_usage;

  RETURN v_usage;
END;
$$;

COMMENT ON FUNCTION approve_material_usage IS 'Approves a pending material_usage record. Only Admin/Office Manager. Creates stock_transaction which triggers stock reduction.';

---------------------------------------------------------------------------
-- 4. GRANTs (following pattern from migration 015)
-- View access for all authenticated, write access controlled by RLS
---------------------------------------------------------------------------
GRANT SELECT ON material_usage TO authenticated;

-- Note: INSERT/UPDATE/DELETE granted to authenticated, RLS restricts by role
GRANT INSERT, UPDATE, DELETE ON material_usage TO authenticated;
