-- Migration: Fix RLS by adding SECURITY DEFINER function for supervisor checks
-- This bypasses user_profile read restrictions safely

-- 1. Create a secure function to check educational supervisor relationship
CREATE OR REPLACE FUNCTION check_educational_supervisor(trainee_uid uuid, supervisor_uid uuid)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the supervisor (supervisor_uid) is listed in the trainee's (trainee_uid) profile
  RETURN EXISTS (
    SELECT 1 FROM public.user_profile tp
    JOIN public.user_profile sp ON sp.user_id = supervisor_uid
    WHERE tp.user_id = trainee_uid
    AND (
      -- Match by email (case insensitive)
      lower(tp.supervisor_email) = lower(sp.email)
      OR 
      -- Match by GMC number
      tp.supervisor_gmc = sp.gmc_number
    )
  );
END;
$$ LANGUAGE plpgsql;

-- 2. Update the evidence update policy to use this function
DROP POLICY IF EXISTS "evidence_update_supervisor_assigned" ON public.evidence;

CREATE POLICY "evidence_update_supervisor_assigned"
ON public.evidence
FOR UPDATE
USING (
  -- Trainee can update their own evidence (in Draft status)
  (trainee_id = auth.uid() AND status = 'Draft')
  OR
  -- Supervisor can update via GMC match
  (
    (SELECT gmc_number FROM public.user_profile WHERE user_id = auth.uid()) = supervisor_gmc
  )
  OR
  -- Supervisor can update via email match (case insensitive)
  (
    lower((SELECT email FROM public.user_profile WHERE user_id = auth.uid())) = lower(supervisor_email)
  )
  OR
  -- Supervisor can update via supervisor_id match
  (
    auth.uid() = supervisor_id
  )
  OR
  -- Educational supervisor relationship (using secure function)
  check_educational_supervisor(trainee_id, auth.uid())
);

COMMENT ON POLICY "evidence_update_supervisor_assigned" ON public.evidence IS 
'Allows trainees to update draft evidence and supervisors to update via GMC, email, supervisor_id, or educational supervisor relationship (verified securely).';
