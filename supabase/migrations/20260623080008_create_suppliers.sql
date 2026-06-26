-- Migration 008: Suppliers, purchase orders, bills, supplier payments
-- Running balance owed per supplier = sum(bills.amount) - sum(supplier_payments.amount)

---------------------------------------------------------------------------
-- suppliers
---------------------------------------------------------------------------
CREATE TABLE suppliers (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name               TEXT        NOT NULL,
  contact_phone      VARCHAR(20),
  contact_email      TEXT,
  materials_supplied TEXT,
  is_active          BOOLEAN     NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  suppliers                    IS 'Material suppliers.';
COMMENT ON COLUMN suppliers.materials_supplied IS 'Freetext description of materials this supplier provides.';

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

---------------------------------------------------------------------------
-- purchase_orders (material requests)
---------------------------------------------------------------------------
CREATE TABLE purchase_orders (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id      UUID          NOT NULL REFERENCES sites(id),
  supplier_id  UUID          NOT NULL REFERENCES suppliers(id),
  description  TEXT          NOT NULL,
  total_amount NUMERIC(14,2) CHECK (total_amount >= 0),
  status       TEXT          NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'approved', 'received', 'cancelled')),
  order_date   DATE          NOT NULL DEFAULT CURRENT_DATE,
  created_by   UUID          NOT NULL REFERENCES profiles(id),
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT now()
);

COMMENT ON TABLE  purchase_orders              IS 'Material requests linked to a site and supplier. Single-amount (no line items).';
COMMENT ON COLUMN purchase_orders.total_amount IS 'Estimated/actual total in INR. Nullable if not known upfront.';

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_purchase_orders_updated_at
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_purchase_orders_site_id     ON purchase_orders(site_id);
CREATE INDEX idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);

---------------------------------------------------------------------------
-- bills (supplier invoices against a purchase order)
---------------------------------------------------------------------------
CREATE TABLE bills (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID          NOT NULL REFERENCES purchase_orders(id),
  bill_number       TEXT,
  bill_date         DATE          NOT NULL,
  amount            NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  notes             TEXT,
  last_edited_by    UUID          NOT NULL REFERENCES profiles(id),
  last_edited_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);

COMMENT ON TABLE  bills             IS 'Supplier invoices/bills recorded against a purchase order.';
COMMENT ON COLUMN bills.bill_number IS 'Supplier''s invoice/bill reference number.';

ALTER TABLE bills ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_bills_purchase_order_id ON bills(purchase_order_id);

---------------------------------------------------------------------------
-- supplier_payments (payments against bills)
---------------------------------------------------------------------------
CREATE TABLE supplier_payments (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id        UUID          NOT NULL REFERENCES bills(id),
  supplier_id    UUID          NOT NULL REFERENCES suppliers(id),
  amount         NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  payment_date   DATE          NOT NULL,
  payment_mode   TEXT          NOT NULL
                 CHECK (payment_mode IN ('cash', 'gpay', 'bank')),
  notes          TEXT,
  last_edited_by UUID          NOT NULL REFERENCES profiles(id),
  last_edited_at TIMESTAMPTZ   NOT NULL DEFAULT now(),
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);

COMMENT ON TABLE  supplier_payments             IS 'Payments made against supplier bills.';
COMMENT ON COLUMN supplier_payments.supplier_id IS 'Denormalized from bill → PO → supplier for easier balance queries.';

ALTER TABLE supplier_payments ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_supplier_payments_bill_id     ON supplier_payments(bill_id);
CREATE INDEX idx_supplier_payments_supplier_id ON supplier_payments(supplier_id);
