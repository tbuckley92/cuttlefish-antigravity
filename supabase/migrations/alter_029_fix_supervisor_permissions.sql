-- Migration 029: Fix Supervisor Permissions (Update/Insert)
-- Robustly allow supervisors to update evidence assigned to them
-- and insert new evidence if needed.

-- 1. DROP old restrictive/conflicting policies
DROP POLICY IF EXISTS "evidence_update_supervisor_assigned" ON public.evidence;
DROP POLICY IF EXISTS "evidence_update_supervisor_flexible" ON public.evidence; -- in case of retry
-- "evidence_update_own" usually allows trainee to update their own. We leave that alone or recreate if needed.
-- ensuring we don't break trainee access:
DROP POLICY IF EXISTS "evidence_update_own" ON public.evidence;

CREATE POLICY "evidence_update_own"
ON public.evidence
FOR UPDATE
USING (
  auth.uid() = trainee_id
);

-- 2. CREATE Flexible Update Policy for Supervisors
-- Allows update if they are named by Email (in Auth) or GMC (in Profile)
CREATE POLICY "evidence_update_supervisor_flexible"
ON public.evidence
FOR UPDATE
USING (
  -- 1. Match by Email (JWT is reliable for logged in user)
  (supervisor_email IS NOT NULL AND lower(supervisor_email) = lower(auth.jwt() ->> 'email'))
  OR
  -- 2. Match by GMC (Profile)
  (supervisor_gmc IS NOT NULL AND supervisor_gmc = (
    SELECT gmc_number FROM public.user_profile WHERE user_id = auth.uid()
  ))
)
WITH CHECK (
  -- Ensure they can't reassign it to someone else (unless they stay supervisor)
  -- Or just check the same conditions on the NEW row
  (supervisor_email IS NOT NULL AND lower(supervisor_email) = lower(auth.jwt() ->> 'email'))
  OR
  (supervisor_gmc IS NOT NULL AND supervisor_gmc = (
    SELECT gmc_number FROM public.user_profile WHERE user_id = auth.uid()
  ))
);

-- 3. CREATE Insert Policy for Supervisors (creating on behalf of trainee)
-- They can insert if they assign themselves as supervisor
CREATE POLICY "evidence_insert_supervisor"
ON public.evidence
FOR INSERT
WITH CHECK (
  -- Must be signed in
  auth.role() = 'authenticated'
  AND (
    -- If inserting for another trainee, MUST list self as supervisor
    (trainee_id != auth.uid() AND (
      lower(supervisor_email) = lower(auth.jwt() ->> 'email')
      OR
      supervisor_gmc = (SELECT gmc_number FROM public.user_profile WHERE user_id = auth.uid())
    ))
    OR
    -- Or inserting their own evidence (Trainee mode)
    (trainee_id = auth.uid())
  )
);

-- 4. Ensure Permissions
GRANT ALL ON public.evidence TO authenticated;
