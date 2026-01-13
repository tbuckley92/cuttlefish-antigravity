-- Migration: Allow trainees to search for supervisors in their deanery
-- This enables the supervisor search autocomplete feature on forms

-- Drop policy if it exists (for re-running migration)
DROP POLICY IF EXISTS "trainee_search_supervisors" ON public.user_profile;

-- Create policy to allow searching for supervisors in same deanery
CREATE POLICY "trainee_search_supervisors"
ON public.user_profile
FOR SELECT
USING (
  -- User must be authenticated
  auth.uid() IS NOT NULL
  AND
  -- Target profile must have Supervisor or EducationalSupervisor role
  (
    'Supervisor' = ANY(roles) 
    OR 'EducationalSupervisor' = ANY(roles)
  )
  AND
  -- Must be in same deanery as requesting user
  deanery = (SELECT deanery FROM public.user_profile WHERE user_id = auth.uid())
);

COMMENT ON POLICY "trainee_search_supervisors" ON public.user_profile IS 
  'Allow all authenticated users to search for supervisors within their own deanery for form completion';
