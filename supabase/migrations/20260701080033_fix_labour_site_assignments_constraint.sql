-- Migration 033: Fix labour_site_assignments overlap constraint
--
-- PROBLEM: The existing no_overlapping_assignments constraint is a plain
-- UNIQUE on (labour_id, site_id, start_date). It:
--   1. Does NOT prevent genuine date-range overlaps (two assignments for the
--      same worker+site with different start dates but overlapping periods).
--   2. DOES incorrectly block same-day re-assignment: ending an assignment on
--      date X and creating a new one also starting date X fails because the
--      start_date column value matches.
--
-- FIX: Replace with a proper EXCLUDE USING gist constraint using daterange.
--   - daterange(start_date, end_date, '[)') is half-open:
--       start_date INCLUSIVE, end_date EXCLUSIVE.
--   - An assignment ended on date X covers [start, X). A new assignment
--     starting on date X covers [X, ...). These do NOT overlap — correct.
--   - end_date IS NULL → [start, ∞), which overlaps any other open-ended
--     assignment on the same worker+site — correctly blocked.
--   - btree_gist is required for mixed = / && operators in EXCLUDE.
--     It is a standard bundled extension available on all Supabase plans.
--
-- SAFE TO APPLY: Pre-migration overlap check confirmed 0 conflicting rows.

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE public.labour_site_assignments
  DROP CONSTRAINT no_overlapping_assignments;

ALTER TABLE public.labour_site_assignments
  ADD CONSTRAINT no_overlapping_assignments
  EXCLUDE USING gist (
    labour_id WITH =,
    site_id   WITH =,
    daterange(start_date, end_date, '[)') WITH &&
  );
