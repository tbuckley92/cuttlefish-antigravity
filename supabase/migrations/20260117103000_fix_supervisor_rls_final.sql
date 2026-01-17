-- Migration: Fix RLS with Simplified Logic
-- The previous policy might be failing because "supervisor_id" is null on the EXISTING row during the update check.
-- Postgres RLS "USING" checks the *existing* row properties before allowing the update.
-- "WITH CHECK" checks the *new* row properties.

-- We need a policy that says:
-- "Allow update IF you are the supervisor named in the generic fields OR you are the ES"

-- The function check_supervisor_rights handles looking up the USER (auth.uid) against the ROW's supervisor fields.

CREATE OR REPLACE FUNCTION check_supervisor_rights(
  p_user_id uuid,
  p_trainee_id uuid,
  p_content_supervisor_gmc text,
  p_content_supervisor_email text,
  p_content_supervisor_id uuid
)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_gmc text;
  v_user_email text;
  v_is_es boolean;
BEGIN
  -- 1. Get the acting user's details (Supervisor)
  SELECT gmc_number, email INTO v_user_gmc, v_user_email
  FROM public.user_profile
  WHERE user_id = p_user_id;

  -- 2. Check direct matches on the content (Evidence)
  -- Does the EXISTING row link to this user?
  IF (p_content_supervisor_id = p_user_id) THEN
    RETURN true;
  END IF;

  IF (v_user_gmc IS NOT NULL AND p_content_supervisor_gmc = v_user_gmc) THEN
    RETURN true;
  END IF;

  IF (v_user_email IS NOT NULL AND lower(p_content_supervisor_email) = lower(v_user_email)) THEN
    RETURN true;
  END IF;

  -- 3. Check Educational Supervisor relationship
  -- Is p_user_id the assigned ES for p_trainee_id?
  -- This allows update even if the evidence item itself doesn't link to the supervisor yet
  SELECT EXISTS (
    SELECT 1 FROM public.user_profile tp
    WHERE tp.user_id = p_trainee_id
    AND (
      (v_user_gmc IS NOT NULL AND tp.supervisor_gmc = v_user_gmc)
      OR
      (v_user_email IS NOT NULL AND lower(tp.supervisor_email) = lower(v_user_email))
    )
  ) INTO v_is_es;

  IF v_is_es THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Update the policy
DROP POLICY IF EXISTS "evidence_update_supervisor_assigned" ON public.evidence;

CREATE POLICY "evidence_update_supervisor_assigned"
ON public.evidence
FOR UPDATE
USING (
  -- 1. Trainee can update their own Draft evidence
  (trainee_id = auth.uid() AND status = 'Draft')
  OR
  -- 2. Supervisor can update if they have rights
  check_supervisor_rights(
    auth.uid(),
    trainee_id,
    supervisor_gmc,
    supervisor_email,
    supervisor_id
  )
);
