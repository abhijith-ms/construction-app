-- Migration 024: get_site_pnl function
-- Returns per-site profit and loss report with income vs costs

CREATE OR REPLACE FUNCTION get_site_pnl(
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
    COALESCE((
      SELECT SUM(pr.amount) FROM pay_receipts pr
      WHERE pr.site_id = s.id
      AND pr.date BETWEEN p_from AND p_to
    ), 0),
    COALESCE((
      SELECT SUM(ls.net_payable) FROM labour_settlements ls
      WHERE ls.site_id = s.id
      AND ls.week_start_date BETWEEN p_from AND p_to
    ), 0),
    COALESCE((
      SELECT SUM(se.amount) FROM site_expenses se
      WHERE se.site_id = s.id
      AND se.date BETWEEN p_from AND p_to
    ), 0),
    COALESCE((
      SELECT SUM(b.amount) FROM bills b
      JOIN purchase_orders po ON po.id = b.purchase_order_id
      WHERE po.site_id = s.id
      AND b.bill_date BETWEEN p_from AND p_to
    ), 0),
    COALESCE((SELECT SUM(ls.net_payable) FROM labour_settlements ls WHERE ls.site_id = s.id AND ls.week_start_date BETWEEN p_from AND p_to), 0) +
    COALESCE((SELECT SUM(se.amount) FROM site_expenses se WHERE se.site_id = s.id AND se.date BETWEEN p_from AND p_to), 0) +
    COALESCE((SELECT SUM(b.amount) FROM bills b JOIN purchase_orders po ON po.id = b.purchase_order_id WHERE po.site_id = s.id AND b.bill_date BETWEEN p_from AND p_to), 0),
    COALESCE((SELECT SUM(pr.amount) FROM pay_receipts pr WHERE pr.site_id = s.id AND pr.date BETWEEN p_from AND p_to), 0) -
    (
      COALESCE((SELECT SUM(ls.net_payable) FROM labour_settlements ls WHERE ls.site_id = s.id AND ls.week_start_date BETWEEN p_from AND p_to), 0) +
      COALESCE((SELECT SUM(se.amount) FROM site_expenses se WHERE se.site_id = s.id AND se.date BETWEEN p_from AND p_to), 0) +
      COALESCE((SELECT SUM(b.amount) FROM bills b JOIN purchase_orders po ON po.id = b.purchase_order_id WHERE po.site_id = s.id AND b.bill_date BETWEEN p_from AND p_to), 0)
    )
  FROM sites s
  WHERE (p_site_id IS NULL OR s.id = p_site_id);
END;
$$;

COMMENT ON FUNCTION get_site_pnl IS 'Returns per-site P&L report with income and cost breakdowns for a date range';
