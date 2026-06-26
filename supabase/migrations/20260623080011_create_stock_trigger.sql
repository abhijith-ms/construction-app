-- Migration 011: Stock level trigger
-- Automatically maintains stock_levels from stock_transactions.
--
-- Fires AFTER INSERT and AFTER DELETE on stock_transactions:
--   receipt / transfer_in  → increment quantity_on_hand at site_id
--   usage / transfer_out   → decrement quantity_on_hand at site_id
--
-- Auto-creates stock_levels rows via UPSERT on first transaction for a
-- new site+material pair.
--
-- DELETE reverses the original insert's effect. If this would push
-- quantity_on_hand below 0, the existing CHECK (quantity_on_hand >= 0)
-- constraint on stock_levels will reject the delete — the caller must
-- add a corrective transaction first.
--
-- UPDATE is intentionally NOT handled. To correct a transaction, delete
-- the wrong row and insert a new one.
--
-- TRANSFER ATOMICITY NOTE:
-- A transfer between two sites requires TWO rows: one transfer_out at the
-- source site and one transfer_in at the destination site. This trigger
-- handles each row independently — it does NOT enforce that both rows
-- exist. The application layer MUST insert both rows together (ideally in
-- a single database transaction) to keep stock consistent. This is a
-- known gap to be addressed when we build the transfer UI, likely via a
-- Postgres function that atomically inserts both rows.

---------------------------------------------------------------------------
-- Trigger function
---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_stock_levels_on_transaction()
RETURNS TRIGGER AS $$
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
    INSERT INTO stock_levels (site_id, material_id, quantity_on_hand, updated_at)
    VALUES (NEW.site_id, NEW.material_id, GREATEST(v_delta, 0), now())
    ON CONFLICT (site_id, material_id) DO UPDATE
      SET quantity_on_hand = stock_levels.quantity_on_hand + v_delta,
          updated_at       = now();

    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    -- Reverse the original insert's effect
    IF OLD.transaction_type IN ('receipt', 'transfer_in') THEN
      v_delta := -OLD.quantity;  -- undo an addition
    ELSE
      v_delta := OLD.quantity;   -- undo a subtraction
    END IF;

    UPDATE stock_levels
    SET quantity_on_hand = quantity_on_hand + v_delta,
        updated_at       = now()
    WHERE site_id     = OLD.site_id
      AND material_id = OLD.material_id;

    -- If the row doesn't exist, that's a data integrity issue — but the
    -- DELETE still succeeds (nothing to reverse). This shouldn't happen
    -- in normal operation since the INSERT trigger created the row.

    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_stock_levels_on_transaction()
  IS 'Maintains stock_levels from stock_transactions. Handles INSERT (upsert) and DELETE (reversal). UPDATE not supported — delete and re-insert instead.';

---------------------------------------------------------------------------
-- Trigger: fires after INSERT or DELETE on stock_transactions
---------------------------------------------------------------------------
CREATE TRIGGER trg_stock_transactions_update_levels
  AFTER INSERT OR DELETE ON stock_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_levels_on_transaction();
