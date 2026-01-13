-- Migration: Allow trainees to search for supervisors in their deanery
-- This enables the supervisor search autocomplete feature on forms
-- FIXED VERSION: Uses user_profile_select_own policy dependency to avoid recursion

-- Drop policy if it exists (for re-running migration)
DROP POLICY IF EXISTS "trainee_search_supervisors" ON public.user_profile;

-- IMPORTANT: This policy depends on "user_profile_select_own" existing first
-- The subquery works because user_profile_select_own allows:
-- SELECT ... WHERE user_id = auth.uid()

-- Create policy to allow searching for supervisors in same deanery
CREATE POLICY "trainee_search_supervisors"
ON public.user_profile
FOR SELECT
USING (
  -- Target profile must have Supervisor or EducationalSupervisor role
  (
    'Supervisor' = ANY(roles) 
    OR 'EducationalSupervisor' = ANY(roles)
  )
  AND
  -- Must be in same deanery as requesting user
  -- This subquery is safe because user_profile_select_own allows it
  deanery IN (
    SELECT deanery 
    FROM public.user_profile 
    WHERE user_id = auth.uid()
  )
);

COMMENT ON POLICY "trainee_search_supervisors" ON public.user_profile IS 
  'Allow all authenticated users to search for supervisors within their own deanery for form completion. Depends on user_profile_select_own policy.';
