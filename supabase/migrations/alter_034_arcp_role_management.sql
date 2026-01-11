-- Migration: Add RPC to manage ARCP Panel Roles
-- Run this in Supabase SQL Editor

-- Function to toggle ARCP Panel Member role for a user
-- Only allows ARCP Superusers to modify users within THEIR OWN deanery
CREATE OR REPLACE FUNCTION toggle_arcp_panel_role(target_user_id UUID, enable BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_role text[];
  current_user_deanery text;
  target_user_deanery text;
BEGIN
  -- Get current user details
  SELECT roles, deanery INTO current_user_role, current_user_deanery
  FROM public.user_profile
  WHERE user_id = auth.uid();

  -- Check permission
  IF NOT ('ARCPSuperuser' = ANY(current_user_role)) THEN
    RAISE EXCEPTION 'Access Denied: Only ARCP Superusers can manage roles.';
  END IF;

  -- Get target user details
  SELECT deanery INTO target_user_deanery
  FROM public.user_profile
  WHERE user_id = target_user_id;

  -- Check authorized scope: target must be in same deanery
  -- We allow matching if target_user_deanery is same string
  IF current_user_deanery IS DISTINCT FROM target_user_deanery THEN
    RAISE EXCEPTION 'Access Denied: You can only manage users in your own deanery.';
  END IF;

  -- Update role
  IF enable THEN
     -- Add role if not present
     UPDATE public.user_profile
     SET roles = array_append(roles, 'ARCPPanelMember')
     WHERE user_id = target_user_id
     AND NOT ('ARCPPanelMember' = ANY(roles));
  ELSE
     -- Remove role
     UPDATE public.user_profile
     SET roles = array_remove(roles, 'ARCPPanelMember')
     WHERE user_id = target_user_id;
  END IF;
END;
$$;

-- Grant execute permission to authenticated users (access control is inside the function)
GRANT EXECUTE ON FUNCTION toggle_arcp_panel_role(UUID, BOOLEAN) TO authenticated;

COMMENT ON FUNCTION toggle_arcp_panel_role IS 'Allows ARCP Superusers to grant/revoke ARCP Panel Member role for users in their deanery';
