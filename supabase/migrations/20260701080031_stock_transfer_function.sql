-- Migration 031: Atomic stock transfer function
--
-- Closes KNOWN_GAPS.md item: "OPEN — Stock transfer atomicity"
--
-- WHAT THIS DOES:
--   Creates transfer_stock_between_sites(), a SECURITY DEFINER Postgres function
--   that inserts both transfer_out and transfer_in rows in a single transaction.
--   The existing trigger (update_stock_levels_on_transaction) fires for each insert
--   and updates stock_levels atomically. Both inserts happen or neither does.
--
-- WHY SECURITY DEFINER:
--   The function runs permission checks via get_my_role() before doing anything.
--   SECURITY DEFINER is required so the function can insert into stock_transactions
--   on behalf of the calling user — the authenticated role has INSERT granted on
--   stock_transactions (migration 015), so this is safe.
--
-- auth.uid() IN SECURITY DEFINER — is this safe?
--   YES. auth.uid() reads from the JWT claims embedded in the current session
--   setting (request.jwt.claims), which is injected per-request by PostgREST.
--   Session settings travel with the transaction and are NOT affected by
--   SECURITY DEFINER (which only changes the privilege level, not the session).
--   This is the same pattern used by get_my_role(), is_supervisor_for_site(),
--   and has_wage_visibility() in migration 015 — all proven to work correctly.
--
-- NULL-role edge case (important):
--   If called without a valid JWT (e.g. via service role in psql), auth.uid()
--   returns NULL and get_my_role() returns NULL.
--   The check: get_my_role() NOT IN ('admin', 'office_manager')
--   evaluates as: NULL NOT IN ('admin', 'office_manager') → NULL (not TRUE)
--   which would SILENTLY PASS the permission gate — a security hole.
--   FIX: Use explicit IS NULL check first, then NOT IN, to catch the NULL case.

CREATE OR REPLACE FUNCTION public.transfer_stock_between_sites(
  p_from_site_id    UUID,
  p_to_site_id      UUID,
  p_material_id     UUID,
  p_quantity        NUMERIC,
  p_reference_note  TEXT DEFAULT NULL,
  p_edited_by       UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, ''
AS $$
DECLARE
  v_current_stock NUMERIC;
  v_role          TEXT;
  v_editor_id     UUID;
BEGIN
  -- Resolve role and check permission.
  -- CRITICAL: check IS NULL explicitly — NULL NOT IN (...) evaluates to NULL,
  -- not TRUE, so the NOT IN check alone would silently pass for unauthenticated
  -- callers (e.g. direct psql as postgres). The IS NULL branch raises an error.
  v_role := public.get_my_role();

  IF v_role IS NULL OR v_role NOT IN ('admin', 'office_manager') THEN
    RAISE EXCEPTION 'Permission denied: only admin or office manager can transfer stock'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Validate inputs
  IF p_from_site_id = p_to_site_id THEN
    RAISE EXCEPTION 'Cannot transfer stock to the same site';
  END IF;

  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Transfer quantity must be greater than zero';
  END IF;

  -- Check sufficient stock at source site
  SELECT quantity_on_hand INTO v_current_stock
  FROM public.stock_levels
  WHERE site_id = p_from_site_id AND material_id = p_material_id;

  IF v_current_stock IS NULL OR v_current_stock < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock at source site. Available: %, Requested: %',
      COALESCE(v_current_stock, 0), p_quantity;
  END IF;

  -- Resolve editor: use explicit p_edited_by if provided, otherwise calling user.
  -- auth.uid() is safe here — it reads request.jwt.claims (a session setting),
  -- which is NOT affected by SECURITY DEFINER.
  v_editor_id := COALESCE(p_edited_by, auth.uid());

  -- Atomically insert both rows. The trigger fires for each INSERT and updates
  -- stock_levels. Because both inserts are in the same transaction, if the
  -- transfer_in insert fails (e.g. a constraint violation), the transfer_out
  -- insert is also rolled back — stock cannot be left in a half-transferred state.
  INSERT INTO public.stock_transactions
    (site_id, material_id, transaction_type, quantity, transfer_site_id, reference_note, last_edited_by)
  VALUES
    (p_from_site_id, p_material_id, 'transfer_out', p_quantity, p_to_site_id,   p_reference_note, v_editor_id),
    (p_to_site_id,   p_material_id, 'transfer_in',  p_quantity, p_from_site_id, p_reference_note, v_editor_id);

END;
$$;

COMMENT ON FUNCTION public.transfer_stock_between_sites(UUID, UUID, UUID, NUMERIC, TEXT, UUID)
  IS 'Atomically transfers stock between two sites by inserting transfer_out and transfer_in rows in a single transaction. Permission check gates to admin/office_manager. Closes KNOWN_GAPS.md stock transfer atomicity item. Fixed: NULL-role check uses IS NULL OR NOT IN to avoid the NULL NOT IN (...) → NULL silent-pass bug.';

-- Grant EXECUTE to authenticated so the client can call this via RPC.
-- The function enforces its own role check internally — the grant does not
-- bypass that check. Without this grant, RPC calls return "permission denied
-- for function transfer_stock_between_sites" before even reaching the body.
GRANT EXECUTE ON FUNCTION public.transfer_stock_between_sites(UUID, UUID, UUID, NUMERIC, TEXT, UUID)
  TO authenticated;
