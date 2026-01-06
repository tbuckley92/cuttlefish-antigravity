-- Migration: add roles column to user_profile for ARCP role-based access control
-- Run on Supabase: SQL Editor -> paste and execute

-- Add roles array column
ALTER TABLE public.user_profile
ADD COLUMN IF NOT EXISTS roles text[] NOT NULL DEFAULT '{}';

-- Comment for documentation
COMMENT ON COLUMN public.user_profile.roles IS 'User roles for ARCP access control: Admin, ARCPPanelMember, ARCPSuperuser, Supervisor, Trainee, EducationalSupervisor';

-- Make specific user an Admin
UPDATE public.user_profile
SET roles = ARRAY['Admin']
WHERE user_id = '59fa8b20-6f49-42dd-963a-91982f77cb7a';

-- RLS Policy: Admin can read all profiles
DROP POLICY IF EXISTS "admin_read_all_profiles" ON public.user_profile;
CREATE POLICY "admin_read_all_profiles"
ON public.user_profile
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_profile up
    WHERE up.user_id = auth.uid()
    AND 'Admin' = ANY(up.roles)
  )
);

-- RLS Policy: Admin can update all profiles
DROP POLICY IF EXISTS "admin_update_all_profiles" ON public.user_profile;
CREATE POLICY "admin_update_all_profiles"
ON public.user_profile
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_profile up
    WHERE up.user_id = auth.uid()
    AND 'Admin' = ANY(up.roles)
  )
);

-- RLS Policy: ARCP Panel/Superuser can read profiles in their deanery
DROP POLICY IF EXISTS "arcp_read_deanery_profiles" ON public.user_profile;
CREATE POLICY "arcp_read_deanery_profiles"
ON public.user_profile
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_profile up
    WHERE up.user_id = auth.uid()
    AND (
      'ARCPPanelMember' = ANY(up.roles)
      OR 'ARCPSuperuser' = ANY(up.roles)
    )
    AND up.deanery = (SELECT deanery FROM public.user_profile WHERE user_id = auth.uid())
  )
);

-- RLS Policy: ARCP Panel can update arcp_outcome for trainees
DROP POLICY IF EXISTS "arcp_update_outcome" ON public.user_profile;
CREATE POLICY "arcp_update_outcome"
ON public.user_profile
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_profile up
    WHERE up.user_id = auth.uid()
    AND (
      'ARCPPanelMember' = ANY(up.roles)
      OR 'ARCPSuperuser' = ANY(up.roles)
    )
  )
)
WITH CHECK (
  -- Only allow updating arcp_outcome (enforced at application level for simplicity)
  TRUE
);

-- RLS Policy: ARCP Superuser can update roles for users (for assigning Panel/Supervisor roles)
DROP POLICY IF EXISTS "arcp_superuser_update_roles" ON public.user_profile;
CREATE POLICY "arcp_superuser_update_roles"
ON public.user_profile
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_profile up
    WHERE up.user_id = auth.uid()
    AND 'ARCPSuperuser' = ANY(up.roles)
  )
);
