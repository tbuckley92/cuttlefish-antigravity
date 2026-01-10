-- Fix RLS policy for ARCP evidence insertion
-- The previous policy restricted type to 'arcp_outcome', but the app uses 'ARCP Full Review' or 'ARCP Interim Review'

-- 1. Drop the incorrect policy
DROP POLICY IF EXISTS "evidence_insert_panel_outcome" ON public.evidence;

-- 2. Create the corrected policy
CREATE POLICY "evidence_insert_panel_outcome"
ON public.evidence
FOR INSERT
WITH CHECK (
  -- Allow both ARCP review types as used in ARCPPanelDashboard.tsx
  type IN ('ARCP Full Review', 'ARCP Interim Review')
  AND (
    -- Check roles using secure functions (assuming these exist from previous migration)
    -- If they don't exist, this will error, but they should be there from the initial setup.
    public.is_arcp_panel_member()
    OR
    public.is_admin()
  )
);
