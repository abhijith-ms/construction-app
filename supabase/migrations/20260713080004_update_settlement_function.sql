-- Migration: Update calculate_weekly_settlement() with per-worker half-day rate
--            and overtime pay, and fix get_attendance_multiplier volatility.
--
-- CHANGES:
--   1. get_attendance_multiplier: IMMUTABLE → STABLE
--      The function reads site_settings (DB read), so IMMUTABLE was incorrect.
--      No logic change — only the volatility category is corrected.
--
--   2. calculate_weekly_settlement: new gross-wage formula
--      Old: SUM(rate_applied × get_attendance_multiplier(...))
--      New: per-row CASE expression, inline in SUM, no helper function call:
--
--        base_wage = CASE status
--          WHEN 'present'  → rate_applied
--          WHEN 'half_day' → IF labour.half_day_rate IS NOT NULL
--                              THEN labour.half_day_rate          (new fixed amount)
--                              ELSE rate_applied × site_settings.half_day_multiplier
--                                   (old fallback — backward compatible for workers
--                                    with no per-worker half_day_rate set)
--          WHEN 'absent'   → 0
--          WHEN 'leave'    → 0
--        END
--
--        overtime_pay = IF labour.overtime_rate IS NOT NULL
--                          AND attendance.overtime_hours IS NOT NULL
--                          AND attendance.overtime_hours > 0
--                       THEN overtime_hours × overtime_rate
--                       ELSE 0
--
--        daily_total = base_wage + overtime_pay
--
--      gross_wages = SUM(daily_total) over Monday–Saturday
--
-- WORKED EXAMPLE 1 — Original Raju example, no overtime, no per-worker half_day_rate
-- (Must match Section 6 of the rules exactly. half_day_rate IS NULL → fallback used.)
--
--   Labour: Raju — Week of June 15–21 (half_day_rate=NULL, overtime_rate=NULL)
--   Mon: present,  rate_applied=₹1300 → base ₹1300, OT ₹0 = ₹1300
--   Tue: present,  rate_applied=₹1300 → base ₹1300, OT ₹0 = ₹1300
--   Wed: half_day, rate_applied=₹1000, half_day_rate=NULL →
--          fallback: ₹1000 × site_multiplier(0.5) = ₹500
--   Thu: absent  → ₹0
--   Fri: present,  rate_applied=₹1300 → ₹1300
--   Sat: present,  rate_applied=₹1300 → ₹1300
--   ──────────────────────────────────────────
--   Gross: ₹5,700   Advance: -₹2,000   Net: ₹3,700   ← must match exactly
--
-- WORKED EXAMPLE 2 — Worker with half_day_rate and overtime_rate set
--   (Values used in integration test, see verification query in task notes.)
--
--   Labour: Raju (half_day_rate=₹400, overtime_rate=₹150/hr)
--   Mon: present,  rate_applied=₹1300, overtime_hours=2 →
--          base ₹1300, OT 2×₹150=₹300  = ₹1600
--   Tue: present,  rate_applied=₹1300, overtime_hours=NULL → ₹1300
--   Wed: half_day, rate_applied=₹1000, half_day_rate=₹400 →
--          base ₹400 (fixed rate used, NOT ₹1000×0.5), OT ₹0 = ₹400
--   Thu: absent → ₹0
--   Fri: present,  rate_applied=₹1300 → ₹1300
--   Sat: present,  rate_applied=₹1300 → ₹1300
--   ──────────────────────────────────────────
--   Gross: ₹5,900   Advance: -₹2,000   Net: ₹3,900
--
-- WORKED EXAMPLE 3 — Simple overtime illustration (from spec)
--   Worker: daily rate ₹1000, half_day_rate=₹400, overtime_rate=₹150/hr
--   Mon: present, 2hr overtime → ₹1000 + (2×₹150) = ₹1300
--   Tue: half_day, no overtime → ₹400
--   Wed: absent → ₹0
--   Total gross: ₹1700

-------------------------------------------------------------------------
-- 1. Fix volatility category on the attendance multiplier helper
--    (no logic change — IMMUTABLE → STABLE because it reads site_settings)
-------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_attendance_multiplier(
    p_status    TEXT,
    p_site_id   UUID,
    p_labour_id UUID,
    p_date      DATE
)
RETURNS NUMERIC AS $$
DECLARE
    v_hd_multiplier NUMERIC;
BEGIN
    -- present = full rate (1.0)
    IF p_status = 'present' THEN
        RETURN 1.0;
    -- half_day = site-specific multiplier (default 0.5)
    ELSIF p_status = 'half_day' THEN
        -- Look up per-site half-day multiplier, fall back to 0.5
        SELECT COALESCE(half_day_multiplier, 0.5) INTO v_hd_multiplier
        FROM site_settings
        WHERE site_id = p_site_id;

        -- If no site_settings row exists, use default 0.5
        IF v_hd_multiplier IS NULL THEN
            v_hd_multiplier := 0.5;
        END IF;

        RETURN v_hd_multiplier;
    -- absent = 0
    ELSIF p_status = 'absent' THEN
        RETURN 0;
    -- leave = 0
    ELSIF p_status = 'leave' THEN
        RETURN 0;
    ELSE
        RETURN 0;
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;  -- was IMMUTABLE; corrected — reads site_settings

COMMENT ON FUNCTION get_attendance_multiplier(TEXT, UUID, UUID, DATE) IS
'Returns wage multiplier: present=1.0, half_day=site-specific (default 0.5), absent=0, leave=0.
No longer called by calculate_weekly_settlement (logic inlined there), but kept for other callers.
STABLE: reads site_settings, so not IMMUTABLE.';

-------------------------------------------------------------------------
-- 2. Updated settlement calculation function
-------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION calculate_weekly_settlement(
    p_labour_id      UUID,
    p_week_start     DATE,
    p_last_edited_by UUID
)
RETURNS labour_settlements AS $$
DECLARE
    v_settlement           RECORD;
    v_labour               RECORD;
    v_half_day_rate        NUMERIC;  -- extracted from v_labour for use in SQL
    v_overtime_rate        NUMERIC;  -- extracted from v_labour for use in SQL
    v_gross_wages          NUMERIC := 0;
    v_total_advances       NUMERIC := 0;
    v_carried_over_due     NUMERIC := 0;
    v_net_payable          NUMERIC := 0;
    v_settlement_id        UUID;
    v_week_end             DATE;
    v_existing_status      TEXT;
    v_existing_settlement_id UUID;
BEGIN
    -- Validation: week_start must be a Monday (ISODOW = 1)
    IF EXTRACT(ISODOW FROM p_week_start) != 1 THEN
        RAISE EXCEPTION 'week_start must be a Monday (ISODOW = 1). Provided: % (ISODOW = %)',
            p_week_start, EXTRACT(ISODOW FROM p_week_start);
    END IF;

    -- Week end is Saturday (5 days after Monday)
    v_week_end := p_week_start + INTERVAL '5 days';

    -- Verify worker exists and fetch all columns (including half_day_rate, overtime_rate)
    SELECT * INTO v_labour FROM labour WHERE id = p_labour_id;
    IF v_labour IS NULL THEN
        RAISE EXCEPTION 'Worker not found: %', p_labour_id;
    END IF;

    -- Extract per-worker rate fields into local scalars for use inside SQL expressions.
    -- NULL semantics are intentional:
    --   v_half_day_rate IS NULL  → fall back to site multiplier (old behaviour)
    --   v_overtime_rate IS NULL  → worker not eligible for overtime
    v_half_day_rate := v_labour.half_day_rate;
    v_overtime_rate := v_labour.overtime_rate;

    -- Calculate gross wages from attendance (Monday–Saturday)
    --
    -- Per-row formula:
    --   base_wage:
    --     present  → rate_applied
    --     half_day → IF v_half_day_rate IS NOT NULL
    --                  THEN v_half_day_rate                      (per-worker fixed rate)
    --                  ELSE rate_applied × site half_day_multiplier (fallback, default 0.5)
    --     absent / leave → 0
    --
    --   overtime_pay:
    --     IF v_overtime_rate IS NOT NULL
    --        AND la.overtime_hours IS NOT NULL
    --        AND la.overtime_hours > 0
    --     THEN la.overtime_hours × v_overtime_rate
    --     ELSE 0
    --
    --   daily_total = base_wage + overtime_pay
    SELECT COALESCE(SUM(
        -- Base wage for the day
        CASE la.status
            WHEN 'present' THEN
                la.rate_applied
            WHEN 'half_day' THEN
                CASE
                    WHEN v_half_day_rate IS NOT NULL THEN
                        v_half_day_rate
                    ELSE
                        la.rate_applied * COALESCE(
                            (SELECT ss.half_day_multiplier
                             FROM site_settings ss
                             WHERE ss.site_id = la.site_id),
                            0.5
                        )
                END
            ELSE
                0  -- absent, leave
        END
        +
        -- Overtime pay for the day
        CASE
            WHEN v_overtime_rate IS NOT NULL
                 AND la.overtime_hours IS NOT NULL
                 AND la.overtime_hours > 0
            THEN la.overtime_hours * v_overtime_rate
            ELSE 0
        END
    ), 0) INTO v_gross_wages
    FROM labour_attendance la
    WHERE la.labour_id = p_labour_id
      AND la.date >= p_week_start
      AND la.date <= v_week_end;

    -- Sum unlinked advances for this worker (settlement_id IS NULL)
    SELECT COALESCE(SUM(amount), 0) INTO v_total_advances
    FROM labour_advances
    WHERE labour_id = p_labour_id
      AND settlement_id IS NULL;

    -- Fetch carried_over_due from most recent prior unsettled settlement
    -- Look for prior weeks with status in ('pending', 'partial', 'overdue')
    -- where unpaid balance > 0
    SELECT COALESCE(SUM(net_payable - amount_paid), 0) INTO v_carried_over_due
    FROM labour_settlements
    WHERE labour_id = p_labour_id
      AND week_start_date < p_week_start
      AND payment_status IN ('pending', 'partial', 'overdue')
      AND (net_payable - amount_paid) > 0;

    -- Compute net payable
    -- Can be negative if advances exceed earnings (worker owes money)
    v_net_payable := v_gross_wages + v_carried_over_due - v_total_advances;

    -- Check if settlement already exists for this week
    SELECT id, payment_status INTO v_existing_settlement_id, v_existing_status
    FROM labour_settlements
    WHERE labour_id = p_labour_id
      AND week_start_date = p_week_start;

    -- UPSERT: Update if exists, insert if not
    IF v_existing_settlement_id IS NOT NULL THEN
        -- Update existing settlement
        -- Only update amounts if currently pending (don't overwrite paid)
        IF v_existing_status IN ('pending', 'partial', 'overdue') THEN
            UPDATE labour_settlements
            SET week_end_date    = v_week_end,
                gross_wages      = v_gross_wages,
                total_advances   = v_total_advances,
                carried_over_due = v_carried_over_due,
                net_payable      = v_net_payable,
                payment_status   = 'pending',  -- Reset to pending on recalculate
                last_edited_by   = p_last_edited_by,
                last_edited_at   = now()
            WHERE id = v_existing_settlement_id
            RETURNING * INTO v_settlement;
        ELSE
            -- Settlement already paid — don't modify amounts, just update metadata
            UPDATE labour_settlements
            SET last_edited_by = p_last_edited_by,
                last_edited_at = now()
            WHERE id = v_existing_settlement_id
            RETURNING * INTO v_settlement;

            -- Don't consume advances again if already paid
            v_total_advances := 0;
        END IF;
        v_settlement_id := v_existing_settlement_id;
    ELSE
        -- Insert new settlement
        INSERT INTO labour_settlements (
            labour_id,
            week_start_date,
            week_end_date,
            gross_wages,
            total_advances,
            carried_over_due,
            net_payable,
            payment_status,
            last_edited_by,
            last_edited_at
        ) VALUES (
            p_labour_id,
            p_week_start,
            v_week_end,
            v_gross_wages,
            v_total_advances,
            v_carried_over_due,
            v_net_payable,
            'pending',
            p_last_edited_by,
            now()
        )
        RETURNING * INTO v_settlement;
        v_settlement_id := v_settlement.id;
    END IF;

    -- Mark consumed advances by setting settlement_id
    -- Only mark advances that were actually consumed in this calculation
    -- AND only if the settlement isn't already fully paid
    IF v_existing_status IS NULL OR v_existing_status IN ('pending', 'partial', 'overdue') THEN
        UPDATE labour_advances
        SET settlement_id = v_settlement_id
        WHERE labour_id = p_labour_id
          AND settlement_id IS NULL;
    END IF;

    RETURN v_settlement;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION calculate_weekly_settlement(UUID, DATE, UUID) IS
'Calculates weekly settlement for a worker. SECURITY DEFINER to bypass RLS for atomic updates.
Validates Monday start, computes gross wages (base + overtime) + carried_over_due - advances = net_payable.

Half-day logic (per worker, per day):
  - If labour.half_day_rate IS NOT NULL: uses that fixed INR amount.
  - If labour.half_day_rate IS NULL: falls back to rate_applied × site_settings.half_day_multiplier
    (backward compatible with old behaviour for workers without a per-worker rate set).

Overtime logic (per worker, per day):
  - If labour.overtime_rate IS NOT NULL AND labour_attendance.overtime_hours IS NOT NULL AND > 0:
    adds overtime_hours × overtime_rate to that day''s gross.
  - Otherwise: no overtime added (worker not eligible or no hours recorded).

Returns the settlement row. Consumes unlinked advances.';
