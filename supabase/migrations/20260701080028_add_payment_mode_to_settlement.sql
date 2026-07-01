-- Migration: Add payment mode columns to labour_settlements
-- Step 5: Payroll payment mode

-- Add payment_mode and payment_reference columns
ALTER TABLE labour_settlements 
  ADD COLUMN IF NOT EXISTS payment_mode TEXT DEFAULT 'cash',
  ADD COLUMN IF NOT EXISTS payment_reference TEXT DEFAULT NULL;

-- Update the mark_settlement_paid function to include payment details
CREATE OR REPLACE FUNCTION mark_settlement_paid(
  p_settlement_id UUID,
  p_amount_paid NUMERIC,
  p_marked_by UUID,
  p_payment_mode TEXT DEFAULT 'cash',
  p_payment_reference TEXT DEFAULT NULL
)
RETURNS labour_settlements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, ''
AS $$
DECLARE
  v_settlement labour_settlements;
BEGIN
  UPDATE labour_settlements
  SET
    amount_paid = p_amount_paid,
    payment_status = CASE
      WHEN p_amount_paid >= net_payable THEN 'paid'
      WHEN p_amount_paid > 0 THEN 'partial'
      ELSE payment_status
    END,
    paid_at = CASE WHEN p_amount_paid >= net_payable THEN now() ELSE paid_at END,
    last_edited_by = p_marked_by,
    last_edited_at = now(),
    payment_mode = p_payment_mode,
    payment_reference = p_payment_reference
  WHERE id = p_settlement_id
  RETURNING * INTO v_settlement;
  RETURN v_settlement;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION mark_settlement_paid(
  UUID, NUMERIC, UUID, TEXT, TEXT
) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_settlement_paid(
  UUID, NUMERIC, UUID, TEXT, TEXT
) TO service_role;
