-- Migration 030: Update get_site_pnl to include material_usage_cost
--
-- Adds material_usage_cost column to the P&L function output.
-- Only APPROVED material usage records are counted toward site cost.
--
-- DEPENDS ON: Migration 029 (material_usage table must exist)

-- Must drop and recreate because we changed the return type (added material_usage_cost column)
DROP FUNCTION IF EXISTS get_site_pnl(UUID, DATE, DATE);

CREATE FUNCTION get_site_pnl(
  p_site_id UUID,
  p_from DATE,
  p_to DATE
)
RETURNS TABLE (
  site_id UUID,
  site_name TEXT,
  total_income NUMERIC,
  labour_cost NUMERIC,
  site_expense_cost NUMERIC,
  supplier_bill_cost NUMERIC,
  material_usage_cost NUMERIC,
  total_cost NUMERIC,
  net_profit NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.name,
    -- Total income from pay_receipts
    COALESCE((SELECT SUM(pr.amount) FROM pay_receipts pr
      WHERE pr.site_id = s.id AND pr.date BETWEEN p_from AND p_to), 0),
    -- Labour cost from settlements
    COALESCE((SELECT SUM(ls.net_payable) FROM labour_settlements ls
      WHERE ls.site_id = s.id AND ls.week_start_date BETWEEN p_from AND p_to), 0),
    -- Site expenses
    COALESCE((SELECT SUM(se.amount) FROM site_expenses se
      WHERE se.site_id = s.id AND se.date BETWEEN p_from AND p_to), 0),
    -- Supplier bills via purchase_orders
    COALESCE((SELECT SUM(b.amount) FROM bills b
      JOIN purchase_orders po ON po.id = b.purchase_order_id
      WHERE po.site_id = s.id AND b.bill_date BETWEEN p_from AND p_to), 0),
    -- NEW: Material usage cost (approved only)
    COALESCE((SELECT SUM(mu.total_cost) FROM material_usage mu
      WHERE mu.site_id = s.id AND mu.usage_date BETWEEN p_from AND p_to
      AND mu.state = 'approved'), 0),
    -- Total cost = labour + expenses + bills + material_usage
    COALESCE((SELECT SUM(ls.net_payable) FROM labour_settlements ls
      WHERE ls.site_id = s.id AND ls.week_start_date BETWEEN p_from AND p_to), 0) +
    COALESCE((SELECT SUM(se.amount) FROM site_expenses se
      WHERE se.site_id = s.id AND se.date BETWEEN p_from AND p_to), 0) +
    COALESCE((SELECT SUM(b.amount) FROM bills b
      JOIN purchase_orders po ON po.id = b.purchase_order_id
      WHERE po.site_id = s.id AND b.bill_date BETWEEN p_from AND p_to), 0) +
    COALESCE((SELECT SUM(mu.total_cost) FROM material_usage mu
      WHERE mu.site_id = s.id AND mu.usage_date BETWEEN p_from AND p_to
      AND mu.state = 'approved'), 0),
    -- Net profit = income - total cost
    COALESCE((SELECT SUM(pr.amount) FROM pay_receipts pr
      WHERE pr.site_id = s.id AND pr.date BETWEEN p_from AND p_to), 0) -
    (
      COALESCE((SELECT SUM(ls.net_payable) FROM labour_settlements ls
        WHERE ls.site_id = s.id AND ls.week_start_date BETWEEN p_from AND p_to), 0) +
      COALESCE((SELECT SUM(se.amount) FROM site_expenses se
        WHERE se.site_id = s.id AND se.date BETWEEN p_from AND p_to), 0) +
      COALESCE((SELECT SUM(b.amount) FROM bills b
        JOIN purchase_orders po ON po.id = b.purchase_order_id
        WHERE po.site_id = s.id AND b.bill_date BETWEEN p_from AND p_to), 0) +
      COALESCE((SELECT SUM(mu.total_cost) FROM material_usage mu
        WHERE mu.site_id = s.id AND mu.usage_date BETWEEN p_from AND p_to
        AND mu.state = 'approved'), 0)
    )
  FROM sites s
  WHERE (p_site_id IS NULL OR s.id = p_site_id);
END;
$$;

COMMENT ON FUNCTION get_site_pnl IS 'Returns P&L summary for sites with material_usage_cost included (approved records only). Returns all sites if p_site_id is NULL, otherwise filters to specific site.';
