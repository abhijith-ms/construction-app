-- Migration 007: Pay receipts
-- Money received from clients, allocated per site.

---------------------------------------------------------------------------
-- pay_receipts
---------------------------------------------------------------------------
CREATE TABLE pay_receipts (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id        UUID          NOT NULL REFERENCES sites(id),
  date           DATE          NOT NULL,
  amount         NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  payment_mode   TEXT          NOT NULL
                 CHECK (payment_mode IN ('cash', 'gpay', 'bank')),
  notes          TEXT,
  last_edited_by UUID          NOT NULL REFERENCES profiles(id),
  last_edited_at TIMESTAMPTZ   NOT NULL DEFAULT now(),
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);

COMMENT ON TABLE pay_receipts IS 'Payments received from clients, allocated per site.';

ALTER TABLE pay_receipts ENABLE ROW LEVEL SECURITY;

-- Index for per-site receipt queries
CREATE INDEX idx_pay_receipts_site_id ON pay_receipts(site_id);
CREATE INDEX idx_pay_receipts_date    ON pay_receipts(date);
