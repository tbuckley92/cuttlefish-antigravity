-- Policy to allow supervisors to view evidence where they are the designated supervisor
-- This logic matches the current user's GMC number (from user_profile) to evidence.supervisor_gmc

CREATE POLICY "evidence_select_supervisor_assigned"
ON public.evidence
FOR SELECT
USING (
  (
    SELECT gmc_number 
    FROM public.user_profile 
    WHERE user_id = auth.uid()
  ) = supervisor_gmc
);
