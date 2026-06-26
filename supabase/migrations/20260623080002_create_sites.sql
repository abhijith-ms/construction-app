-- Migration 002: Sites & site settings
-- Supervisor assignment is via supervisor_site_assignments (migration 003),
-- NOT a column on this table.

---------------------------------------------------------------------------
-- sites
---------------------------------------------------------------------------
CREATE TABLE sites (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT          NOT NULL,
  client_name  TEXT          NOT NULL,
  client_phone VARCHAR(20),
  budget       NUMERIC(14,2),
  start_date   DATE,
  status       TEXT          NOT NULL DEFAULT 'active'
               CHECK (status IN ('active', 'on_hold', 'completed')),
  created_by   UUID          REFERENCES profiles(id),
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT now()
);

COMMENT ON TABLE  sites        IS 'Construction sites/projects.';
COMMENT ON COLUMN sites.budget IS 'Project budget in INR. Nullable if not yet determined.';
COMMENT ON COLUMN sites.status IS 'Site lifecycle: active, on_hold, or completed.';

ALTER TABLE sites ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_sites_updated_at
  BEFORE UPDATE ON sites
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

---------------------------------------------------------------------------
-- site_settings (per-site configuration — currently: half-day multiplier)
---------------------------------------------------------------------------
CREATE TABLE site_settings (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id             UUID          NOT NULL UNIQUE
                      REFERENCES sites(id) ON DELETE CASCADE,
  half_day_multiplier NUMERIC(3,2)  NOT NULL DEFAULT 0.50
                      CHECK (half_day_multiplier > 0 AND half_day_multiplier < 1),
  last_edited_by      UUID          NOT NULL REFERENCES profiles(id),
  last_edited_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

COMMENT ON TABLE  site_settings                    IS 'Per-site configuration. One row per site.';
COMMENT ON COLUMN site_settings.half_day_multiplier IS 'Multiplier for half-day wage (default 0.50). Must be > 0 and < 1.';

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
