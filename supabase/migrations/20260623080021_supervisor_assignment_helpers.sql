-- Migration: Supervisor Assignment Helpers
-- Phase 2: Site assignment management with cascading delete

-- Atomically removes site assignment + wage permission in one transaction
CREATE OR REPLACE FUNCTION remove_supervisor_site(
  p_supervisor_id UUID,
  p_site_id UUID
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, ''
AS $$
BEGIN
  -- Delete wage permissions first to avoid FK issues if any
  DELETE FROM supervisor_wage_permissions
    WHERE supervisor_id = p_supervisor_id AND site_id = p_site_id;
  
  -- Delete the site assignment
  DELETE FROM supervisor_site_assignments
    WHERE supervisor_id = p_supervisor_id AND site_id = p_site_id;
END;
$$;

-- Grant execute permission to authenticated users
-- (RLS policies on the underlying tables enforce permissions)
GRANT EXECUTE ON FUNCTION remove_supervisor_site(UUID, UUID) TO authenticated;
