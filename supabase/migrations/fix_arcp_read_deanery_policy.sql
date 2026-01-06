-- Fix: ARCP Panel Dashboard RLS Policy
-- The arcp_read_deanery_profiles policy had a bug where it compared the user's deanery to their own deanery
-- instead of comparing the TARGET profile's deanery to the user's deanery.

-- First, ensure the roles column exists (add if missing)
ALTER TABLE public.user_profile
ADD COLUMN IF NOT EXISTS roles text[] NOT NULL DEFAULT '{}';

-- Set the current user as Admin (allows them to see all profiles)
-- This will grant Admin role to the first user without any roles
UPDATE public.user_profile
SET roles = ARRAY['Admin']
WHERE user_id = (
  SELECT user_id FROM public.user_profile 
  WHERE roles = '{}' OR roles IS NULL 
  ORDER BY created_at 
  LIMIT 1
);

-- Drop the buggy policy
DROP POLICY IF EXISTS "arcp_read_deanery_profiles" ON public.user_profile;

-- Create corrected policy that allows ARCP Panel/Superuser to read profiles where:
-- 1. The current user has ARCPPanelMember or ARCPSuperuser role
-- 2. The TARGET profile's deanery matches the current user's deanery
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
    AND public.user_profile.deanery = up.deanery  -- Compare TARGET profile's deanery to current user's deanery
  )
);

-- Also ensure Admin policy exists for full access
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

-- Grant the current logged-in user Admin role (run this separately if needed):
-- UPDATE public.user_profile SET roles = ARRAY['Admin'] WHERE user_id = auth.uid();
