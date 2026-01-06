-- Fix: Infinite recursion in RLS policies
-- The problem is that policies are querying user_profile to check roles,
-- but this triggers the same policies, creating infinite recursion.
-- Solution: Use SECURITY DEFINER functions to bypass RLS when checking roles.

-- First, drop the problematic policies
DROP POLICY IF EXISTS "admin_read_all_profiles" ON public.user_profile;
DROP POLICY IF EXISTS "arcp_read_deanery_profiles" ON public.user_profile;

-- Create a SECURITY DEFINER function to check if user is admin (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profile
    WHERE user_id = auth.uid()
    AND 'Admin' = ANY(roles)
  );
$$;

-- Create a SECURITY DEFINER function to check if user is ARCP panel member
CREATE OR REPLACE FUNCTION public.is_arcp_panel_member()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profile
    WHERE user_id = auth.uid()
    AND ('ARCPPanelMember' = ANY(roles) OR 'ARCPSuperuser' = ANY(roles))
  );
$$;

-- Create a SECURITY DEFINER function to get current user's deanery
CREATE OR REPLACE FUNCTION public.get_current_user_deanery()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT deanery FROM public.user_profile WHERE user_id = auth.uid();
$$;

-- Recreate Admin policy using the function (no recursion)
CREATE POLICY "admin_read_all_profiles"
ON public.user_profile
FOR SELECT
USING (public.is_admin());

-- Recreate ARCP panel policy using functions (no recursion)
CREATE POLICY "arcp_read_deanery_profiles"
ON public.user_profile
FOR SELECT
USING (
  public.is_arcp_panel_member()
  AND deanery = public.get_current_user_deanery()
);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_arcp_panel_member() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_user_deanery() TO authenticated;
