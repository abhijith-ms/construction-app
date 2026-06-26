-- Migration 012: Require site_id on all labour_attendance rows
--
-- REASON: The original CHECK constraint (migration 005) allowed absent/leave rows
-- to have NULL site_id. This breaks RLS: Supervisor policies scope access by
-- is_supervisor_for_site(site_id), so absent rows with NULL site_id would be
-- invisible to Supervisors who need to see and update them (e.g. correcting a
-- missed mark). The business fix is correct too: a Supervisor always records
-- absence from the perspective of their site, so site context is always known.
--
-- CHANGE SUMMARY:
--   1. Drop the existing unnamed CHECK constraint that permitted NULL site_id
--      on absent/leave rows.
--   2. Set site_id column NOT NULL at the column level.
--   3. Re-add a clean named CHECK for the present/half_day field requirements
--      (rate_applied and work_category still only required when present/half_day).
--
-- SEED NOTE: seed.sql line for Raju's Thursday absent row must also be updated
-- to provide site_id. See seed.sql section 10.

---------------------------------------------------------------------------
-- Step 1: Drop the existing unnamed CHECK constraint
-- (auto-named by Postgres, looks like 'labour_attendance_check' or similar)
---------------------------------------------------------------------------
DO $$
DECLARE
  v_conname text;
BEGIN
  SELECT conname INTO v_conname
  FROM pg_constraint
  WHERE conrelid = 'public.labour_attendance'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%absent%';

  IF v_conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.labour_attendance DROP CONSTRAINT %I', v_conname);
    RAISE NOTICE 'Dropped constraint: %', v_conname;
  ELSE
    RAISE NOTICE 'No matching constraint found — nothing to drop.';
  END IF;
END
$$;

---------------------------------------------------------------------------
-- Step 2: Make site_id NOT NULL (column-level constraint — cleaner than CHECK)
---------------------------------------------------------------------------
ALTER TABLE public.labour_attendance
  ALTER COLUMN site_id SET NOT NULL;

COMMENT ON COLUMN labour_attendance.site_id
  IS 'Site this attendance record belongs to. Required for all statuses (including absent/leave) — the Supervisor always records absence in the context of their assigned site.';

---------------------------------------------------------------------------
-- Step 3: Re-add a named CHECK for present/half_day field requirements
-- rate_applied and work_category are still only required when actually working
---------------------------------------------------------------------------
ALTER TABLE public.labour_attendance
  ADD CONSTRAINT labour_attendance_working_fields_required
  CHECK (
    status NOT IN ('present', 'half_day')
    OR (
      rate_applied   IS NOT NULL AND
      work_category  IS NOT NULL
    )
  );

COMMENT ON CONSTRAINT labour_attendance_working_fields_required
  ON public.labour_attendance
  IS 'Requires rate_applied and work_category for present/half_day rows. Absent/leave rows need only site_id (enforced at column level).';
