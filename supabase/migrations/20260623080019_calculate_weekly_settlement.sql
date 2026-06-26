-- Migration 019: Calculate weekly settlement function
--
-- FUNCTION: calculate_weekly_settlement(p_labour_id UUID, p_week_start DATE, p_last_edited_by UUID)
-- Validates p_week_start is Monday, calculates gross wages with multipliers,
-- sums unlinked advances, fetches carried-over due, computes net payable,
-- upserts settlement row, and marks advances as consumed.
-- Output must match the Section 6 worked example:
-- Raju, week of June 15-21: Gross ₹5,700 - Advance ₹2,000 = Net ₹3,700

-------------------------------------------------------------------------
-- ATTENDANCE MULTIPLIER FUNCTION
-------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_attendance_multiplier(p_status TEXT, p_site_id UUID, p_labour_id UUID, p_date DATE)
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
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_attendance_multiplier(TEXT, UUID, UUID, DATE) IS 
'Returns wage multiplier: present=1.0, half_day=site-specific (default 0.5), absent=0, leave=0';

-------------------------------------------------------------------------
-- MAIN SETTLEMENT CALCULATION FUNCTION
-------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION calculate_weekly_settlement(
    p_labour_id UUID,
    p_week_start DATE,
    p_last_edited_by UUID
)
RETURNS labour_settlements AS $$
DECLARE
    v_settlement RECORD;
    v_labour RECORD;
    v_gross_wages NUMERIC := 0;
    v_total_advances NUMERIC := 0;
    v_carried_over_due NUMERIC := 0;
    v_net_payable NUMERIC := 0;
    v_settlement_id UUID;
    v_week_end DATE;
    v_existing_status TEXT;
    v_existing_settlement_id UUID;
BEGIN
    -- Validation: week_start must be a Monday (ISODOW = 1)
    IF EXTRACT(ISODOW FROM p_week_start) != 1 THEN
        RAISE EXCEPTION 'week_start must be a Monday (ISODOW = 1). Provided: % (ISODOW = %)',
            p_week_start, EXTRACT(ISODOW FROM p_week_start);
    END IF;
    
    -- Week end is Saturday (5 days after Monday)
    v_week_end := p_week_start + INTERVAL '5 days';
    
    -- Verify worker exists
    SELECT * INTO v_labour FROM labour WHERE id = p_labour_id;
    IF v_labour IS NULL THEN
        RAISE EXCEPTION 'Worker not found: %', p_labour_id;
    END IF;
    
    -- Calculate gross wages from attendance (Monday-Saturday)
    -- Formula: SUM(rate_applied × attendance_multiplier)
    SELECT COALESCE(SUM(
        la.rate_applied * get_attendance_multiplier(la.status, la.site_id, la.labour_id, la.date)
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
    -- Where unpaid balance > 0
    SELECT COALESCE(SUM(net_payable - amount_paid), 0) INTO v_carried_over_due
    FROM labour_settlements
    WHERE labour_id = p_labour_id
      AND week_start_date < p_week_start
      AND payment_status IN ('pending', 'partial', 'overdue')
      AND (net_payable - amount_paid) > 0;
    
    -- Compute net payable
    -- Can be negative if advances exceed earnings (workers owe money)
    v_net_payable := v_gross_wages + v_carried_over_due - v_total_advances;
    
    -- Check if settlement already exists for this week
    SELECT id, payment_status INTO v_existing_settlement_id, v_existing_status
    FROM labour_settlements
    WHERE labour_id = p_labour_id
      AND week_start_date = p_week_start;
    
    -- UPSERT: Update if exists, insert if not
    IF v_existing_settlement_id IS NOT NULL THEN
        -- Update existing settlement
        -- Only update if currently pending (don't overwrite paid)
        IF v_existing_status IN ('pending', 'partial', 'overdue') THEN
            UPDATE labour_settlements
            SET week_end_date = v_week_end,
                gross_wages = v_gross_wages,
                total_advances = v_total_advances,
                carried_over_due = v_carried_over_due,
                net_payable = v_net_payable,
                payment_status = 'pending', -- Reset to pending on recalculate
                last_edited_by = p_last_edited_by,
                last_edited_at = now()
            WHERE id = v_existing_settlement_id
            RETURNING * INTO v_settlement;
        ELSE
            -- Settlement already paid - don't modify amounts, just update metadata
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
Validates Monday start, computes gross×multiplier + carried_over_due - advances = net_payable.
Returns the settlement row. Consumes unlinked advances.';

-------------------------------------------------------------------------
-- MARK SETTLEMENT AS PAID FUNCTION
-------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION mark_settlement_paid(
    p_settlement_id UUID,
    p_amount_paid NUMERIC,
    p_marked_by UUID
)
RETURNS labour_settlements AS $$
DECLARE
    v_settlement RECORD;
    v_amount_paid NUMERIC;
BEGIN
    -- Get current settlement
    SELECT * INTO v_settlement
    FROM labour_settlements
    WHERE id = p_settlement_id;
    
    IF v_settlement IS NULL THEN
        RAISE EXCEPTION 'Settlement not found: %', p_settlement_id;
    END IF;
    
    -- If no amount specified, pay full net_payable
    IF p_amount_paid IS NULL OR p_amount_paid = 0 THEN
        v_amount_paid := v_settlement.net_payable;
    ELSE
        v_amount_paid := p_amount_paid;
    END IF;
    
    -- Update settlement
    UPDATE labour_settlements
    SET amount_paid = v_amount_paid,
        payment_status = CASE 
            WHEN v_amount_paid >= net_payable THEN 'paid'
            WHEN v_amount_paid > 0 THEN 'partial'
            ELSE 'pending'
        END,
        paid_at = CASE WHEN v_amount_paid >= net_payable THEN now() ELSE paid_at END,
        last_edited_by = p_marked_by,
        last_edited_at = now()
    WHERE id = p_settlement_id
    RETURNING * INTO v_settlement;
    
    RETURN v_settlement;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION mark_settlement_paid(UUID, NUMERIC, UUID) IS 
'Marks a settlement as paid. SECURITY DEFINER. Amount defaults to net_payable if not specified.
Sets status paid/partial based on amounts. Records paid_at and last_edited_by.';