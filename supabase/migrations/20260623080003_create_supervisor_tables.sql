-- Migration 003: Supervisor site assignments & wage permissions
-- These two tables are central to RLS:
--   - supervisor_site_assignments scopes a supervisor to their site(s)
--   - supervisor_wage_permissions gates wage/rate visibility per supervisor per site

---------------------------------------------------------------------------
-- supervisor_site_assignments (many-to-many: supervisor ↔ site)
---------------------------------------------------------------------------
CREATE TABLE supervisor_site_assignments (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  supervisor_id UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  site_id       UUID        NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  assigned_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by   UUID        NOT NULL REFERENCES profiles(id),
  UNIQUE (supervisor_id, site_id)
);

COMMENT ON TABLE supervisor_site_assignments IS 'Many-to-many: which supervisors are assigned to which sites.';

ALTER TABLE supervisor_site_assignments ENABLE ROW LEVEL SECURITY;

-- Index for looking up assignments by site (e.g. "who is assigned to this site?")
CREATE INDEX idx_supervisor_site_assignments_site_id
  ON supervisor_site_assignments(site_id);

---------------------------------------------------------------------------
-- supervisor_wage_permissions (per-supervisor, per-site wage visibility toggle)
---------------------------------------------------------------------------
CREATE TABLE supervisor_wage_permissions (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  supervisor_id      UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  site_id            UUID        NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  can_view_set_wages BOOLEAN     NOT NULL DEFAULT false,
  last_edited_by     UUID        NOT NULL REFERENCES profiles(id),
  last_edited_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (supervisor_id, site_id)
);

COMMENT ON TABLE  supervisor_wage_permissions                    IS 'Wage visibility toggle per supervisor per site. Default: disabled.';
COMMENT ON COLUMN supervisor_wage_permissions.can_view_set_wages IS 'When true, supervisor can view rates, computed wages, and set the half-day multiplier for this site.';

ALTER TABLE supervisor_wage_permissions ENABLE ROW LEVEL SECURITY;

-- Index for looking up permissions by site
CREATE INDEX idx_supervisor_wage_permissions_site_id
  ON supervisor_wage_permissions(site_id);
