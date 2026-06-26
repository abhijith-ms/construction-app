-- Migration 006: Labour settlements (weekly payroll) & advances
--
-- Settlement cycle: fixed calendar week, Monday to Saturday (confirmed).
-- Advances: deducted immediately from current/next settlement.
-- Overdue: unpaid balance carries over week-to-week.

---------------------------------------------------------------------------
-- labour_settlements
---------------------------------------------------------------------------
CREATE TABLE labour_settlements (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  labour_id        UUID          NOT NULL REFERENCES labour(id),
  week_start_date  DATE          NOT NULL,
  week_end_date    DATE          NOT NULL,
  gross_wages      NUMERIC(12,2) NOT NULL CHECK (gross_wages >= 0),
  total_advances   NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_advances >= 0),
  carried_over_due NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (carried_over_due >= 0),
  net_payable      NUMERIC(12,2) NOT NULL,
  amount_paid      NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  payment_status   TEXT          NOT NULL DEFAULT 'pending'
                   CHECK (payment_status IN ('pending', 'partial', 'paid', 'overdue')),
  paid_at          TIMESTAMPTZ,
  last_edited_by   UUID          NOT NULL REFERENCES profiles(id),
  last_edited_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  UNIQUE (labour_id, week_start_date),
  -- Enforce Monday–Saturday settlement week
  CHECK (EXTRACT(ISODOW FROM week_start_date) = 1),
  CHECK (week_end_date = week_start_date + INTERVAL '5 days')
);

COMMENT ON TABLE  labour_settlements                  IS 'Weekly payroll settlement per worker. Cycle: Monday to Saturday.';
COMMENT ON COLUMN labour_settlements.gross_wages      IS 'Sum of (daily rate × attendance multiplier) across the week.';
COMMENT ON COLUMN labour_settlements.carried_over_due IS 'Unpaid balance carried forward from previous settlement weeks.';
COMMENT ON COLUMN labour_settlements.net_payable      IS 'gross_wages + carried_over_due - total_advances. Can be negative if advances exceed earnings — this is expected (worker owes money), not a bug.';
COMMENT ON COLUMN labour_settlements.payment_status   IS 'pending → partial/paid/overdue. Overdue if unpaid past the settlement week.';

ALTER TABLE labour_settlements ENABLE ROW LEVEL SECURITY;

---------------------------------------------------------------------------
-- labour_advances
---------------------------------------------------------------------------
CREATE TABLE labour_advances (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  labour_id      UUID          NOT NULL REFERENCES labour(id),
  site_id        UUID          NOT NULL REFERENCES sites(id),
  amount         NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  date_given     DATE          NOT NULL,
  notes          TEXT,
  settlement_id  UUID          REFERENCES labour_settlements(id) ON DELETE SET NULL,
  last_edited_by UUID          NOT NULL REFERENCES profiles(id),
  last_edited_at TIMESTAMPTZ   NOT NULL DEFAULT now(),
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);

COMMENT ON TABLE  labour_advances               IS 'Advances given to workers, tied to a site for P&L cost allocation.';
COMMENT ON COLUMN labour_advances.site_id       IS 'Site this advance is allocated against. Always required — every advance is a cost to a site.';
COMMENT ON COLUMN labour_advances.settlement_id IS 'Set when this advance is consumed by a settlement. NULL until settled.';

ALTER TABLE labour_advances ENABLE ROW LEVEL SECURITY;

-- Indexes for common lookups
CREATE INDEX idx_labour_advances_labour_id ON labour_advances(labour_id);
CREATE INDEX idx_labour_advances_site_id   ON labour_advances(site_id);
