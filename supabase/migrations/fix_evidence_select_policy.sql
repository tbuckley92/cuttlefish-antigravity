-- Allow ARCP Panel Members and Admins to view ARCP outcomes (Full Review / Interim)
-- even if they are in 'Draft' status (which is how they are created).
-- The existing policy only allows viewing 'Submitted' or 'COMPLETE' evidence.

DROP POLICY IF EXISTS "evidence_select_panel_arcp_specific" ON public.evidence;

CREATE POLICY "evidence_select_panel_arcp_specific"
ON public.evidence
FOR SELECT
USING (
  -- Check for specific ARCP outcome types
  type IN ('ARCP Full Review', 'ARCP Interim Review')
  AND (
    -- Allow Admins
    EXISTS (
        SELECT 1 FROM public.user_profile
        WHERE user_id = auth.uid()
        AND 'Admin' = ANY(roles)
    )
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
);
