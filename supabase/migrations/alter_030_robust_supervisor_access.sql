-- Migration: Robust Supervisor Evidence Access
-- Fixes case-sensitivity in email filtering and adds ID-based access

-- 1. Update SELECT policy
DROP POLICY IF EXISTS "evidence_select_supervisor_assigned" ON public.evidence;

CREATE POLICY "evidence_select_supervisor_assigned"
ON public.evidence
FOR SELECT
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
    -- Match by Signed Off ID (Robust for future history)
    auth.uid() = signed_off_by
  )
);

-- 2. Update UPDATE policy to also be case-insensitive
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
);

COMMENT ON POLICY "evidence_select_supervisor_assigned" ON public.evidence IS 'Allows supervisors to see evidence assigned by GMC, case-insensitive email, or their User ID if signed off.';
