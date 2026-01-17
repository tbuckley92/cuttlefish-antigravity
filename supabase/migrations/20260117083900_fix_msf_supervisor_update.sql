-- Migration: Fix supervisor update policy for MSF and other forms
-- Consolidates supervisor access by GMC, email, or supervisor_id

-- First ensure supervisor_id column exists
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES auth.users(id);
CREATE INDEX IF NOT EXISTS idx_evidence_supervisor_id ON evidence(supervisor_id);

-- Drop existing update policies to avoid conflicts
DROP POLICY IF EXISTS "evidence_update_supervisor_assigned" ON public.evidence;
DROP POLICY IF EXISTS "Supervisors can update evidence assigned to them" ON public.evidence;
DROP POLICY IF EXISTS "supervisor_can_update" ON public.evidence;

-- Create comprehensive supervisor update policy
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
  -- Educational supervisor relationship (for MSF, ESR, GSAT)
  EXISTS (
    SELECT 1 FROM public.user_profile tp
    WHERE tp.user_id = evidence.trainee_id
    AND (
      lower(tp.supervisor_email) = lower((SELECT email FROM public.user_profile WHERE user_id = auth.uid()))
      OR tp.supervisor_gmc = (SELECT gmc_number FROM public.user_profile WHERE user_id = auth.uid())
    )
  )
);

-- Grant update permission to authenticated users (RLS handles access control)
GRANT UPDATE ON public.evidence TO authenticated;

COMMENT ON POLICY "evidence_update_supervisor_assigned" ON public.evidence IS 
'Allows trainees to update draft evidence and supervisors to update via GMC, email, supervisor_id, or educational supervisor relationship.';
