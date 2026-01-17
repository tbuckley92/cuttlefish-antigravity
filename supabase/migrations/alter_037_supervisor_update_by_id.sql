-- Migration: Allow supervisors to update evidence by supervisor_id
-- This complements the existing policies that use GMC and email matching

-- Drop and recreate the UPDATE policy to include supervisor_id
DROP POLICY IF EXISTS "evidence_update_supervisor_assigned" ON public.evidence;

CREATE POLICY "evidence_update_supervisor_assigned"
ON public.evidence
FOR UPDATE
USING (
  (
    -- Match by GMC Number
    (SELECT gmc_number FROM public.user_profile WHERE user_id = auth.uid()) = supervisor_gmc
  )
  OR
  (
    -- Match by Email (CASE INSENSITIVE)
    lower((SELECT email FROM public.user_profile WHERE user_id = auth.uid())) = lower(supervisor_email)
  )
  OR
  (
    -- Match by Supervisor ID (Robust - new field)
    auth.uid() = supervisor_id
  )
);

COMMENT ON POLICY "evidence_update_supervisor_assigned" ON public.evidence IS 'Allows supervisors to update evidence assigned by GMC, case-insensitive email, or supervisor_id.';
