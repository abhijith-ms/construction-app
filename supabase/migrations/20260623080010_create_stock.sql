-- Migration 010: Materials, stock levels, stock transactions
-- Full live running stock balance per site per material.
-- stock_levels holds the current balance; stock_transactions logs every movement.
-- A future Postgres function/trigger will update stock_levels on each transaction.

---------------------------------------------------------------------------
-- materials (master list)
---------------------------------------------------------------------------
CREATE TABLE materials (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL UNIQUE,
  unit       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  materials      IS 'Master list of materials tracked in stock.';
COMMENT ON COLUMN materials.unit IS 'Unit of measure: bags, cubic feet, kg, pieces, etc.';

ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

---------------------------------------------------------------------------
-- stock_levels (live balance per site per material)
---------------------------------------------------------------------------
CREATE TABLE stock_levels (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id          UUID          NOT NULL REFERENCES sites(id),
  material_id      UUID          NOT NULL REFERENCES materials(id),
  quantity_on_hand NUMERIC(12,3) NOT NULL DEFAULT 0
                   CHECK (quantity_on_hand >= 0),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  UNIQUE (site_id, material_id)
);

COMMENT ON TABLE stock_levels IS 'Live running stock balance per site per material. Updated by stock_transactions.';

ALTER TABLE stock_levels ENABLE ROW LEVEL SECURITY;

---------------------------------------------------------------------------
-- stock_transactions (every receipt/use/transfer)
---------------------------------------------------------------------------
CREATE TABLE stock_transactions (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id          UUID          NOT NULL REFERENCES sites(id),
  material_id      UUID          NOT NULL REFERENCES materials(id),
  transaction_type TEXT          NOT NULL
                   CHECK (transaction_type IN ('receipt', 'usage', 'transfer_in', 'transfer_out')),
  quantity         NUMERIC(12,3) NOT NULL CHECK (quantity > 0),
  reference_note   TEXT,
  transfer_site_id UUID          REFERENCES sites(id),
  last_edited_by   UUID          NOT NULL REFERENCES profiles(id),
  last_edited_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  -- transfer_site_id required for transfers, NULL for receipt/usage
  CHECK (
    (transaction_type IN ('transfer_in', 'transfer_out') AND transfer_site_id IS NOT NULL)
    OR
    (transaction_type IN ('receipt', 'usage') AND transfer_site_id IS NULL)
  ),
  -- Cannot transfer to/from the same site
  CHECK (transfer_site_id IS NULL OR transfer_site_id != site_id)
);

COMMENT ON TABLE  stock_transactions                  IS 'Every stock movement. Quantity always positive; type determines add/subtract.';
COMMENT ON COLUMN stock_transactions.transfer_site_id IS 'For transfer_in/transfer_out: the other site involved in the transfer.';

ALTER TABLE stock_transactions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_stock_transactions_site_material
  ON stock_transactions(site_id, material_id);
