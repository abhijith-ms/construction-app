-- Migration 013: Add is_active to materials
--
-- REASON: The materials table lacked a soft-deactivation flag, unlike labour,
-- staff, and suppliers which all have is_active. This was identified as a gap
-- during RLS planning: hard DELETE on materials was disallowed (same as other
-- master-data tables), so we need is_active = false as the retirement mechanism.
--
-- CHANGE SUMMARY:
--   1. Add is_active BOOLEAN NOT NULL DEFAULT true to materials.
--   2. Add a comment explaining the column.

ALTER TABLE public.materials
  ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN materials.is_active
  IS 'Soft-deactivation flag. Set to false to retire a material instead of deleting it. Consistent with labour, staff, and suppliers.';
