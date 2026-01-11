-- Migration: Allow ARCP Panel Members and Admins to Update ARCP Outcomes in Evidence Table
-- This allows moving them from 'Draft' to 'COMPLETE' during confirmation.

DROP POLICY IF EXISTS "evidence_update_panel_arcp_specific" ON public.evidence;

CREATE POLICY "evidence_update_panel_arcp_specific"
ON public.evidence
FOR UPDATE
USING (
  -- Check for specific ARCP outcome types
  type IN ('ARCP Full Review', 'ARCP Interim Review')
  AND (
    -- Allow Admins
    public.is_admin()
    OR
    -- Allow Panel Members (scoped by deanery)
    EXISTS (
      SELECT 1
      FROM public.arcp_panel_member ap
      WHERE ap.active
        AND ap.user_id = auth.uid()
        AND public.evidence.trainee_deanery = ANY(ap.deaneries)
    )
  )
)
WITH CHECK (
  -- Ensure type cannot be changed by this policy
  type IN ('ARCP Full Review', 'ARCP Interim Review')
);

COMMENT ON POLICY "evidence_update_panel_arcp_specific" ON public.evidence IS 'Allows ARCP panel members and admins to update (sign off) ARCP outcome evidence items in their deanery.';
