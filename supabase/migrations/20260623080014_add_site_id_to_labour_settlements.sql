-- Migration 014: Add site_id to labour_settlements
--
-- REASON: labour_settlements had no site_id column, making it impossible to
-- apply site-scoped RLS policies for Supervisors with wage visibility enabled.
-- A Supervisor can only view settlements for sites where they have the
-- can_view_set_wages toggle enabled, which requires a site_id to filter on.
--
-- CHANGE SUMMARY:
--   1. Add nullable site_id UUID REFERENCES sites(id) to labour_settlements.
--   2. Nullable because:
--      a. Existing seed data has no settlement rows, so no backfill needed.
--      b. The settlement calculation function (to be built later) will always
--         populate site_id. NULL values indicate pre-migration rows only.
--   3. Add index for RLS policy lookups by site.

ALTER TABLE public.labour_settlements
  ADD COLUMN site_id UUID REFERENCES public.sites(id);

COMMENT ON COLUMN labour_settlements.site_id
  IS 'Site this settlement is associated with. Enables site-scoped RLS for supervisors with wage visibility. Nullable — will be populated by the settlement calculation function.';

CREATE INDEX idx_labour_settlements_site_id
  ON public.labour_settlements(site_id);
