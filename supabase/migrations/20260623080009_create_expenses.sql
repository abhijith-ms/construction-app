-- Migration 009: Site expenses & office expenses

---------------------------------------------------------------------------
-- site_expenses (per-site)
---------------------------------------------------------------------------
CREATE TABLE site_expenses (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id        UUID          NOT NULL REFERENCES sites(id),
  category       TEXT          NOT NULL
                 CHECK (category IN ('material', 'transport', 'food', 'general')),
  amount         NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  date           DATE          NOT NULL,
  description    TEXT,
  work_type      TEXT,
  last_edited_by UUID          NOT NULL REFERENCES profiles(id),
  last_edited_at TIMESTAMPTZ   NOT NULL DEFAULT now(),
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);

COMMENT ON TABLE  site_expenses           IS 'Expenses tied to a specific site.';
COMMENT ON COLUMN site_expenses.work_type IS 'Optionally linked work type for this expense.';

ALTER TABLE site_expenses ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_site_expenses_site_id ON site_expenses(site_id);
CREATE INDEX idx_site_expenses_date    ON site_expenses(date);

---------------------------------------------------------------------------
-- office_expenses (company-level, NOT tied to any site)
---------------------------------------------------------------------------
CREATE TABLE office_expenses (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  category       TEXT          NOT NULL
                 CHECK (category IN ('rent', 'staff_salary', 'transport', 'general')),
  amount         NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  date           DATE          NOT NULL,
  description    TEXT,
  last_edited_by UUID          NOT NULL REFERENCES profiles(id),
  last_edited_at TIMESTAMPTZ   NOT NULL DEFAULT now(),
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);

COMMENT ON TABLE office_expenses IS 'Company-level expenses not tied to any site.';

ALTER TABLE office_expenses ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_office_expenses_date ON office_expenses(date);
