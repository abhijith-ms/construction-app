CREATE OR REPLACE FUNCTION public.guard_rate_applied_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', ''
AS $$
DECLARE
  v_role text;
  v_default_rate NUMERIC;
BEGIN
  v_role := public.get_my_role();

  IF v_role IN ('admin', 'office_manager') THEN
    RETURN NEW;
  END IF;

  IF v_role = 'supervisor' AND NEW.rate_applied IS NOT NULL THEN
    IF NOT public.has_wage_visibility(NEW.site_id) THEN
      SELECT default_daily_rate INTO v_default_rate
      FROM labour WHERE id = NEW.labour_id;
      
      IF NEW.rate_applied != v_default_rate THEN
        RAISE EXCEPTION 'Permission denied: supervisor does not have wage visibility for site % — cannot set rate_applied',
          NEW.site_id
          USING ERRCODE = 'insufficient_privilege';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
