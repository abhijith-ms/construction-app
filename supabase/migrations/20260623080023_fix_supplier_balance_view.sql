-- Migration: Fix supplier_balances view cross-join bug
-- Date: 2026-06-26
-- Issue: Previous view joined bills and supplier_payments directly to suppliers,
--        causing row multiplication (cross-join) when aggregating.
-- Fix: Use subquery aggregations to calculate totals before joining.

-- Drop and recreate the view with corrected logic
CREATE OR REPLACE VIEW supplier_balances AS
SELECT 
  s.id as supplier_id,
  s.name,
  s.contact_phone,
  s.contact_email,
  s.materials_supplied,
  s.is_active,
  COALESCE(bills_agg.total_billed, 0) as total_billed,
  COALESCE(payments_agg.total_paid, 0) as total_paid,
  COALESCE(bills_agg.total_billed, 0) - COALESCE(payments_agg.total_paid, 0) as balance_owed
FROM suppliers s
LEFT JOIN (
  SELECT po.supplier_id, SUM(b.amount) as total_billed
  FROM purchase_orders po
  JOIN bills b ON b.purchase_order_id = po.id
  GROUP BY po.supplier_id
) bills_agg ON bills_agg.supplier_id = s.id
LEFT JOIN (
  SELECT sp.supplier_id, SUM(sp.amount) as total_paid
  FROM supplier_payments sp
  GROUP BY sp.supplier_id
) payments_agg ON payments_agg.supplier_id = s.id;

-- Grant access to authenticated users
GRANT SELECT ON supplier_balances TO authenticated;

COMMENT ON VIEW supplier_balances IS 'Aggregated supplier balance view. Shows total billed, total paid, and balance owed per supplier. Uses subquery aggregations to avoid cross-join multiplication bug.';
