-- Migration 018: Make stock trigger function SECURITY DEFINER
--
-- REASON: The update_stock_levels_on_transaction() trigger function writes to
-- stock_levels. When it fires in response to an authenticated user inserting or
-- deleting a stock_transaction, it runs under the calling user's role by default.
-- The authenticated role has no INSERT/UPDATE/DELETE policy on stock_levels
-- (those are managed exclusively by this trigger), so the trigger fails with
-- "permission denied for table stock_levels."
--
-- FIX: Recreate the function as SECURITY DEFINER. This makes it run as the
-- function owner (postgres/superuser) regardless of the calling user's role,
-- allowing it to write stock_levels. The trigger function does not expose any
-- data to the caller — it only maintains the derived stock_levels balance.
--
-- SECURITY NOTE: SECURITY DEFINER is appropriate here because:
--   1. The function only reads/writes stock_levels (a derived table).
--   2. The RLS policies on stock_transactions still control WHO can insert/delete
--      transactions (Admin + Office Manager only). The function just reacts to
--      those inserts/deletes — it does not bypass those controls.
--   3. The function is not callable directly by authenticated users (it's a
--      trigger function, only invoked by the trigger).

CREATE OR REPLACE FUNCTION public.update_stock_levels_on_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, ''
AS $$
DECLARE
  v_delta NUMERIC(12,3);
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Determine delta: positive for receipt/transfer_in, negative for usage/transfer_out
    IF NEW.transaction_type IN ('receipt', 'transfer_in') THEN
      v_delta := NEW.quantity;
    ELSE
      v_delta := -NEW.quantity;
    END IF;

    -- Upsert: create stock_levels row if it doesn't exist, otherwise update
    INSERT INTO public.stock_levels (site_id, material_id, quantity_on_hand, updated_at)
    VALUES (NEW.site_id, NEW.material_id, GREATEST(v_delta, 0), now())
    ON CONFLICT (site_id, material_id) DO UPDATE
      SET quantity_on_hand = public.stock_levels.quantity_on_hand + v_delta,
          updated_at       = now();

    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    -- Reverse the original insert's effect
    IF OLD.transaction_type IN ('receipt', 'transfer_in') THEN
      v_delta := -OLD.quantity;  -- undo an addition
    ELSE
      v_delta := OLD.quantity;   -- undo a subtraction
    END IF;

    UPDATE public.stock_levels
    SET quantity_on_hand = quantity_on_hand + v_delta,
        updated_at       = now()
    WHERE site_id     = OLD.site_id
      AND material_id = OLD.material_id;

    RETURN OLD;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.update_stock_levels_on_transaction()
  IS 'SECURITY DEFINER trigger: maintains stock_levels from stock_transactions. Runs as owner to bypass RLS on stock_levels (which has no direct-write policies for authenticated users by design). Handles INSERT (upsert) and DELETE (reversal). UPDATE not supported.';
