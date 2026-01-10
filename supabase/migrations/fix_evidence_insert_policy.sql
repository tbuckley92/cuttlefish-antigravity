-- Fix RLS to allow ARCP Panel and Admin to insert 'arcp_outcome' evidence
-- Uses SECURITY DEFINER functions to safely check roles without RLS recursion

-- 1. Ensure helper functions exist and are SECURITY DEFINER
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_arcp_panel_member() TO authenticated;

-- 2. Create the insert policy using these functions
DROP POLICY IF EXISTS "evidence_insert_panel_outcome" ON public.evidence;

CREATE POLICY "evidence_insert_panel_outcome"
ON public.evidence
FOR INSERT
WITH CHECK (
  -- Only allow specific type
  type = 'arcp_outcome'
  AND (
    -- Check roles using secure functions
    public.is_arcp_panel_member()
    OR
    public.is_admin()
  )
);
