-- Migration 022: Supplier balance view for running balance calculation
-- Running balance owed = sum(bills.amount) - sum(supplier_payments.amount)

CREATE OR REPLACE VIEW supplier_balances AS
SELECT 
  s.id as supplier_id,
  s.name,
  s.contact_phone,
  s.contact_email,
  s.materials_supplied,
  s.is_active,
  COALESCE(SUM(b.amount), 0) as total_billed,
  COALESCE(SUM(sp.amount), 0) as total_paid,
  COALESCE(SUM(b.amount), 0) - COALESCE(SUM(sp.amount), 0) as balance_owed
FROM suppliers s
LEFT JOIN purchase_orders po ON po.supplier_id = s.id
LEFT JOIN bills b ON b.purchase_order_id = po.id
LEFT JOIN supplier_payments sp ON sp.supplier_id = s.id
GROUP BY s.id, s.name, s.contact_phone, s.contact_email, s.materials_supplied, s.is_active;

COMMENT ON VIEW supplier_balances IS 'Running balance owed per supplier. Balance = total_billed - total_paid.';

-- Enable RLS on the view (views inherit RLS from underlying tables, but we add policies for select)
-- The view is read-only; modifications go through the underlying suppliers table

-- Grant select to authenticated users (actual row access controlled by RLS on suppliers)
GRANT SELECT ON supplier_balances TO authenticated;
GRANT SELECT ON supplier_balances TO anon;
